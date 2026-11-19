import test from "node:test";
import * as assert from "node:assert/strict";
import { parseAudioEmbedsFromMarkdown } from "../src/noteAudioExplorer.ts";

test("parseAudioEmbedsFromMarkdown: 다중 오디오 임베드 및 Line N 탐색 검증 (3-UX-05, 3-PIPE-05)", () => {
	const markdown = `# 2026-11-20 기획 회의록

첫 번째 토론 내용입니다.
![[Recording 20261120_1.m4a]]

두 번째 세션 시작
![[subfolder/Recording 20261120_2.wav|두번째 녹음]]

<!-- on-the-record:start audio="Recording 20261120_1.m4a" -->
- [00:01] 이미 전사된 내용
<!-- on-the-record:end audio="Recording 20261120_1.m4a" -->

세 번째 녹음
![[Meeting 3.mp3]]`;

	const items = parseAudioEmbedsFromMarkdown(markdown);
	assert.equal(items.length, 3);

	// 첫 번째 오디오
	assert.equal(items[0].filename, "Recording 20261120_1.m4a");
	assert.equal(items[0].lineNumber, 4);
	assert.equal(items[0].transcribed, true);

	// 두 번째 오디오
	assert.equal(items[1].filename, "Recording 20261120_2.wav");
	assert.equal(items[1].lineNumber, 7);
	assert.equal(items[1].transcribed, false);

	// 세 번째 오디오
	assert.equal(items[2].filename, "Meeting 3.mp3");
	assert.equal(items[2].lineNumber, 14);
	assert.equal(items[2].transcribed, false);
});

test("parseAudioEmbedsFromMarkdown: 오디오가 없는 일반 마크다운 노트", () => {
	const markdown = `# 일반 노트\n- 이미지 ![[image.png]]\n- 문서 [[다른노트.md]]`;
	const items = parseAudioEmbedsFromMarkdown(markdown);
	assert.equal(items.length, 0);
});
