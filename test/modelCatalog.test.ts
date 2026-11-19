import test from "node:test";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import {
	SUPPORTED_MODELS,
	getModelMetadata,
	getDefaultModelStorageDir,
	resolveModelExpectedPath,
	checkModelFileInstalled,
	buildModelDownloadCommand,
} from "../src/modelCatalog.ts";

test("SUPPORTED_MODELS: 5개 공식 모델 메타데이터 정의 검증 (3-UX-08)", () => {
	assert.equal(SUPPORTED_MODELS.length, 5);
	const ids = SUPPORTED_MODELS.map((m) => m.id);
	assert.deepEqual(ids, ["base", "small", "medium", "large-v3-turbo", "large-v3"]);

	// Medium 모델이 기본 권장(recommended = true)이어야 함
	const medium = getModelMetadata("medium");
	assert.equal(medium.recommended, true);
	assert.equal(medium.filename, "ggml-medium-q5_0.bin");
	assert.ok(medium.huggingFaceUrl.includes("huggingface.co"));
	assert.ok(medium.sizeMb > 500);
});

test("getModelMetadata: 존재하지 않는 id 요청 시 기본 fallback 모델(base) 반환", () => {
	const fallback = getModelMetadata("non-existent-model");
	assert.equal(fallback.id, "base");
});

test("getDefaultModelStorageDir 및 resolveModelExpectedPath 경로 검증", () => {
	const storageDir = getDefaultModelStorageDir();
	assert.ok(storageDir.endsWith(path.join("on-the-record-dev", "models")));

	const mediumPath = resolveModelExpectedPath("medium");
	assert.equal(mediumPath, path.join(storageDir, "ggml-medium-q5_0.bin"));
});

test("buildModelDownloadCommand: PowerShell 다운로드 원클릭 명령어 생성 검증", () => {
	const cmd = buildModelDownloadCommand("medium");
	assert.ok(cmd.includes("Invoke-WebRequest"));
	assert.ok(cmd.includes("ggml-medium-q5_0.bin"));
	assert.ok(cmd.includes("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q5_0.bin"));
});

test("checkModelFileInstalled: 모델 설치 여부 감지", () => {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "otr-model-test-"));
	try {
		const dummyModelPath = path.join(tmpDir, "ggml-medium-q5_0.bin");
		fs.writeFileSync(dummyModelPath, "dummy content");

		// 현재 설정된 경로가 존재하고 매칭되는 경우
		const res1 = checkModelFileInstalled("medium", dummyModelPath);
		assert.equal(res1.installed, true);
		assert.equal(res1.resolvedPath, dummyModelPath);
		assert.ok(res1.sizeBytes && res1.sizeBytes > 0);

		// 존재하지 않는 경로인 경우
		const res2 = checkModelFileInstalled("large-v3", "C:\\non-existent\\ggml-large-v3.bin");
		assert.equal(res2.installed, false);
	} finally {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	}
});
