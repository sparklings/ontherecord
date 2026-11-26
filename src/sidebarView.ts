import { ItemView, Notice, TFile, setIcon } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { OTR_SIDEBAR_VIEW_TYPE } from "./sidebarTypes.ts";
import { parseAudioEmbedsFromMarkdown, jumpToLineInActiveEditor } from "./noteAudioExplorer.ts";
import type { AudioEmbedItem } from "./noteAudioExplorer.ts";
import type { WorkerProgress } from "./transcriptionQueueWorker.ts";
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
	openAudioPicker: () => void;
	generateSummary: (note: TFile) => Promise<void>;
	openSettings?: () => void;
	isToolsConfigured?: () => boolean;
	cancelTranscription?: () => void;
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

		if (this.callbacks.openSettings) {
			const settingsBtn = headerActions.createEl("button", { cls: "otr-icon-btn", title: "플러그인 설정 열기" });
			setIcon(settingsBtn, "settings");
			settingsBtn.onclick = () => this.callbacks.openSettings?.();
		}

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

		// 6. 하단 퀵 액션 스트립 (복잡한 AI 요약 제거, 핵심 기능 집중)
		const quickStrip = container.createDiv({ cls: "otr-quick-tools-strip" });

		const pickAudioBtn = quickStrip.createEl("button", { cls: "otr-tool-btn" });
		const folderIcon = pickAudioBtn.createSpan({ cls: "otr-inline-icon" });
		setIcon(folderIcon, "folder-open");
		pickAudioBtn.createSpan({ text: "오디오 파일 전사" });
		pickAudioBtn.onclick = () => this.callbacks.openAudioPicker();

		const newNoteBtn = quickStrip.createEl("button", { cls: "otr-tool-btn" });
		const notePlusIcon = newNoteBtn.createSpan({ cls: "otr-inline-icon" });
		setIcon(notePlusIcon, "file-plus");
		newNoteBtn.createSpan({ text: "새 회의록 작성" });
		newNoteBtn.onclick = async () => {
			const newFile = await this.callbacks.createNewMeetingNote();
			if (newFile) {
				this.activeNote = newFile;
				await this.refresh();
			}
		};

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

		if (!this.activeNote && this.playerState === "idle") {
			// Empty State: 노트가 없으면 녹음 버튼을 비활성화
			const disabledBtn = this.noteActionBarEl.createEl("button", {
				cls: "otr-compact-rec-btn is-disabled",
				title: "먼저 노트를 열거나 작성하세요",
			});
			disabledBtn.disabled = true;
			const dot = disabledBtn.createSpan({ cls: "otr-compact-rec-dot" });
			dot.setAttribute("aria-hidden", "true");
			disabledBtn.createSpan({ text: "녹음 시작" });
			return;
		}

		if (this.playerState === "idle") {
			const recBtn = this.noteActionBarEl.createEl("button", {
				cls: "otr-compact-rec-btn",
				title: "현재 활성 노트에서 녹음 시작",
			});
			const dot = recBtn.createSpan({ cls: "otr-compact-rec-dot" });
			dot.setAttribute("aria-hidden", "true");
			recBtn.createSpan({ text: "녹음 시작" });
			recBtn.onclick = async () => {
				if (!this.activeNote) return;
				await this.callbacks.startRecording(this.activeNote);
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
		const statusText = this.currentProgress
			? `전사 중 (${this.currentQueueCount}건 대기)`
			: `대기열 ${this.currentQueueCount}건`;

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
			const percent = typeof this.currentProgress.percent === "number" ? Math.round(this.currentProgress.percent) : 0;

			const fileRow = this.queueWidgetEl.createDiv({ cls: "otr-queue-file-row" });
			fileRow.createSpan({ text: fileName, cls: "otr-queue-filename" });
			fileRow.createSpan({ text: `${percent}%`, cls: "otr-queue-percent" });

			const barTrack = this.queueWidgetEl.createDiv({ cls: "otr-queue-progress-track" });
			const barFill = barTrack.createDiv({ cls: "otr-queue-progress-fill" });
			barFill.setCssProps({ width: `${Math.min(100, Math.max(0, percent))}%` });
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
				const content = await this.app.vault.read(activeFile);
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

		for (const item of this.audioItems) {
			const itemCard = this.audioListContainerEl.createDiv({ cls: "otr-audio-item-stacked" });

			// 1. Top Row: Line Tag + Filename (left) vs Done/Pending Pill (right)
			const topRow = itemCard.createDiv({ cls: "otr-audio-card-top" });
			const leftGroup = topRow.createDiv({ cls: "otr-audio-card-left" });
			leftGroup.createSpan({ cls: "otr-line-tag", text: `${item.lineNumber}행` });
			const titleSpan = leftGroup.createSpan({ cls: "otr-audio-item-title", text: item.filename });
			titleSpan.title = item.audioPath;

			const statusSpan = topRow.createSpan({
				cls: `otr-audio-status-pill ${item.transcribed ? "is-done" : "is-pending"}`,
			});
			if (item.transcribed) {
				const checkIcon = statusSpan.createSpan({ cls: "otr-inline-icon" });
				setIcon(checkIcon, "check");
			} else {
				statusSpan.createSpan({ cls: "otr-status-badge-dot" });
			}
			statusSpan.createSpan({ text: item.transcribed ? "전사 완료" : "전사 대기" });

			// 2. Meta Row: 파일 크기 및 재생 시간 (MB)
			const linkedFile = this.activeNote
				? this.app.metadataCache.getFirstLinkpathDest(item.audioPath, this.activeNote.path)
				: this.app.vault.getAbstractFileByPath(item.audioPath);
			const sizeMb = linkedFile instanceof TFile ? (linkedFile.stat.size / (1024 * 1024)).toFixed(1) : "0.0";
			itemCard.createDiv({ text: sizeMb !== "0.0" ? `${sizeMb} MB` : item.audioPath, cls: "otr-audio-card-meta font-mono-tabular" });

			// 3. Footer Row:
			const footerRow = itemCard.createDiv({
				cls: `otr-audio-card-footer ${item.transcribed ? "is-done-footer" : "is-pending-footer"}`,
			});

			const jumpBtn = footerRow.createEl("button", {
				cls: "otr-card-btn",
				title: `${item.lineNumber}행 위치로 본문 스크롤`,
			});
			const jumpIcon = jumpBtn.createSpan({ cls: "otr-inline-icon" });
			setIcon(jumpIcon, "external-link");
			jumpBtn.createSpan({ text: "본문 이동" });
			jumpBtn.onclick = () => {
				jumpToLineInActiveEditor(this.app, item.lineNumber);
			};

			if (item.transcribed) {
				const retranscribeBtn = footerRow.createEl("button", {
					cls: "otr-card-btn",
					title: `'${item.filename}' 다시 전사하기`,
				});
				const reIcon = retranscribeBtn.createSpan({ cls: "otr-inline-icon" });
				setIcon(reIcon, "refresh-cw");
				retranscribeBtn.createSpan({ text: "다시 전사" });
				retranscribeBtn.onclick = async () => {
					retranscribeBtn.disabled = true;
					await this.callbacks.enqueueAudioTranscription(item.audioPath);
					new Notice(`[${item.filename}] 대기열에 다시 추가되었습니다.`);
				};
			} else {
				const transcribeBtn = footerRow.createEl("button", {
					cls: "otr-action-badge-btn",
					title: `'${item.filename}' 음성 전사 시작`,
				});
				const micIcon = transcribeBtn.createSpan({ cls: "otr-inline-icon" });
				setIcon(micIcon, "mic");
				transcribeBtn.createSpan({ text: "전사 시작" });
				transcribeBtn.onclick = async () => {
					transcribeBtn.disabled = true;
					await this.callbacks.enqueueAudioTranscription(item.audioPath);
					new Notice(`[${item.filename}] 백그라운드 전사 대기열에 추가되었습니다.`);
				};
			}
		}
	}
}
