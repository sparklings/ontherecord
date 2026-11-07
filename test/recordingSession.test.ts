import test from "node:test";
import assert from "node:assert/strict";
import {
	calculateNextRecordingSeq,
	RecordingSessionManager,
	resolveRecordStartMode,
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

test("resolveRecordStartMode: frontmatter와 기본 시작 방식을 올바르게 해결한다", () => {
	// frontmatter에 설정이 없으면 defaultMode 반환
	assert.equal(resolveRecordStartMode(undefined, "confirm"), "confirm");
	assert.equal(resolveRecordStartMode(null, "confirm"), "confirm");
	assert.equal(resolveRecordStartMode("", "confirm"), "confirm");

	// frontmatter에 유효한 모드가 있으면 우선 적용
	assert.equal(resolveRecordStartMode("auto", "confirm"), "auto");
	assert.equal(resolveRecordStartMode("manual", "confirm"), "manual");
	assert.equal(resolveRecordStartMode("CONFIRM", "auto"), "confirm");
	assert.equal(resolveRecordStartMode("  auto  ", "manual"), "auto");

	// 비활성화 키워드인 경우 null 반환
	assert.equal(resolveRecordStartMode(false, "confirm"), null);
	assert.equal(resolveRecordStartMode("false", "confirm"), null);
	assert.equal(resolveRecordStartMode("off", "confirm"), null);
	assert.equal(resolveRecordStartMode("none", "confirm"), null);
	assert.equal(resolveRecordStartMode("disabled", "confirm"), null);

	// 알 수 없는 문자열이나 boolean true는 defaultMode로 폴백
	assert.equal(resolveRecordStartMode("custom-unknown", "confirm"), "confirm");
	assert.equal(resolveRecordStartMode(true, "auto"), "auto");
});

test("calculateNextRecordingSeq: 기존 오디오 임베드 수에 따라 1부터 증가한다", () => {
	assert.equal(calculateNextRecordingSeq(0), 1);
	assert.equal(calculateNextRecordingSeq(1), 2);
	assert.equal(calculateNextRecordingSeq(4), 5);
	assert.equal(calculateNextRecordingSeq(-1), 1);
});

test("RecordingSessionManager: confirm 모드는 알림 출력 후 코어 레코더를 즉시 시작하고 영속화한다", async () => {
	const storage = new InMemorySessionStorage();
	const recorder = new MockAudioRecorder();
	const fixedTime = 1700000000000;
	const manager = new RecordingSessionManager(storage, recorder, () => fixedTime);

	const notifications: string[] = [];
	const session = await manager.startSession({
		notePath: "Meetings/2026-11-07 회의록.md",
		seq: 1,
		mode: "confirm",
		notify: (msg) => notifications.push(msg),
	});

	assert.ok(session);
	assert.equal(session.notePath, "Meetings/2026-11-07 회의록.md");
	assert.equal(session.seq, 1);
	assert.equal(session.startedAt, fixedTime);

	// 사용자 요구조건: confirm 대화상자로 묻지 않고 우측 상단 알림 메시지 출력
	assert.deepEqual(notifications, ["음성 녹음을 시작합니다."]);
	assert.equal(recorder.startCallCount, 1);
	assert.equal(recorder.isRecording(), true);

	// 디스크 저장 확인
	assert.ok(storage.content);
	const persisted = JSON.parse(storage.content) as ActiveRecordingSession;
	assert.deepEqual(persisted, session);
});

test("RecordingSessionManager: auto 모드는 알림 없이 조용히 즉시 시작한다", async () => {
	const storage = new InMemorySessionStorage();
	const recorder = new MockAudioRecorder();
	const manager = new RecordingSessionManager(storage, recorder, () => 1000);

	const notifications: string[] = [];
	const session = await manager.startSession({
		notePath: "Notes/AutoNote.md",
		seq: 2,
		mode: "auto",
		notify: (msg) => notifications.push(msg),
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
		notify: (msg) => notifications.push(msg),
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
		mode: "confirm",
		notify: (msg) => notifications.push(msg),
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
