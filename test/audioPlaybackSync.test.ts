import test from "node:test";
import assert from "node:assert/strict";
import { TIMESTAMP_REGEX, syncAudioPlayback } from "../src/audioPlaybackSync.ts";

test("TIMESTAMP_REGEX: 마크다운 전사문의 타임스탬프 패턴을 정확히 매칭한다 (3-PIPE-03)", () => {
	const text = "- [02:15] 안녕하세요 회의를 시작합니다. [01:23:45] 다음 안건입니다.";
	const matches = [...text.matchAll(TIMESTAMP_REGEX)].map((m) => m[1]);

	assert.deepEqual(matches, ["02:15", "01:23:45"]);
});

test("syncAudioPlayback: audio 요소의 currentTime을 설정하고 play를 호출한다 (3-PIPE-03)", () => {
	let played = false;
	const mockAudio = {
		currentTime: 0,
		play: () => {
			played = true;
			return Promise.resolve();
		},
	} as unknown as HTMLAudioElement;

	const success = syncAudioPlayback(mockAudio, 135);
	assert.equal(success, true);
	assert.equal(mockAudio.currentTime, 135);
	assert.equal(played, true);
});
