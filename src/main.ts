import { addIcon, FileSystemAdapter, getLinkpath, MarkdownView, Modal, Notice, Plugin, setIcon, TFile, WorkspaceLeaf } from "obsidian";
import type { EmbedCache } from "obsidian";

export const OTR_DECK_ICON_ID = "otr-record-deck";
const OTR_DECK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15v-2"/><path d="M12 17v-6"/><path d="M15 15v-2"/></svg>`;
import { DEFAULT_VAULT_SETTINGS, normalizeVaultSettings } from "./settings.ts";
import type { LocalSettings, VaultSettings } from "./settings.ts";
import { LocalSettingsStore } from "./localSettingsStore.ts";
import { RecordingWatcher } from "./recordingWatcher.ts";
import { OnTheRecordSettingTab } from "./settingsTab.ts";
import { RecordingQueue } from "./recordingQueue.ts";
import type { QueuedRecording } from "./recordingQueue.ts";
import { waitForLinkedNotes } from "./linkWaiter.ts";
import { AUDIO_EXTENSIONS, isSupportedAudioExtension } from "./audioFiles.ts";
import { AudioFilePickerModal } from "./audioFilePicker.ts";
import { waitForStable } from "./stability.ts";
import { WhisperCppCpuRuntime, WHISPER_CPP_CPU_AUDIO_EXTENSIONS } from "./whisperCppCpu.ts";
import type { WhisperCppModelIdentity, WhisperCppRuntimeIdentity } from "./whisperCppCpu.ts";
import { getCpuToolSearchRoots, scanCpuToolCandidates } from "./cpuRuntimeDiscovery.ts";
import {
	CpuRuntimeDiscoveryProgressModal,
	CpuRuntimeDiscoveryResultsModal,
} from "./cpuRuntimeDiscoveryModal.ts";
import type { CpuToolDiscoveryReport, VerifiedCpuToolPair } from "./cpuRuntimeDiscoveryModal.ts";
import { findTranscriptMatches } from "./transcriptSearch.ts";
import type { TranscriptSearchMatch } from "./transcriptSearch.ts";
import { openTranscriptMatch, TranscriptSearchModal, TranscriptSearchResultsModal } from "./transcriptSearchModal.ts";
import type { AudioEmbedPosition } from "./resultPreview.ts";

import { AudioEmbedTargetPickerModal, ExistingResultModal, ResultPreviewModal } from "./resultPreviewModal.ts";
import type { AudioEmbedTarget } from "./resultPreviewModal.ts";
import { applyAudioEmbedInsertion, formatResultMarkdown, hasExistingResult, prioritizeAudioEmbeds } from "./resultPreview.ts";
import type { ExistingResultChoice } from "./resultPreview.ts";
import type { TranscriptionResult } from "./provider.ts";
import type { CpuSmokeTestStage } from "./whisperCppCpu.ts";
import {
	calculateNextRecordingSeq,
	RecordingSessionManager,
	resolveRecordStartMode,
	resolveRecordStartNotice,
} from "./recordingSession.ts";
import type { CoreAudioRecorder, SessionStorageAdapter } from "./recordingSession.ts";
import { TabCloseHandler } from "./tabCloseHandler.ts";
import { formatStatusBarProgress, TranscriptionQueueWorker } from "./transcriptionQueueWorker.ts";
import { RecordingStatusBar } from "./recordingStatusBar.ts";
import {
	recalculateFrontmatterRecordings,
	applyRecordingSessionToMarkdown,
} from "./noteMetadataHandler.ts";
import {
	checkUnfinishedSessionOnStartup,
	collectAllLinkedAudioPaths,
	findOrphanAudioFiles,
	SUPPORTED_AUDIO_EXTENSIONS,
} from "./orphanAudioHandler.ts";
import { OrphanAudioModal } from "./orphanAudioModal.ts";
import type { OrphanAudioFileInfo } from "./orphanAudioHandler.ts";
import {
	handleTimestampClick,
	postProcessTimestamps,
} from "./audioPlaybackSync.ts";
import { generateMeetingSummary } from "./localLlmClient.ts";
import { extractTranscriptFromMarkdown, formatMeetingSummaryBlock } from "./summaryPrompt.ts";
import { OnTheRecordSidebarView, OTR_SIDEBAR_VIEW_TYPE } from "./sidebarView.ts";
import { createMeetingNote, isContentMatchingTemplate } from "./meetingNoteCreator.ts";
import { parseAudioEmbedsFromMarkdown } from "./noteAudioExplorer.ts";
import { FloatingRecordingIndicator } from "./floatingIndicator.ts";
import type { WorkerProgress } from "./transcriptionQueueWorker.ts";

interface ObsidianAudioRecorderPlugin {
	instance?: {
		recording?: boolean;
	};
}

interface ObsidianAppWithAudioRecorder {
	commands?: {
		executeCommandById?: (id: string) => boolean | undefined;
	};
	internalPlugins?: {
		plugins?: Record<string, ObsidianAudioRecorderPlugin | undefined>;
	};
}

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

class CpuRuntimeTestProgressModal extends Modal {
	private statusEl!: HTMLElement;
	private detailEl!: HTMLElement;
	private elapsedEl!: HTMLElement;
	private progressEl!: HTMLProgressElement;
	private readonly startedAt = Date.now();
	private timer: number | null = null;

	onOpen(): void {
		this.modalEl.addClass("otr-cpu-runtime-test");
		this.titleEl.setText("CPU 런타임 시험");
		this.statusEl = this.contentEl.createEl("p");
		this.detailEl = this.contentEl.createEl("p", { cls: "setting-item-description" });
		this.elapsedEl = this.contentEl.createEl("p", { cls: "setting-item-description" });
		this.progressEl = this.contentEl.createEl("progress", { attr: { max: 100 } });
		this.timer = window.setInterval(() => this.updateElapsed(), 1000);
		this.updateElapsed();
		this.setStage("checking-files");
	}

	onClose(): void {
		if (this.timer !== null) window.clearInterval(this.timer);
		this.timer = null;
		this.contentEl.empty();
	}

	setStage(stage: CpuSmokeTestStage, percent?: number): void {
		const labels: Record<CpuSmokeTestStage, string> = {
			"checking-files": "런타임과 모델 파일 확인 중",
			"hashing-runtime": "런타임 SHA-256 확인 중",
			"hashing-model": "모델 SHA-256 확인 중",
			"checking-version": "런타임 버전 확인 중",
			"checking-audio": "입력 오디오 확인 중",
			"normalizing-audio": "오디오를 16 kHz 모노 PCM WAV로 변환 중",
			transcribing: "시험 추론 실행 중",
		};
		this.statusEl.setText(labels[stage]);
		if ((stage === "hashing-runtime" || stage === "hashing-model") && percent !== undefined) {
			this.progressEl.value = percent;
			this.detailEl.setText(`${percent}%`);
		} else {
			this.progressEl.removeAttribute("value");
			this.detailEl.setText(
				stage === "transcribing"
					? "모델 로드와 전사 중입니다. 오디오 길이와 모델에 따라 시간이 걸릴 수 있습니다."
					: "잠시 기다려 주세요.",
			);
		}
		this.updateElapsed();
	}

	showCompleted(): void {
		this.stopTimer();
		this.titleEl.setText("CPU 런타임 검증 완료");
		this.statusEl.setText("시험 추론이 정상적으로 완료되었습니다.");
		this.detailEl.setText("정규화 오디오와 시험 전사 결과는 임시 폴더에서 삭제했습니다.");
		this.progressEl.value = 100;
	}

	showFailed(message: string): void {
		this.stopTimer();
		this.titleEl.setText("CPU 런타임 시험 실패");
		this.statusEl.setText(message);
		this.detailEl.setText("설정 경로와 런타임·모델 파일을 확인한 뒤 다시 시도하세요.");
		this.progressEl.removeAttribute("value");
	}

	private updateElapsed(): void {
		if (!this.elapsedEl) return;
		const elapsedSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
		const elapsed = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
		this.elapsedEl.setText(`경과 시간: ${elapsed}`);
	}

	private stopTimer(): void {
		if (this.timer !== null) window.clearInterval(this.timer);
		this.timer = null;
	}
}

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
	private cpuDiscoveryInProgress = false;
	private sessionManager!: RecordingSessionManager;
	private tabCloseHandler!: TabCloseHandler;
	private queueWorker!: TranscriptionQueueWorker;
	private statusBarItem: HTMLElement | null = null;
	private recordingStatusBar!: RecordingStatusBar;
	private recordingStatusBarItem: HTMLElement | null = null;
	private floatingIndicator!: FloatingRecordingIndicator;

	async onload(): Promise<void> {
		this.setupSessionManager();
		this.setupTabCloseHandler();
		this.setupQueueWorker();
		this.setupRecordingStatusBar();
		this.setupFloatingIndicator();

		try {
			const restored = await this.sessionManager.restore();
			if (restored) {
				this.recordingStatusBar.start(restored);
				this.floatingIndicator.setState("recording", restored.startedAt);
			}
		} catch (error) {
			this.reportError("이전 녹음 세션을 복원하지 못했습니다.", error);
		}

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
				async (patch) => {
					await this.updateLocalSettings(patch);
				},
				this.localSettingsError,
				() => this.openCpuRuntimeTestPicker(),
				() => {
					void this.discoverCpuSetup();
				},
				this,
			),
		);

		this.registerView(
			OTR_SIDEBAR_VIEW_TYPE,
			(leaf) =>
				new OnTheRecordSidebarView(leaf, {
					isRecording: () => this.sessionManager.isRecording(),
					getActiveSessionNotePath: () => this.sessionManager.getActiveSession()?.notePath ?? null,
					startRecording: async (note) => {
						await this.startRecordingForNote(note);
					},
					pauseRecording: async () => {
						await this.pauseCurrentRecording();
					},
					resumeRecording: async () => {
						const activeFile = this.app.workspace.getActiveFile();
						if (activeFile) {
							await this.startRecordingForNote(activeFile);
						}
					},
					stopRecording: async () => {
						await this.stopCurrentRecording();
					},
					createNewMeetingNote: async () => {
						const created = await createMeetingNote(this.app, {
							folder: this.vaultSettings.autoRecordFolder,
							templatePath: this.vaultSettings.autoRecordTemplatePath,
						});
						const targetFile = this.app.vault.getAbstractFileByPath(created.path);
						if (!(targetFile instanceof TFile)) return null;
						const leaf = this.app.workspace.getLeaf(false);
						await leaf.openFile(targetFile);
						return targetFile;
					},
					enqueueAudioTranscription: async (audioPath: string) => {
						const activeFile = this.app.workspace.getActiveFile();
						const audioFile = this.app.vault.getAbstractFileByPath(audioPath);
						this.recordingQueue.enqueue({
							filePath: audioPath,
							notePaths: activeFile ? [activeFile.path] : [],
							size: audioFile instanceof TFile ? audioFile.stat.size : 0,
							queuedAt: Date.now(),
							status: "queued",
						});
						void this.queueWorker.trigger();
					},
					openAudioPicker: () => {
						this.openAudioFilePicker();
					},
					generateSummary: async (note) => {
						await this.generateAndAppendSummary(note);
					},
					openSettings: () => {
						const appWithSetting = this.app as unknown as {
							setting?: { open: () => void; openTabById: (id: string) => void };
						};
						appWithSetting.setting?.open();
						appWithSetting.setting?.openTabById(this.manifest.id);
					},
					isToolsConfigured: () => {
						return Boolean(
							this.localSettings?.runtimePath?.trim() &&
							this.localSettings?.modelPath?.trim() &&
							this.localSettings?.ffmpegPath?.trim(),
						);
					},
					cancelTranscription: () => {
						this.queueWorker.stop();
						this.queueWorker.start();
						this.updateSidebarProgress(null);
						new Notice("진행 중인 전사 작업을 취소했습니다.");
					},
				}),
		);

		this.addCommand({
			id: "create-meeting-note-and-record",
			name: "새 회의록 작성 및 음성 녹음 시작",
			callback: async () => {
				const created = await createMeetingNote(this.app, {
					folder: this.vaultSettings.autoRecordFolder,
					templatePath: this.vaultSettings.autoRecordTemplatePath,
				});
				const targetFile = this.app.vault.getAbstractFileByPath(created.path);
				if (!(targetFile instanceof TFile)) return;
				const leaf = this.app.workspace.getLeaf(false);
				await leaf.openFile(targetFile);
				await this.startRecordingForNote(targetFile);
				await this.activateSidebarView();
			},
		});

		this.addCommand({
			id: "open-sidebar-panel",
			name: "오른쪽 사이드바 회의록 제어 패널 열기",
			callback: async () => {
				await this.activateSidebarView();
			},
		});

		this.addCommand({
			id: "start-recording",
			name: "현재 활성 노트에서 음성 녹음 시작",
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const note = view?.file;
				if (!view || !note) {
					new Notice("녹음을 시작할 Markdown 노트를 먼저 여세요.");
					return;
				}
				void this.startRecordingForNote(note);
			},
		});
		this.addCommand({
			id: "stop-recording",
			name: "음성 녹음 중지",
			callback: () => {
				void this.stopCurrentRecording();
			},
		});
		this.addCommand({
			id: "select-audio-file",
			name: "전사할 오디오 파일 선택",
			callback: () => this.openAudioFilePicker(),
		});
		this.addCommand({
			id: "preview-sample-result",
			name: "샘플 전사 결과 미리보기 시험",
			callback: () => {
				this.openSamplePreviewPicker();
			},
		});
		this.addCommand({
			id: "transcribe-audio-insert",
			name: "오디오 전사 및 결과 삽입",
			callback: () => {
				this.openCpuTranscriptionPicker();
			},
		});
		this.addCommand({
			id: "search-transcripts",
			name: "전사문 검색",
			callback: () => this.openTranscriptSearch(),
		});
		this.addCommand({
			id: "recalculate-note-recordings",
			name: "이 노트 녹음 정보 재계산",
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile && activeFile.extension === "md") {
					if (!checking) {
						void this.recalculateCurrentNoteRecordings(activeFile);
					}
					return true;
				}
				return false;
			},
		});
		this.addCommand({
			id: "check-orphan-audio",
			name: "고아 녹음 파일 점검",
			callback: () => {
				void this.openOrphanAudioModal();
			},
		});
		this.addCommand({
			id: "summarize-active-note-transcript",
			name: "현재 활성 노트 전사문 로컬 AI 요약 생성",
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile && activeFile.extension === "md") {
					if (!checking) {
						void this.generateAndAppendSummary(activeFile);
					}
					return true;
				}
				return false;
			},
		});
		addIcon(OTR_DECK_ICON_ID, OTR_DECK_ICON_SVG);
		this.addRibbonIcon(OTR_DECK_ICON_ID, "On the Record 회의록 제어 패널 열기", () => {
			void this.activateSidebarView();
		});

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.refreshSidebarViews();
			}),
		);
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				this.refreshSidebarViews();
			}),
		);

		// 3-PIPE-03: 타임스탬프 오디오 동기화 포스트 프로세서 및 클릭 이벤트 등록
		this.registerMarkdownPostProcessor((el) => {
			postProcessTimestamps(el);
		});
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			const target = evt.target as HTMLElement;
			if (target) {
				handleTimestampClick(target);
			}
		});

		// 3-PIPE-01: 상태표시줄 아이템 생성
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.addClass("otr-status-bar");
		this.statusBarItem.onClickEvent(() => {
			const progress = this.queueWorker.getProgress();
			if (progress) {
				const pct = progress.percent !== undefined ? ` (${Math.round(progress.percent)}%)` : "";
				new Notice(`[On the Record] 전사 진행 중: ${progress.item.filePath}${pct}\n단계: ${progress.stage}`, 5000);
			} else {
				const queuedCount = this.recordingQueue.list().filter((i) => i.status === "queued").length;
				if (queuedCount > 0) {
					new Notice(`[On the Record] 대기열에 ${queuedCount}개 파일이 대기 중입니다.`, 4000);
				} else {
					new Notice("[On the Record] 현재 진행 중인 전사 작업이 없습니다.", 3000);
				}
			}
		});

		// 3-REC-02: WorkspaceLeaf.prototype.detach 후킹하여 탭 닫힘 감지
		const originalDetach = WorkspaceLeaf.prototype.detach;
		const pluginInstance = this;
		this.register(() => {
			WorkspaceLeaf.prototype.detach = originalDetach;
		});
		WorkspaceLeaf.prototype.detach = function (this: WorkspaceLeaf) {
			const view = this.view;
			if (view instanceof MarkdownView && view.file) {
				void pluginInstance.tabCloseHandler?.handleLeafClose(view.file.path);
			}
			return originalDetach.apply(this);
		};

		// S-09: 코어 녹음기가 생성 직후 새 탭으로 오디오 파일을 여는 동작 자동 닫기
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				if (leaf && leaf.view instanceof MarkdownView === false) {
					const activeFile = this.app.workspace.getActiveFile();
					if (activeFile && pluginInstance.tabCloseHandler?.shouldAutoCloseAudioLeaf(activeFile.path)) {
						leaf.detach();
					}
				}
			}),
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
			this.queueWorker.start();
			void checkUnfinishedSessionOnStartup(this.app, {
				get: () => this.sessionManager.restore(),
			});
			this.registerEvent(
				this.app.vault.on("create", (file) => {
					if (file instanceof TFile && file.extension.toLowerCase() === "md") {
						window.setTimeout(() => {
							void this.handleMarkdownNoteCreated(file);
						}, 300);
					}
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
		this.floatingIndicator?.destroy();
		this.recordingStatusBar?.stop();
		this.queueWorker?.stop();
		this.watcher?.dispose();
		this.watcher = null;
		for (const controller of this.pendingManualSelections.values()) controller.abort();
		this.pendingManualSelections.clear();
	}

	private setupSessionManager(): void {
		const sessionFilePath = `${this.app.vault.configDir}/plugins/${this.manifest.id}/active-session.json`;
		const storage: SessionStorageAdapter = {
			read: async () => {
				try {
					if (await this.app.vault.adapter.exists(sessionFilePath)) {
						return await this.app.vault.adapter.read(sessionFilePath);
					}
					return null;
				} catch {
					return null;
				}
			},
			write: async (data: string) => {
				try {
					await this.app.vault.adapter.write(sessionFilePath, data);
				} catch (error) {
					console.error("[on-the-record] 활성 세션 디스크 저장 실패:", error);
				}
			},
			delete: async () => {
				try {
					if (await this.app.vault.adapter.exists(sessionFilePath)) {
						await this.app.vault.adapter.remove(sessionFilePath);
					}
				} catch {
					// ignore
				}
			},
		};

		const recorder: CoreAudioRecorder = {
			isRecording: () => {
				const app = this.app as unknown as ObsidianAppWithAudioRecorder;
				const internalPlugin = app.internalPlugins?.plugins?.["audio-recorder"];
				return Boolean(internalPlugin?.instance?.recording);
			},
			start: async () => {
				const app = this.app as unknown as ObsidianAppWithAudioRecorder;
				const executed = app.commands?.executeCommandById?.("audio-recorder:start");
				return executed !== false;
			},
			stop: async () => {
				const app = this.app as unknown as ObsidianAppWithAudioRecorder;
				const executed = app.commands?.executeCommandById?.("audio-recorder:stop");
				return executed !== false;
			},
		};

		this.sessionManager = new RecordingSessionManager(storage, recorder);
	}

	private setupTabCloseHandler(): void {
		this.tabCloseHandler = new TabCloseHandler({
			sessionManager: this.sessionManager,
			vault: {
				read: async (path) => {
					const file = this.app.vault.getAbstractFileByPath(path);
					if (file instanceof TFile) return this.app.vault.read(file);
					return "";
				},
				process: async (path, fn) => {
					const file = this.app.vault.getAbstractFileByPath(path);
					if (file instanceof TFile) return this.app.vault.process(file, fn);
					return "";
				},
				exists: async (path) => {
					return Boolean(this.app.vault.getAbstractFileByPath(path));
				},
			},
			getAction: () => this.vaultSettings.onTabCloseAction,
			onNotice: (msg) => new Notice(msg, 5000),
		});
	}

	private setupQueueWorker(): void {
		const runtime = new WhisperCppCpuRuntime();
		this.queueWorker = new TranscriptionQueueWorker({
			queue: this.recordingQueue,
			engine: {
				transcribe: async (runtimePath, modelPath, ffmpegPath, audioFullPath, language, onProgress, _signal, gpuOptions) => {
					const result = await runtime.transcribe(
						runtimePath,
						modelPath,
						ffmpegPath,
						audioFullPath,
						language,
						onProgress,
						gpuOptions as import("./whisperCppCpu.ts").WhisperGpuExecutionOptions | undefined,
					);
					return {
						...result,
						engine: {
							providerId: "whisper-cpp",
							providerVersion: "1.9.5",
							modelId: modelPath,
							device:
								gpuOptions?.gpuBackend === "cuda" ||
								gpuOptions?.gpuBackend === "vulkan" ||
								gpuOptions?.gpuBackend === "openvino"
									? gpuOptions.gpuBackend
									: "cpu",
						},
					};
				},
			},
			settingsProvider: {
				getLocalSettings: () => this.localSettings,
				getVaultSettings: () => ({
					language: this.vaultSettings.language,
					vocabularyPrompt: this.vaultSettings.vocabularyPrompt,
				}),
				resolveFullPath: (filePath) => {
					const adapter = this.app.vault.adapter;
					if (adapter instanceof FileSystemAdapter) {
						return adapter.getFullPath(filePath);
					}
					return null;
				},
			},
			onProgress: (progress) => {
				const text = formatStatusBarProgress(progress);
				this.statusBarItem?.setText(text);
				if (text) {
					this.statusBarItem?.setAttribute("title", `[On the Record] 전사 진행 중: ${progress?.item.filePath}\n클릭 시 상세 확인`);
				} else {
					this.statusBarItem?.removeAttribute("title");
				}
				this.updateSidebarProgress(progress);
			},
			onItemCompleted: async (item, result) => {
				await this.handleQueueItemCompleted(item, result);
			},
			onItemError: (item, error) => {
				this.reportError(`'${item.filePath}' 백그라운드 전사에 실패했습니다.`, error);
			},
		});
	}

	private setupRecordingStatusBar(): void {
		this.recordingStatusBarItem = this.addStatusBarItem();
		this.recordingStatusBarItem.addClass("otr-recording-status-bar");
		this.recordingStatusBar = new RecordingStatusBar(
			{
				setText: (t) => this.recordingStatusBarItem?.setText(t),
				setAttribute: (k, v) => this.recordingStatusBarItem?.setAttribute(k, v),
				removeAttribute: (k) => this.recordingStatusBarItem?.removeAttribute(k),
				addClass: (c) => this.recordingStatusBarItem?.addClass(c),
				removeClass: (c) => this.recordingStatusBarItem?.removeClass(c),
			},
			() => {
				void this.stopCurrentRecording();
			},
		);
		this.recordingStatusBarItem.onClickEvent(() => {
			this.recordingStatusBar.handleClick();
		});
	}

	private setupFloatingIndicator(): void {
		this.floatingIndicator = new FloatingRecordingIndicator(
			{
				onPause: async () => {
					await this.pauseCurrentRecording();
				},
				onResume: async () => {
					const activeFile = this.app.workspace.getActiveFile();
					if (activeFile) {
						await this.startRecordingForNote(activeFile);
					}
				},
				onStop: async () => {
					await this.stopCurrentRecording();
				},
			},
			{ setIcon },
		);
	}

	private async startRecordingForNote(note: TFile): Promise<void> {
		this.floatingIndicator?.setState("starting");
		const existingEmbeds = this.app.metadataCache.getFileCache(note)?.embeds?.length ?? 0;
		const seq = calculateNextRecordingSeq(existingEmbeds);
		const session = await this.sessionManager.startManualSession({
			notePath: note.path,
			seq,
			onNotice: (msg) => new Notice(msg, 4000),
		});
		if (session) {
			this.recordingStatusBar.start(session);
			this.floatingIndicator?.setState("recording", session.startedAt);
			this.refreshSidebarViews();
		} else {
			this.floatingIndicator?.setState("idle");
		}
	}

	private async pauseCurrentRecording(): Promise<void> {
		if (!this.sessionManager.isRecording()) return;
		await this.sessionManager.stopSession();
		this.recordingStatusBar.stop();
		this.floatingIndicator?.setState("paused");
		this.refreshSidebarViews();
		new Notice("녹음이 일시정지되었습니다. ('계속하기'를 누르면 후속 녹음이 이어집니다)");
	}

	private updateSidebarProgress(progress: WorkerProgress | null): void {
		const queueCount = this.recordingQueue.list().length;
		const leaves = this.app.workspace.getLeavesOfType(OTR_SIDEBAR_VIEW_TYPE);
		for (const leaf of leaves) {
			if (leaf.view instanceof OnTheRecordSidebarView) {
				leaf.view.setTranscriptionProgress(progress, queueCount);
			}
		}
	}

	private async stopCurrentRecording(): Promise<void> {
		if (!this.sessionManager.isRecording()) {
			this.floatingIndicator?.setState("idle");
			new Notice("현재 진행 중인 음성 녹음이 없습니다.");
			return;
		}
		const session = await this.sessionManager.stopSession();
		this.recordingStatusBar.stop();
		this.floatingIndicator?.setState("idle");
		this.refreshSidebarViews();
		if (session) {
			new Notice(`${session.notePath}의 음성 녹음을 중지했습니다.`);
		} else {
			new Notice("음성 녹음을 중지했습니다.");
		}
	}

	private async handleQueueItemCompleted(item: QueuedRecording, result: TranscriptionResult): Promise<void> {
		const filename = item.filePath.split("/").pop() ?? item.filePath;
		const targets = this.findAudioEmbedTargets(item.filePath);

		if (targets.length === 0) {
			new Notice(`[On the Record] '${filename}' 전사가 완료되었습니다. (노트 임베드 미연결)`, 7000);
			return;
		}

		const target = targets[0];
		const formattedMarkdown = formatResultMarkdown(result, { includeTimestamps: true });

		if (this.vaultSettings.transcriptionInsertMode === "auto") {
			try {
				let choice: ExistingResultChoice = "append";
				const current = await this.app.vault.read(target.note);
				if (hasExistingResult(current, item.filePath)) {
					choice = "append";
				}
				await this.app.vault.process(target.note, (content) =>
					applyAudioEmbedInsertion(content, {
						audioPath: item.filePath,
						markdown: formattedMarkdown,
						embed: this.toAudioEmbedPosition(target.embed),
						existing: choice,
					}),
				);
				new Notice(`[On the Record] '${filename}' 전사 결과가 노트(${target.note.path})에 자동 삽입되었습니다.`, 6000);

				if (this.vaultSettings.enableLocalLlm && this.vaultSettings.localLlmAutoSummarize) {
					void this.generateAndAppendSummary(target.note);
				}
			} catch (error) {
				this.reportError(`전사 결과 자동 삽입에 실패했습니다: ${item.filePath}`, error);
			}
		} else {
			new Notice(`[On the Record] '${filename}' 전사가 완료되었습니다. 결과를 검토하고 노트에 삽입하세요.`, 10000);
		}
	}

	async generateAndAppendSummary(note: TFile): Promise<void> {
		if (!this.vaultSettings.enableLocalLlm) {
			new Notice("로컬 LLM 요약 기능이 꺼져 있습니다. 설정 화면에서 활성화하세요.");
			return;
		}

		try {
			const content = await this.app.vault.read(note);
			const transcriptText = extractTranscriptFromMarkdown(content);
			if (!transcriptText || transcriptText.trim().length === 0) {
				new Notice(`[On the Record] '${note.basename}' 노트에서 요약할 전사문을 찾을 수 없습니다.`);
				return;
			}

			new Notice(`[On the Record] '${note.basename}' 로컬 AI 요약 생성을 시작합니다... (${this.vaultSettings.localLlmModel})`, 5000);

			const summary = await generateMeetingSummary({
				endpoint: this.vaultSettings.localLlmEndpoint,
				model: this.vaultSettings.localLlmModel,
				transcript: transcriptText,
			});

			const summaryBlock = formatMeetingSummaryBlock(summary, this.vaultSettings.localLlmModel);
			await this.app.vault.process(note, (c) => c + summaryBlock);
			new Notice(`[On the Record] '${note.basename}' 로컬 AI 회의 요약이 노트 하단에 추가되었습니다!`, 7000);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			new Notice(`[On the Record] 로컬 AI 요약 생성 실패: ${msg}`, 8000);
		}
	}

	private async handleMarkdownNoteCreated(file: TFile): Promise<void> {
		if (file.extension.toLowerCase() !== "md") return;

		if (this.vaultSettings.autoRecordFolder) {
			const folder = this.vaultSettings.autoRecordFolder.replace(/^\/+|\/+$/g, "");
			if (folder && !file.path.startsWith(`${folder}/`)) return;
		}

		if (this.vaultSettings.autoRecordTemplatePath && this.vaultSettings.autoRecordTemplatePath.trim().length > 0) {
			const templatePath = this.vaultSettings.autoRecordTemplatePath.trim();
			const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
			if (templateFile instanceof TFile) {
				try {
					const [templateContent, noteContent] = await Promise.all([
						this.app.vault.read(templateFile),
						this.app.vault.read(file),
					]);
					if (!isContentMatchingTemplate(noteContent, templateContent)) {
						return;
					}
				} catch {
					// 읽기 실패 시 통과
				}
			}
		}

		let frontmatterRecorder: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter?.recorder;
		if (frontmatterRecorder === undefined) {
			try {
				const content = await this.app.vault.cachedRead(file);
				const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
				if (match) {
					const lines = match[1].split(/\r?\n/);
					for (const line of lines) {
						const parts = line.split(":");
						if (parts[0]?.trim() === "recorder" && parts[1]) {
							frontmatterRecorder = parts[1].trim();
							break;
						}
					}
				}
			} catch {
				// ignore
			}
		}

		const mode = resolveRecordStartMode(frontmatterRecorder, this.vaultSettings.recordStartMode);
		if (mode === "manual") return;

		const showNotice = resolveRecordStartNotice(frontmatterRecorder, this.vaultSettings.recordStartNotification);
		const existingEmbeds = this.app.metadataCache.getFileCache(file)?.embeds?.length ?? 0;
		const seq = calculateNextRecordingSeq(existingEmbeds);

		const session = await this.sessionManager.startSession({
			notePath: file.path,
			seq,
			mode,
			showNotice,
			onNotice: (msg) => new Notice(msg, 4000),
		});
		if (session) {
			this.recordingStatusBar.start(session);
		}
	}

	async activateSidebarView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(OTR_SIDEBAR_VIEW_TYPE)[0];
		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({
					type: OTR_SIDEBAR_VIEW_TYPE,
					active: true,
				});
				leaf = rightLeaf;
			}
		}
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	refreshSidebarViews(): void {
		const leaves = this.app.workspace.getLeavesOfType(OTR_SIDEBAR_VIEW_TYPE);
		for (const leaf of leaves) {
			if (leaf.view instanceof OnTheRecordSidebarView) {
				void leaf.view.refresh();
			}
		}
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

		const resolvedNotePaths: string[] = result.status === "linked" ? [...result.notePaths] : [];
		const recentSession = this.sessionManager.getActiveSession() ?? this.tabCloseHandler.getRecentlyStoppedSession();
		if (recentSession) {
			await this.tabCloseHandler.attachAudioToNote(recentSession.notePath, file.path, {
				seq: recentSession.seq,
				startedAt: recentSession.startedAt,
				endedAt: Date.now(),
				sizeBytes: size ?? file.stat.size,
			});
			if (!resolvedNotePaths.includes(recentSession.notePath)) {
				resolvedNotePaths.push(recentSession.notePath);
			}
		} else if (result.status === "timeout") {
			new Notice("녹음 노트의 오디오 링크를 확인하지 못했습니다. 파일 찾기 기능을 사용하세요.");
			return;
		}

		if (result.status !== "linked" && resolvedNotePaths.length === 0) return;

		const added = this.recordingQueue.enqueue({
			filePath: file.path,
			notePaths: resolvedNotePaths,
			size: size ?? file.stat.size,
			queuedAt: Date.now(),
			status: "queued",
		});
		if (!added) return;

		this.logQueueState();
		new Notice("녹음 파일을 백그라운드 전사 대기열에 추가했습니다.");
		this.queueWorker.trigger();
	}

	private async previewAndInsertResult(result: TranscriptionResult, audioPath: string, target: AudioEmbedTarget): Promise<void> {
		const targetName = `${target.note.path} · ${target.embed.position.start.line + 1}행`;
		const approved = await new ResultPreviewModal(this.app, result, targetName).prompt();
		if (!approved) {
			new Notice("취소했습니다. 노트는 수정되지 않았습니다.");
			return;
		}

		try {
			let choice: ExistingResultChoice | null = "append";
			const current = await this.app.vault.read(target.note);
			if (hasExistingResult(current, audioPath)) {
				choice = await new ExistingResultModal(this.app).prompt();
				if (!choice) {
					new Notice("취소했습니다. 노트는 수정되지 않았습니다.");
					return;
				}
			}
			const selectedChoice = choice;
			await this.app.vault.process(target.note, (content) =>
				applyAudioEmbedInsertion(content, {
					audioPath,
					markdown: approved.markdown,
					embed: this.toAudioEmbedPosition(target.embed),
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

	private openCpuRuntimeTestPicker(): void {
		if (!this.localSettings?.runtimePath || !this.localSettings.modelPath || !this.localSettings.ffmpegPath) {
			new Notice("설정에서 런타임·모델·ffmpeg 경로를 먼저 지정하세요.");
			return;
		}

		const picker = new AudioFilePickerModal(
			this.app,
			(file) => {
				void this.runCpuRuntimeSmokeTest(file);
			},
			WHISPER_CPP_CPU_AUDIO_EXTENSIONS,
		);
		if (picker.getItems().length === 0) {
			new Notice("시험 추론에는 m4a, mp3, wav, aac, ogg 또는 flac 오디오 파일이 필요합니다.");
			return;
		}
		picker.open();
	}

	private openSamplePreviewPicker(): void {
		this.openCurrentNoteAudioPicker(AUDIO_EXTENSIONS, (target) => {
			void this.previewAndInsertResult(SAMPLE_RESULT, target.audioFile.path, target);
		});
	}

	private openCpuTranscriptionPicker(): void {
		if (!this.localSettings?.runtimePath || !this.localSettings.modelPath || !this.localSettings.ffmpegPath) {
			new Notice("설정에서 런타임·모델·ffmpeg 경로를 먼저 지정하세요.");
			return;
		}
		this.openCurrentNoteAudioPicker(WHISPER_CPP_CPU_AUDIO_EXTENSIONS, (target) => {
			void this.transcribeAndPreview(target.audioFile, target);
		});
	}

	private openCurrentNoteAudioPicker(
		supportedExtensions: readonly string[],
		onChoose: (target: AudioEmbedTarget) => void,
	): void {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const note = view?.file;
		if (!view || !note) {
			new Notice("녹음 embed가 있는 Markdown 노트를 먼저 여세요.");
			return;
		}
		const embeds = this.app.metadataCache.getFileCache(note)?.embeds ?? [];
		const supported = new Set(supportedExtensions);
		const targets = embeds.flatMap((embed) => {
			const destination = this.app.metadataCache.getFirstLinkpathDest(getLinkpath(embed.link), note.path);
			if (!(destination instanceof TFile) || !supported.has(destination.extension.toLowerCase())) return [];
			return [{ note, embed, audioFile: destination }];
		});
		if (targets.length === 0) {
			new Notice("현재 노트에 지원되는 녹음 embed가 없습니다.");
			return;
		}
		const orderedTargets = prioritizeAudioEmbeds(
			targets.map((target) => ({ target, position: target.embed.position })),
			view.editor.getCursor(),
		).map(({ target }) => target);
		new AudioEmbedTargetPickerModal(this.app, orderedTargets, onChoose).open();
	}

	private async transcribeAndPreview(file: TFile, target: AudioEmbedTarget): Promise<void> {
		const settings = this.localSettings;
		if (!settings) {
			new Notice(this.localSettingsError ?? "PC별 런타임 설정을 불러올 수 없습니다.");
			return;
		}
		const adapter = this.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) {
			new Notice("로컬 파일 경로를 제공하지 않는 vault에서는 전사할 수 없습니다.");
			return;
		}

		const progress = new CpuRuntimeTestProgressModal(this.app);
		progress.open();
		let result: TranscriptionResult;
		try {
			result = await new WhisperCppCpuRuntime().transcribe(
				settings.runtimePath,
				settings.modelPath,
				settings.ffmpegPath,
				adapter.getFullPath(file.path),
				this.vaultSettings.language,
				(stage, percent) => progress.setStage(stage, percent),
			);
		} catch (error) {
			this.reportError("CPU 전사에 실패했습니다.", error);
			const message = error instanceof Error ? error.message : "원인을 확인할 수 없는 오류입니다.";
			progress.showFailed(message);
			return;
		}
		progress.close();
		await this.previewAndInsertResult(result, file.path, target);
	}

	private openTranscriptSearch(): void {
		new TranscriptSearchModal(
			this.app,
			this.vaultSettings.transcriptSearchTerms,
			(query) => {
				void this.searchTranscripts(query);
			},
		).open();
	}

	private async searchTranscripts(query: string): Promise<void> {
		try {
			const matches: TranscriptSearchMatch[] = [];
			for (const file of this.app.vault.getMarkdownFiles()) {
				const content = await this.app.vault.cachedRead(file);
				matches.push(...findTranscriptMatches(file.path, content, query));
			}
			new TranscriptSearchResultsModal(
				this.app,
				query,
				matches,
				(match) => {
					void openTranscriptMatch(this.app, match).catch((error: unknown) => {
						this.reportError("검색 결과 위치를 열지 못했습니다.", error);
					});
				},
			).open();
		} catch (error) {
			this.reportError("전사문을 검색하지 못했습니다.", error);
		}
	}

	private async runCpuRuntimeSmokeTest(file: TFile): Promise<void> {
		const settings = this.localSettings;
		if (!settings) {
			new Notice(this.localSettingsError ?? "PC별 런타임 설정을 불러올 수 없습니다.");
			return;
		}

		const progress = new CpuRuntimeTestProgressModal(this.app);
		progress.open();
		try {
			const adapter = this.app.vault.adapter;
			if (!(adapter instanceof FileSystemAdapter)) {
				throw new Error("로컬 파일 경로를 제공하지 않는 Vault에서는 시험 추론을 실행할 수 없습니다.");
			}
			const verification = await new WhisperCppCpuRuntime().smokeTest(
				settings.runtimePath,
				settings.modelPath,
				settings.ffmpegPath,
				adapter.getFullPath(file.path),
				this.vaultSettings.language,
				(stage, percent) => progress.setStage(stage, percent),
			);
			const report = [
				`런타임: ${verification.runtimeVersion}`,
				`런타임 SHA-256: ${verification.runtimeSha256}`,
				`모델: ${verification.modelId} (${verification.modelQuantization})`,
				`모델 SHA-256: ${verification.modelSha256}`,
				"시험 추론 성공. 정규화 오디오와 전사 결과는 임시 폴더에서 삭제했습니다.",
			].join("\n");
			progress.showCompleted();
			progress.contentEl.createEl("pre", { cls: "otr-cpu-runtime-report", text: report });
		} catch (error) {
			this.reportError("CPU 런타임 검증 또는 시험 추론에 실패했습니다.", error);
			const message = error instanceof Error ? error.message : "원인을 확인할 수 없는 오류입니다.";
			progress.showFailed(message);
		}
	}

	private async discoverCpuSetup(): Promise<void> {
		if (this.cpuDiscoveryInProgress) return;
		if (!this.localSettings) {
			new Notice(this.localSettingsError ?? "PC별 설정을 불러올 수 없습니다.");
			return;
		}

		this.cpuDiscoveryInProgress = true;
		const progress = new CpuRuntimeDiscoveryProgressModal(this.app);
		progress.open();
		try {
			const candidates = await scanCpuToolCandidates(getCpuToolSearchRoots({
				userProfile: process.env.USERPROFILE,
				localAppData: process.env.LOCALAPPDATA,
				programFiles: process.env.ProgramFiles,
				programFilesX86: process.env["ProgramFiles(x86)"],
				programData: process.env.ProgramData,
			}));
			const runtime = new WhisperCppCpuRuntime();
			const verifiedRuntimes: Array<{ path: string; identity: WhisperCppRuntimeIdentity }> = [];
			const verifiedModels: Array<{ path: string; identity: WhisperCppModelIdentity }> = [];
			const rejections: string[] = [];

			for (const runtimePath of candidates.runtimePaths) {
				progress.setMessage(`런타임 검증 중: ${runtimePath}`);
				try {
					const identity = await runtime.identifyRuntime(runtimePath, (_stage, percent) => {
						if (percent !== undefined) progress.setMessage(`런타임 SHA-256 확인 중 (${percent}%): ${runtimePath}`);
					});
					verifiedRuntimes.push({ path: runtimePath, identity });
				} catch (error) {
					rejections.push(`${runtimePath}: ${errorMessage(error)}`);
				}
			}

			for (const modelPath of candidates.modelPaths) {
				progress.setMessage(`모델 SHA-256 확인 중: ${modelPath}`);
				try {
					const identity = await runtime.identifyModel(modelPath, (_stage, percent) => {
						if (percent !== undefined) progress.setMessage(`모델 SHA-256 확인 중 (${percent}%): ${modelPath}`);
					});
					verifiedModels.push({ path: modelPath, identity });
				} catch (error) {
					rejections.push(`${modelPath}: ${errorMessage(error)}`);
				}
			}

			const pairs: VerifiedCpuToolPair[] = [];
			for (const verifiedRuntime of verifiedRuntimes) {
				for (const verifiedModel of verifiedModels) {
					if (pairs.length >= 25) break;
					pairs.push({
						runtimePath: verifiedRuntime.path,
						modelPath: verifiedModel.path,
						verification: { ...verifiedRuntime.identity, ...verifiedModel.identity },
					});
				}
				if (pairs.length >= 25) break;
			}
			const pairsTruncated = verifiedRuntimes.length * verifiedModels.length > pairs.length;
			const report: CpuToolDiscoveryReport = {
				runtimeCandidateCount: candidates.runtimePaths.length,
				modelCandidateCount: candidates.modelPaths.length,
				pairs,
				pairsTruncated,
				warnings: candidates.warnings,
				rejections: rejections.slice(0, 5),
				rejectionCount: rejections.length,
			};
			progress.close();
			new CpuRuntimeDiscoveryResultsModal(
				this.app,
				report,
				(pair) => void this.applyDiscoveredCpuSetup(pair),
			).open();
		} catch (error) {
			progress.close();
			this.reportError("CPU 런타임과 모델을 검색하지 못했습니다.", error);
		} finally {
			this.cpuDiscoveryInProgress = false;
		}
	}

	private async applyDiscoveredCpuSetup(pair: VerifiedCpuToolPair): Promise<void> {
		try {
			const saved = await this.updateLocalSettings({
				runtimePath: pair.runtimePath,
				modelPath: pair.modelPath,
			});
			if (!saved) return;
			new Notice(`검증된 ${pair.verification.modelId} 모델과 런타임 경로를 설정에 적용했습니다.`);
		} catch (error) {
			this.reportError("검색한 CPU 도구 경로를 설정에 적용하지 못했습니다.", error);
		}
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
			new Notice("선택한 오디오 파일을 백그라운드 전사 대기열에 추가했습니다.");
			this.queueWorker.trigger();
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
		return [...new Set(this.findAudioEmbedTargets(filePath).map((target) => target.note.path))];
	}

	private findAudioEmbedTargets(filePath: string): AudioEmbedTarget[] {
		const targets: AudioEmbedTarget[] = [];
		for (const note of this.app.vault.getMarkdownFiles()) {
			const embeds = this.app.metadataCache.getFileCache(note)?.embeds ?? [];
			for (const embed of embeds) {
				const destination = this.app.metadataCache.getFirstLinkpathDest(
					getLinkpath(embed.link),
					note.path,
				);
				if (destination instanceof TFile && destination.path === filePath) {
					targets.push({ note, embed, audioFile: destination });
				}
			}
		}
		return targets;
	}

	private toAudioEmbedPosition(embed: EmbedCache): AudioEmbedPosition {
		return {
			start: { line: embed.position.start.line, ch: embed.position.start.col },
			end: { line: embed.position.end.line, ch: embed.position.end.col },
			link: embed.link,
		};
	}

	private removeQueuedRecording(filePath: string): void {
		if (this.recordingQueue.remove(filePath)) this.logQueueState();
	}

	private logQueueState(): void {
		console.debug(`[on-the-record] 전사 대기열 항목: ${this.recordingQueue.list().length}`);
	}

	private async updateLocalSettings(patch: Partial<LocalSettings>): Promise<boolean> {
		if (!this.localSettingsStore || !this.localSettings) {
			new Notice(this.localSettingsError ?? "PC별 설정을 저장할 수 없습니다.");
			return false;
		}
		const store = this.localSettingsStore;
		let saved = false;
		const save = this.localSaveQueue.then(async () => {
			this.localSettings = await store.update(patch);
			saved = true;
		});
		this.localSaveQueue = save.catch((error: unknown) => {
			this.reportError("PC별 설정을 저장하지 못했습니다.", error);
		});
		await this.localSaveQueue;
		return saved;
	}

	async recalculateCurrentNoteRecordings(file: TFile): Promise<void> {
		try {
			let resultSummary: { count: number; totalSeconds: number; totalSizeMb: number } | null = null;
			await this.app.vault.process(file, (data) => {
				const res = recalculateFrontmatterRecordings(data, (audioPath) => {
					const cleanPath = audioPath.replace(/^!\[\[|\]\]$/g, "").replace(/^\[\[|\]\]$/g, "");
					const dest = this.app.metadataCache.getFirstLinkpathDest(getLinkpath(cleanPath), file.path);
					if (dest) {
						return {
							sizeBytes: dest.stat.size,
							mtime: dest.stat.mtime,
						};
					}
					return undefined;
				});
				resultSummary = {
					count: res.count,
					totalSeconds: res.totalSeconds,
					totalSizeMb: res.totalSizeMb,
				};
				return res.updatedMarkdown;
			});

			const summary = resultSummary as { count: number; totalSeconds: number; totalSizeMb: number } | null;
			if (summary) {
				if (summary.count > 0) {
					const min = Math.floor(summary.totalSeconds / 60);
					const sec = summary.totalSeconds % 60;
					new Notice(
						`[On the Record] 녹음 정보 재계산 완료\n총 ${summary.count}개 녹음 (소요: ${min}분 ${sec}초 · ${summary.totalSizeMb} MB)`,
						5000,
					);
				} else {
					new Notice("[On the Record] 이 노트에서 녹음 정보를 찾을 수 없습니다.", 4000);
				}
			}
		} catch (err) {
			this.reportError("녹음 정보 재계산 중 오류가 발생했습니다.", err);
		}
	}

	async openOrphanAudioModal(): Promise<void> {
		try {
			const files = this.app.vault.getFiles();
			const audioFiles: OrphanAudioFileInfo[] = [];
			for (const file of files) {
				if (SUPPORTED_AUDIO_EXTENSIONS.has(file.extension.toLowerCase())) {
					audioFiles.push({
						path: file.path,
						name: file.name,
						sizeBytes: file.stat.size,
						mtime: file.stat.mtime,
					});
				}
			}

			const linkedPaths = collectAllLinkedAudioPaths(this.app);
			const orphans = findOrphanAudioFiles(audioFiles, linkedPaths);

			const modal = new OrphanAudioModal(this.app, orphans, async (orphan, targetNote) => {
				await this.app.vault.process(targetNote, (data) => {
					const existingCount = parseAudioEmbedsFromMarkdown(data).length;
					const nextSeq = calculateNextRecordingSeq(existingCount);
					return applyRecordingSessionToMarkdown(data, {
						audioPath: orphan.path,
						seq: nextSeq,
						sizeBytes: orphan.sizeBytes,
						startedAt: orphan.mtime,
						endedAt: orphan.mtime,
					});
				});
			});
			modal.open();
		} catch (err) {
			this.reportError("고아 녹음 파일 점검 중 오류가 발생했습니다.", err);
		}
	}

	private reportError(message: string, error: unknown): void {
		console.error(`[on-the-record] ${message}`, error);
		const detail = error instanceof Error ? error.message : String(error);
		new Notice(`${message}\n${detail}`, 10_000);
	}
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
