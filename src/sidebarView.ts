import { ItemView, MarkdownView, Notice, TFile, setIcon } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { OTR_SIDEBAR_VIEW_TYPE } from "./sidebarTypes.ts";
import { parseAudioEmbedsFromMarkdown, jumpToLineInActiveEditor } from "./noteAudioExplorer.ts";
import type { AudioEmbedItem } from "./noteAudioExplorer.ts";
import type { WorkerProgress } from "./transcriptionQueueWorker.ts";
import type { QueuedRecording } from "./recordingQueue.ts";
import { isSupportedAudioExtension } from "./audioFiles.ts";

export { OTR_SIDEBAR_VIEW_TYPE };

export interface SidebarControllerCallbacks {
	isRecording: () => boolean;
	getActiveSessionNotePath: () => string | null;
	startRecording: (note: TFile) => Promise<void>;
	pauseRecording: () => Promise<void>;
	resumeRecording: () => Promise<void>;
	stopRecording: () => Promise<void>;
	createNewMeetingNote: () => Promise<TFile | null>;
	enqueueAudioTranscription: (audioPath: string) => Promise<void>;
	openAudioPicker?: () => void;
	generateSummary: (note: TFile) => Promise<void>;
	openNoteInMainArea?: (note: TFile) => Promise<void>;
	openSettings?: () => void;
	isToolsConfigured?: () => boolean;
	cancelTranscription?: () => void;
	getPendingQueueCount?: () => number;
	getQueueItems?: () => QueuedRecording[];
}

export class OnTheRecordSidebarView extends ItemView {
	private callbacks: SidebarControllerCallbacks;
	private activeNote: TFile | null = null;
	private audioItems: AudioEmbedItem[] = [];
	private playerState: "idle" | "recording" | "paused" = "idle";
	private recordingStartedAt: number | null = null;
	private accumulatedSeconds = 0;
	private timerHandle: number | null = null;
	private currentProgress: WorkerProgress | null = null;
	private currentQueueCount = 0;

	// DOM Elements
	private activeNoteContainerEl!: HTMLElement;
	private activeNoteNameEl!: HTMLElement;
	private noteActionBarEl!: HTMLElement;
	private setupAlertEl!: HTMLElement;
	private queueWidgetEl!: HTMLElement;
	private audioListContainerEl!: HTMLElement;
	private audioCountBadgeEl!: HTMLElement;

	constructor(leaf: WorkspaceLeaf, callbacks: SidebarControllerCallbacks) {
		super(leaf);
		this.callbacks = callbacks;
	}

	getViewType(): string {
		return OTR_SIDEBAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "On the Record";
	}

	getIcon(): string {
		return "otr-record-deck";
	}

	async onOpen(): Promise<void> {
		const container = this.contentEl;
		container.empty();
		container.addClass("otr-sidebar-container");

		// 1. 마이크로 브랜딩 헤더 + 새로고침/설정 버튼
		const headerEl = container.createDiv({ cls: "otr-sidebar-header" });
		const titleGroup = headerEl.createDiv({ cls: "otr-sidebar-title-group" });
		const titleIcon = titleGroup.createSpan({ cls: "otr-brand-icon-box" });
		setIcon(titleIcon, "otr-record-deck");
		const titleStack = titleGroup.createDiv({ cls: "otr-sidebar-title-stack" });
		titleStack.createSpan({ text: "On the Record" });
		titleStack.createSpan({ text: "음성 녹음 및 로컬 전사", cls: "otr-sidebar-subtitle" });

		const headerActions = headerEl.createDiv({ cls: "otr-sidebar-header-actions" });
		const refreshBtn = headerActions.createEl("button", { cls: "otr-icon-btn", title: "새로고침" });
		setIcon(refreshBtn, "refresh-cw");
		refreshBtn.onclick = () => void this.refresh();

		// 2. 도구 미설정 복구 배너 (필요 시에만 노출)
		this.setupAlertEl = container.createDiv({ cls: "otr-setup-alert is-hidden" });

		// 3. Ultra-minimal compact target note & record bar
		const contextCard = container.createDiv({ cls: "otr-context-card" });
		const contextHeader = contextCard.createDiv({ cls: "otr-context-header-row" });
		contextHeader.createSpan({ cls: "otr-context-label", text: "대상 노트" });

		const newNoteLink = contextHeader.createEl("button", { text: "+ 새 회의록", cls: "otr-link-btn" });
		newNoteLink.onclick = async () => {
			const newFile = await this.callbacks.createNewMeetingNote();
			if (newFile) {
				this.activeNote = newFile;
				await this.refresh();
			}
		};

		const noteBodyRow = contextCard.createDiv({ cls: "otr-compact-note-row" });
		this.activeNoteContainerEl = noteBodyRow.createDiv({ cls: "otr-context-filebox" });
		this.activeNoteContainerEl.onclick = async () => {
			if (this.activeNote && this.callbacks.openNoteInMainArea) {
				await this.callbacks.openNoteInMainArea(this.activeNote);
			}
		};
		const noteIcon = this.activeNoteContainerEl.createSpan({ cls: "otr-inline-icon" });
		setIcon(noteIcon, "file-text");
		this.activeNoteNameEl = this.activeNoteContainerEl.createSpan({ text: "선택된 노트 없음", cls: "otr-context-filename" });
		this.noteActionBarEl = noteBodyRow.createDiv({ cls: "otr-compact-record-actions" });

		// 4. 실시간 백그라운드 전사 큐 진행률 위젯 (진행 중일 때만 노출)
		this.queueWidgetEl = container.createDiv({ cls: "otr-queue-widget is-hidden" });

		// 5. 본문 오디오 임베드 목록 섹션
		const explorerSection = container.createDiv({ cls: "otr-explorer-section" });
		const explorerHeader = explorerSection.createDiv({ cls: "otr-explorer-header" });
		const explorerTitle = explorerHeader.createDiv({ cls: "otr-explorer-title" });
		explorerTitle.createSpan({ text: "노트 내 녹음 파일" });
		this.audioCountBadgeEl = explorerTitle.createSpan({ cls: "otr-pill-count", text: "0" });

		explorerHeader.createSpan({ text: "녹음 목록", cls: "otr-explorer-subtext" });

		this.audioListContainerEl = explorerSection.createDiv({ cls: "otr-audio-list" });

		await this.refresh();
	}

	async onClose(): Promise<void> {
		// 사이드바 타이머 등 별도 리소스 없음
	}

	setRecordingState(state: "idle" | "recording" | "paused"): void {
		this.playerState = state;
		this.renderCompactControls();
	}

	setTranscriptionProgress(progress: WorkerProgress | null, queueCount: number): void {
		this.currentProgress = progress;
		this.currentQueueCount = queueCount;
		this.renderQueueWidget();
		this.renderAudioList();
	}

	private renderSetupAlert(): void {
		if (!this.setupAlertEl) return;
		const configured = this.callbacks.isToolsConfigured ? this.callbacks.isToolsConfigured() : true;
		if (configured) {
			this.setupAlertEl.addClass("is-hidden");
			this.setupAlertEl.empty();
			return;
		}

		this.setupAlertEl.removeClass("is-hidden");
		this.setupAlertEl.empty();

		const msg = this.setupAlertEl.createSpan({ text: "전사 도구 경로가 설정되지 않았습니다." });
		msg.addClass("otr-setup-alert-msg");

		if (this.callbacks.openSettings) {
			const openBtn = this.setupAlertEl.createEl("button", {
				text: "설정 열기",
				cls: "otr-action-badge-btn",
			});
			openBtn.onclick = () => this.callbacks.openSettings?.();
		}
	}

	private renderCompactControls(): void {
		if (!this.noteActionBarEl) return;
		this.noteActionBarEl.empty();

		if (this.playerState === "idle") {
			const recBtn = this.noteActionBarEl.createEl("button", {
				cls: "otr-compact-rec-btn",
				title: this.activeNote ? "현재 노트에서 녹음 시작" : "새 회의록을 열고 녹음 시작",
			});
			const dot = recBtn.createSpan({ cls: "otr-compact-rec-dot" });
			dot.setAttribute("aria-hidden", "true");
			recBtn.createSpan({ text: "녹음 시작" });
			recBtn.onclick = async () => {
				let noteToRecord = this.activeNote;
				if (!noteToRecord) {
					// 활성 대상 노트가 없으면 새 회의록을 템플릿과 함께 생성하여 에디터에 열고 녹음 시작
					noteToRecord = await this.callbacks.createNewMeetingNote();
					if (noteToRecord) {
						this.activeNote = noteToRecord;
						await this.refresh();
					}
				} else {
					// 기존 활성 노트가 에디터에 열려있지 않은 경우 에디터에서 열고 포커스
					const activeEditorFile = this.app.workspace.getActiveFile();
					if (activeEditorFile?.path !== noteToRecord.path) {
						let leaf = this.app.workspace.getLeaf(false);
						if (leaf.getRoot() !== this.app.workspace.rootSplit) {
							leaf = this.app.workspace.getLeaf(true);
						}
						await leaf.openFile(noteToRecord);
						this.app.workspace.setActiveLeaf(leaf, { focus: true });
					}
				}
				if (noteToRecord) {
					await this.callbacks.startRecording(noteToRecord);
				}
			};
		} else {
			const activeBtn = this.noteActionBarEl.createEl("button", {
				cls: "otr-compact-rec-btn is-recording",
				title: "녹음 중지 및 노트 본문 삽입",
			});
			const dot = activeBtn.createSpan({ cls: "otr-compact-rec-dot pulse" });
			dot.setAttribute("aria-hidden", "true");
			activeBtn.createSpan({ text: this.playerState === "paused" ? "일시정지" : "녹음 중지" });
			activeBtn.onclick = async () => {
				await this.callbacks.stopRecording();
				if (this.activeNote && this.callbacks.openNoteInMainArea) {
					await this.callbacks.openNoteInMainArea(this.activeNote);
				}
				await this.refresh();
			};
		}
	}

	private renderQueueWidget(): void {
		if (!this.queueWidgetEl) return;

		if (!this.currentProgress && this.currentQueueCount === 0) {
			this.queueWidgetEl.addClass("is-hidden");
			this.queueWidgetEl.empty();
			return;
		}

		this.queueWidgetEl.removeClass("is-hidden");
		this.queueWidgetEl.empty();

		const topRow = this.queueWidgetEl.createDiv({ cls: "otr-queue-top-row" });
		let statusText = "음성 전사 진행 중";
		if (this.currentQueueCount > 1) {
			statusText = `음성 전사 진행 중 (후속 ${this.currentQueueCount - 1}건 대기)`;
		} else if (this.currentProgress?.stage) {
			const stageLabels: Record<string, string> = {
				starting: "전사 엔진 준비 중...",
				"checking-audio": "오디오 파일 확인 중...",
				"normalizing-audio": "오디오 변환 중 (FFmpeg)...",
				"hashing-runtime": "런타임 확인 중...",
				"hashing-model": "모델 확인 중...",
				transcribing: "AI 음성 전사 진행 중...",
			};
			statusText = stageLabels[this.currentProgress.stage] ?? "AI 음성 전사 진행 중...";
		}

		const leftGroup = topRow.createDiv({ cls: "otr-queue-label-group" });
		leftGroup.createSpan({ cls: "otr-queue-dot" });
		leftGroup.createSpan({ text: statusText, cls: "otr-queue-status-text" });

		if (this.callbacks.cancelTranscription) {
			const cancelBtn = topRow.createEl("button", {
				cls: "otr-icon-btn",
				title: "현재 전사 작업 취소",
			});
			setIcon(cancelBtn, "x");
			cancelBtn.onclick = () => this.callbacks.cancelTranscription?.();
		}

		if (this.currentProgress) {
			const fileName = this.currentProgress.item.filePath.split("/").pop() ?? this.currentProgress.item.filePath;
			const rawPercent = this.currentProgress.percent;
			const isDeterminate = typeof rawPercent === "number" && rawPercent > 0;
			const percent = isDeterminate ? Math.round(rawPercent) : 0;

			const fileRow = this.queueWidgetEl.createDiv({ cls: "otr-queue-file-row" });
			fileRow.createSpan({ text: fileName, cls: "otr-queue-filename" });
			fileRow.createSpan({ text: isDeterminate ? `${percent}%` : "처리 중...", cls: "otr-queue-percent" });

			const barTrack = this.queueWidgetEl.createDiv({ cls: "otr-queue-progress-track" });
			const barFill = barTrack.createDiv({
				cls: `otr-queue-progress-fill ${!isDeterminate ? "is-indeterminate" : ""}`,
			});
			barFill.setCssProps({ width: `${isDeterminate ? Math.min(100, Math.max(0, percent)) : 40}%` });
		}
	}

	async refresh(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile && activeFile.extension.toLowerCase() === "md") {
			this.activeNote = activeFile;
			if (this.activeNoteNameEl) {
				this.activeNoteNameEl.setText(activeFile.name);
				this.activeNoteNameEl.removeClass("is-empty");
			}

			try {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				let content: string;
				if (activeView && activeView.file?.path === activeFile.path) {
					content = activeView.editor.getValue();
				} else {
					content = await this.app.vault.read(activeFile);
				}
				this.audioItems = parseAudioEmbedsFromMarkdown(content);
			} catch {
				this.audioItems = [];
			}
		} else if (activeFile && isSupportedAudioExtension(activeFile.extension)) {
			// 활성 탭이 오디오 파일인 경우 즉시 인식
			this.activeNote = null;
			if (this.activeNoteNameEl) {
				this.activeNoteNameEl.setText(`[오디오] ${activeFile.name}`);
				this.activeNoteNameEl.removeClass("is-empty");
			}
			this.audioItems = [
				{
					audioPath: activeFile.path,
					filename: activeFile.name,
					lineNumber: 1,
					rawLineText: `![[${activeFile.name}]]`,
					transcribed: false,
				},
			];
		} else {
			const recordingNotePath = this.callbacks.getActiveSessionNotePath();
			if (recordingNotePath) {
				const file = this.app.vault.getAbstractFileByPath(recordingNotePath);
				if (file instanceof TFile) {
					this.activeNote = file;
					if (this.activeNoteNameEl) {
						this.activeNoteNameEl.setText(file.name);
						this.activeNoteNameEl.removeClass("is-empty");
					}
				}
			} else {
				this.activeNote = null;
				if (this.activeNoteNameEl) {
					this.activeNoteNameEl.setText("선택된 회의록 없음");
					this.activeNoteNameEl.addClass("is-empty");
				}
				this.audioItems = [];
			}
		}

		if (this.callbacks.isRecording()) {
			if (this.playerState !== "recording" && this.playerState !== "paused") {
				this.playerState = "recording";
			}
		} else if (this.playerState !== "paused") {
			this.playerState = "idle";
		}

		if (this.callbacks.getPendingQueueCount) {
			this.currentQueueCount = this.callbacks.getPendingQueueCount();
		}

		this.renderSetupAlert();
		this.renderCompactControls();
		this.renderQueueWidget();
		this.renderAudioList();
	}

	private renderAudioList(): void {
		if (!this.audioListContainerEl) return;
		this.audioListContainerEl.empty();

		if (this.audioCountBadgeEl) {
			this.audioCountBadgeEl.setText(`${this.audioItems.length}`);
		}

		if (this.audioItems.length === 0) {
			const emptyEl = this.audioListContainerEl.createDiv({ cls: "otr-audio-empty" });
			emptyEl.setText(this.activeNote ? "노트에 삽입된 녹음 파일이 없습니다." : "회의록을 열거나 '+ 새 회의록'을 눌러 시작하세요.");
			return;
		}

		const queueItems = this.callbacks.getQueueItems ? this.callbacks.getQueueItems() : [];

		for (const item of this.audioItems) {
			const row = this.audioListContainerEl.createDiv({ cls: "otr-ag-row" });
			row.title = `${item.audioPath} (${item.lineNumber}행) - 클릭 시 본문 이동`;
			row.onclick = () => {
				jumpToLineInActiveEditor(this.app, item.lineNumber);
			};

			const linkedFile = this.activeNote
				? this.app.metadataCache.getFirstLinkpathDest(item.audioPath, this.activeNote.path)
				: this.app.vault.getAbstractFileByPath(item.audioPath);
			const resolvedPath = linkedFile instanceof TFile ? linkedFile.path : item.audioPath;

			const queueItem = queueItems.find(
				(q) =>
					q.filePath === item.audioPath ||
					q.filePath === resolvedPath ||
					q.filePath.endsWith("/" + item.filename) ||
					item.audioPath.endsWith("/" + q.filePath) ||
					q.filePath === item.filename,
			);
			const isProcessing = queueItem?.status === "processing";
			const isQueued = queueItem?.status === "queued";

			// 1. 좌측 메인 영역: 아이콘 + 파일명 + 메타(용량 및 라인번호)
			const mainGroup = row.createDiv({ cls: "otr-ag-row-main" });
			const iconClass = item.transcribed
				? "is-done"
				: isProcessing
					? "is-processing"
					: isQueued
						? "is-queued"
						: "is-pending";
			const iconEl = mainGroup.createSpan({ cls: `otr-ag-icon ${iconClass}` });
			setIcon(iconEl, item.transcribed ? "headphones" : "mic");

			mainGroup.createSpan({ cls: "otr-ag-filename", text: item.filename });

			const sizeMb = linkedFile instanceof TFile ? (linkedFile.stat.size / (1024 * 1024)).toFixed(1) : "0.0";
			const metaText = sizeMb !== "0.0" ? `${sizeMb} MB · #${item.lineNumber}` : `#${item.lineNumber}`;
			mainGroup.createSpan({ cls: "otr-ag-meta", text: metaText });

			// 2. 우측 영역: 상태 배지 (클릭 시 전사/재전사 동작)
			const rightGroup = row.createDiv({ cls: "otr-ag-row-right" });

			let badgeText = "대기";
			let badgeClass = "is-pending";
			let badgeTitle = `'${item.filename}' 음성 전사 시작 (클릭)`;

			if (item.transcribed) {
				badgeText = "전사 완료";
				badgeClass = "is-done";
				badgeTitle = `'${item.filename}' 다시 전사하기 (클릭)`;
			} else if (isProcessing) {
				badgeText = "● 전사 중...";
				badgeClass = "is-processing";
				badgeTitle = `'${item.filename}' 전사 진행 중`;
			} else if (isQueued) {
				badgeText = "대기 중 (큐)";
				badgeClass = "is-queued";
				badgeTitle = `'${item.filename}' 대기열에서 대기 중`;
			}

			const badgeEl = rightGroup.createSpan({
				cls: `otr-ag-status-badge ${badgeClass}`,
				text: badgeText,
			});
			badgeEl.title = badgeTitle;
			badgeEl.onclick = async (e) => {
				e.stopPropagation();
				if (isProcessing) {
					new Notice(`[${item.filename}] 이미 전사가 진행 중입니다.`);
					return;
				}
				if (isQueued) {
					new Notice(`[${item.filename}] 이미 대기열에 등록되어 있습니다.`);
					return;
				}
				badgeEl.setText("등록 중...");
				await this.callbacks.enqueueAudioTranscription(resolvedPath);
				new Notice(
					item.transcribed
						? `[${item.filename}] 대기열에 다시 추가되었습니다.`
						: `[${item.filename}] 백그라운드 전사 대기열에 추가되었습니다.`,
				);
				await this.refresh();
			};
		}
	}
}
