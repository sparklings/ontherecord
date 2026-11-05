import test from "node:test";
import assert from "node:assert/strict";
import { waitForLinkedNotes } from "../src/linkWaiter.ts";

function createDependencies() {
	let notePaths: string[] = [];
	let listener: (() => void) | null = null;
	let timerCallback: (() => void) | null = null;
	let unsubscribed = false;
	return {
		dependencies: {
			findLinkedNotes: () => notePaths,
			onChange: (callback: () => void) => {
				listener = callback;
				return () => {
					unsubscribed = true;
					listener = null;
				};
			},
			setTimeout: (callback: () => void) => {
				timerCallback = callback;
				return 1;
			},
			clearTimeout: () => {
				timerCallback = null;
			},
		},
		setNotes: (paths: string[]) => {
			notePaths = paths;
		},
		fireChange: () => listener?.(),
		fireTimeout: () => timerCallback?.(),
		isUnsubscribed: () => unsubscribed,
	};
}

test("이미 embed가 있으면 즉시 해당 note 경로를 반환한다", async () => {
	const fixture = createDependencies();
	fixture.setNotes(["Meetings/notes.md"]);
	const result = await waitForLinkedNotes("Meetings/recording.m4a", fixture.dependencies, 1000);
	assert.deepEqual(result, { status: "linked", notePaths: ["Meetings/notes.md"] });
});

test("MetadataCache 변경 후 링크가 나타나면 대기를 완료한다", async () => {
	const fixture = createDependencies();
	const resultPromise = waitForLinkedNotes("Meetings/recording.m4a", fixture.dependencies, 1000);
	fixture.setNotes(["Meetings/notes.md"]);
	fixture.fireChange();
	assert.deepEqual(await resultPromise, { status: "linked", notePaths: ["Meetings/notes.md"] });
	assert.equal(fixture.isUnsubscribed(), true);
});

test("링크 대기 제한 시간이 지나면 timeout을 반환한다", async () => {
	const fixture = createDependencies();
	const resultPromise = waitForLinkedNotes("Meetings/recording.m4a", fixture.dependencies, 1000);
	fixture.fireTimeout();
	assert.deepEqual(await resultPromise, { status: "timeout" });
	assert.equal(fixture.isUnsubscribed(), true);
});

test("삭제나 취소 신호는 링크 대기를 취소한다", async () => {
	const fixture = createDependencies();
	const controller = new AbortController();
	const resultPromise = waitForLinkedNotes(
		"Meetings/recording.m4a",
		fixture.dependencies,
		1000,
		controller.signal,
	);
	controller.abort();
	assert.deepEqual(await resultPromise, { status: "cancelled" });
	assert.equal(fixture.isUnsubscribed(), true);
});
