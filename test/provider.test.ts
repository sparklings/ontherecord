import test from "node:test";
import assert from "node:assert/strict";
import { ProviderError } from "../src/provider.ts";

test("provider 오류는 공통 코드와 provider 식별자를 유지한다", () => {
	const cause = new Error("runtime exited");
	const error = new ProviderError("전사 실행에 실패했습니다.", "execution-failed", "whisper-cpp-cpu", cause);

	assert.equal(error.name, "ProviderError");
	assert.equal(error.code, "execution-failed");
	assert.equal(error.providerId, "whisper-cpp-cpu");
	assert.equal(error.cause, cause);
	assert.ok(error instanceof Error);
});
