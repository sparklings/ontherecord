import test from "node:test";
import assert from "node:assert/strict";
import {
	applyAudioEmbedInsertion,
	findResultBlock,
	formatResultMarkdown,
	formatTimestamp,
	prioritizeAudioEmbeds,
	wrapResultBlock,
} from "../src/resultPreview.ts";
import type { TranscriptionResult } from "../src/provider.ts";
import type { AudioEmbedPosition } from "../src/resultPreview.ts";

const result: TranscriptionResult = {
	language: "ko",
	text: "하나 둘",
	segments: [
		{ startSeconds: 0, endSeconds: 2, text: " 하나 " },
		{ startSeconds: 3725.9, endSeconds: 4000, text: "둘" },
		{ startSeconds: 4001, endSeconds: 4002, text: "  " },
	],
	engine: { providerId: "t", providerVersion: "1", modelId: "m", device: "cpu" },
	warnings: [],
};

test("시간 형식을 mm:ss 또는 h:mm:ss로 만든다", () => {
	assert.equal(formatTimestamp(5.9), "00:05");
	assert.equal(formatTimestamp(3725), "1:02:05");
	assert.equal(formatTimestamp(-1), "00:00");
});

test("segment를 마크다운으로 만들고 빈 segment는 제외한다", () => {
	assert.equal(formatResultMarkdown(result, { includeTimestamps: true }), "- [00:00] 하나\n- [1:02:05] 둘");
	assert.equal(formatResultMarkdown(result, { includeTimestamps: false }), "- 하나\n- 둘");
});

const embedText = "![[a.m4a]]";
const embed: AudioEmbedPosition = {
	start: { line: 2, ch: 0 },
	end: { line: 2, ch: embedText.length },
	link: "a.m4a",
};

test("커서 위 가장 가까운 오디오 embed를 먼저 선택하고 나머지는 문서 순서로 제시한다", () => {
	const items = [
		{ id: "first", position: { start: { line: 1, col: 0 } } },
		{ id: "above-nearest", position: { start: { line: 8, col: 0 } } },
		{ id: "below", position: { start: { line: 12, col: 0 } } },
		{ id: "above-far", position: { start: { line: 4, col: 0 } } },
	];
	assert.deepEqual(
		prioritizeAudioEmbeds(items, { line: 10, ch: 0 }).map((item) => item.id),
		["above-nearest", "above-far", "first", "below"],
	);
});

test("커서와 같은 행의 embed는 열 위치를 기준으로 우선순위를 정한다", () => {
	const items = [
		{ id: "after-cursor", position: { start: { line: 5, col: 24 } } },
		{ id: "before-far", position: { start: { line: 5, col: 2 } } },
		{ id: "before-near", position: { start: { line: 5, col: 18 } } },
	];
	assert.deepEqual(
		prioritizeAudioEmbeds(items, { line: 5, ch: 20 }).map((item) => item.id),
		["before-near", "before-far", "after-cursor"],
	);
});

test("결과를 지정한 녹음 embed 바로 아래에 삽입하고 나머지 노트를 보존한다", () => {
	const content = "# 제목\n\n![[a.m4a]]\n\n## 메모\n보존할 내용\n";
	const out = applyAudioEmbedInsertion(content, { audioPath: "a.m4a", markdown: "- x", embed });
	assert.ok(out.indexOf(embedText) < out.indexOf("- x"));
	assert.ok(out.indexOf("- x") < out.indexOf("## 메모"));
	assert.ok(out.includes("보존할 내용"));
});

test("Obsidian이 embed cache range에서 앞의 느낌표를 제외해도 지원한다", () => {
	const content = "![[a.m4a]]\n";
	const out = applyAudioEmbedInsertion(content, {
		audioPath: "a.m4a",
		markdown: "- x",
		embed: {
			start: { line: 0, ch: 1 },
			end: { line: 0, ch: embedText.length },
			link: "a.m4a",
		},
	});
	assert.ok(out.indexOf(embedText) < out.indexOf("- x"));
});

test("재전사 교체와 추가 결과를 녹음 embed 아래에 함께 둔다", () => {
	const content = `# 제목\n\n${embedText}\n\n## 이전 결과 위치\n${wrapResultBlock("a.m4a", "- old")}\n\n## 메모\n보존\n`;
	const replaced = applyAudioEmbedInsertion(content, {
		audioPath: "a.m4a",
		markdown: "- replacement",
		embed,
		existing: "replace",
	});
	assert.ok(replaced.indexOf(embedText) < replaced.indexOf("- replacement"));
	assert.ok(replaced.indexOf("- replacement") < replaced.indexOf("## 이전 결과 위치"));
	assert.ok(!replaced.includes("- old"));
	assert.ok(replaced.includes("## 메모\n보존"));

	const appended = applyAudioEmbedInsertion(content, {
		audioPath: "a.m4a",
		markdown: "- new transcription",
		embed,
		existing: "append",
	});
	assert.ok(appended.indexOf(embedText) < appended.indexOf("- old"));
	assert.ok(appended.indexOf("- old") < appended.indexOf("- new transcription"));
	assert.ok(appended.indexOf("- new transcription") < appended.indexOf("## 이전 결과 위치"));
});

test("기존 결과 처리 선택이 없으면 변경하지 않고 실패하며 stale embed를 거부한다", () => {
	const content = `${embedText}\n${wrapResultBlock("a.m4a", "- old")}\n`;
	assert.throws(
		() => applyAudioEmbedInsertion(content, {
			audioPath: "a.m4a",
			markdown: "- new",
			embed: { ...embed, start: { line: 0, ch: 0 }, end: { line: 0, ch: embedText.length } },
		}),
		/기존 전사 결과의 처리 방법/,
	);
	assert.throws(
		() => applyAudioEmbedInsertion("![[renamed.m4a]]\n", {
			audioPath: "a.m4a",
			markdown: "- x",
			embed: { ...embed, start: { line: 0, ch: 0 }, end: { line: 0, ch: embedText.length } },
		}),
		/오디오 embed가 변경/,
	);
});

test("결과 블록은 공백이 있는 오디오 경로와 함께 추적된다", () => {
	const first = wrapResultBlock("a b.m4a", "- old");
	assert.ok(findResultBlock(first, "a b.m4a"));
});

test("전사 대기 중 상단 편집으로 라인이 밀려도 오디오 embed를 동적으로 재탐색하여 결과를 삽입한다", () => {
	// 원본 위치는 0행이었으나, 상단에 여러 줄이 추가되어 5행으로 밀린 상황
	const prepended = "# 새로 작성된 회의 개요\n\n- 참석자: 김팀장, 이선임\n- 일시: 2026-11-27\n\n";
	const contentWithPrepend = `${prepended}${embedText}\n`;

	// 기존 embed 위치 정보는 여전히 0행을 가리키고 있음
	const shifted = applyAudioEmbedInsertion(contentWithPrepend, {
		audioPath: "a.m4a",
		markdown: "- dynamic fallback result",
		embed: { ...embed, start: { line: 0, ch: 0 }, end: { line: 0, ch: embedText.length } },
	});

	// 상단 내용이 보존되고, 재배치된 embed 바로 뒤에 결과 블록이 올바르게 삽입되어야 함
	assert.ok(shifted.startsWith(prepended));
	assert.ok(shifted.includes(embedText));
	assert.ok(shifted.includes("- dynamic fallback result"));
	assert.ok(shifted.indexOf(embedText) < shifted.indexOf("- dynamic fallback result"));
});
