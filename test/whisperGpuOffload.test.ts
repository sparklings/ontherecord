import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { buildWhisperInferenceArgs } from "../src/whisperCppCpu.ts";
import { normalizeLocalSettings, DEFAULT_LOCAL_SETTINGS } from "../src/settings.ts";

describe("whisper.cpp GPU 오프로딩 및 인수 생성 (3-GPU-01, 3-GPU-02)", () => {
	const defaultOptions = {
		modelPath: "C:\\models\\ggml-base-q5_1.bin",
		audioPath: "C:\\temp\\normalized.wav",
		language: "ko",
		outputBase: "C:\\temp\\transcript",
	};

	it("CPU 전용 모드(device='cpu')일 때 -ng(no GPU) 플래그를 포함해야 한다", () => {
		const args = buildWhisperInferenceArgs({
			...defaultOptions,
			device: "cpu",
		});

		assert.ok(args.includes("-ng"), "'-ng' 플래그가 포함되어야 합니다.");
		assert.ok(!args.includes("-ngl"), "'-ngl' 플래그가 포함되지 않아야 합니다.");
	});

	it("GPU 레이어 오프로드(gpuLayers: 99) 설정 시 -ngl 99를 포함해야 한다", () => {
		const args = buildWhisperInferenceArgs({
			...defaultOptions,
			gpuLayers: 99,
		});

		const nglIndex = args.indexOf("-ngl");
		assert.notEqual(nglIndex, -1, "'-ngl' 플래그가 존재해야 합니다.");
		assert.equal(args[nglIndex + 1], "99", "'-ngl' 다음 인수는 '99'여야 합니다.");
		assert.ok(!args.includes("-ng"), "GPU 오프로드 시 '-ng'는 포함되지 않아야 합니다.");
	});

	it("특정 GPU 장치 번호(gpuDeviceId: 1) 지정 시 -dev 1을 전달해야 한다", () => {
		const args = buildWhisperInferenceArgs({
			...defaultOptions,
			gpuLayers: 32,
			gpuDeviceId: 1,
		});

		const devIndex = args.indexOf("-dev");
		assert.notEqual(devIndex, -1, "'-dev' 플래그가 존재해야 합니다.");
		assert.equal(args[devIndex + 1], "1", "'-dev' 다음 인수는 '1'이어야 합니다.");
	});

	it("기본 GPU 장치 번호(gpuDeviceId: 0) 전달 시에도 정상 포함되어야 한다", () => {
		const args = buildWhisperInferenceArgs({
			...defaultOptions,
			gpuLayers: 99,
			gpuDeviceId: 0,
		});

		const devIndex = args.indexOf("-dev");
		assert.notEqual(devIndex, -1, "'-dev' 플래그가 존재해야 합니다.");
		assert.equal(args[devIndex + 1], "0", "'-dev' 다음 인수는 '0'이어야 합니다.");
	});

	it("비음성 환각 억제 파라미터(-sns)와 GPU 오프로딩이 함께 공존해야 한다", () => {
		const args = buildWhisperInferenceArgs({
			...defaultOptions,
			device: "cuda",
			gpuLayers: 99,
			suppressHallucinations: true,
		});

		assert.ok(args.includes("-sns"), "'-sns'가 포함되어야 합니다.");
		assert.ok(args.includes("-ngl") && args[args.indexOf("-ngl") + 1] === "99", "'-ngl 99'가 포함되어야 합니다.");
	});

	it("normalizeLocalSettings에서 GPU 관련 설정 필드를 올바르게 검증 및 기본값을 제공해야 한다", () => {
		const defaults = normalizeLocalSettings({});
		assert.equal(defaults.gpuBackend, "auto");
		assert.equal(defaults.gpuLayers, 0);
		assert.equal(defaults.gpuDeviceId, 0);

		const custom = normalizeLocalSettings({
			runtimePath: "C:\\whisper.exe",
			modelPath: "C:\\model.bin",
			ffmpegPath: "C:\\ffmpeg.exe",
			gpuBackend: "cuda",
			gpuLayers: 99,
			gpuDeviceId: 0,
		});
		assert.equal(custom.gpuBackend, "cuda");
		assert.equal(custom.gpuLayers, 99);
		assert.equal(custom.gpuDeviceId, 0);
	});

	it("잘못된 GPU 설정 값에 대해 예외를 발생시켜야 한다", () => {
		assert.throws(() => {
			normalizeLocalSettings({ gpuBackend: "invalid-gpu" });
		}, /gpuBackend 설정이 올바르지 않습니다/);

		assert.throws(() => {
			normalizeLocalSettings({ gpuLayers: -1 });
		}, /gpuLayers 설정은 0~999 사이의 정수여야 합니다/);

		assert.throws(() => {
			normalizeLocalSettings({ gpuDeviceId: 100 });
		}, /gpuDeviceId 설정은 0~64 사이의 정수여야 합니다/);
	});
});
