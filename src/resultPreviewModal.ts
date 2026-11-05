import { App, Modal, Setting } from "obsidian";
import type { TranscriptionResult } from "./provider.ts";
import { DEFAULT_RESULT_HEADING, formatResultMarkdown } from "./resultPreview.ts";
import type { ExistingResultChoice } from "./resultPreview.ts";

export interface ApprovedResult {
	markdown: string;
	heading: string;
}

export class ResultPreviewModal extends Modal {
	private resolve: (value: ApprovedResult | null) => void = () => undefined;
	private settled = false;
	private includeTimestamps = true;
	private heading = DEFAULT_RESULT_HEADING;
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
			text: `승인하기 전에는 노트가 수정되지 않습니다. 대상 노트: ${this.targetName}`,
		});
		for (const warning of this.result.warnings) contentEl.createEl("p", { text: `경고: ${warning}` });

		new Setting(contentEl).setName("시간 표시 포함").addToggle((toggle) =>
			toggle.setValue(this.includeTimestamps).onChange((value) => {
				this.includeTimestamps = value;
				this.markdown = formatResultMarkdown(this.result, { includeTimestamps: value });
				this.render();
			}),
		);
		new Setting(contentEl).setName("삽입할 헤딩").addText((text) =>
			text.setValue(this.heading).onChange((value) => {
				this.heading = value;
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
						this.finish({ markdown: this.markdown, heading: this.heading });
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
