import test from "node:test";
import assert from "node:assert/strict";
import {
	parseTimestampToSeconds,
	parseRecordingsFromBody,
	recalculateFrontmatterRecordings,
} from "../src/noteMetadataHandler.ts";

test("parseTimestampToSeconds: 다양한 타임스탬프 형식을 초 단위로 정확히 파싱한다", () => {
	assert.equal(parseTimestampToSeconds("00:45"), 45);
	assert.equal(parseTimestampToSeconds("02:15"), 135);
	assert.equal(parseTimestampToSeconds("[02:15]"), 135);
	assert.equal(parseTimestampToSeconds("01:23:45"), 5025);
	assert.equal(parseTimestampToSeconds("invalid"), 0);
});

test("parseRecordingsFromBody: 본문 내 상세 녹음 블록과 마커, 임베드를 정확히 파싱한다 (3-REC-05)", () => {
	const markdown = `---
title: 회의록
---

# 회의 내용
회의를 시작합니다.

## 녹음 기록

<!-- on-the-record:start audio="recordings/audio1.m4a" seq="1" -->
### 녹음 1 · 2026-11-19 10:00 (소요: 02:30 · 1.50 MB)
![[recordings/audio1.m4a]]

- [00:10] 안건 논의
<!-- on-the-record:end audio="recordings/audio1.m4a" seq="1" -->

<!-- on-the-record:start audio="recordings/audio2.m4a" seq="2" -->
### 녹음 2 · 2026-11-19 11:00 (소요: 05:00 · 3.20 MB)
![[recordings/audio2.m4a]]
<!-- on-the-record:end audio="recordings/audio2.m4a" seq="2" -->

추가 참고 오디오:
![[samples/extra.mp3]]
`;

	const items = parseRecordingsFromBody(markdown);
	assert.equal(items.length, 3);
	assert.equal(items[0].audioPath, "recordings/audio1.m4a");
	assert.equal(items[0].durationSeconds, 150);
	assert.equal(items[0].sizeMb, 1.5);

	assert.equal(items[1].audioPath, "recordings/audio2.m4a");
	assert.equal(items[1].durationSeconds, 300);
	assert.equal(items[1].sizeMb, 3.2);

	assert.equal(items[2].audioPath, "samples/extra.mp3");
	assert.equal(items[2].durationSeconds, 0); // 단순 임베드는 기본 0초
});

test("recalculateFrontmatterRecordings: 본문 상태를 기반으로 Frontmatter를 완전 동기화한다 (3-REC-05)", () => {
	const markdown = `---
recording_state: recorded
recordings:
  - "[[old-deleted.m4a]]"
recording_count: 99
recording_total_seconds: 9999
---

## 녹음 기록
### 녹음 1 · 2026-11-19 10:00 (소요: 01:30 · 2.00 MB)
![[audio1.m4a]]

### 녹음 2 · 2026-11-19 11:00 (소요: 02:00 · 3.00 MB)
![[audio2.m4a]]
`;

	const result = recalculateFrontmatterRecordings(markdown);
	assert.equal(result.count, 2);
	assert.equal(result.totalSeconds, 210); // 90초 + 120초
	assert.equal(result.totalSizeMb, 5.0);
	assert.deepEqual(result.recordings, ['"[[audio1.m4a]]"', '"[[audio2.m4a]]"']);

	assert.match(result.updatedMarkdown, /recording_count: 2/);
	assert.match(result.updatedMarkdown, /recording_total_seconds: 210/);
	assert.match(result.updatedMarkdown, /recording_total_size_mb: 5/);
	assert.doesNotMatch(result.updatedMarkdown, /old-deleted\.m4a/);
});

test("recalculateFrontmatterRecordings: 녹음이 없는 경우 recording 속성을 안전하게 정리한다", () => {
	const markdown = `---
title: 일반 메모
recording_state: recorded
recording_count: 1
---

녹음이 전혀 없는 일반 텍스트 메모입니다.
`;

	const result = recalculateFrontmatterRecordings(markdown);
	assert.equal(result.count, 0);
	assert.equal(result.totalSeconds, 0);
	assert.match(result.updatedMarkdown, /title: 일반 메모/);
	assert.doesNotMatch(result.updatedMarkdown, /recording_state/);
	assert.doesNotMatch(result.updatedMarkdown, /recording_count/);
});
