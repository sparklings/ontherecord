import { getLinkpath, Notice, Plugin, TFile } from "obsidian";
import { DEFAULT_VAULT_SETTINGS, normalizeVaultSettings } from "./settings.ts";
import type { LocalSettings, VaultSettings } from "./settings.ts";
import { LocalSettingsStore } from "./localSettingsStore.ts";
import { RecordingWatcher } from "./recordingWatcher.ts";
import { OnTheRecordSettingTab } from "./settingsTab.ts";
import { RecordingQueue } from "./recordingQueue.ts";
import { waitForLinkedNotes } from "./linkWaiter.ts";
import { isSupportedAudioExtension } from "./audioFiles.ts";
import { AudioFilePickerModal } from "./audioFilePicker.ts";
import { waitForStable } from "./stability.ts";

import { ExistingResultModal, ResultPreviewModal } from "./resultPreviewModal.ts";
import { applyHeadingInsertion, hasExistingResult } from "./resultPreview.ts";
import type { ExistingResultChoice } from "./resultPreview.ts";
import type { TranscriptionResult } from "./provider.ts";

const SAMPLE_AUDIO_PATH = "sample/preview-test.m4a";
const SAMPLE_RESULT: TranscriptionResult = {
	language: "ko",
	text: "샘플 문장입니다. 실제 전사 결과가 아닙니다.",
	segments: [
		{ startSeconds: 0, endSeconds: 3.2, text: "샘플 문장입니다." },
		{ startSeconds: 3.2, endSeconds: 7.5, text: "실제 전사 결과가 아닙니다." },
	],
	engine: { providerId: "sample", providerVersion: "0", modelId: "none", device: "cpu" },
	warnings: ["시험용 샘플입니다. 실제 녹음을 전사한 결과가 아닙니다."],
};

const LINK_WAIT_TIMEOUT_MS = 30_000;
const MANUAL_FILE_STABILITY_TIMEOUT_MS = 15_000;

export default class OnTheRecordPlugin extends Plugin {
	private watcher: RecordingWatcher | null = null;
	private readonly recordingQueue = new RecordingQueue();
	private vaultSettings: VaultSettings = { ...DEFAULT_VAULT_SETTINGS };
	private localSettings: LocalSettings | null = null;
	private localSettingsStore: LocalSettingsStore | null = null;
	private localSettingsError: string | null = null;
	private vaultSaveQueue: Promise<void> = Promise.resolve();
	private localSaveQueue: Promise<void> = Promise.resolve();
	private readonly pendingManualSelections = new Map<string, AbortController>();

	async onload(): Promise<void> {
		try {
			this.vaultSettings = normalizeVaultSettings(await this.loadData());
		} catch (error) {
			this.reportError("vault 설정을 불러오지 못했습니다.", error);
			this.vaultSettings = { ...DEFAULT_VAULT_SETTINGS };
		}

		try {
			const localAppData = process.env.LOCALAPPDATA;
			this.localSettingsStore = new LocalSettingsStore(localAppData ?? "", this.manifest.id);
			this.localSettings = await this.localSettingsStore.load();
		} catch (error) {
			this.localSettingsStore = null;
			this.localSettings = null;
			this.localSettingsError = "PC별 설정을 읽거나 초기화하지 못했습니다. 권한과 로컬 저장 공간을 확인하세요.";
			this.reportError(this.localSettingsError, error);
		}

		this.addSettingTab(
			new OnTheRecordSettingTab(
				this.app,
				() => this.vaultSettings,
				(patch) => this.updateVaultSettings(patch),
				() => this.localSettings,
				(patch) => this.updateLocalSettings(patch),
				this.localSettingsError,
				this,
			),
		);

		this.addCommand({
			id: "select-audio-file",
			name: "전사할 오디오 파일 선택",
			callback: () => this.openAudioFilePicker(),
		});
		this.addCommand({
			id: "preview-sample-result",
			name: "샘플 전사 결과 미리보기 시험",
			callback: () => {
				void this.previewAndInsertResult(SAMPLE_RESULT, SAMPLE_AUDIO_PATH);
			},
		});
		this.addRibbonIcon("search", "전사할 오디오 파일 선택", () => this.openAudioFilePicker());

		const watcher = new RecordingWatcher(
			this.app,
			(recording) =>
				this.handleStableRecording(recording.file, recording.stability.size, recording.signal),
			{ quietMs: this.vaultSettings.stabilizationSeconds * 1000 },
			(error) => this.reportError("녹음 파일 안정화 중 오류가 발생했습니다.", error),
		);
		this.watcher = watcher;

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.vault.on("create", (file) => {
					if (this.vaultSettings.autoDetectRecording) watcher.handleCreate(file);
				}),
			);
			this.registerEvent(
				this.app.vault.on("delete", (file) => {
					watcher.handleDelete(file);
					if (file instanceof TFile) {
						this.cancelManualSelection(file.path);
						this.removeQueuedRecording(file.path);
					}
				}),
			);
			this.registerEvent(
				this.app.vault.on("rename", (file, oldPath) => {
					if (file instanceof TFile) {
						this.cancelManualSelection(oldPath);
						this.recordingQueue.rename(oldPath, file.path);
						if (this.vaultSettings.autoDetectRecording) watcher.handleRename(file, oldPath);
					}
				}),
			);
		});
	}

	onunload(): void {
		this.watcher?.dispose();
		this.watcher = null;
		for (const controller of this.pendingManualSelections.values()) controller.abort();
		this.pendingManualSelections.clear();
	}

	private async updateVaultSettings(patch: Partial<VaultSettings>): Promise<void> {
		this.vaultSettings = { ...this.vaultSettings, ...patch };
		if (patch.autoDetectRecording === false) this.watcher?.cancelPending();
		this.watcher?.setOptions({ quietMs: this.vaultSettings.stabilizationSeconds * 1000 });
		const save = this.vaultSaveQueue.then(() => this.saveData(this.vaultSettings));
		this.vaultSaveQueue = save.catch((error: unknown) => {
			this.reportError("vault 설정을 저장하지 못했습니다.", error);
		});
		await this.vaultSaveQueue;
	}

	private async handleStableRecording(file: TFile, size: number | null, signal: AbortSignal): Promise<void> {
		if (!this.vaultSettings.autoDetectRecording) return;
		if (!this.vaultSettings.autoTranscribe) {
			new Notice("녹음 파일이 준비됐습니다. 자동 전사는 설정에서 꺼져 있습니다.");
			return;
		}

		const result = await waitForLinkedNotes(
			file.path,
			{
				findLinkedNotes: (filePath) => this.findLinkedNotes(filePath),
				onChange: (callback) => {
					const event = this.app.metadataCache.on("changed", callback);
					return () => this.app.metadataCache.offref(event);
				},
				setTimeout: (callback, ms) => window.setTimeout(callback, ms),
				clearTimeout: (handle) => window.clearTimeout(handle),
			},
			LINK_WAIT_TIMEOUT_MS,
			signal,
		);

		if (signal.aborted) return;
		if (result.status === "timeout") {
			new Notice("녹음 노트의 오디오 링크를 확인하지 못했습니다. 파일 찾기 기능을 사용하세요.");
			return;
		}
		if (result.status !== "linked") return;

		const added = this.recordingQueue.enqueue({
			filePath: file.path,
			notePaths: result.notePaths,
			size: size ?? file.stat.size,
			queuedAt: Date.now(),
			status: "queued",
		});
		if (!added) return;

		this.logQueueState();
		new Notice("녹음 파일을 전사 대기열에 추가했습니다. 전사 엔진 연결은 아직 제공되지 않습니다.");
	}

	// 승인 전에는 노트를 수정하지 않는다. 실제 엔진이 연결되면 같은 경로로 결과를 전달한다.
	async previewAndInsertResult(result: TranscriptionResult, audioPath: string): Promise<void> {
		const target = this.app.workspace.getActiveFile();
		if (!target || target.extension !== "md") {
			new Notice("결과를 넣을 마크다운 노트를 먼저 여세요.");
			return;
		}

		const approved = await new ResultPreviewModal(this.app, result, target.path).prompt();
		if (!approved) {
			new Notice("취소했습니다. 노트는 수정되지 않았습니다.");
			return;
		}

		try {
			let choice: ExistingResultChoice | null = "append";
			const current = await this.app.vault.read(target);
			if (hasExistingResult(current, audioPath)) {
				choice = await new ExistingResultModal(this.app).prompt();
				if (!choice) {
					new Notice("취소했습니다. 노트는 수정되지 않았습니다.");
					return;
				}
			}
			const selectedChoice = choice;
			await this.app.vault.process(target, (content) =>
				applyHeadingInsertion(content, {
					heading: approved.heading,
					audioPath,
					markdown: approved.markdown,
					existing: selectedChoice,
				}),
			);
			new Notice("전사 결과를 노트에 반영했습니다.");
		} catch (error) {
			this.reportError("전사 결과를 노트에 반영하지 못했습니다.", error);
		}
	}

	private openAudioFilePicker(): void {
		const hasAudioFiles = this.app.vault
			.getFiles()
			.some((file) => isSupportedAudioExtension(file.extension));
		if (!hasAudioFiles) {
			new Notice("Vault에서 지원되는 오디오 파일을 찾지 못했습니다.");
			return;
		}

		new AudioFilePickerModal(this.app, (file) => {
			void this.queueSelectedAudioFile(file);
		}).open();
	}

	private async queueSelectedAudioFile(selectedFile: TFile): Promise<void> {
		const filePath = selectedFile.path;
		const currentFile = this.app.vault.getAbstractFileByPath(filePath);
		if (!(currentFile instanceof TFile) || !isSupportedAudioExtension(currentFile.extension)) {
			new Notice("선택한 오디오 파일을 vault에서 찾을 수 없습니다.");
			return;
		}
		if (currentFile.stat.size <= 0) {
			new Notice("선택한 오디오 파일이 비어 있습니다.");
			return;
		}
		if (this.recordingQueue.has(filePath)) {
			new Notice("이 파일은 이미 전사 대기열에 있습니다.");
			return;
		}
		if (this.pendingManualSelections.has(filePath)) {
			new Notice("이 파일의 안정화 상태를 이미 확인하고 있습니다.");
			return;
		}

		const controller = new AbortController();
		this.pendingManualSelections.set(filePath, controller);
		try {
			const quietMs = this.vaultSettings.stabilizationSeconds * 1000;
			const initialStat = await this.app.vault.adapter.stat(filePath);
			if (!initialStat || initialStat.size <= 0) {
				new Notice("선택한 오디오 파일을 읽을 수 없거나 비어 있습니다.");
				return;
			}

			let size = initialStat.size;
			if (Date.now() - initialStat.mtime < quietMs) {
				const stability = await waitForStable(
					filePath,
					{
						stat: async (path) => {
							const stat = await this.app.vault.adapter.stat(path);
							return stat ? { size: stat.size, mtime: stat.mtime } : null;
						},
						now: () => Date.now(),
						sleep: (ms) => new Promise((resolve) => window.setTimeout(resolve, ms)),
						signal: controller.signal,
					},
					{
						intervalMs: 500,
						quietMs,
						timeoutMs: MANUAL_FILE_STABILITY_TIMEOUT_MS,
					},
				);
				if (stability.status === "cancelled") return;
				if (stability.status !== "stable") {
					new Notice(
						stability.status === "missing"
							? "선택한 오디오 파일이 사라졌습니다."
							: "파일이 계속 변경 중이어서 대기열에 추가하지 않았습니다.",
					);
					return;
				}
				size = stability.size ?? initialStat.size;
			}

			if (controller.signal.aborted) return;
			const latestFile = this.app.vault.getAbstractFileByPath(filePath);
			if (!(latestFile instanceof TFile)) {
				new Notice("선택한 오디오 파일이 사라졌습니다.");
				return;
			}

			const added = this.recordingQueue.enqueue({
				filePath,
				notePaths: this.findLinkedNotes(filePath),
				size,
				queuedAt: Date.now(),
				status: "queued",
			});
			if (!added) {
				new Notice("이 파일은 이미 전사 대기열에 있습니다.");
				return;
			}

			this.logQueueState();
			new Notice("선택한 오디오 파일을 전사 대기열에 추가했습니다. 전사 엔진 연결은 아직 제공되지 않습니다.");
		} catch (error) {
			if (!controller.signal.aborted) this.reportError("선택한 오디오 파일을 확인하지 못했습니다.", error);
		} finally {
			if (this.pendingManualSelections.get(filePath) === controller) {
				this.pendingManualSelections.delete(filePath);
			}
		}
	}

	private cancelManualSelection(filePath: string): void {
		this.pendingManualSelections.get(filePath)?.abort();
		this.pendingManualSelections.delete(filePath);
	}

	private findLinkedNotes(filePath: string): string[] {
		const linkedNotes: string[] = [];
		for (const note of this.app.vault.getMarkdownFiles()) {
			const embeds = this.app.metadataCache.getFileCache(note)?.embeds ?? [];
			const matches = embeds.some((embed) => {
				const destination = this.app.metadataCache.getFirstLinkpathDest(
					getLinkpath(embed.link),
					note.path,
				);
				return destination?.path === filePath;
			});
			if (matches) linkedNotes.push(note.path);
		}
		return linkedNotes;
	}

	private removeQueuedRecording(filePath: string): void {
		if (this.recordingQueue.remove(filePath)) this.logQueueState();
	}

	private logQueueState(): void {
		console.debug(`[on-the-record] 전사 대기열 항목: ${this.recordingQueue.list().length}`);
	}

	private async updateLocalSettings(patch: Partial<LocalSettings>): Promise<void> {
		if (!this.localSettingsStore || !this.localSettings) {
			new Notice(this.localSettingsError ?? "PC별 설정을 저장할 수 없습니다.");
			return;
		}
		this.localSettings = { ...this.localSettings, ...patch };
		const store = this.localSettingsStore;
		const save = this.localSaveQueue.then(async () => {
			this.localSettings = await store.update(patch);
		});
		this.localSaveQueue = save.catch((error: unknown) => {
			this.reportError("PC별 설정을 저장하지 못했습니다.", error);
		});
		await this.localSaveQueue;
	}

	private reportError(message: string, error: unknown): void {
		const errorType = error instanceof Error ? error.name : "UnknownError";
		console.error(`[on-the-record] ${message} (${errorType})`);
		new Notice(message);
	}
}
