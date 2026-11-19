import { strict as assert } from "assert";
import test from "node:test";
import {
	attachAudioEmbedToMarkdown,
	hasAudioEmbedInMarkdown,
	TabCloseHandler,
} from "../src/tabCloseHandler.ts";
import type { TabCloseVaultAdapter } from "../src/tabCloseHandler.ts";
import { RecordingSessionManager } from "../src/recordingSession.ts";
import type { CoreAudioRecorder, SessionStorageAdapter } from "../src/recordingSession.ts";

function createMockStorage(): SessionStorageAdapter {
	let value: string | null = null;
	return {
		read: async () => value,
		write: async (data: string) => {
			value = data;
		},
		delete: async () => {
			value = null;
		},
	};
}

function createMockRecorder(): CoreAudioRecorder & { isRecordingState: boolean } {
	return {
		isRecordingState: false,
		isRecording() {
			return this.isRecordingState;
		},
		start: async function () {
			this.isRecordingState = true;
			return true;
		},
		stop: async function () {
			this.isRecordingState = false;
			return true;
		},
	};
}

function createMockVault(files: Record<string, string>): TabCloseVaultAdapter {
	const storage = { ...files };
	return {
		read: async (path: string) => storage[path] ?? "",
		process: async (path: string, fn: (content: string) => string) => {
			const current = storage[path] ?? "";
			const updated = fn(current);
			storage[path] = updated;
			return updated;
		},
		exists: async (path: string) => path in storage,
	};
}

test("hasAudioEmbedInMarkdown: 다양한 형식의 오디오 임베드를 정확히 감지한다", () => {
	const content1 = "# 회의록\n\n![[Recording 20261107.m4a]]\n\n본문 내용";
	assert.equal(hasAudioEmbedInMarkdown(content1, "Recording 20261107.m4a"), true);
	assert.equal(hasAudioEmbedInMarkdown(content1, "recordings/Recording 20261107.m4a"), true);
	assert.equal(hasAudioEmbedInMarkdown(content1, "other.m4a"), false);

	const content2 = "# 회의록\n\n![[recordings/audio.wav|녹음 파일]]\n";
	assert.equal(hasAudioEmbedInMarkdown(content2, "recordings/audio.wav"), true);
	assert.equal(hasAudioEmbedInMarkdown(content2, "audio.wav"), true);
});

test("attachAudioEmbedToMarkdown: 미존재 시 본문 끝에 추가하고, 이미 존재하면 중복 추가를 방지한다", () => {
	const initial = "# 회의록\n\n안건 회의";
	const attached = attachAudioEmbedToMarkdown(initial, "recordings/sample.m4a");
	assert.equal(attached, "# 회의록\n\n안건 회의\n\n![[recordings/sample.m4a]]\n");

	// 다시 호출해도 중복되지 않음
	const twice = attachAudioEmbedToMarkdown(attached, "recordings/sample.m4a");
	assert.equal(twice, attached);
});

test("TabCloseHandler: 녹음 중인 노트 탭 닫힘 시 녹음을 안전하게 중지한다", async () => {
	const storage = createMockStorage();
	const recorder = createMockRecorder();
	const sessionManager = new RecordingSessionManager(storage, recorder);
	const vault = createMockVault({ "Notes/Meeting.md": "# 회의록\n" });

	const notices: string[] = [];
	let closeAction: "stop-and-attach" | "ignore" = "stop-and-attach";

	const handler = new TabCloseHandler({
		sessionManager,
		vault,
		getAction: () => closeAction,
		onNotice: (msg) => notices.push(msg),
	});

	// 세션 시작
	await sessionManager.startSession({
		notePath: "Notes/Meeting.md",
		seq: 1,
		mode: "auto",
		showNotice: false,
	});
	assert.equal(sessionManager.isRecording(), true);

	// 다른 노트 탭이 닫히면 녹음 유지
	const handledOther = await handler.handleLeafClose("Notes/Other.md");
	assert.equal(handledOther, false);
	assert.equal(sessionManager.isRecording(), true);

	// 녹음 중인 노트 탭이 닫히면 녹음 중지
	const handledTarget = await handler.handleLeafClose("Notes/Meeting.md");
	assert.equal(handledTarget, true);
	assert.equal(sessionManager.isRecording(), false);
	assert.equal(notices.length, 1);
	assert.match(notices[0], /안전하게 중지했습니다/);

	// 코어가 새 탭으로 오디오를 열 때 자동 닫기 판단 확인 (S-09)
	assert.equal(handler.shouldAutoCloseAudioLeaf("recordings/audio.m4a"), true);
	assert.equal(handler.shouldAutoCloseAudioLeaf("Notes/New.md"), false);
});

test("TabCloseHandler: ignore 설정 시에는 탭이 닫혀도 녹음을 중지하지 않는다", async () => {
	const storage = createMockStorage();
	const recorder = createMockRecorder();
	const sessionManager = new RecordingSessionManager(storage, recorder);
	const vault = createMockVault({ "Notes/Meeting.md": "# 회의록\n" });

	const handler = new TabCloseHandler({
		sessionManager,
		vault,
		getAction: () => "ignore",
	});

	await sessionManager.startSession({
		notePath: "Notes/Meeting.md",
		seq: 1,
		mode: "auto",
		showNotice: false,
	});

	const handled = await handler.handleLeafClose("Notes/Meeting.md");
	assert.equal(handled, false);
	assert.equal(sessionManager.isRecording(), true);
});

test("TabCloseHandler: attachAudioToNote는 대상 노트에 안전하게 오디오를 연결한다", async () => {
	const storage = createMockStorage();
	const recorder = createMockRecorder();
	const sessionManager = new RecordingSessionManager(storage, recorder);
	const vault = createMockVault({ "Notes/Meeting.md": "# 회의록\n\n회의 내용" });

	const handler = new TabCloseHandler({
		sessionManager,
		vault,
		getAction: () => "stop-and-attach",
	});

	const ok = await handler.attachAudioToNote("Notes/Meeting.md", "recordings/audio.m4a");
	assert.equal(ok, true);

	const content = await vault.read("Notes/Meeting.md");
	assert.match(content, /!\[\[recordings\/audio\.m4a\]\]/);
});
