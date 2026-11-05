import { FuzzySuggestModal, TFile } from "obsidian";
import type { App } from "obsidian";
import { isSupportedAudioExtension } from "./audioFiles.ts";

export class AudioFilePickerModal extends FuzzySuggestModal<TFile> {
	constructor(
		app: App,
		private readonly onChoose: (file: TFile) => void,
	) {
		super(app);
		this.setPlaceholder("전사할 오디오 파일을 검색하세요");
	}

	getItems(): TFile[] {
		return this.app.vault.getFiles().filter((file) => isSupportedAudioExtension(file.extension));
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		this.onChoose(file);
	}
}
