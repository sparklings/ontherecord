import { ItemView, Notice, TFile } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { OTR_SIDEBAR_VIEW_TYPE } from "./sidebarTypes.ts";
import { parseAudioEmbedsFromMarkdown, jumpToLineInActiveEditor } from "./noteAudioExplorer.ts";
import type { AudioEmbedItem } from "./noteAudioExplorer.ts";

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
}

export class OnTheRecordSidebarView extends ItemView {
	private callbacks: SidebarControllerCallbacks;
	private activeNote: TFile | null = null;
	private audioItems: AudioEmbedItem[] = [];
	private timerHandle: number | null = null;
	private elapsedSeconds = 0;
	private playerState: "idle" | "recording" | "paused" = "idle";

	// DOM Elements
	private timerDisplayEl!: HTMLElement;
	private stateBadgeEl!: HTMLElement;
	private activeNoteNameEl!: HTMLElement;
	private audioListContainerEl!: HTMLElement;
	private recordBtn!: HTMLButtonElement;
	private pauseBtn!: HTMLButtonElement;
	private resumeBtn!: HTMLButtonElement;
	private stopBtn!: HTMLButtonElement;

	constructor(leaf: WorkspaceLeaf, callbacks: SidebarControllerCallbacks) {
		super(leaf);
		this.callbacks = callbacks;
	}

	getViewType(): string {
		return OTR_SIDEBAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "회의록 녹음 & 전사 제어기";
	}

	getIcon(): string {
		return "microphone";
	}

	async onOpen(): Promise<void> {
		const container = this.contentEl;
		container.empty();
		container.addClass("otr-sidebar-container");

		// 1. 헤더
		const headerEl = container.createDiv({ cls: "otr-sidebar-header" });
		const titleEl = headerEl.createSpan({ text: "🎙️ On the Record" });
		titleEl.style.fontWeight = "bold";
		titleEl.style.fontSize = "1.05em";

		const refreshBtn = headerEl.createEl("button", { text: "새로고침", cls: "clickable-icon" });
		refreshBtn.style.fontSize = "0.8em";
		refreshBtn.onclick = () => void this.refresh();

		// 2. 활성 대상 회의록 카드
		const noteCard = container.createDiv({ cls: "otr-sidebar-card otr-note-card" });
		noteCard.createDiv({ text: "📄 현재 대상 회의록", cls: "otr-card-label" });

		this.activeNoteNameEl = noteCard.createDiv({ text: "열린 회의록 없음", cls: "otr-note-title" });

		const newNoteBtn = noteCard.createEl("button", { text: "+ 새 회의록 생성", cls: "mod-cta" });
		newNoteBtn.style.marginTop = "6px";
		newNoteBtn.style.width = "100%";
		newNoteBtn.onclick = async () => {
			const newFile = await this.callbacks.createNewMeetingNote();
			if (newFile) {
				this.activeNote = newFile;
				await this.refresh();
			}
		};

		// 3. 플레이어형 녹음 제어기 카드 (3-UX-04, 3-UX-09)
		const playerCard = container.createDiv({ cls: "otr-sidebar-card otr-player-card" });

		const timerRow = playerCard.createDiv({ cls: "otr-timer-row" });
		this.timerDisplayEl = timerRow.createDiv({ text: "00:00", cls: "otr-timer-display" });

		this.stateBadgeEl = timerRow.createSpan({ cls: "otr-status-badge is-missing", text: "대기 중" });

		// 플레이어 버튼 바 (● / ❚❚ / ▶ / ■)
		const controlsBar = playerCard.createDiv({ cls: "otr-controls-bar" });

		this.recordBtn = controlsBar.createEl("button", { text: "● 녹음", cls: "otr-btn-record" });
		this.recordBtn.title = "녹음 시작";
		this.recordBtn.onclick = async () => {
			if (!this.activeNote) {
				new Notice("녹음을 시작할 회의록 문서를 먼저 열거나 생성하세요.");
				return;
			}
			await this.callbacks.startRecording(this.activeNote);
			this.setRecordingState("recording");
		};

		this.pauseBtn = controlsBar.createEl("button", { text: "❚❚ 일시정지", cls: "otr-btn-pause" });
		this.pauseBtn.title = "일시정지 (스마트 분할 세션)";
		this.pauseBtn.disabled = true;
		this.pauseBtn.onclick = async () => {
			await this.callbacks.pauseRecording();
			this.setRecordingState("paused");
		};

		this.resumeBtn = controlsBar.createEl("button", { text: "▶ 계속하기", cls: "otr-btn-resume" });
		this.resumeBtn.title = "녹음 계속하기";
		this.resumeBtn.disabled = true;
		this.resumeBtn.onclick = async () => {
			await this.callbacks.resumeRecording();
			this.setRecordingState("recording");
		};

		this.stopBtn = controlsBar.createEl("button", { text: "■ 안전 중지", cls: "otr-btn-stop" });
		this.stopBtn.title = "녹음 안전 중지 및 오디오 연결";
		this.stopBtn.disabled = true;
		this.stopBtn.onclick = async () => {
			await this.callbacks.stopRecording();
			this.setRecordingState("idle");
			await this.refresh();
		};

		// 4. 활성 노트 내 다중 레코딩 임베드 탐색기 (3-UX-05, 3-UX-11)
		const explorerCard = container.createDiv({ cls: "otr-sidebar-card otr-explorer-card" });
		explorerCard.createDiv({ text: "🎧 본문 오디오 임베드 목록", cls: "otr-card-label" });

		this.audioListContainerEl = explorerCard.createDiv({ cls: "otr-audio-list-container" });

		// 5. 부가 퀵 액션 바 (3-UX-13, 3-POST-01)
		const quickActionsCard = container.createDiv({ cls: "otr-sidebar-card" });
		quickActionsCard.createDiv({ text: "⚡ 빠른 도구", cls: "otr-card-label" });

		const pickAudioBtn = quickActionsCard.createEl("button", { text: "📁 오디오 파일 선택 전사", cls: "otr-quick-btn" });
		pickAudioBtn.onclick = () => this.callbacks.openAudioPicker();

		const aiSummaryBtn = quickActionsCard.createEl("button", { text: "🤖 로컬 AI 회의록 요약", cls: "otr-quick-btn" });
		aiSummaryBtn.onclick = async () => {
			if (!this.activeNote) {
				new Notice("요약할 회의록 노트를 먼저 여세요.");
				return;
			}
			await this.callbacks.generateSummary(this.activeNote);
		};

		await this.refresh();
	}

	async onClose(): Promise<void> {
		this.stopTimer();
	}

	/**
	 * 플레이어 상태(idle / recording / paused)를 갱신합니다.
	 */
	setRecordingState(state: "idle" | "recording" | "paused"): void {
		this.playerState = state;

		if (state === "recording") {
			this.recordBtn.disabled = true;
			this.pauseBtn.disabled = false;
			this.resumeBtn.disabled = true;
			this.stopBtn.disabled = false;

			this.stateBadgeEl.className = "otr-status-badge is-ready otr-pulse";
			this.stateBadgeEl.setText("🔴 녹음 중");

			this.startTimer();
		} else if (state === "paused") {
			this.recordBtn.disabled = true;
			this.pauseBtn.disabled = true;
			this.resumeBtn.disabled = false;
			this.stopBtn.disabled = false;

			this.stateBadgeEl.className = "otr-status-badge is-missing";
			this.stateBadgeEl.setText("❚❚ 일시정지됨");

			this.pauseTimer();
		} else {
			this.recordBtn.disabled = false;
			this.pauseBtn.disabled = true;
			this.resumeBtn.disabled = true;
			this.stopBtn.disabled = true;

			this.stateBadgeEl.className = "otr-status-badge is-missing";
			this.stateBadgeEl.setText("대기 중");

			this.stopTimer();
		}
	}

	private startTimer(): void {
		if (this.timerHandle !== null) return;
		this.timerHandle = window.setInterval(() => {
			this.elapsedSeconds++;
			this.renderTimer();
		}, 1000);
	}

	private pauseTimer(): void {
		if (this.timerHandle !== null) {
			window.clearInterval(this.timerHandle);
			this.timerHandle = null;
		}
	}

	private stopTimer(): void {
		this.pauseTimer();
		this.elapsedSeconds = 0;
		this.renderTimer();
	}

	private renderTimer(): void {
		const m = Math.floor(this.elapsedSeconds / 60);
		const s = this.elapsedSeconds % 60;
		const pad = (n: number) => String(n).padStart(2, "0");
		if (this.timerDisplayEl) {
			this.timerDisplayEl.setText(`${pad(m)}:${pad(s)}`);
		}
	}

	/**
	 * 활성 파일 및 임베드 목록을 다시 읽어 UI를 최신 상태로 동기화합니다.
	 */
	async refresh(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile && activeFile.extension.toLowerCase() === "md") {
			this.activeNote = activeFile;
			if (this.activeNoteNameEl) {
				this.activeNoteNameEl.setText(activeFile.name);
			}

			// 노트 본문 파싱
			try {
				const content = await this.app.vault.read(activeFile);
				this.audioItems = parseAudioEmbedsFromMarkdown(content);
			} catch {
				this.audioItems = [];
			}
		} else {
			const recordingNotePath = this.callbacks.getActiveSessionNotePath();
			if (recordingNotePath) {
				const file = this.app.vault.getAbstractFileByPath(recordingNotePath);
				if (file instanceof TFile) {
					this.activeNote = file;
					if (this.activeNoteNameEl) {
						this.activeNoteNameEl.setText(file.name);
					}
				}
			} else {
				this.activeNote = null;
				if (this.activeNoteNameEl) {
					this.activeNoteNameEl.setText("열린 회의록 없음");
				}
				this.audioItems = [];
			}
		}

		// 녹음 세션 여부 반영
		if (this.callbacks.isRecording()) {
			if (this.playerState !== "recording" && this.playerState !== "paused") {
				this.setRecordingState("recording");
			}
		} else if (this.playerState !== "paused") {
			this.setRecordingState("idle");
		}

		this.renderAudioList();
	}

	private renderAudioList(): void {
		if (!this.audioListContainerEl) return;
		this.audioListContainerEl.empty();

		if (this.audioItems.length === 0) {
			const emptyEl = this.audioListContainerEl.createDiv({ cls: "setting-item-description" });
			emptyEl.style.fontSize = "0.85em";
			emptyEl.style.padding = "6px 0";
			emptyEl.setText("이 회의록에 삽입된 오디오 녹음 파일이 없습니다.");
			return;
		}

		for (const item of this.audioItems) {
			const itemRow = this.audioListContainerEl.createDiv({ cls: "otr-audio-item-row" });

			const infoCol = itemRow.createDiv({ cls: "otr-audio-info-col" });

			const topMeta = infoCol.createDiv({ cls: "otr-audio-top-meta" });
			topMeta.createSpan({ cls: "otr-line-badge", text: `Line ${item.lineNumber}` });

			const statusSpan = topMeta.createSpan({
				cls: `otr-status-badge ${item.transcribed ? "is-ready" : "is-missing"}`,
				text: item.transcribed ? "전사 완료" : "미전사",
			});
			statusSpan.style.fontSize = "0.75em";

			const nameSpan = infoCol.createDiv({ cls: "otr-audio-filename", text: item.filename });
			nameSpan.title = item.audioPath;

			// 액션 버튼 바 ([이동], [전사])
			const actionCol = itemRow.createDiv({ cls: "otr-audio-action-col" });

			const jumpBtn = actionCol.createEl("button", { text: "이동", cls: "otr-btn-jump" });
			jumpBtn.title = `본문 ${item.lineNumber}행 위치로 커서 이동`;
			jumpBtn.onclick = () => {
				jumpToLineInActiveEditor(this.app, item.lineNumber);
			};

			const transcribeBtn = actionCol.createEl("button", {
				text: item.transcribed ? "재전사" : "전사",
				cls: "otr-btn-transcribe",
			});
			transcribeBtn.title = `'${item.filename}' 백그라운드 전사 대기열에 등록`;
			transcribeBtn.onclick = async () => {
				transcribeBtn.disabled = true;
				await this.callbacks.enqueueAudioTranscription(item.audioPath);
				new Notice(`[${item.filename}] 백그라운드 전사 큐에 등록되었습니다.`);
			};
		}
	}
}
