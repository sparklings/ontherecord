import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { parseWhisperCppJsonOutput, WhisperCppCpuRuntime } from "../src/whisperCppCpu.ts";

const runtimeHash = "331dba46d6427105d2b802cdbc7eae916ea1c5abf9b0d3b5cfe460d8db8e4366";
const baseModelHash = "422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898";
const runtimeVersion = "whisper.cpp version: 1.9.5";

async function createFixture() {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "otr-whisper-cpu-test-"));
	const runtimePath = path.join(directory, "whisper-cli.exe");
	const modelPath = path.join(directory, "ggml-base-q5_1.bin");
	const ffmpegPath = path.join(directory, "ffmpeg.exe");
	const audioPath = path.join(directory, "sample.m4a");
	await Promise.all([
		fs.writeFile(runtimePath, "runtime"),
		fs.writeFile(modelPath, "model"),
		fs.writeFile(ffmpegPath, "ffmpeg"),
		fs.writeFile(audioPath, "audio"),
	]);
	return { directory, runtimePath, modelPath, ffmpegPath, audioPath };
}

test("known runtime and model are verified, audio is normalized, and all temporary output is removed", async () => {
	const fixture = await createFixture();
	let inferenceOutputBase = "";
	let normalizedAudioPath = "";
	let inferenceAudioPath = "";
	let inferenceArgs: readonly string[] = [];
	let normalizationArgs: readonly string[] = [];
	const stages: string[] = [];
	try {
		const runtime = new WhisperCppCpuRuntime({
			hashFile: async (filePath) => filePath === fixture.runtimePath ? runtimeHash : baseModelHash,
			runCommand: async (filePath, args) => {
				if (args[0] === "--version") return { stdout: runtimeVersion, stderr: "" };
				if (filePath === fixture.ffmpegPath) {
					normalizationArgs = args;
					normalizedAudioPath = args[args.length - 1];
					await fs.writeFile(normalizedAudioPath, "normalized pcm wav");
					return { stdout: "", stderr: "" };
				}
				inferenceAudioPath = args[args.indexOf("-f") + 1];
				inferenceArgs = args;
				const outputBase = args[args.indexOf("-of") + 1];
				if (!outputBase) throw new Error("Missing output path");
				inferenceOutputBase = outputBase;
				await fs.writeFile(`${inferenceOutputBase}.json`, JSON.stringify({
					result: { language: "ko" },
					transcription: [{ offsets: { from: 0, to: 125 }, text: "비공개 전사문" }],
				}));
				return { stdout: "", stderr: "" };
			},
		});

		const result = await runtime.smokeTest(
			fixture.runtimePath,
			fixture.modelPath,
			fixture.ffmpegPath,
			fixture.audioPath,
			"ko",
			(stage) => stages.push(stage),
		);

		assert.equal(result.runtimeSha256, runtimeHash);
		assert.equal(result.modelId, "base");
		assert.equal(result.modelQuantization, "q5_1");
		assert.equal(result.modelSha256, baseModelHash);
		assert.ok(stages.includes("hashing-runtime"));
		assert.ok(stages.includes("hashing-model"));
		assert.ok(stages.includes("normalizing-audio"));
		assert.ok(stages.includes("transcribing"));
		assert.ok(inferenceArgs.includes("-oj"));
		assert.ok(normalizationArgs.includes("0:a:0"));
		assert.ok(normalizationArgs.includes("16000"));
		assert.ok(normalizationArgs.includes("pcm_s16le"));
		assert.equal(inferenceAudioPath, normalizedAudioPath);
		await assert.rejects(fs.stat(`${inferenceOutputBase}.json`), { code: "ENOENT" });
		await assert.rejects(fs.stat(normalizedAudioPath), { code: "ENOENT" });
	} finally {
		await fs.rm(fixture.directory, { recursive: true, force: true });
	}
});

test("transcription returns whisper.cpp segment offsets as seconds and removes temporary output", async () => {
	const fixture = await createFixture();
	let inferenceOutputBase = "";
	try {
		const runtime = new WhisperCppCpuRuntime({
			hashFile: async (filePath) => filePath === fixture.runtimePath ? runtimeHash : baseModelHash,
			runCommand: async (filePath, args) => {
				if (args[0] === "--version") return { stdout: runtimeVersion, stderr: "" };
				if (filePath === fixture.ffmpegPath) {
					await fs.writeFile(args[args.length - 1], "normalized pcm wav");
					return { stdout: "", stderr: "" };
				}
				inferenceOutputBase = args[args.indexOf("-of") + 1];
				await fs.writeFile(`${inferenceOutputBase}.json`, JSON.stringify({
					result: { language: "ko" },
					transcription: [
						{ offsets: { from: 0, to: 125 }, text: "첫 문장 " },
						{ offsets: { from: 125, to: 280 }, text: "두 번째 문장" },
					],
				}));
				return { stdout: "", stderr: "" };
			},
		});

		const result = await runtime.transcribe(
			fixture.runtimePath,
			fixture.modelPath,
			fixture.ffmpegPath,
			fixture.audioPath,
			"auto",
		);

		assert.equal(result.language, "ko");
		assert.equal(result.text, "첫 문장 두 번째 문장");
		assert.deepEqual(result.segments, [
			{ startSeconds: 0, endSeconds: 1.25, text: "첫 문장 " },
			{ startSeconds: 1.25, endSeconds: 2.8, text: "두 번째 문장" },
		]);
		assert.deepEqual(result.engine, {
			providerId: "whisper-cpp-cpu",
			providerVersion: "1.9.5",
			modelId: "base",
			device: "cpu",
		});
		assert.deepEqual(result.warnings, []);
		await assert.rejects(fs.stat(`${inferenceOutputBase}.json`), { code: "ENOENT" });
	} finally {
		await fs.rm(fixture.directory, { recursive: true, force: true });
	}
});

test("malformed whisper.cpp segment offsets are rejected", () => {
	assert.throws(
		() => parseWhisperCppJsonOutput(JSON.stringify({
			transcription: [{ offsets: { from: 150, to: 100 }, text: "invalid" }],
		}), "ko"),
		(error: unknown) => error instanceof Error && error.message.includes("offsets 또는 text"),
	);
});

test("normalization failure prevents inference and removes temporary files", async () => {
	const fixture = await createFixture();
	let inferenceCount = 0;
	let normalizationOutput = "";
	try {
		const runtime = new WhisperCppCpuRuntime({
			hashFile: async (filePath) => filePath === fixture.runtimePath ? runtimeHash : baseModelHash,
			runCommand: async (filePath, args) => {
				if (args[0] === "--version") return { stdout: runtimeVersion, stderr: "" };
				if (filePath === fixture.ffmpegPath) {
					normalizationOutput = args[args.length - 1];
					throw new Error("decoder failure");
				}
				if (args.includes("-f")) {
					inferenceCount += 1;
					return { stdout: "", stderr: "" };
				}
				throw new Error("Unexpected command");
			},
		});

		await assert.rejects(
			runtime.smokeTest(fixture.runtimePath, fixture.modelPath, fixture.ffmpegPath, fixture.audioPath, "ko"),
			(error: unknown) => error instanceof Error && error.message.includes("FFmpeg 오디오 정규화"),
		);
		assert.equal(inferenceCount, 0);
		await assert.rejects(fs.stat(normalizationOutput), { code: "ENOENT" });
	} finally {
		await fs.rm(fixture.directory, { recursive: true, force: true });
	}
});

test("unknown runtime and model hashes are rejected before inference", async () => {
	const fixture = await createFixture();
	try {
		let runCount = 0;
		const runtime = new WhisperCppCpuRuntime({
			hashFile: async () => "0".repeat(64),
			runCommand: async () => {
				runCount += 1;
				return { stdout: runtimeVersion, stderr: "" };
			},
		});

		await assert.rejects(
			runtime.verify(fixture.runtimePath, fixture.modelPath),
			(error: unknown) => error instanceof Error && error.message.includes("런타임 SHA-256"),
		);
		assert.equal(runCount, 0);

		const modelMismatch = new WhisperCppCpuRuntime({
			hashFile: async (filePath) => filePath === fixture.runtimePath ? runtimeHash : "0".repeat(64),
			runCommand: async () => ({ stdout: runtimeVersion, stderr: "" }),
		});
		await assert.rejects(
			modelMismatch.verify(fixture.runtimePath, fixture.modelPath),
			(error: unknown) => error instanceof Error && error.message.includes("등록된 기준 모델"),
		);
	} finally {
		await fs.rm(fixture.directory, { recursive: true, force: true });
	}
});

test("runtime version mismatch and unsupported audio format fail explicitly", async () => {
	const fixture = await createFixture();
	try {
		const versionMismatch = new WhisperCppCpuRuntime({
			hashFile: async (filePath) => filePath === fixture.runtimePath ? runtimeHash : baseModelHash,
			runCommand: async () => ({ stdout: "whisper.cpp version: 1.8.0", stderr: "" }),
		});
		await assert.rejects(
			versionMismatch.verify(fixture.runtimePath, fixture.modelPath),
			(error: unknown) => error instanceof Error && error.message.includes("버전이 기준선과 다릅니다"),
		);

		const supportedRuntime = new WhisperCppCpuRuntime({
			hashFile: async (filePath) => filePath === fixture.runtimePath ? runtimeHash : baseModelHash,
			runCommand: async () => ({ stdout: runtimeVersion, stderr: "" }),
		});
		await assert.rejects(
			supportedRuntime.smokeTest(
				fixture.runtimePath,
				fixture.modelPath,
				fixture.ffmpegPath,
				path.join(fixture.directory, "sample.wma"),
				"ko",
			),
			(error: unknown) => error instanceof Error && error.message.includes("M4A, MP3, WAV"),
		);
	} finally {
		await fs.rm(fixture.directory, { recursive: true, force: true });
	}
});
