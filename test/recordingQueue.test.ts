import test from "node:test";
import assert from "node:assert/strict";
import { RecordingQueue } from "../src/recordingQueue.ts";

const job = {
	filePath: "Meetings/recording.m4a",
	notePaths: ["Meetings/notes.md"],
	size: 128,
	queuedAt: 123,
	status: "queued" as const,
};

test("대기열은 파일 경로별 중복 항목을 거부한다", () => {
	const queue = new RecordingQueue();
	assert.equal(queue.enqueue(job), true);
	assert.equal(queue.enqueue(job), false);
	assert.equal(queue.list().length, 1);
});

test("삭제와 이름 변경을 대기열에 반영한다", () => {
	const queue = new RecordingQueue();
	queue.enqueue(job);
	queue.rename(job.filePath, "Meetings/renamed.m4a");
	assert.equal(queue.has(job.filePath), false);
	assert.equal(queue.has("Meetings/renamed.m4a"), true);
	assert.equal(queue.remove("Meetings/renamed.m4a"), true);
	assert.equal(queue.list().length, 0);
});

test("목록은 내부 대기열의 note 경로를 외부 변경으로부터 보호한다", () => {
	const queue = new RecordingQueue();
	queue.enqueue(job);
	queue.list()[0].notePaths.push("Other/note.md");
	assert.deepEqual(queue.list()[0].notePaths, job.notePaths);
});
