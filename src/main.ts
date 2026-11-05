import { getLinkpath, Notice, Plugin, TFile } from "obsidian";
import { DEFAULT_VAULT_SETTINGS, normalizeVaultSettings } from "./settings.ts";
import type { LocalSettings, VaultSettings } from "./settings.ts";
import { LocalSettingsStore } from "./localSettingsStore.ts";
import { RecordingWatcher } from "./recordingWatcher.ts";
import { OnTheRecordSettingTab } from "./settingsTab.ts";
import { RecordingQueue } from "./recordingQueue.ts";
import { waitForLinkedNotes } from "./linkWaiter.ts";

const LINK_WAIT_TIMEOUT_MS = 30_000;

export default class OnTheRecordPlugin extends Plugin {
	private watcher: RecordingWatcher | null = null;
	private readonly recordingQueue = new RecordingQueue();
	private vaultSettings: VaultSettings = { ...DEFAULT_VAULT_SETTINGS };
	private localSettings: LocalSettings | null = null;
	private localSettingsStore: LocalSettingsStore | null = null;
	private localSettingsError: string | null = null;
	private vaultSaveQueue: Promise<void> = Promise.resolve();
	private localSaveQueue: Promise<void> = Promise.resolve();

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
					if (file instanceof TFile) this.removeQueuedRecording(file.path);
				}),
			);
			this.registerEvent(
				this.app.vault.on("rename", (file, oldPath) => {
					if (file instanceof TFile) {
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
