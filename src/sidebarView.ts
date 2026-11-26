import { ItemView, Notice, TFile, setIcon } from "obsidian";
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
	private statusDotEl!: HTMLElement;
	private statusLabelEl!: HTMLElement;
	private waveformContainerEl!: HTMLElement;
	private activeNoteNameEl!: HTMLElement;
	private audioListContainerEl!: HTMLElement;
	private audioCountBadgeEl!: HTMLElement;
	private controlsContainerEl!: HTMLElement;

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

		// 1. 헤더 (12px Micro-Branding + Action Icon)
		const headerEl = container.createDiv({ cls: "otr-sidebar-header" });
		const titleGroup = headerEl.createDiv({ cls: "otr-sidebar-title-group" });
		const titleIcon = titleGroup.createSpan();
		setIcon(titleIcon, "otr-record-deck");
		titleGroup.createSpan({ text: "On the Record" });

		const refreshBtn = headerEl.createEl("button", { cls: "otr-icon-btn", title: "새로고침" });
		setIcon(refreshBtn, "refresh-cw");
		refreshBtn.onclick = () => void this.refresh();

		// 2. 활성 대상 회의록 컨텍스트 카드
		const contextCard = container.createDiv({ cls: "otr-context-card" });
		const contextHeader = contextCard.createDiv({ cls: "otr-context-header-row" });
		const labelSpan = contextHeader.createSpan({ cls: "otr-context-label" });
		const fileIcon = labelSpan.createSpan();
		setIcon(fileIcon, "file-text");
		labelSpan.createSpan({ text: "현재 대상 회의록" });

		const newNoteLink = contextHeader.createEl("button", { text: "+ 새 회의록", cls: "otr-link-btn" });
		newNoteLink.onclick = async () => {
			const newFile = await this.callbacks.createNewMeetingNote();
			if (newFile) {
				this.activeNote = newFile;
				await this.refresh();
			}
		};

		this.activeNoteNameEl = contextCard.createDiv({ text: "열린 회의록 없음", cls: "otr-context-filename" });

		// 3. 정밀 스튜디오 데크 (Studio Deck)
		const studioDeck = container.createDiv({ cls: "otr-studio-deck" });

		const deckStatusRow = studioDeck.createDiv({ cls: "otr-deck-status-row" });
		const statusGroup = deckStatusRow.createDiv({ cls: "otr-deck-status-group" });
		this.statusDotEl = statusGroup.createSpan({ cls: "otr-status-badge-dot" });
		this.statusLabelEl = statusGroup.createSpan({ text: "대기 중", cls: "otr-status-label is-idle" });

		this.timerDisplayEl = deckStatusRow.createDiv({ text: "00:00", cls: "otr-deck-timer font-mono-tabular" });

		// 슬렌더 파형 비주얼라이저 (9개 미니 바)
		this.waveformContainerEl = studioDeck.createDiv({ cls: "otr-waveform-row" });
		for (let i = 0; i < 9; i++) {
			this.waveformContainerEl.createDiv({ cls: "otr-wave-bar" });
		}

		// 컨트롤 버튼 클러스터
		this.controlsContainerEl = studioDeck.createDiv();
		this.renderControls();

		// 4. 본문 오디오 임베드 목록 섹션
		const explorerSection = container.createDiv({ cls: "otr-explorer-section" });
		const explorerHeader = explorerSection.createDiv({ cls: "otr-explorer-header" });
		const explorerTitle = explorerHeader.createDiv({ cls: "otr-explorer-title" });
		const headIcon = explorerTitle.createSpan();
		setIcon(headIcon, "headphones");
		explorerTitle.createSpan({ text: "노트 내 오디오" });

		this.audioCountBadgeEl = explorerHeader.createSpan({ cls: "otr-pill-count", text: "0" });

		this.audioListContainerEl = explorerSection.createDiv({ cls: "otr-audio-list" });

		// 5. 하단 퀵 액션 스트립
		const quickStrip = container.createDiv({ cls: "otr-quick-tools-strip" });

		const pickAudioBtn = quickStrip.createEl("button", { cls: "otr-tool-btn" });
		const folderIcon = pickAudioBtn.createSpan();
		setIcon(folderIcon, "folder-open");
		pickAudioBtn.createSpan({ text: "파일 전사" });
		pickAudioBtn.onclick = () => this.callbacks.openAudioPicker();

		const aiSummaryBtn = quickStrip.createEl("button", { cls: "otr-tool-btn" });
		const sparkIcon = aiSummaryBtn.createSpan();
		setIcon(sparkIcon, "sparkles");
		aiSummaryBtn.createSpan({ text: "AI 요약" });
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
	 * 플레이어 컨트롤 버튼 UI를 상태에 맞게 정밀 렌더링합니다.
	 */
	private renderControls(): void {
		if (!this.controlsContainerEl) return;
		this.controlsContainerEl.empty();

		if (this.playerState === "idle") {
			// 대기 상태: 단일 원클릭 녹음 시작 버튼
			const recordBtn = this.controlsContainerEl.createEl("button", {
				cls: "otr-ctrl-btn btn-record-main w-full py-1.5",
				title: "음성 녹음 시작",
			});
			const recIcon = recordBtn.createSpan();
			setIcon(recIcon, "mic");
			recordBtn.createSpan({ text: "녹음 시작" });
			recordBtn.onclick = async () => {
				if (!this.activeNote) {
					new Notice("녹음을 시작할 회의록 문서를 먼저 열거나 생성하세요.");
					return;
				}
				await this.callbacks.startRecording(this.activeNote);
				this.setRecordingState("recording");
			};
		} else {
			// 녹음 중 또는 일시정지 상태: 3분할 정밀 컨트롤 바
			const controlsGrid = this.controlsContainerEl.createDiv({ cls: "otr-controls-grid" });

			// 1. 일시정지 / 계속하기 버튼
			const pauseResumeBtn = controlsGrid.createEl("button", {
				cls: "otr-ctrl-btn",
				title: this.playerState === "recording" ? "일시정지" : "녹음 계속하기",
			});
			const prIcon = pauseResumeBtn.createSpan();
			setIcon(prIcon, this.playerState === "recording" ? "pause" : "play");
			pauseResumeBtn.createSpan({ text: this.playerState === "recording" ? "일시정지" : "계속하기" });
			pauseResumeBtn.onclick = async () => {
				if (this.playerState === "recording") {
					await this.callbacks.pauseRecording();
					this.setRecordingState("paused");
				} else {
					await this.callbacks.resumeRecording();
					this.setRecordingState("recording");
				}
			};

			// 2. 안전 중지 및 노트 연결 버튼
			const stopBtn = controlsGrid.createEl("button", {
				cls: "otr-ctrl-btn btn-stop",
				title: "녹음 안전 중지 및 오디오 연결",
			});
			const stopIcon = stopBtn.createSpan();
			setIcon(stopIcon, "square");
			stopBtn.createSpan({ text: "중지·연결" });
			stopBtn.onclick = async () => {
				await this.callbacks.stopRecording();
				this.setRecordingState("idle");
				await this.refresh();
			};

			// 3. 분할 세션 버튼 (스마트 분할)
			const splitBtn = controlsGrid.createEl("button", {
				cls: "otr-ctrl-btn",
				title: "현재 녹음 저장 후 새 세션 즉시 시작",
			});
			const splitIcon = splitBtn.createSpan();
			setIcon(splitIcon, "plus");
			splitBtn.createSpan({ text: "분할" });
			splitBtn.onclick = async () => {
				await this.callbacks.pauseRecording();
				await this.callbacks.resumeRecording();
				this.setRecordingState("recording");
				new Notice("새 녹음 세션으로 분할되었습니다.");
			};
		}
	}

	/**
	 * 플레이어 상태(idle / recording / paused)를 갱신합니다.
	 */
	setRecordingState(state: "idle" | "recording" | "paused"): void {
		this.playerState = state;

		if (state === "recording") {
			this.statusDotEl.className = "otr-status-badge-dot pulse is-recording";
			this.statusLabelEl.className = "otr-status-label is-recording";
			this.statusLabelEl.setText("녹음 중");

			this.waveformContainerEl.addClass("is-recording");
			this.startTimer();
		} else if (state === "paused") {
			this.statusDotEl.className = "otr-status-badge-dot is-paused";
			this.statusLabelEl.className = "otr-status-label is-paused";
			this.statusLabelEl.setText("일시정지됨");

			this.waveformContainerEl.removeClass("is-recording");
			this.pauseTimer();
		} else {
			this.statusDotEl.className = "otr-status-badge-dot is-idle";
			this.statusLabelEl.className = "otr-status-label is-idle";
			this.statusLabelEl.setText("대기 중");

			this.waveformContainerEl.removeClass("is-recording");
			this.stopTimer();
		}

		this.renderControls();
	}

	private startTimer(): void {
		if (this.timerHandle !== null) return;
		this.timerHandle = window.setInterval(() => {
			this.elapsedSeconds++;
			this.updateTimerDisplay();
		}, 1000);
	}

	private pauseTimer(): void {
		if (this.timerHandle !== null) {
			window.clearInterval(this.timerHandle);
			this.timerHandle = null;
		}
	}

	private stopTimer(): void {
		if (this.timerHandle !== null) {
			window.clearInterval(this.timerHandle);
			this.timerHandle = null;
		}
		this.elapsedSeconds = 0;
		this.updateTimerDisplay();
	}

	private updateTimerDisplay(): void {
		if (!this.timerDisplayEl) return;
		const pad = (n: number) => String(n).padStart(2, "0");
		const h = Math.floor(this.elapsedSeconds / 3600);
		const m = Math.floor((this.elapsedSeconds % 3600) / 60);
		const s = this.elapsedSeconds % 60;
		if (h > 0) {
			this.timerDisplayEl.setText(`${pad(h)}:${pad(m)}:${pad(s)}`);
		} else {
			this.timerDisplayEl.setText(`${pad(m)}:${pad(s)}`);
		}
	}

	async refresh(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile && activeFile.extension.toLowerCase() === "md") {
			this.activeNote = activeFile;
			if (this.activeNoteNameEl) {
				this.activeNoteNameEl.setText(activeFile.name);
			}

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

		if (this.audioCountBadgeEl) {
			this.audioCountBadgeEl.setText(`${this.audioItems.length}개`);
		}

		if (this.audioItems.length === 0) {
			const emptyEl = this.audioListContainerEl.createDiv({ cls: "text-[11px] text-[var(--text-muted)] py-2 text-center" });
			emptyEl.setText("노트에 삽입된 오디오가 없습니다.");
			return;
		}

		for (const item of this.audioItems) {
			const itemCard = this.audioListContainerEl.createDiv({ cls: "otr-audio-item" });

			const infoCol = itemCard.createDiv({ cls: "otr-audio-item-info" });

			const metaRow = infoCol.createDiv({ cls: "otr-audio-item-meta" });
			metaRow.createSpan({ cls: "otr-line-tag", text: `L${item.lineNumber}` });

			const statusSpan = metaRow.createSpan({
				cls: `text-[10px] font-medium flex items-center gap-0.5 ${item.transcribed ? "text-[var(--text-success,#10b981)]" : "text-[var(--text-muted)]"}`,
			});
			if (item.transcribed) {
				const checkIcon = statusSpan.createSpan();
				setIcon(checkIcon, "check");
			}
			statusSpan.createSpan({ text: item.transcribed ? "전사됨" : "미전사" });

			const titleRow = infoCol.createDiv({ cls: "otr-audio-item-title", text: item.filename });
			titleRow.title = item.audioPath;

			// 액션 아이콘 버튼 바
			const actionCol = itemCard.createDiv({ cls: "otr-audio-item-actions" });

			const jumpBtn = actionCol.createEl("button", {
				cls: "otr-action-icon-btn",
				title: `본문 ${item.lineNumber}행 위치로 커서 이동`,
			});
			setIcon(jumpBtn, "arrow-up-right");
			jumpBtn.onclick = () => {
				jumpToLineInActiveEditor(this.app, item.lineNumber);
			};

			if (item.transcribed) {
				const retranscribeBtn = actionCol.createEl("button", {
					cls: "otr-action-icon-btn",
					title: `'${item.filename}' 재전사 대기열 등록`,
				});
				setIcon(retranscribeBtn, "refresh-cw");
				retranscribeBtn.onclick = async () => {
					retranscribeBtn.disabled = true;
					await this.callbacks.enqueueAudioTranscription(item.audioPath);
					new Notice(`[${item.filename}] 재전사 대기열에 등록되었습니다.`);
				};
			} else {
				const transcribeBtn = actionCol.createEl("button", {
					cls: "otr-action-badge-btn",
					text: "전사",
					title: `'${item.filename}' 백그라운드 전사 시작`,
				});
				transcribeBtn.onclick = async () => {
					transcribeBtn.disabled = true;
					await this.callbacks.enqueueAudioTranscription(item.audioPath);
					new Notice(`[${item.filename}] 백그라운드 전사 큐에 등록되었습니다.`);
				};
			}
		}
	}
}
