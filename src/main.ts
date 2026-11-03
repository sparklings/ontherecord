import { Notice, Plugin } from "obsidian";
import { RecordingWatcher } from "./recordingWatcher";

export default class OnTheRecordPlugin extends Plugin {
	private watcher: RecordingWatcher | null = null;

	onload(): void {
		const watcher = new RecordingWatcher(this.app, ({ file, stability }) => {
			const kb = stability.size === null ? "?" : Math.round(stability.size / 1024).toString();
			console.debug(
				`[on-the-record] 녹음 파일 안정화: .${file.extension}, ${kb} KB, 대기 ${Math.round(stability.waitedMs / 1000)}초, 변경 ${stability.changes}회`,
			);
			new Notice(`녹음 파일을 감지했습니다: ${file.name}`);
		});
		this.watcher = watcher;

		// 볼트 초기 로딩 중의 create 이벤트(기존 파일)는 무시하고, 준비된 뒤 생성되는 파일만 감지한다.
		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(this.app.vault.on("create", (file) => watcher.handleCreate(file)));
			this.registerEvent(this.app.vault.on("delete", (file) => watcher.handleDelete(file)));
			this.registerEvent(
				this.app.vault.on("rename", (file, oldPath) => watcher.handleRename(file, oldPath)),
			);
		});
	}

	onunload(): void {
		this.watcher?.dispose();
		this.watcher = null;
	}
}
