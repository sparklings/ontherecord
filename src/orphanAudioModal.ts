import type { App, TFile } from "obsidian";
import { Modal, Notice } from "obsidian";
import type { OrphanAudioFileInfo } from "./orphanAudioHandler.ts";

/**
 * 고아 오디오 파일을 검사하고 연결할 수 있는 모달 UI (3-REC-06).
 */
export class OrphanAudioModal extends Modal {
	private orphans: OrphanAudioFileInfo[];
	private onAttach: (audio: OrphanAudioFileInfo, targetFile: TFile) => Promise<void>;

	constructor(
		app: App,
		orphans: OrphanAudioFileInfo[],
		onAttach: (audio: OrphanAudioFileInfo, targetFile: TFile) => Promise<void>,
	) {
		super(app);
		this.orphans = orphans;
		this.onAttach = onAttach;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "고아 녹음 파일 점검" });

		if (this.orphans.length === 0) {
			contentEl.createEl("p", {
				text: "어떤 노트에도 연결되지 않은 고아 녹음 파일이 없습니다. 모든 오디오가 정상 연결되어 있습니다.",
			});
			const closeBtn = contentEl.createEl("button", { text: "닫기" });
			closeBtn.addEventListener("click", () => this.close());
			return;
		}

		contentEl.createEl("p", {
			text: `노트에 연결되지 않은 녹음 파일이 ${this.orphans.length}개 발견되었습니다. 현재 열려 있는 활성 노트에 바로 연결할 수 있습니다.`,
		});

		const listContainer = contentEl.createDiv({ cls: "otr-orphan-list" });

		for (const orphan of this.orphans) {
			const itemDiv = listContainer.createDiv({ cls: "otr-orphan-item" });

			const infoDiv = itemDiv.createDiv();
			infoDiv.createEl("strong", { text: orphan.name });
			const sizeMb = (orphan.sizeBytes / (1024 * 1024)).toFixed(2);
			const dateStr = new Date(orphan.mtime).toLocaleString();
			infoDiv.createDiv({
				text: `경로: ${orphan.path} · 용량: ${sizeMb} MB · 일시: ${dateStr}`,
				cls: "nav-file-tag",
			});

			const attachBtn = itemDiv.createEl("button", { text: "활성 노트에 연결" });
			attachBtn.addEventListener("click", () => {
				void (async () => {
					const activeFile = this.app.workspace.getActiveFile();
					if (!activeFile || activeFile.extension !== "md") {
						new Notice("오디오를 연결할 마크다운 노트를 먼저 열어주세요.");
						return;
					}
					attachBtn.disabled = true;
					attachBtn.textContent = "연결 중...";
					try {
						await this.onAttach(orphan, activeFile);
						new Notice(`'${orphan.name}' 파일이 '${activeFile.name}'에 연결되었습니다.`);
						this.close();
					} catch (err) {
						new Notice(`연결 실패: ${err instanceof Error ? err.message : String(err)}`);
						attachBtn.disabled = false;
						attachBtn.textContent = "활성 노트에 연결";
					}
				})();
			});
		}

		const bottomDiv = contentEl.createDiv();
		const closeBtn = bottomDiv.createEl("button", { text: "닫기" });
		closeBtn.addEventListener("click", () => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
