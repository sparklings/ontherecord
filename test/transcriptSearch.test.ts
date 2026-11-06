import test from "node:test";
import assert from "node:assert/strict";
import { findTranscriptMatches } from "../src/transcriptSearch.ts";

test("searches only timestamped segments inside generated transcript blocks", () => {
	const note = [
		"# Meeting",
		"outside keyword",
		'<!-- on-the-record:begin audio="Recordings%2Fmeeting.m4a" -->',
		"- [00:01] Keyword appears here",
		"- [00:02] 다른 문장",
		"<!-- on-the-record:end -->",
		"- [00:03] keyword outside a result block",
	].join("\n");

	assert.deepEqual(findTranscriptMatches("Meetings/Review.md", note, "keyword"), [{
		notePath: "Meetings/Review.md",
		audioPath: "Recordings/meeting.m4a",
		timestamp: "00:01",
		text: "Keyword appears here",
		line: 3,
	}]);
});

test("matches Korean text without case normalization loss and supports long timestamps", () => {
	const note = [
		'<!-- on-the-record:begin audio="meeting.m4a" -->',
		"- [1:02:03] 중요한 결정 사항",
		"<!-- on-the-record:end -->",
	].join("\n");

	const results = findTranscriptMatches("Meeting.md", note, "결정");
	assert.equal(results.length, 1);
	assert.equal(results[0].timestamp, "1:02:03");
	assert.equal(results[0].line, 1);
});

test("blank queries and un-timestamped transcript text do not produce matches", () => {
	const note = [
		'<!-- on-the-record:begin audio="meeting.m4a" -->',
		"이전 타임스탬프 없는 결과 keyword",
		"<!-- on-the-record:end -->",
	].join("\n");
	assert.deepEqual(findTranscriptMatches("Meeting.md", note, "  "), []);
	assert.deepEqual(findTranscriptMatches("Meeting.md", note, "keyword"), []);
});
