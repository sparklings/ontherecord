import test from "node:test";
import * as assert from "node:assert/strict";
import * as http from "node:http";
import {
	isLocalhostEndpoint,
	normalizeEndpointUrl,
	testLocalLlmConnection,
	generateMeetingSummary,
} from "../src/localLlmClient.ts";
import {
	buildSummaryPrompt,
	formatMeetingSummaryBlock,
	extractTranscriptFromMarkdown,
} from "../src/summaryPrompt.ts";

test("isLocalhostEndpoint: 100% 로컬 프라이빗 엔드포인트만 허용 (3-POST-01)", () => {
	assert.equal(isLocalhostEndpoint("http://localhost:11434"), true);
	assert.equal(isLocalhostEndpoint("http://127.0.0.1:11434"), true);
	assert.equal(isLocalhostEndpoint("http://127.0.0.1:1234/v1"), true);
	assert.equal(isLocalhostEndpoint("http://[::1]:11434"), true);

	// 외부 원격 서버 및 클라우드 API는 엄격 차단
	assert.equal(isLocalhostEndpoint("https://api.openai.com/v1"), false);
	assert.equal(isLocalhostEndpoint("https://api.anthropic.com/v1"), false);
	assert.equal(isLocalhostEndpoint("http://192.168.0.10:11434"), false);
	assert.equal(isLocalhostEndpoint("https://my-cloud-ollama.com"), false);
	assert.equal(isLocalhostEndpoint("invalid-url"), false);
});

test("normalizeEndpointUrl: 프로토콜 및 슬래시 정규화", () => {
	assert.equal(normalizeEndpointUrl("localhost:11434"), "http://localhost:11434");
	assert.equal(normalizeEndpointUrl("http://localhost:11434/"), "http://localhost:11434");
	assert.equal(normalizeEndpointUrl("http://localhost:1234/v1///"), "http://localhost:1234/v1");
});

test("buildSummaryPrompt & formatMeetingSummaryBlock 검증", () => {
	const transcript = "[00:01] 팀장: 다음 주 화요일까지 보고서를 작성합시다.\n[00:05] 팀원: 알겠습니다.";
	const { system, user } = buildSummaryPrompt(transcript);

	assert.ok(system.includes("핵심 요약"));
	assert.ok(system.includes("주요 결정 사항"));
	assert.ok(system.includes("액션 아이템"));
	assert.ok(user.includes(transcript));

	const block = formatMeetingSummaryBlock("### 📌 핵심 요약\n- 보고서 작성 회의", "qwen2.5:7b", new Date("2026-11-20T10:00:00"));
	assert.ok(block.includes("## 🤖 로컬 AI 회의록 요약"));
	assert.ok(block.includes("qwen2.5:7b"));
	assert.ok(block.includes("2026-11-20"));
	assert.ok(block.includes("보고서 작성 회의"));
});

test("extractTranscriptFromMarkdown: 마커 블록 및 타임스탬프 추출", () => {
	// 1. 마커 블록이 있는 경우
	const mdWithMarker = `# 회의록
Some notes before
<!-- on-the-record:start audio="rec1.m4a" seq="1" -->
[00:01] 안녕하세요. 회의를 시작합니다.
[00:05] 오늘 안건은 출시 일정입니다.
<!-- on-the-record:end audio="rec1.m4a" seq="1" -->
Other content`;
	const extracted1 = extractTranscriptFromMarkdown(mdWithMarker);
	assert.ok(extracted1.includes("출시 일정입니다"));
	assert.ok(!extracted1.includes("Some notes before"));

	// 2. 타임스탬프만 있는 경우
	const mdWithTimestamps = `# 단순 회의
- [01:10] 팀장: 일정 확정합시다.
- [01:25] 발표자: 네 좋습니다.
잡담 내용`;
	const extracted2 = extractTranscriptFromMarkdown(mdWithTimestamps);
	assert.ok(extracted2.includes("[01:10] 팀장"));
	assert.ok(extracted2.includes("[01:25] 발표자"));
	assert.ok(!extracted2.includes("잡담 내용"));

	// 3. 빈 텍스트
	assert.equal(extractTranscriptFromMarkdown(""), "");
});

test("testLocalLlmConnection: Mock 로컬 Ollama 및 OpenAI 호환 서버 테스트", async () => {
	// Mock HTTP 서버 구동
	const server = http.createServer((req, res) => {
		if (req.url === "/api/tags" && req.method === "GET") {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ models: [{ name: "qwen2.5:7b" }, { name: "gemma2:9b" }] }));
			return;
		}
		if (req.url === "/api/chat" && req.method === "POST") {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({
				message: {
					content: "### 📌 핵심 요약\n- 로컬 AI 테스트 성공\n\n### 🎯 주요 결정 사항\n- 출시 진행\n\n### ✅ 액션 아이템\n- [ ] **[개발팀]** 배포",
				},
			}));
			return;
		}
		res.writeHead(404);
		res.end();
	});

	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
	const address = server.address();
	if (!address || typeof address === "string") throw new Error("Server address error");
	const endpoint = `http://127.0.0.1:${address.port}`;

	try {
		// 연결 확인
		const connResult = await testLocalLlmConnection(endpoint);
		assert.equal(connResult.ok, true);
		assert.equal(connResult.serverType, "ollama");
		assert.deepEqual(connResult.models, ["qwen2.5:7b", "gemma2:9b"]);

		// 요약 생성
		const summary = await generateMeetingSummary({
			endpoint,
			model: "qwen2.5:7b",
			transcript: "[00:01] 회의 내용입니다.",
		});
		assert.ok(summary.includes("핵심 요약"));
		assert.ok(summary.includes("로컬 AI 테스트 성공"));

		// 외부 엔드포인트 차단 확인
		await assert.rejects(
			async () => {
				await generateMeetingSummary({
					endpoint: "https://api.openai.com/v1",
					model: "gpt-4",
					transcript: "sample",
				});
			},
			/프라이버시/,
		);
	} finally {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	}
});
