import { TFile } from "obsidian";
import type { App } from "obsidian";
import { waitForStable } from "./stability";
import type { StabilityOptions, StabilityResult } from "./stability";

export const AUDIO_EXTENSIONS: readonly string[] = ["m4a", "mp3", "wav", "aac", "ogg"];

export interface DetectedRecording {
	file: TFile;
	stability: StabilityResult;
}

export type RecordingHandler = (recording: DetectedRecording) => void;

export class RecordingWatcher {
	private readonly pending = new Map<string, AbortController>();

	constructor(
		private readonly app: App,
		private readonly onStable: RecordingHandler,
		private readonly options: Partial<StabilityOptions> = {},
	) {}

	isAudio(file: unknown): file is TFile {
		return file instanceof TFile && AUDIO_EXTENSIONS.includes(file.extension.toLowerCase());
	}

	/** vault `create` 이벤트에서 호출한다. 레이아웃 준비 전의 초기 로딩 이벤트는 호출 측에서 걸러야 한다. */
	handleCreate(file: unknown): void {
		if (!this.isAudio(file)) return;
		const key = file.path;
		if (this.pending.has(key)) return;

		const controller = new AbortController();
		this.pending.set(key, controller);
		void this.waitAndReport(file, controller);
	}

	handleDelete(file: unknown): void {
		if (file instanceof TFile) this.pending.get(file.path)?.abort();
	}

	handleRename(file: unknown, oldPath: string): void {
		const controller = this.pending.get(oldPath);
		if (!controller) return;
		controller.abort();
		this.handleCreate(file);
	}

	dispose(): void {
		for (const controller of this.pending.values()) controller.abort();
		this.pending.clear();
	}

	private async waitAndReport(file: TFile, controller: AbortController): Promise<void> {
		try {
			const adapter = this.app.vault.adapter;
			const stability = await waitForStable(
				file.path,
				{
					stat: async (path) => {
						const stat = await adapter.stat(path);
						return stat ? { size: stat.size, mtime: stat.mtime } : null;
					},
					now: () => Date.now(),
					sleep: (ms) => new Promise((resolve) => window.setTimeout(resolve, ms)),
					signal: controller.signal,
				},
				this.options,
			);
			if (stability.status === "stable") this.onStable({ file, stability });
			else console.debug(`[on-the-record] 녹음 파일 대기 종료: ${stability.status}`);
		} finally {
			if (this.pending.get(file.path) === controller) this.pending.delete(file.path);
		}
	}
}
