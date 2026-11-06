import { createHash } from "crypto";
import { execFile as execFileCallback } from "child_process";
import { createReadStream } from "fs";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import * as path from "path";
import { promisify } from "util";
import { ProviderError } from "./provider.ts";
import type { TranscriptionResult, TranscriptionSegment } from "./provider.ts";

const execFile = promisify(execFileCallback);

export const WHISPER_CPP_CPU_AUDIO_EXTENSIONS = ["m4a", "mp3", "wav", "aac", "ogg", "flac"] as const;
const CPU_AUDIO_EXTENSION_SET = new Set<string>(WHISPER_CPP_CPU_AUDIO_EXTENSIONS);

const EXPECTED_RUNTIME_VERSION = "whisper.cpp version: 1.9.5";
const EXPECTED_RUNTIME_SHA256 = "331dba46d6427105d2b802cdbc7eae916ea1c5abf9b0d3b5cfe460d8db8e4366";
const SMOKE_TEST_TIMEOUT_MS = 5 * 60 * 1000;
const NORMALIZATION_TIMEOUT_MS = 5 * 60 * 1000;

const VERIFIED_MODELS = [
	{
		id: "base",
		quantization: "q5_1",
		sha256: "422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898",
	},
	{
		id: "small",
		quantization: "q5_1",
		sha256: "ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb",
	},
	{
		id: "medium",
		quantization: "q5_0",
		sha256: "19fea4b380c3a618ec4723c3eef2eb785ffba0d0538cf43f8f235e7b3b34220f",
	},
	{
		id: "large-v3-turbo",
		quantization: "q5_0",
		sha256: "394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2",
	},
	{
		id: "large-v3",
		quantization: "q5_0",
		sha256: "d75795ecff3f83b5faa89d1900604ad8c780abd5739fae406de19f23ecd98ad1",
	},
] as const;

interface CommandResult {
	stdout: string;
	stderr: string;
}

interface CommandRunner {
	(filePath: string, args: readonly string[], timeoutMs: number): Promise<CommandResult>;
}

interface CpuRuntimeDependencies {
	hashFile(filePath: string, onProgress: (percent: number) => void): Promise<string>;
	runCommand: CommandRunner;
}

export type CpuSmokeTestStage =
	| "checking-files"
	| "hashing-runtime"
	| "hashing-model"
	| "checking-version"
	| "checking-audio"
	| "normalizing-audio"
	| "transcribing";

export type CpuSmokeTestProgress = (stage: CpuSmokeTestStage, percent?: number) => void;

export interface WhisperCppCpuVerification {
	runtimeVersion: string;
	runtimeSha256: string;
	modelId: string;
	modelQuantization: string;
	modelSha256: string;
}

export function parseWhisperCppJsonOutput(json: string, fallbackLanguage: string): Pick<TranscriptionResult, "language" | "text" | "segments"> {
	let output: unknown;
	try {
		output = JSON.parse(json) as unknown;
	} catch (error) {
		throw new ProviderError("whisper.cpp JSON 결과를 해석할 수 없습니다.", "invalid-output", "whisper-cpp-cpu", asError(error));
	}
	if (!isRecord(output) || !Array.isArray(output.transcription)) {
		throw new ProviderError("whisper.cpp JSON 결과에 transcription 배열이 없습니다.", "invalid-output", "whisper-cpp-cpu");
	}

	const segments: TranscriptionSegment[] = output.transcription.map((item, index) => {
		if (!isRecord(item) || !isRecord(item.offsets)) {
			throw new ProviderError(`whisper.cpp JSON segment ${index + 1}에 offsets가 없습니다.`, "invalid-output", "whisper-cpp-cpu");
		}
		const { from, to } = item.offsets;
		if (
			typeof from !== "number" ||
			!Number.isInteger(from) ||
			typeof to !== "number" ||
			!Number.isInteger(to) ||
			from < 0 ||
			to < from ||
			typeof item.text !== "string"
		) {
			throw new ProviderError(`whisper.cpp JSON segment ${index + 1}의 offsets 또는 text가 올바르지 않습니다.`, "invalid-output", "whisper-cpp-cpu");
		}
		return { startSeconds: from / 100, endSeconds: to / 100, text: item.text };
	});

	const result = isRecord(output.result) ? output.result : null;
	const language = result && typeof result.language === "string" && result.language.trim()
		? result.language.trim()
		: fallbackLanguage;
	return {
		language,
		text: segments.map((segment) => segment.text).join("").trim(),
		segments,
	};
}

const defaultDependencies: CpuRuntimeDependencies = {
	async hashFile(filePath, onProgress) {
		const hash = createHash("sha256");
		const fileSize = (await fs.stat(filePath)).size;
		let bytesRead = 0;
		let lastPercent = -1;
		return await new Promise<string>((resolve, reject) => {
			const stream = createReadStream(filePath);
			stream.on("data", (chunk: Buffer) => {
				hash.update(chunk);
				bytesRead += chunk.length;
				const percent = fileSize > 0 ? Math.floor((bytesRead / fileSize) * 100) : 100;
				if (percent !== lastPercent) {
					lastPercent = percent;
					onProgress(percent);
				}
			});
			stream.on("error", reject);
			stream.on("end", () => resolve(hash.digest("hex")));
		});
	},
	async runCommand(filePath, args, timeoutMs) {
		const result = await execFile(filePath, [...args], {
			timeout: timeoutMs,
			maxBuffer: 1024 * 1024,
			windowsHide: true,
		});
		return { stdout: result.stdout, stderr: result.stderr };
	},
};

export class WhisperCppCpuRuntime {
	private readonly dependencies: CpuRuntimeDependencies;

	constructor(dependencies: CpuRuntimeDependencies = defaultDependencies) {
		this.dependencies = dependencies;
	}

	async verify(
		runtimePath: string,
		modelPath: string,
		onProgress: CpuSmokeTestProgress = () => undefined,
	): Promise<WhisperCppCpuVerification> {
		onProgress("checking-files");
		if (process.platform !== "win32") {
			throw new ProviderError("현재 검증된 whisper.cpp 런타임은 Windows용입니다.", "runtime-unavailable", "whisper-cpp-cpu");
		}
		if (!runtimePath.trim() || !modelPath.trim()) {
			throw new ProviderError("설정에서 런타임 실행 파일과 모델 경로를 모두 지정하세요.", "runtime-unavailable", "whisper-cpp-cpu");
		}

		await assertRegularFile(runtimePath, "런타임 실행 파일");
		await assertRegularFile(modelPath, "모델 파일");

		onProgress("hashing-runtime", 0);
		const runtimeSha256 = await this.dependencies.hashFile(runtimePath, (percent) => onProgress("hashing-runtime", percent));
		if (runtimeSha256 !== EXPECTED_RUNTIME_SHA256) {
			throw new ProviderError(
				`런타임 SHA-256이 기준선과 다릅니다. 확인된 실행 파일의 SHA-256: ${EXPECTED_RUNTIME_SHA256}`,
				"runtime-unavailable",
				"whisper-cpp-cpu",
			);
		}

		onProgress("hashing-model", 0);
		const modelSha256 = await this.dependencies.hashFile(modelPath, (percent) => onProgress("hashing-model", percent));
		const model = VERIFIED_MODELS.find((candidate) => candidate.sha256 === modelSha256);
		if (!model) {
			throw new ProviderError(
				`등록된 기준 모델과 일치하지 않습니다. 계산된 모델 SHA-256: ${modelSha256}`,
				"invalid-model",
				"whisper-cpp-cpu",
			);
		}

		let versionResult: CommandResult;
		onProgress("checking-version");
		try {
			versionResult = await this.dependencies.runCommand(runtimePath, ["--version"], 10_000);
		} catch (error) {
			throw new ProviderError("whisper.cpp 버전을 확인하지 못했습니다.", "runtime-unavailable", "whisper-cpp-cpu", asError(error));
		}
		const versionOutput = `${versionResult.stdout}\n${versionResult.stderr}`;
		const runtimeVersion = versionOutput
			.split(/\r?\n/)
			.map((line) => line.trim())
			.find((line) => line === EXPECTED_RUNTIME_VERSION) ?? versionResult.stdout.trim();
		if (runtimeVersion !== EXPECTED_RUNTIME_VERSION) {
			throw new ProviderError(
				`whisper.cpp 버전이 기준선과 다릅니다. 기대값: ${EXPECTED_RUNTIME_VERSION}; 확인값: ${runtimeVersion || "(출력 없음)"}`,
				"runtime-unavailable",
				"whisper-cpp-cpu",
			);
		}

		return {
			runtimeVersion,
			runtimeSha256,
			modelId: model.id,
			modelQuantization: model.quantization,
			modelSha256,
		};
	}

	async smokeTest(
		runtimePath: string,
		modelPath: string,
		ffmpegPath: string,
		audioPath: string,
		language: string,
		onProgress: CpuSmokeTestProgress = () => undefined,
	): Promise<WhisperCppCpuVerification> {
		const verification = await this.verify(runtimePath, modelPath, onProgress);
		await this.runInference(runtimePath, modelPath, ffmpegPath, audioPath, language, onProgress);
		return verification;
	}

	async transcribe(
		runtimePath: string,
		modelPath: string,
		ffmpegPath: string,
		audioPath: string,
		language: string,
		onProgress: CpuSmokeTestProgress = () => undefined,
	): Promise<TranscriptionResult> {
		const verification = await this.verify(runtimePath, modelPath, onProgress);
		const transcription = await this.runInference(runtimePath, modelPath, ffmpegPath, audioPath, language, onProgress);
		return {
			...transcription,
			engine: {
				providerId: "whisper-cpp-cpu",
				providerVersion: verification.runtimeVersion.replace(/^whisper\.cpp version:\s*/, ""),
				modelId: verification.modelId,
				device: "cpu",
			},
			warnings: [],
		};
	}

	private async runInference(
		runtimePath: string,
		modelPath: string,
		ffmpegPath: string,
		audioPath: string,
		language: string,
		onProgress: CpuSmokeTestProgress,
	): Promise<Pick<TranscriptionResult, "language" | "text" | "segments">> {
		onProgress("checking-audio");
		if (!CPU_AUDIO_EXTENSION_SET.has(path.extname(audioPath).slice(1).toLowerCase())) {
			throw new ProviderError(
				"시험 입력은 M4A, MP3, WAV, AAC, OGG 또는 FLAC이어야 합니다.",
				"unsupported-audio",
				"whisper-cpp-cpu",
			);
		}
		await assertRegularFile(audioPath, "시험 오디오 파일");
		await assertRegularFile(ffmpegPath, "FFmpeg 실행 파일");
		if (language !== "auto" && language !== "ko" && language !== "en") {
			throw new ProviderError("시험 언어 설정이 올바르지 않습니다.", "execution-failed", "whisper-cpp-cpu");
		}

		const temporaryDirectory = await fs.mkdtemp(path.join(tmpdir(), "on-the-record-cpu-test-"));
		const normalizedAudioPath = path.join(temporaryDirectory, "normalized.wav");
		const outputBase = path.join(temporaryDirectory, "transcript");
		let runError: unknown;
		let transcription: Pick<TranscriptionResult, "language" | "text" | "segments"> | null = null;
		try {
			onProgress("normalizing-audio");
			try {
				await this.dependencies.runCommand(
					ffmpegPath,
					[
						"-nostdin",
						"-hide_banner",
						"-loglevel", "error",
						"-y",
						"-i", audioPath,
						"-map", "0:a:0",
						"-map_metadata", "-1",
						"-vn",
						"-ac", "1",
						"-ar", "16000",
						"-c:a", "pcm_s16le",
						"-f", "wav",
						normalizedAudioPath,
					],
					NORMALIZATION_TIMEOUT_MS,
				);
			} catch (error) {
				throw new ProviderError("FFmpeg 오디오 정규화에 실패했습니다. 입력 파일과 디코더를 확인하세요.", "unsupported-audio", "whisper-cpp-cpu", asError(error));
			}
			await assertRegularFile(normalizedAudioPath, "정규화된 오디오 파일");

			onProgress("transcribing");
			await this.dependencies.runCommand(
				runtimePath,
				[
					"-m", modelPath,
					"-f", normalizedAudioPath,
					"-l", language,
					"-t", "4",
					"-np",
					"-oj",
					"-of", outputBase,
				],
				SMOKE_TEST_TIMEOUT_MS,
			);
			const transcriptPath = `${outputBase}.json`;
			await assertRegularFile(transcriptPath, "whisper.cpp JSON 결과 파일");
			try {
				transcription = parseWhisperCppJsonOutput(await fs.readFile(transcriptPath, "utf8"), language);
			} catch (error) {
				if (error instanceof ProviderError) throw error;
				throw new ProviderError("whisper.cpp JSON 결과를 읽지 못했습니다.", "invalid-output", "whisper-cpp-cpu", asError(error));
			}
		} catch (error) {
			runError = error;
		}

		try {
			await fs.rm(temporaryDirectory, { recursive: true, force: true });
		} catch (error) {
			throw new ProviderError(
				"시험용 임시 파일을 삭제하지 못했습니다. 임시 폴더를 직접 확인하세요.",
				"execution-failed",
				"whisper-cpp-cpu",
				asError(error),
			);
		}
		if (runError) {
			if (runError instanceof ProviderError) throw runError;
			throw new ProviderError("whisper.cpp 시험 추론에 실패했습니다.", "execution-failed", "whisper-cpp-cpu", asError(runError));
		}
		if (!transcription) {
			throw new ProviderError("whisper.cpp 전사 결과가 없습니다.", "invalid-output", "whisper-cpp-cpu");
		}
		return transcription;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function assertRegularFile(filePath: string, label: string): Promise<void> {
	let stat;
	try {
		stat = await fs.stat(filePath);
	} catch (error) {
		throw new ProviderError(`${label}을(를) 찾거나 읽을 수 없습니다. 경로와 권한을 확인하세요.`, "runtime-unavailable", "whisper-cpp-cpu", asError(error));
	}
	if (!stat.isFile() || stat.size <= 0) {
		throw new ProviderError(`${label}이(가) 비어 있거나 일반 파일이 아닙니다.`, "runtime-unavailable", "whisper-cpp-cpu");
	}
}

function asError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}
