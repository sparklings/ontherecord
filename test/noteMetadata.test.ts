import { strict as assert } from "assert";
import test from "node:test";
import {
	appendRecordingBlockToBody,
	applyRecordingSessionToMarkdown,
	getSessionMarker,
	hasSessionMarkerInBody,
	updateFrontmatterRecordings,
} from "../src/noteMetadataHandler.ts";
import type { RecordingMetadataEntry } from "../src/noteMetadataHandler.ts";

test("updateFrontmatterRecordings: Frontmatter가 없는 문서에 기본 메타데이터를 생성한다", () => {
	const initial = "# 2026-11-19 팀 주간 회의\n\n회의 안건 논의.";
	const entry: RecordingMetadataEntry = {
		audioPath: "recordings/Recording 20261119.m4a",
		seq: 1,
		startedAt: new Date("2026-11-19T10:00:00Z").getTime(),
		endedAt: new Date("2026-11-19T10:15:30Z").getTime(),
		durationSeconds: 930,
		sizeBytes: 15 * 1024 * 1024,
	};

	const updated = updateFrontmatterRecordings(initial, entry);

	assert.match(updated, /^---\r?\n/);
	assert.match(updated, /recording_state:\s*recorded/);
	assert.match(updated, /recordings:\r?\n\s+-\s+"\[\[recordings\/Recording 20261119\.m4a\]\]"/);
	assert.match(updated, /recording_count:\s*1/);
	assert.match(updated, /recording_total_seconds:\s*930/);
	assert.match(updated, /recording_total_size_mb:\s*15/);
	assert.match(updated, /# 2026-11-19 팀 주간 회의/);
});

test("updateFrontmatterRecordings: 기존 Frontmatter 속성을 보존하면서 다중 녹음을 누적 집계한다", () => {
	const initial = [
		"---",
		"title: 전략 기획 회의",
		"tags:",
		"  - meeting",
		"recording_state: recorded",
		"recordings:",
		'  - "[[recordings/rec1.m4a]]"',
		"recording_count: 1",
		"recording_total_seconds: 600",
		"recording_total_size_mb: 10",
		'recording_first_start: "2026-11-19T10:00:00.000Z"',
		'recording_last_end: "2026-11-19T10:10:00.000Z"',
		"---",
		"# 본문 내용",
	].join("\n");

	const entry2: RecordingMetadataEntry = {
		audioPath: "recordings/rec2.m4a",
		seq: 2,
		startedAt: new Date("2026-11-19T10:20:00Z").getTime(),
		endedAt: new Date("2026-11-19T10:35:00Z").getTime(),
		durationSeconds: 900,
		sizeBytes: 12 * 1024 * 1024,
	};

	const updated = updateFrontmatterRecordings(initial, entry2);

	// 기존 태그와 타이틀 보존 확인
	assert.match(updated, /title:\s*전략 기획 회의/);
	// 누적 집계 확인 (1 + 1 = 2개, 600 + 900 = 1500초, 10 + 12 = 22MB)
	assert.match(updated, /recording_count:\s*2/);
	assert.match(updated, /recording_total_seconds:\s*1500/);
	assert.match(updated, /recording_total_size_mb:\s*22/);
	assert.match(updated, /"\[\[recordings\/rec1\.m4a\]\]"/);
	assert.match(updated, /"\[\[recordings\/rec2\.m4a\]\]"/);
	assert.match(updated, /recording_first_start:\s*"2026-11-19T10:00:00\.000Z"/);
});

test("appendRecordingBlockToBody: 세션별 고유 마커와 함께 녹음 블록을 격리 추가한다 (3-REC-03)", () => {
	const initial = "# 2026-11-19 회의\n\n안건 논의";
	const entry: RecordingMetadataEntry = {
		audioPath: "recordings/rec1.m4a",
		seq: 1,
		startedAt: new Date("2026-11-19T10:00:00").getTime(),
		endedAt: new Date("2026-11-19T10:15:30").getTime(),
		durationSeconds: 930,
		sizeBytes: 8.5 * 1024 * 1024,
	};

	const updated = appendRecordingBlockToBody(initial, entry);

	assert.match(updated, /## 녹음 기록/);
	assert.match(updated, /<!-- on-the-record:start audio="recordings\/rec1\.m4a" seq="1" -->/);
	assert.match(updated, /### 녹음 1 · .* \(소요: 15:30 · 8\.50 MB\)/);
	assert.match(updated, /!\[\[recordings\/rec1\.m4a\]\]/);
	assert.match(updated, /<!-- on-the-record:end audio="recordings\/rec1\.m4a" seq="1" -->/);

	// 동일 파일 재호출 시 중복 추가 방지 확인
	const twice = appendRecordingBlockToBody(updated, entry);
	assert.equal(twice, updated);
});

test("appendRecordingBlockToBody: 다중 녹음 블록이 순차 누적되고 각 마커가 격리된다 (3-REC-03)", () => {
	const initial = "# 2026-11-19 회의\n\n안건 논의";
	const entry1: RecordingMetadataEntry = {
		audioPath: "recordings/rec1.m4a",
		seq: 1,
		startedAt: new Date("2026-11-19T10:00:00").getTime(),
		endedAt: new Date("2026-11-19T10:10:00").getTime(),
		durationSeconds: 600,
	};
	const entry2: RecordingMetadataEntry = {
		audioPath: "recordings/rec2.m4a",
		seq: 2,
		startedAt: new Date("2026-11-19T10:15:00").getTime(),
		endedAt: new Date("2026-11-19T10:30:00").getTime(),
		durationSeconds: 900,
	};

	const step1 = appendRecordingBlockToBody(initial, entry1);
	const step2 = appendRecordingBlockToBody(step1, entry2);

	assert.ok(hasSessionMarkerInBody(step2, "recordings/rec1.m4a"));
	assert.ok(hasSessionMarkerInBody(step2, "recordings/rec2.m4a"));
	assert.match(step2, /### 녹음 1/);
	assert.match(step2, /### 녹음 2/);
	assert.match(step2, /!\[\[recordings\/rec1\.m4a\]\]/);
	assert.match(step2, /!\[\[recordings\/rec2\.m4a\]\]/);
});

test("applyRecordingSessionToMarkdown: Frontmatter와 본문 블록을 단일 트랜잭션으로 동시 기록한다 (3-REC-04)", () => {
	const initial = "# 회의록\n\n본문 내용";
	const entry: RecordingMetadataEntry = {
		audioPath: "recordings/meeting.m4a",
		seq: 1,
		startedAt: new Date("2026-11-19T11:00:00Z").getTime(),
		endedAt: new Date("2026-11-19T11:20:00Z").getTime(),
		durationSeconds: 1200,
		sizeBytes: 16 * 1024 * 1024,
	};

	const result = applyRecordingSessionToMarkdown(initial, entry);

	// Frontmatter 확인
	assert.match(result, /^---\r?\n/);
	assert.match(result, /recording_total_seconds:\s*1200/);
	// 본문 블록 확인
	assert.match(result, /## 녹음 기록/);
	assert.match(result, /### 녹음 1/);
	assert.match(result, /!\[\[recordings\/meeting\.m4a\]\]/);
	assert.match(result, /<!-- on-the-record:start audio="recordings\/meeting\.m4a" seq="1" -->/);
});
