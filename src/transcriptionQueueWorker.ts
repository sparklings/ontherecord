import type { QueuedRecording, RecordingQueue } from "./recordingQueue.ts";
import type { TranscriptionResult } from "./provider.ts";

export type WorkerState = "idle" | "processing" | "paused";

export interface WorkerProgress {
	item: QueuedRecording;
	stage: string;
	percent?: number;
	startedAt: number;
}

export interface TranscriptionEngine {
	transcribe(
		runtimePath: string,
		modelPath: string,
		ffmpegPath: string,
		audioFullPath: string,
		language: string,
		onProgress?: (stage: string, percent?: number) => void,
		signal?: AbortSignal,
		gpuOptions?: { gpuBackend?: string; gpuLayers?: number; gpuDeviceId?: number },
	): Promise<TranscriptionResult>;
}

export interface WorkerSettingsProvider {
	getLocalSettings(): {
		runtimePath: string;
		modelPath: string;
		ffmpegPath: string;
		gpuBackend?: string;
		gpuLayers?: number;
		gpuDeviceId?: number;
	} | null;
	getVaultSettings(): { language: string };
	resolveFullPath(vaultRelativePath: string): string | null;
}

export interface TranscriptionQueueWorkerOptions {
	queue: RecordingQueue;
	engine: TranscriptionEngine;
	settingsProvider: WorkerSettingsProvider;
	onProgress?: (progress: WorkerProgress | null) => void;
	onItemCompleted?: (item: QueuedRecording, result: TranscriptionResult) => Promise<void> | void;
	onItemError?: (item: QueuedRecording, error: unknown) => void;
	onStateChange?: (state: WorkerState) => void;
}

export function formatStatusBarProgress(progress: WorkerProgress | null): string {
	if (!progress) return "";
	const filename = progress.item.filePath.split("/").pop() ?? progress.item.filePath;
	const percentStr = progress.percent !== undefined ? ` [${Math.round(progress.percent)}%]` : "";
	return `🎙️ 전사 중${percentStr}: ${filename}`;
}

export class TranscriptionQueueWorker {
	private readonly queue: RecordingQueue;
	private readonly engine: TranscriptionEngine;
	private readonly settingsProvider: WorkerSettingsProvider;
	private readonly onProgress?: (progress: WorkerProgress | null) => void;
	private readonly onItemCompleted?: (item: QueuedRecording, result: TranscriptionResult) => Promise<void> | void;
	private readonly onItemError?: (item: QueuedRecording, error: unknown) => void;
	private readonly onStateChange?: (state: WorkerState) => void;

	private state: WorkerState = "idle";
	private currentProgress: WorkerProgress | null = null;
	private activeAbortController: AbortController | null = null;
	private isRunning = false;
	private loopPromise: Promise<void> | null = null;

	constructor(options: TranscriptionQueueWorkerOptions) {
		this.queue = options.queue;
		this.engine = options.engine;
		this.settingsProvider = options.settingsProvider;
		this.onProgress = options.onProgress;
		this.onItemCompleted = options.onItemCompleted;
		this.onItemError = options.onItemError;
		this.onStateChange = options.onStateChange;
	}

	getState(): WorkerState {
		return this.state;
	}

	getProgress(): WorkerProgress | null {
		return this.currentProgress;
	}

	start(): void {
		if (this.isRunning) return;
		this.isRunning = true;
		this.trigger();
	}

	stop(): void {
		this.isRunning = false;
		if (this.activeAbortController) {
			this.activeAbortController.abort();
			this.activeAbortController = null;
		}
		this.setState("idle");
		this.setProgress(null);
	}

	trigger(): void {
		if (!this.isRunning) return;
		if (this.loopPromise !== null) return;

		this.loopPromise = this.processNextItems().finally(() => {
			this.loopPromise = null;
			if (this.isRunning && this.hasQueuedItem()) {
				this.trigger();
			}
		});
	}

	private hasQueuedItem(): boolean {
		return this.queue.list().some((item) => item.status === "queued");
	}

	private setState(state: WorkerState): void {
		if (this.state !== state) {
			this.state = state;
			this.onStateChange?.(state);
		}
	}

	private setProgress(progress: WorkerProgress | null): void {
		this.currentProgress = progress;
		this.onProgress?.(progress);
	}

	private async processNextItems(): Promise<void> {
		while (this.isRunning) {
			const queuedItems = this.queue.list().filter((item) => item.status === "queued");
			if (queuedItems.length === 0) {
				this.setState("idle");
				this.setProgress(null);
				break;
			}

			const nextItem = queuedItems[0];
			await this.processItem(nextItem);
		}
	}

	private async processItem(item: QueuedRecording): Promise<void> {
		const localSettings = this.settingsProvider.getLocalSettings();
		if (!localSettings || !localSettings.runtimePath || !localSettings.modelPath || !localSettings.ffmpegPath) {
			this.queue.update(item.filePath, { status: "error" });
			this.onItemError?.(item, new Error("PC별 로컬 런타임/모델/ffmpeg 설정이 누락되었습니다."));
			return;
		}

		const fullPath = this.settingsProvider.resolveFullPath(item.filePath);
		if (!fullPath) {
			this.queue.update(item.filePath, { status: "error" });
			this.onItemError?.(item, new Error(`파일 절대 경로를 확인할 수 없습니다: ${item.filePath}`));
			return;
		}

		this.setState("processing");
		this.queue.update(item.filePath, { status: "processing" });

		const startedAt = Date.now();
		this.setProgress({
			item,
			stage: "starting",
			percent: 0,
			startedAt,
		});

		const controller = new AbortController();
		this.activeAbortController = controller;

		try {
			const vaultSettings = this.settingsProvider.getVaultSettings();
			const result = await this.engine.transcribe(
				localSettings.runtimePath,
				localSettings.modelPath,
				localSettings.ffmpegPath,
				fullPath,
				vaultSettings.language,
				(stage, percent) => {
					this.setProgress({
						item,
						stage,
						percent,
						startedAt,
					});
				},
				controller.signal,
				{
					gpuBackend: localSettings.gpuBackend,
					gpuLayers: localSettings.gpuLayers,
					gpuDeviceId: localSettings.gpuDeviceId,
				},
			);

			if (controller.signal.aborted) {
				this.queue.update(item.filePath, { status: "cancelled" });
				return;
			}

			this.queue.update(item.filePath, { status: "completed" });
			this.setProgress(null);

			if (this.onItemCompleted) {
				await this.onItemCompleted(item, result);
			}
		} catch (error) {
			if (controller.signal.aborted) {
				this.queue.update(item.filePath, { status: "cancelled" });
			} else {
				this.queue.update(item.filePath, { status: "error" });
				this.onItemError?.(item, error);
			}
		} finally {
			this.activeAbortController = null;
			this.setProgress(null);
		}
	}
}
