import { App, Modal, Notice, Setting, TFile, setIcon } from "obsidian";
import type { EmbedCache } from "obsidian";
import type { TranscriptionResult, TranscriptionSegment } from "./provider.ts";
import { formatResultMarkdown, formatTimestamp } from "./resultPreview.ts";
import type { ExistingResultChoice } from "./resultPreview.ts";
import { syncAudioPlayback } from "./audioPlaybackSync.ts";

export interface ApprovedResult {
	markdown: string;
}

export interface AudioEmbedTarget {
	note: TFile;
	embed: EmbedCache;
	audioFile: TFile;
}

export class AudioEmbedTargetPickerModal extends Modal {
	private selectedIndex = 0;
	private readonly rows: HTMLElement[] = [];
	private readonly buttons: HTMLButtonElement[] = [];

	constructor(
		app: App,
		private readonly targets: readonly AudioEmbedTarget[],
		private readonly onChoose: (target: AudioEmbedTarget) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.modalEl.addClass("otr-audio-embed-picker");
		this.setTitle("현재 노트의 녹음 선택");
		this.contentEl.createEl("p", {
			text: "커서 위에 있는 가장 가까운 녹음이 먼저 선택됩니다. 화살표 키로 목록을 이동하고 enter로 선택하세요.",
		});
		this.targets.forEach((target, index) => {
			const row = new Setting(this.contentEl)
				.setName(target.audioFile.path)
				.setDesc(`${target.embed.position.start.line + 1}행`)
				.addButton((button) =>
					button.setButtonText(index === 0 ? "선택됨" : "선택").onClick(() => this.choose(index)),
				);
			row.settingEl.addClass("otr-audio-embed-picker-row");
			this.rows.push(row.settingEl);
			const button = row.settingEl.querySelector("button");
			if (!button) throw new Error("오디오 선택 버튼을 만들지 못했습니다.");
			this.buttons.push(button);
		});
		this.select(0);
		this.contentEl.addEventListener("keydown", this.handleKeyDown);
		this.buttons[0]?.focus();
	}

	onClose(): void {
		this.contentEl.removeEventListener("keydown", this.handleKeyDown);
		this.contentEl.empty();
	}

	private readonly handleKeyDown = (event: KeyboardEvent): void => {
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			const delta = event.key === "ArrowDown" ? 1 : -1;
			this.select((this.selectedIndex + delta + this.targets.length) % this.targets.length);
			this.buttons[this.selectedIndex]?.focus();
		} else if (event.key === "Enter") {
			event.preventDefault();
			this.choose(this.selectedIndex);
		}
	};

	private select(index: number): void {
		this.selectedIndex = index;
		this.rows.forEach((row, rowIndex) => {
			row.toggleClass("is-selected", rowIndex === index);
			const button = this.buttons[rowIndex];
			if (button) button.textContent = rowIndex === index ? "선택됨" : "선택";
			button?.setAttribute("aria-pressed", String(rowIndex === index));
		});
	}

	private choose(index: number): void {
		const target = this.targets[index];
		if (!target) return;
		this.close();
		this.onChoose(target);
	}
}

const PLAYBACK_SPEEDS = [1.0, 1.25, 1.5, 2.0] as const;

export class ResultPreviewModal extends Modal {
	private resolve: (value: ApprovedResult | null) => void = () => undefined;
	private settled = false;
	private includeTimestamps = true;
	private editableSegments: Array<{ startSeconds: number; endSeconds: number; text: string }> = [];
	private audioEl: HTMLAudioElement | null = null;
	private speedIndex = 0;
	private segmentRows: HTMLElement[] = [];

	constructor(
		app: App,
		private readonly result: TranscriptionResult,
		private readonly targetName: string,
		private readonly audioFile?: TFile,
	) {
		super(app);
		this.editableSegments = result.segments.map((seg: TranscriptionSegment) => ({
			startSeconds: seg.startSeconds,
			endSeconds: seg.endSeconds,
			text: seg.text,
		}));
	}

	prompt(): Promise<ApprovedResult | null> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	onOpen(): void {
		this.modalEl.addClass("otr-review-modal");
		this.setTitle("전사 결과 검토 및 삽입");
		this.render();
	}

	onClose(): void {
		if (this.audioEl) {
			this.audioEl.pause();
			this.audioEl.src = "";
			this.audioEl = null;
		}
		this.segmentRows = [];
		this.contentEl.empty();
		this.finish(null);
	}

	private finish(value: ApprovedResult | null): void {
		if (this.settled) return;
		this.settled = true;
		this.resolve(value);
	}

	private buildCurrentMarkdown(): string {
		if (this.editableSegments.length === 0) {
			return this.result.text.trim();
		}
		return formatResultMarkdown(
			{
				...this.result,
				segments: this.editableSegments,
				text: this.editableSegments.map((s) => s.text.trim()).filter(Boolean).join(" "),
			},
			{ includeTimestamps: this.includeTimestamps },
		);
	}

	private renderAudioSyncBar(containerEl: HTMLElement): void {
		if (!this.audioFile) return;

		const resourceUrl = this.app.vault.getResourcePath(this.audioFile);
		const audio = containerEl.createEl("audio", { cls: "is-hidden" });
		audio.src = resourceUrl;
		audio.preload = "metadata";
		this.audioEl = audio;

		const bar = containerEl.createDiv({ cls: "otr-audio-sync-bar" });

		const playBtn = bar.createEl("button", { cls: "otr-sync-play-btn", title: "재생 / 일시정지" });
		setIcon(playBtn, "play");

		const timeEl = bar.createSpan({ cls: "otr-sync-time", text: "00:00 / 00:00" });

		const seekbar = bar.createEl("input", {
			cls: "otr-sync-seekbar",
			type: "range",
		});
		seekbar.min = "0";
		seekbar.max = "100";
		seekbar.step = "0.1";
		seekbar.value = "0";

		const speedBtn = bar.createEl("button", {
			cls: "otr-sync-speed-btn",
			text: `${PLAYBACK_SPEEDS[this.speedIndex].toFixed(2).replace(/\.00$/, ".0")}x`,
			title: "재생 속도 전환",
		});

		playBtn.onclick = () => {
			if (audio.paused) {
				void audio.play();
			} else {
				audio.pause();
			}
		};

		speedBtn.onclick = () => {
			this.speedIndex = (this.speedIndex + 1) % PLAYBACK_SPEEDS.length;
			const nextSpeed = PLAYBACK_SPEEDS[this.speedIndex];
			audio.playbackRate = nextSpeed;
			speedBtn.setText(`${nextSpeed}x`);
		};

		seekbar.addEventListener("input", () => {
			const nextTime = Number(seekbar.value);
			if (Number.isFinite(nextTime)) {
				audio.currentTime = nextTime;
			}
		});

		const syncUi = () => {
			const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
			const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
			if (duration > 0) {
				seekbar.max = String(duration);
			}
			seekbar.value = String(current);
			timeEl.setText(`${formatTimestamp(current)} / ${formatTimestamp(duration)}`);

			playBtn.empty();
			setIcon(playBtn, audio.paused ? "play" : "pause");

			// 현재 재생 시각에 해당하는 세그먼트 행 강조
			this.segmentRows.forEach((row, idx) => {
				const seg = this.editableSegments[idx];
				if (!seg) return;
				const isActive = !audio.paused && current >= seg.startSeconds && current <= Math.max(seg.endSeconds, seg.startSeconds + 0.5);
				row.toggleClass("is-active", isActive);
			});
		};

		audio.addEventListener("loadedmetadata", syncUi);
		audio.addEventListener("timeupdate", syncUi);
		audio.addEventListener("play", syncUi);
		audio.addEventListener("pause", syncUi);
		audio.addEventListener("ended", syncUi);
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.segmentRows = [];

		const headerMeta = contentEl.createDiv({ cls: "otr-review-subtitle" });
		headerMeta.setText(`대상: ${this.targetName}`);

		for (const warning of this.result.warnings) {
			contentEl.createEl("p", { text: `경고: ${warning}`, cls: "otr-review-warning" });
		}

		this.renderAudioSyncBar(contentEl);

		const toolbar = contentEl.createDiv({ cls: "otr-review-toolbar" });
		const hintText = toolbar.createSpan({
			cls: "otr-review-hint",
			text: this.audioFile
				? "타임스탬프를 클릭하면 해당 위치부터 재생됩니다. 문장을 직접 수정할 수 있습니다."
				: "문장을 직접 수정한 뒤 노트에 삽입할 수 있습니다.",
		});
		void hintText;

		const copyRawBtn = toolbar.createEl("button", { cls: "otr-link-btn", text: "원문 복사" });
		copyRawBtn.onclick = async () => {
			await navigator.clipboard.writeText(this.buildCurrentMarkdown());
			new Notice("전사 내용을 클립보드에 복사했습니다.");
		};

		new Setting(contentEl).setName("시간 표시 포함").addToggle((toggle) =>
			toggle.setValue(this.includeTimestamps).onChange((value) => {
				this.includeTimestamps = value;
				this.renderSegmentsOnly(listContainer);
			}),
		);

		const listContainer = contentEl.createDiv({ cls: "otr-segment-list" });
		this.renderSegmentsOnly(listContainer);

		const footer = contentEl.createDiv({ cls: "otr-review-footer" });
		const cancelBtn = footer.createEl("button", { text: "취소" });
		cancelBtn.onclick = () => this.close();

		const insertBtn = footer.createEl("button", { text: "노트에 삽입", cls: "mod-cta" });
		insertBtn.onclick = () => {
			const finalMarkdown = this.buildCurrentMarkdown();
			if (finalMarkdown.trim().length === 0) return;
			this.finish({ markdown: finalMarkdown });
			this.close();
		};
	}

	private renderSegmentsOnly(listContainer: HTMLElement): void {
		listContainer.empty();
		this.segmentRows = [];

		if (this.editableSegments.length === 0) {
			const fallbackArea = listContainer.createEl("textarea", { cls: "otr-segment-fallback-area" });
			fallbackArea.value = this.result.text;
			fallbackArea.rows = 10;
			return;
		}

		this.editableSegments.forEach((seg, index) => {
			const row = listContainer.createDiv({ cls: "otr-segment-row" });
			this.segmentRows.push(row);

			if (this.includeTimestamps) {
				const tsBtn = row.createEl("button", {
					cls: "otr-segment-ts-btn",
					text: `[${formatTimestamp(seg.startSeconds)}]`,
					title: this.audioEl ? `${formatTimestamp(seg.startSeconds)} 위치부터 재생` : "타임스탬프",
				});
				tsBtn.onclick = () => {
					if (this.audioEl) {
						syncAudioPlayback(this.audioEl, seg.startSeconds);
					}
				};
			}

			const input = row.createEl("textarea", { cls: "otr-segment-input" });
			input.value = seg.text;
			input.rows = Math.max(1, Math.min(4, Math.ceil(seg.text.length / 55)));
			input.addEventListener("input", () => {
				this.editableSegments[index].text = input.value;
			});
		});
	}
}

export class ExistingResultModal extends Modal {
	private resolve: (value: ExistingResultChoice | null) => void = () => undefined;
	private settled = false;

	prompt(): Promise<ExistingResultChoice | null> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	onOpen(): void {
		this.setTitle("기존 전사 결과 발견");
		this.contentEl.createEl("p", {
			text: "이 오디오의 전사 결과가 노트에 이미 있습니다. 기존 결과를 교체할지, 새 결과를 추가할지 선택하세요.",
		});
		new Setting(this.contentEl)
			.addButton((button) => button.setButtonText("교체").onClick(() => this.choose("replace")))
			.addButton((button) => button.setButtonText("추가").onClick(() => this.choose("append")))
			.addButton((button) => button.setButtonText("취소").onClick(() => this.close()));
	}

	onClose(): void {
		this.contentEl.empty();
		this.finish(null);
	}

	private choose(choice: ExistingResultChoice): void {
		this.finish(choice);
		this.close();
	}

	private finish(value: ExistingResultChoice | null): void {
		if (this.settled) return;
		this.settled = true;
		this.resolve(value);
	}
}
