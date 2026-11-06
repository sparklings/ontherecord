import { MarkdownView, Modal, Setting, TFile } from "obsidian";
import type { App } from "obsidian";
import type { TranscriptSearchMatch } from "./transcriptSearch.ts";

export class TranscriptSearchModal extends Modal {
	constructor(
		app: App,
		private readonly savedTerms: readonly string[],
		private readonly search: (query: string) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle("전사문 검색");
		this.contentEl.createEl("p", {
			text: "저장된 전사 결과의 segment에서 검색어를 찾고 해당 timestamp 위치로 이동합니다.",
		});
		const input = this.contentEl.createEl("input", {
			type: "text",
			placeholder: "검색어 입력",
		});
		input.setAttribute("list", "otr-transcript-search-terms");
		input.addEventListener("keydown", (event) => {
			if (event.key === "Enter") this.submit(input.value);
		});
		const suggestions = this.contentEl.createEl("datalist", { attr: { id: "otr-transcript-search-terms" } });
		for (const term of this.savedTerms) suggestions.createEl("option", { attr: { value: term } });

		new Setting(this.contentEl)
			.addButton((button) =>
				button
					.setButtonText("검색")
					.setCta()
					.onClick(() => this.submit(input.value)),
			)
			.addButton((button) => button.setButtonText("취소").onClick(() => this.close()));
		input.focus();
	}

	private submit(query: string): void {
		if (!query.trim()) return;
		this.close();
		this.search(query.trim());
	}
}

export class TranscriptSearchResultsModal extends Modal {
	constructor(
		app: App,
		private readonly query: string,
		private readonly matches: readonly TranscriptSearchMatch[],
		private readonly openMatch: (match: TranscriptSearchMatch) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(`전사문 검색 결과: ${this.query}`);
		if (this.matches.length === 0) {
			this.contentEl.createEl("p", { text: "일치하는 전사 segment가 없습니다." });
			return;
		}
		this.contentEl.createEl("p", { text: `${this.matches.length}개 segment에서 찾았습니다.` });
		for (const match of this.matches) {
			new Setting(this.contentEl)
				.setName(`${match.notePath} · ${match.timestamp}`)
				.setDesc(`${match.audioPath}\n${match.text}`)
				.addButton((button) =>
					button.setButtonText("열기").onClick(() => {
						this.close();
						this.openMatch(match);
					}),
				);
		}
	}
}

export async function openTranscriptMatch(app: App, match: TranscriptSearchMatch): Promise<void> {
	const file = app.vault.getAbstractFileByPath(match.notePath);
	if (!(file instanceof TFile)) throw new Error(`검색 결과 노트를 찾을 수 없습니다: ${match.notePath}`);

	const leaf = app.workspace.getLeaf(false);
	await leaf.openFile(file);
	if (!(leaf.view instanceof MarkdownView)) {
		throw new Error(`검색 결과 노트를 Markdown 편집기로 열지 못했습니다: ${match.notePath}`);
	}
	const position = { line: match.line, ch: 0 };
	leaf.view.editor.setCursor(position);
	leaf.view.editor.scrollIntoView({ from: position, to: position }, true);
}
