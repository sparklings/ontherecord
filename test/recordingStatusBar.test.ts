import { strict as assert } from "assert";
import test from "node:test";
import {
	formatRecordingStatusBarText,
	RecordingStatusBar,
} from "../src/recordingStatusBar.ts";
import type { RecordingStatusBarElement } from "../src/recordingStatusBar.ts";
import type { ActiveRecordingSession } from "../src/recordingSession.ts";

function createMockStatusBarElement(): RecordingStatusBarElement & {
	text: string;
	title: string;
	classes: Set<string>;
} {
	return {
		text: "",
		title: "",
		classes: new Set<string>(),
		setText(t: string) {
			this.text = t;
		},
		setAttribute(name: string, val: string) {
			if (name === "title") this.title = val;
		},
		removeAttribute(name: string) {
			if (name === "title") this.title = "";
		},
		addClass(cls: string) {
			this.classes.add(cls);
		},
		removeClass(cls: string) {
			this.classes.delete(cls);
		},
	};
}

test("formatRecordingStatusBarText: 세션 노트명과 경과 시간을 정확히 표시한다", () => {
	const session: ActiveRecordingSession = {
		notePath: "Meetings/2026-11-19 주간회의.md",
		startedAt: 1000,
		seq: 1,
	};

	assert.equal(formatRecordingStatusBarText(session, 0), "🔴 00:00 2026-11-19 주간회의");
	assert.equal(formatRecordingStatusBarText(session, 85), "🔴 01:25 2026-11-19 주간회의");
	assert.equal(formatRecordingStatusBarText(session, 3665), "🔴 1:01:05 2026-11-19 주간회의");
});

test("RecordingStatusBar: start와 tick 및 stop이 올바르게 상태와 타이머를 제어한다", () => {
	const el = createMockStatusBarElement();
	let stopCalled = false;
	let mockNow = 1000;

	const bar = new RecordingStatusBar(
		el,
		() => {
			stopCalled = true;
		},
		() => mockNow,
	);

	const session: ActiveRecordingSession = {
		notePath: "Meetings/Review.md",
		startedAt: 1000,
		seq: 1,
	};

	// 시작
	bar.start(session);
	assert.ok(el.classes.has("otr-recording-active"));
	assert.equal(el.text, "🔴 00:00 Review");
	assert.match(el.title, /Review\.md/);

	// 10초 경과 시뮬레이션
	mockNow = 11000;
	// tick 간접 확인
	bar.start(session);
	assert.equal(el.text, "🔴 00:10 Review");

	// 클릭 시 중지 요청 트리거
	bar.handleClick();
	assert.equal(stopCalled, true);

	// 정지
	bar.stop();
	assert.equal(el.text, "");
	assert.equal(el.classes.has("otr-recording-active"), false);
	assert.equal(el.title, "");
});
