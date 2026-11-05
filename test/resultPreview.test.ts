import test from "node:test";
import assert from "node:assert/strict";
import {
	applyHeadingInsertion,
	findResultBlock,
	formatResultMarkdown,
	formatTimestamp,
} from "../src/resultPreview.ts";
import type { TranscriptionResult } from "../src/provider.ts";

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

test("지정 헤딩 섹션 끝에 삽입하고 다음 헤딩은 보존한다", () => {
	const content = "# 제목\n\n## 전사 결과\n기존\n\n## 다른\n내용\n";
	const out = applyHeadingInsertion(content, { heading: "전사 결과", audioPath: "a.m4a", markdown: "- x" });
	assert.ok(out.indexOf("- x") < out.indexOf("## 다른"));
	assert.ok(out.includes("기존"));
	assert.ok(out.endsWith("## 다른\n내용\n"));
});

test("헤딩이 없으면 문서 끝에 새 헤딩을 만든다", () => {
	const out = applyHeadingInsertion("본문\n", { heading: "전사 결과", audioPath: "a.m4a", markdown: "- x" });
	assert.ok(out.startsWith("본문\n\n## 전사 결과\n"));
});

test("코드 블록 안의 헤딩은 무시한다", () => {
	const content = "```\n## 전사 결과\n```\n";
	const out = applyHeadingInsertion(content, { heading: "전사 결과", audioPath: "a.m4a", markdown: "- x" });
	assert.ok(out.startsWith(content));
	assert.ok(out.endsWith("- x\n<!-- on-the-record:end -->\n"));
});

test("기존 결과는 교체 또는 추가를 선택할 수 있다", () => {
	const first = applyHeadingInsertion("", { heading: "R", audioPath: "a b.m4a", markdown: "- old" });
	assert.ok(findResultBlock(first, "a b.m4a"));
	const replaced = applyHeadingInsertion(first, {
		heading: "R",
		audioPath: "a b.m4a",
		markdown: "- new",
		existing: "replace",
	});
	assert.ok(replaced.includes("- new") && !replaced.includes("- old"));
	const appended = applyHeadingInsertion(first, {
		heading: "R",
		audioPath: "a b.m4a",
		markdown: "- new",
		existing: "append",
	});
	assert.ok(appended.includes("- new") && appended.includes("- old"));
});
