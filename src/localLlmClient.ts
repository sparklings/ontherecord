import { buildSummaryPrompt } from "./summaryPrompt.ts";

export interface LlmConnectionTestResult {
	ok: boolean;
	serverType: "ollama" | "openai-compatible" | "unknown";
	models: string[];
	error?: string;
}

export interface GenerateSummaryOptions {
	endpoint: string;
	model: string;
	transcript: string;
	abortSignal?: AbortSignal;
	timeoutMs?: number;
}

/**
 * 프라이버시 보호를 위해 오직 로컬 머신(localhost / 127.0.0.1 / [::1]) 엔드포인트만 허용합니다.
 */
export function isLocalhostEndpoint(endpoint: string): boolean {
	try {
		const parsed = new URL(endpoint.trim());
		const host = parsed.hostname.toLowerCase();
		return (
			host === "localhost" ||
			host === "127.0.0.1" ||
			host === "::1" ||
			host === "[::1]" ||
			host === "0.0.0.0"
		);
	} catch {
		return false;
	}
}

/**
 * 엔드포인트 URL을 정규화합니다.
 */
export function normalizeEndpointUrl(endpoint: string): string {
	let trimmed = endpoint.trim();
	if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
		trimmed = "http://" + trimmed;
	}
	return trimmed.replace(/\/+$/, "");
}

/**
 * 로컬 LLM 서버(Ollama 또는 LM Studio / 로컬 vLLM)의 실행 여부 및 설치된 모델 목록을 조회합니다.
 */
export async function testLocalLlmConnection(endpoint: string, timeoutMs = 3500): Promise<LlmConnectionTestResult> {
	if (!isLocalhostEndpoint(endpoint)) {
		return {
			ok: false,
			serverType: "unknown",
			models: [],
			error: "보안 정책에 따라 외부 원격 서버는 금지되며 localhost(127.0.0.1)만 연결 가능합니다.",
		};
	}

	const base = normalizeEndpointUrl(endpoint);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	// 1. Ollama tags API 시도: GET /api/tags
	try {
		const ollamaRes = await fetch(`${base}/api/tags`, {
			method: "GET",
			signal: controller.signal,
		});
		if (ollamaRes.ok) {
			clearTimeout(timer);
			const data = (await ollamaRes.json()) as { models?: Array<{ name?: string }> };
			const models = (data.models ?? [])
				.map((m) => m.name)
				.filter((n): n is string => typeof n === "string" && n.length > 0);
			return {
				ok: true,
				serverType: "ollama",
				models,
			};
		}
	} catch {
		// Ollama 실패 시 OpenAI 호환 엔드포인트 시도
	}

	// 2. OpenAI-compatible models API 시도: GET /v1/models
	try {
		const openaiRes = await fetch(`${base}/v1/models`, {
			method: "GET",
			signal: controller.signal,
		});
		if (openaiRes.ok) {
			clearTimeout(timer);
			const data = (await openaiRes.json()) as { data?: Array<{ id?: string }> };
			const models = (data.data ?? [])
				.map((m) => m.id)
				.filter((id): id is string => typeof id === "string" && id.length > 0);
			return {
				ok: true,
				serverType: "openai-compatible",
				models,
			};
		}
	} catch (err: unknown) {
		clearTimeout(timer);
		const message = err instanceof Error ? err.message : String(err);
		return {
			ok: false,
			serverType: "unknown",
			models: [],
			error: `로컬 LLM 서버 연결 실패 (${base}): ${message}. Ollama나 LM Studio가 실행 중인지 확인하세요.`,
		};
	} finally {
		clearTimeout(timer);
	}

	return {
		ok: false,
		serverType: "unknown",
		models: [],
		error: `서버가 응답하지 않거나 지원하지 않는 엔드포인트입니다 (${base}).`,
	};
}

/**
 * 로컬 LLM을 호출하여 전사문 요약본을 생성합니다.
 */
export async function generateMeetingSummary(options: GenerateSummaryOptions): Promise<string> {
	const { endpoint, model, transcript, abortSignal, timeoutMs = 90000 } = options;

	if (!isLocalhostEndpoint(endpoint)) {
		throw new Error("보안 및 프라이버시 정책: 오직 로컬(localhost / 127.0.0.1) LLM 서버만 호출 가능합니다.");
	}

	if (!transcript || transcript.trim().length === 0) {
		throw new Error("요약할 회의 전사문 내용이 없습니다.");
	}

	const base = normalizeEndpointUrl(endpoint);
	const { system, user } = buildSummaryPrompt(transcript);

	// 내부 타임아웃 컨트롤러 생성
	const timeoutController = new AbortController();
	const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

	const handleAbort = () => timeoutController.abort();
	if (abortSignal) {
		abortSignal.addEventListener("abort", handleAbort);
	}

	try {
		// 우선 Ollama /api/chat 호출 시도
		const isOllamaCandidate = !base.includes("/v1") && !base.endsWith(":1234");
		if (isOllamaCandidate) {
			try {
				const response = await fetch(`${base}/api/chat`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						model,
						messages: [
							{ role: "system", content: system },
							{ role: "user", content: user },
						],
						stream: false,
						options: {
							temperature: 0.2,
						},
					}),
					signal: timeoutController.signal,
				});

				if (response.ok) {
					const data = (await response.json()) as { message?: { content?: string } };
					if (data.message?.content) {
						return data.message.content.trim();
					}
				}
			} catch (ollamaErr) {
				// 타임아웃이면 바로 throw
				if (timeoutController.signal.aborted) {
					throw new Error("로컬 LLM 요약 생성 시간이 초과되었습니다 (타임아웃).");
				}
				// 그 외는 OpenAI 호환 포맷으로 fallback
			}
		}

		// OpenAI 호환 엔드포인트 (/v1/chat/completions) 시도
		const chatUrl = base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
		const response = await fetch(chatUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model,
				messages: [
					{ role: "system", content: system },
					{ role: "user", content: user },
				],
				temperature: 0.2,
				stream: false,
			}),
			signal: timeoutController.signal,
		});

		if (!response.ok) {
			const errBody = await response.text().catch(() => "");
			throw new Error(`로컬 LLM 호출 실패 (HTTP ${response.status}): ${errBody || response.statusText}`);
		}

		const data = (await response.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};

		const content = data.choices?.[0]?.message?.content;
		if (!content) {
			throw new Error("로컬 LLM이 올바른 텍스트 응답을 반환하지 않았습니다.");
		}

		return content.trim();
	} catch (err: unknown) {
		if (timeoutController.signal.aborted) {
			throw new Error("로컬 LLM 요약 작업이 취소되었거나 제한 시간(90초)을 초과했습니다.");
		}
		throw err;
	} finally {
		clearTimeout(timer);
		if (abortSignal) {
			abortSignal.removeEventListener("abort", handleAbort);
		}
	}
}
