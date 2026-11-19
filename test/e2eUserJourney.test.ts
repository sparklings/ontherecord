import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { applyRecordingSessionToMarkdown, recalculateFrontmatterRecordings } from "../src/noteMetadataHandler.ts";
import { applyAudioEmbedInsertion } from "../src/resultPreview.ts";
import type { TranscriptionResult } from "../src/provider.ts";

test("E2E User Journey: 녹음 연결 -> 백그라운드 전사 결과 삽입 -> 메타데이터 재계산 동기화 (3-UX-03)", async () => {
	// 1. 사용자 노트 생성 시점 (초기 상태)
	let noteContent = `---
title: 2026-11-19 주간 전략 회의
date: 2026-11-19
---

# 회의 안건
1. 신규 기능 출시 일정 점검
2. 로컬 음성 전사 품질 평가
`;

	// 2. 음성 녹음 종료 및 노트 안전 연결 (3-REC-01, 3-REC-02, 3-REC-04)
	const recordingEntry1 = {
		audioPath: "recordings/Meeting_01.m4a",
		seq: 1,
		durationSeconds: 125, // 2분 5초
		sizeBytes: 2.5 * 1024 * 1024, // 2.5 MB
		startedAt: new Date("2026-11-19T10:00:00").getTime(),
		endedAt: new Date("2026-11-19T10:02:05").getTime(),
	};

	noteContent = applyRecordingSessionToMarkdown(noteContent, recordingEntry1);

	// 검증: Frontmatter에 recording 속성이 생성되고, 본문에 ## 녹음 기록 섹션이 추가됨
	assert.match(noteContent, /recording_state: recorded/);
	assert.match(noteContent, /recording_count: 1/);
	assert.match(noteContent, /recording_total_seconds: 125/);
	assert.match(noteContent, /## 녹음 기록/);
	assert.match(noteContent, /!\[\[recordings\/Meeting_01\.m4a\]\]/);

	// 3. 백그라운드 전사 큐 워커 완료 및 본문 자동 삽입 (3-PIPE-01, 3-PIPE-02, 3-PIPE-03)
	const transcriptMarkdown = "- [00:00] 회의를 시작합니다.\n- [00:05] 첫 번째 안건입니다.";
	const lines = noteContent.split(/\r?\n/);
	const lineIdx = lines.findIndex((l) => l.includes(`![[${recordingEntry1.audioPath}]]`));
	assert.ok(lineIdx >= 0, "오디오 임베드 행을 찾아야 함");
	const embedLineText = lines[lineIdx];

	noteContent = applyAudioEmbedInsertion(noteContent, {
		audioPath: recordingEntry1.audioPath,
		markdown: transcriptMarkdown,
		embed: {
			start: { line: lineIdx, ch: 0 },
			end: { line: lineIdx, ch: embedLineText.length },
			link: recordingEntry1.audioPath,
		},
	});

	// 검증: 오디오 임베드 바로 아래에 타임스탬프가 포함된 전사문 블록이 삽입됨
	assert.match(noteContent, /- \[00:00\] 회의를 시작합니다\./);
	assert.match(noteContent, /- \[00:05\] 첫 번째 안건입니다\./);

	// 4. 두 번째 녹음 추가 (3-REC-03 다중 녹음 격리)
	const recordingEntry2 = {
		audioPath: "recordings/Meeting_02.m4a",
		seq: 2,
		durationSeconds: 180, // 3분 0초
		sizeBytes: 3.5 * 1024 * 1024, // 3.5 MB
		startedAt: new Date("2026-11-19T10:30:00").getTime(),
		endedAt: new Date("2026-11-19T10:33:00").getTime(),
	};

	noteContent = applyRecordingSessionToMarkdown(noteContent, recordingEntry2);

	// 검증: 두 번째 녹음 블록이 누적되고 count가 2로 증가하며 첫 번째 전사문이 보존됨
	assert.match(noteContent, /recording_count: 2/);
	assert.match(noteContent, /recording_total_seconds: 305/); // 125 + 180
	assert.match(noteContent, /!\[\[recordings\/Meeting_02\.m4a\]\]/);
	assert.match(noteContent, /- \[00:00\] 회의를 시작합니다\./);

	// 5. 녹음 정보 재계산 명령 실행 (3-REC-05 동기화 무결성)
	const recalculated = recalculateFrontmatterRecordings(noteContent);
	assert.equal(recalculated.count, 2);
	assert.equal(recalculated.totalSeconds, 305);
	assert.equal(recalculated.totalSizeMb, 6.0); // 2.5 + 3.5 MB
});
