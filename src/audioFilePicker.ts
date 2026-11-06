import { FuzzySuggestModal, TFile } from "obsidian";
import type { App } from "obsidian";
import { AUDIO_EXTENSIONS } from "./audioFiles.ts";

export class AudioFilePickerModal extends FuzzySuggestModal<TFile> {
	private readonly supportedExtensions: ReadonlySet<string>;

	constructor(
		app: App,
		private readonly onChoose: (file: TFile) => void,
		supportedExtensions: readonly string[] = AUDIO_EXTENSIONS,
	) {
		super(app);
		this.supportedExtensions = new Set(supportedExtensions.map((extension) => extension.toLowerCase()));
		this.setPlaceholder(
			supportedExtensions === AUDIO_EXTENSIONS
				? "전사할 오디오 파일을 검색하세요"
				: `오디오 파일을 검색하세요 (${supportedExtensions.join(", ")})`,
		);
	}

	getItems(): TFile[] {
		return this.app.vault.getFiles().filter((file) => this.supportedExtensions.has(file.extension.toLowerCase()));
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		this.onChoose(file);
	}
}
