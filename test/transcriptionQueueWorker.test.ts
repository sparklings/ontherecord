import { strict as assert } from "assert";
import test from "node:test";
import { RecordingQueue } from "../src/recordingQueue.ts";
import {
	formatStatusBarProgress,
	TranscriptionQueueWorker,
} from "../src/transcriptionQueueWorker.ts";
import type {
	TranscriptionEngine,
	WorkerProgress,
	WorkerSettingsProvider,
} from "../src/transcriptionQueueWorker.ts";
import type { TranscriptionResult } from "../src/provider.ts";

function createMockSettings(): WorkerSettingsProvider {
	return {
		getLocalSettings: () => ({
			runtimePath: "C:/whisper/whisper-cli.exe",
			modelPath: "C:/whisper/ggml-base.bin",
			ffmpegPath: "C:/ffmpeg/ffmpeg.exe",
		}),
		getVaultSettings: () => ({ language: "ko" }),
		resolveFullPath: (p: string) => `C:/vault/${p}`,
	};
}

const DUMMY_RESULT: TranscriptionResult = {
	language: "ko",
	text: "테스트 전사 결과입니다.",
	segments: [{ startSeconds: 0, endSeconds: 2.5, text: "테스트 전사 결과입니다." }],
	engine: { providerId: "test", providerVersion: "1.0", modelId: "base", device: "cpu" },
};

test("formatStatusBarProgress: 진행률에 맞게 텍스트를 정확히 포맷팅한다", () => {
	assert.equal(formatStatusBarProgress(null), "");

	const progress1: WorkerProgress = {
		item: {
			filePath: "recordings/audio1.m4a",
			notePaths: ["notes/note1.md"],
			size: 1024,
			queuedAt: Date.now(),
			status: "processing",
		},
		stage: "transcribing",
		percent: 54.3,
		startedAt: Date.now(),
	};
	assert.equal(formatStatusBarProgress(progress1), "🎙️ 전사 중 [54%]: audio1.m4a");

	const progress2: WorkerProgress = {
		...progress1,
		percent: undefined,
	};
	assert.equal(formatStatusBarProgress(progress2), "🎙️ 전사 중: audio1.m4a");
});

test("TranscriptionQueueWorker: 큐의 항목을 순차적으로 전사하고 완료 이벤트를 전달한다", async () => {
	const queue = new RecordingQueue();
	const completedItems: string[] = [];
	const progressUpdates: Array<number | undefined> = [];

	queue.enqueue({
		filePath: "recordings/item1.m4a",
		notePaths: ["notes/item1.md"],
		size: 2048,
		queuedAt: Date.now(),
		status: "queued",
	});
	queue.enqueue({
		filePath: "recordings/item2.m4a",
		notePaths: ["notes/item2.md"],
		size: 4096,
		queuedAt: Date.now(),
		status: "queued",
	});

	const engine: TranscriptionEngine = {
		transcribe: async (_r, _m, _f, audioPath, _l, onProgress) => {
			onProgress?.("transcribing", 25);
			onProgress?.("transcribing", 100);
			return {
				...DUMMY_RESULT,
				text: `${audioPath} 전사 완료`,
			};
		},
	};

	const worker = new TranscriptionQueueWorker({
		queue,
		engine,
		settingsProvider: createMockSettings(),
		onProgress: (p) => {
			if (p) progressUpdates.push(p.percent);
		},
		onItemCompleted: (item, _res) => {
			completedItems.push(item.filePath);
		},
	});

	worker.start();

	// 작업 완료까지 잠시 대기
	await new Promise((resolve) => setTimeout(resolve, 50));

	assert.equal(completedItems.length, 2);
	assert.deepEqual(completedItems, ["recordings/item1.m4a", "recordings/item2.m4a"]);
	assert.equal(worker.getState(), "idle");
	assert.equal(worker.getProgress(), null);
	assert.ok(progressUpdates.includes(25));
	assert.ok(progressUpdates.includes(100));

	const finalQueue = queue.list();
	assert.equal(finalQueue[0].status, "completed");
	assert.equal(finalQueue[1].status, "completed");

	worker.stop();
});

test("TranscriptionQueueWorker: 엔진 실패 시 큐를 error 상태로 전환하고 onItemError를 호출한다", async () => {
	const queue = new RecordingQueue();
	let reportedError: unknown = null;

	queue.enqueue({
		filePath: "recordings/broken.m4a",
		notePaths: ["notes/broken.md"],
		size: 1024,
		queuedAt: Date.now(),
		status: "queued",
	});

	const engine: TranscriptionEngine = {
		transcribe: async () => {
			throw new Error("FFmpeg decode failure");
		},
	};

	const worker = new TranscriptionQueueWorker({
		queue,
		engine,
		settingsProvider: createMockSettings(),
		onItemError: (_item, err) => {
			reportedError = err;
		},
	});

	worker.start();
	await new Promise((resolve) => setTimeout(resolve, 50));

	assert.ok(reportedError instanceof Error);
	assert.match((reportedError as Error).message, /FFmpeg decode failure/);
	assert.equal(queue.list()[0].status, "error");
	assert.equal(worker.getState(), "idle");

	worker.stop();
});

test("TranscriptionQueueWorker: stop 호출 시 대기 상태로 복귀하고 진행 중 작업을 취소한다", async () => {
	const queue = new RecordingQueue();
	queue.enqueue({
		filePath: "recordings/long.m4a",
		notePaths: ["notes/long.md"],
		size: 9999,
		queuedAt: Date.now(),
		status: "queued",
	});

	let wasAborted = false;
	const engine: TranscriptionEngine = {
		transcribe: async (_r, _m, _f, _a, _l, _p, signal) => {
			return new Promise((resolve, reject) => {
				signal?.addEventListener("abort", () => {
					wasAborted = true;
					reject(new Error("aborted"));
				});
			});
		},
	};

	const worker = new TranscriptionQueueWorker({
		queue,
		engine,
		settingsProvider: createMockSettings(),
	});

	worker.start();
	await new Promise((resolve) => setTimeout(resolve, 20));
	assert.equal(worker.getState(), "processing");

	worker.stop();
	await new Promise((resolve) => setTimeout(resolve, 20));

	assert.equal(worker.getState(), "idle");
	assert.equal(wasAborted, true);
});
