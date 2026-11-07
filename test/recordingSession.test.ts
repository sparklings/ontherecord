import test from "node:test";
import assert from "node:assert/strict";
import {
	calculateNextRecordingSeq,
	RecordingSessionManager,
	resolveRecordStartMode,
	resolveRecordStartNotice,
} from "../src/recordingSession.ts";
import type {
	ActiveRecordingSession,
	CoreAudioRecorder,
	SessionStorageAdapter,
} from "../src/recordingSession.ts";

class InMemorySessionStorage implements SessionStorageAdapter {
	public content: string | null = null;

	async read(): Promise<string | null> {
		return this.content;
	}

	async write(data: string): Promise<void> {
		this.content = data;
	}

	async delete(): Promise<void> {
		this.content = null;
	}
}

class MockAudioRecorder implements CoreAudioRecorder {
	public recording = false;
	public startCallCount = 0;
	public stopCallCount = 0;
	public shouldFailStart = false;

	isRecording(): boolean {
		return this.recording;
	}

	async start(): Promise<boolean> {
		this.startCallCount++;
		if (this.shouldFailStart) return false;
		this.recording = true;
		return true;
	}

	async stop(): Promise<boolean> {
		this.stopCallCount++;
		this.recording = false;
		return true;
	}
}

test("resolveRecordStartMode: 시작 방식 2종(auto/manual)을 올바르게 판정한다", () => {
	// frontmatter에 설정이 없으면 defaultMode 반환
	assert.equal(resolveRecordStartMode(undefined, "auto"), "auto");
	assert.equal(resolveRecordStartMode(null, "auto"), "auto");
	assert.equal(resolveRecordStartMode("", "manual"), "manual");

	// frontmatter에 명시된 모드 우선 판정
	assert.equal(resolveRecordStartMode("auto", "manual"), "auto");
	assert.equal(resolveRecordStartMode("manual", "auto"), "manual");
	assert.equal(resolveRecordStartMode("  MANUAL  ", "auto"), "manual");
	assert.equal(resolveRecordStartMode("confirm", "manual"), "auto"); // confirm은 auto로 흡수

	// 비활성화 키워드는 manual로 해석
	assert.equal(resolveRecordStartMode(false, "auto"), "manual");
	assert.equal(resolveRecordStartMode("false", "auto"), "manual");
	assert.equal(resolveRecordStartMode("off", "auto"), "manual");
	assert.equal(resolveRecordStartMode("none", "auto"), "manual");
	assert.equal(resolveRecordStartMode("disabled", "auto"), "manual");
});

test("resolveRecordStartNotice: 자동 시작 시 알림 여부를 올바르게 판정한다", () => {
	assert.equal(resolveRecordStartNotice(undefined, true), true);
	assert.equal(resolveRecordStartNotice(undefined, false), false);
	assert.equal(resolveRecordStartNotice("silent", true), false);
	assert.equal(resolveRecordStartNotice("SILENT", true), false);
	assert.equal(resolveRecordStartNotice("notice", false), true);
	assert.equal(resolveRecordStartNotice("confirm", false), true);
});

test("calculateNextRecordingSeq: 기존 오디오 임베드 수에 따라 1부터 증가한다", () => {
	assert.equal(calculateNextRecordingSeq(0), 1);
	assert.equal(calculateNextRecordingSeq(1), 2);
	assert.equal(calculateNextRecordingSeq(4), 5);
	assert.equal(calculateNextRecordingSeq(-1), 1);
});

test("RecordingSessionManager: auto 모드 + 알림 켬은 토스트 알림 후 즉시 개시하고 영속화한다", async () => {
	const storage = new InMemorySessionStorage();
	const recorder = new MockAudioRecorder();
	const fixedTime = 1700000000000;
	const manager = new RecordingSessionManager(storage, recorder, () => fixedTime);

	const notifications: string[] = [];
	const session = await manager.startSession({
		notePath: "Meetings/2026-11-07 회의록.md",
		seq: 1,
		mode: "auto",
		showNotice: true,
		onNotice: (msg) => notifications.push(msg),
	});

	assert.ok(session);
	assert.equal(session.notePath, "Meetings/2026-11-07 회의록.md");
	assert.equal(session.seq, 1);
	assert.equal(session.startedAt, fixedTime);

	// 토스트 알림 출력 확인
	assert.deepEqual(notifications, ["음성 녹음을 시작합니다."]);
	assert.equal(recorder.startCallCount, 1);
	assert.equal(recorder.isRecording(), true);

	// 디스크 저장 확인
	assert.ok(storage.content);
	const persisted = JSON.parse(storage.content) as ActiveRecordingSession;
	assert.deepEqual(persisted, session);
});

test("RecordingSessionManager: auto 모드 + 알림 끔(무음)은 알림 없이 조용히 즉시 개시한다", async () => {
	const storage = new InMemorySessionStorage();
	const recorder = new MockAudioRecorder();
	const manager = new RecordingSessionManager(storage, recorder, () => 1000);

	const notifications: string[] = [];
	const session = await manager.startSession({
		notePath: "Notes/AutoNote.md",
		seq: 2,
		mode: "auto",
		showNotice: false,
		onNotice: (msg) => notifications.push(msg),
	});

	assert.ok(session);
	assert.equal(session.notePath, "Notes/AutoNote.md");
	assert.equal(session.seq, 2);
	assert.equal(notifications.length, 0); // 알림 없음
	assert.equal(recorder.startCallCount, 1);
	assert.equal(recorder.isRecording(), true);
});

test("RecordingSessionManager: manual 모드는 자동 호출 시 시작을 거부한다", async () => {
	const storage = new InMemorySessionStorage();
	const recorder = new MockAudioRecorder();
	const manager = new RecordingSessionManager(storage, recorder);

	const session = await manager.startSession({
		notePath: "Notes/ManualNote.md",
		seq: 1,
		mode: "manual",
	});

	assert.equal(session, null);
	assert.equal(recorder.startCallCount, 0);
	assert.equal(storage.content, null);
});

test("RecordingSessionManager: startManualSession은 명시적 수동 시작을 지원한다", async () => {
	const storage = new InMemorySessionStorage();
	const recorder = new MockAudioRecorder();
	const manager = new RecordingSessionManager(storage, recorder, () => 2000);

	const notifications: string[] = [];
	const session = await manager.startManualSession({
		notePath: "Notes/ManualNote.md",
		seq: 3,
		onNotice: (msg) => notifications.push(msg),
	});

	assert.ok(session);
	assert.equal(session.notePath, "Notes/ManualNote.md");
	assert.equal(session.seq, 3);
	assert.deepEqual(notifications, ["음성 녹음을 시작합니다."]);
	assert.equal(recorder.startCallCount, 1);
});

test("RecordingSessionManager: 이미 녹음 중인 경우 중복 시작을 거부한다", async () => {
	const storage = new InMemorySessionStorage();
	const recorder = new MockAudioRecorder();
	const manager = new RecordingSessionManager(storage, recorder);

	await manager.startSession({
		notePath: "Notes/First.md",
		seq: 1,
		mode: "auto",
	});

	const notifications: string[] = [];
	const second = await manager.startSession({
		notePath: "Notes/Second.md",
		seq: 1,
		mode: "auto",
		onNotice: (msg) => notifications.push(msg),
	});

	assert.equal(second, null);
	assert.deepEqual(notifications, ["이미 녹음이 진행 중입니다."]);
	assert.equal(recorder.startCallCount, 1);
});

test("RecordingSessionManager: stopSession은 코어 레코더를 중지하고 영속화 파일을 삭제한다", async () => {
	const storage = new InMemorySessionStorage();
	const recorder = new MockAudioRecorder();
	const manager = new RecordingSessionManager(storage, recorder);

	await manager.startSession({
		notePath: "Notes/StopTest.md",
		seq: 1,
		mode: "auto",
	});
	assert.ok(storage.content);

	const stopped = await manager.stopSession();
	assert.ok(stopped);
	assert.equal(stopped.notePath, "Notes/StopTest.md");
	assert.equal(manager.getActiveSession(), null);
	assert.equal(recorder.isRecording(), false);
	assert.equal(recorder.stopCallCount, 1);
	assert.equal(storage.content, null);
});

test("RecordingSessionManager: restore는 디스크에 저장된 세션을 복원한다", async () => {
	const storage = new InMemorySessionStorage();
	const recorder = new MockAudioRecorder();
	storage.content = JSON.stringify({
		notePath: "Notes/RestoredNote.md",
		startedAt: 123456789,
		seq: 2,
	});

	const manager = new RecordingSessionManager(storage, recorder);
	const restored = await manager.restore();

	assert.ok(restored);
	assert.equal(restored.notePath, "Notes/RestoredNote.md");
	assert.equal(restored.startedAt, 123456789);
	assert.equal(restored.seq, 2);
	assert.equal(manager.getActiveSession(), restored);
});

test("RecordingSessionManager: 디스크 세션이 손상된 경우 복원 실패 및 디스크를 정리한다", async () => {
	const storage = new InMemorySessionStorage();
	const recorder = new MockAudioRecorder();
	storage.content = "{ malformed json";

	const manager = new RecordingSessionManager(storage, recorder);
	const restored = await manager.restore();

	assert.equal(restored, null);
	assert.equal(manager.getActiveSession(), null);
	assert.equal(storage.content, null);
});
