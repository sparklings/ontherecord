import test from "node:test";
import assert from "node:assert/strict";
import { AUDIO_EXTENSIONS, isSupportedAudioExtension } from "../src/audioFiles.ts";

test("지원 오디오 확장자만 대소문자 구분 없이 허용한다", () => {
	for (const extension of AUDIO_EXTENSIONS) {
		assert.equal(isSupportedAudioExtension(extension), true);
		assert.equal(isSupportedAudioExtension(extension.toUpperCase()), true);
	}

	assert.equal(isSupportedAudioExtension("flac"), false);
	assert.equal(isSupportedAudioExtension(""), false);
});
