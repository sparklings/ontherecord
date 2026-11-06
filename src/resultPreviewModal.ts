import { App, Modal, Setting, TFile } from "obsidian";
import type { EmbedCache } from "obsidian";
import type { TranscriptionResult } from "./provider.ts";
import { formatResultMarkdown } from "./resultPreview.ts";
import type { ExistingResultChoice } from "./resultPreview.ts";

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

export class ResultPreviewModal extends Modal {
	private resolve: (value: ApprovedResult | null) => void = () => undefined;
	private settled = false;
	private includeTimestamps = true;
	private markdown = "";

	constructor(
		app: App,
		private readonly result: TranscriptionResult,
		private readonly targetName: string,
	) {
		super(app);
	}

	prompt(): Promise<ApprovedResult | null> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	onOpen(): void {
		this.markdown = formatResultMarkdown(this.result, { includeTimestamps: this.includeTimestamps });
		this.setTitle("전사 결과 미리보기");
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
		this.finish(null);
	}

	private finish(value: ApprovedResult | null): void {
		if (this.settled) return;
		this.settled = true;
		this.resolve(value);
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("p", {
			text: `승인하기 전에는 노트가 수정되지 않습니다. 녹음 embed 바로 아래에 삽입합니다. 대상 노트: ${this.targetName}`,
		});
		for (const warning of this.result.warnings) contentEl.createEl("p", { text: `경고: ${warning}` });

		new Setting(contentEl).setName("시간 표시 포함").addToggle((toggle) =>
			toggle.setValue(this.includeTimestamps).onChange((value) => {
				this.includeTimestamps = value;
				this.markdown = formatResultMarkdown(this.result, { includeTimestamps: value });
				this.render();
			}),
		);
		const area = contentEl.createEl("textarea");
		area.value = this.markdown;
		area.rows = 14;
		area.setCssProps({ width: "100%" });
		area.addEventListener("input", () => {
			this.markdown = area.value;
		});

		new Setting(contentEl)
			.addButton((button) =>
				button
					.setButtonText("노트에 삽입")
					.setCta()
					.onClick(() => {
						if (this.markdown.trim().length === 0) return;
						this.finish({ markdown: this.markdown });
						this.close();
					}),
			)
			.addButton((button) =>
				button.setButtonText("취소").onClick(() => {
					this.close();
				}),
			);
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
