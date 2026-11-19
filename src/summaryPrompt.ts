export const DEFAULT_SUMMARY_SYSTEM_PROMPT = `당신은 전문 회의록 작성 및 요약 비서입니다. 제공된 회의 음성 전사문을 정밀 분석하여 객관적이고 가독성 높은 마크다운 요약본을 작성하세요.

반드시 다음 3가지 섹션 구조를 준수하여 한국어로 작성해야 합니다:
### 📌 핵심 요약
- 회의의 배경과 주요 논의 사항을 3~5개의 명확한 불릿 포인트로 정리합니다.

### 🎯 주요 결정 사항
- 회의를 통해 합의되거나 확정된 정책, 방향성, 기술적 결정 사항을 정리합니다. (결정된 내용이 없으면 '특이 결정 사항 없음'으로 표기)

### ✅ 액션 아이템
- 향후 수행할 구체적인 업무 목록을 마크다운 체크박스 형식(\`- [ ]\`)으로 작성합니다.
- 발화자나 담당자, 기한이 언급된 경우 볼드체로 명시합니다. (예: \`- [ ] **[홍길동]** API 스펙 문서 초안 작성 (다음 주 화요일까지)\`)

주의사항:
- 원문에 없는 내용을 날조하거나 추측하지 마세요.
- 불필요한 서두 인사말이나 사족 없이 본문 섹션만 바로 출력하세요.`;

export function buildSummaryPrompt(transcriptText: string): { system: string; user: string } {
	return {
		system: DEFAULT_SUMMARY_SYSTEM_PROMPT,
		user: `다음은 회의 음성 전사문입니다:\n\n---\n${transcriptText.trim()}\n---\n\n위 회의 전사문을 바탕으로 핵심 요약, 주요 결정 사항, 액션 아이템을 작성해주세요.`,
	};
}

export function formatMeetingSummaryBlock(summaryContent: string, modelName: string, date: Date = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	const y = date.getFullYear();
	const m = pad(date.getMonth() + 1);
	const d = pad(date.getDate());
	const hh = pad(date.getHours());
	const mm = pad(date.getMinutes());
	const formattedDate = `${y}-${m}-${d} ${hh}:${mm}`;

	return `\n\n## 🤖 로컬 AI 회의록 요약\n> 🔒 100% 프라이빗 로컬 요약 (모델: \`${modelName}\` · 일시: ${formattedDate})\n\n${summaryContent.trim()}\n`;
}

/**
 * 노트 마크다운 본문에서 전사문 텍스트를 추출합니다.
 * 1) on-the-record 마커 구간 내 텍스트 우선 탐색
 * 2) 타임스탬프([00:00]) 형태의 전사 행 수집
 * 3) 없으면 전체 본문 반환
 */
export function extractTranscriptFromMarkdown(markdownBody: string): string {
	if (!markdownBody || markdownBody.trim().length === 0) {
		return "";
	}

	// 1. 마커 블록 추출 (<!-- on-the-record:start ... --> ~ <!-- on-the-record:end -->)
	const markerRegex = /<!--\s*on-the-record:start[^>]*-->([\s\S]*?)<!--\s*on-the-record:end\s*-->/gi;
	let match: RegExpExecArray | null;
	const extractedBlocks: string[] = [];

	while ((match = markerRegex.exec(markdownBody)) !== null) {
		const blockContent = match[1].trim();
		if (blockContent.length > 0) {
			extractedBlocks.push(blockContent);
		}
	}

	if (extractedBlocks.length > 0) {
		return extractedBlocks.join("\n\n");
	}

	// 2. 타임스탬프([00:00] 또는 [00:00:00]) 라인 수집
	const lines = markdownBody.split(/\r?\n/);
	const timestampLineRegex = /^\s*(?:-\s*)?\[\d{1,2}:\d{2}(?::\d{2})?\]/;
	const timestampLines = lines.filter((line) => timestampLineRegex.test(line));

	if (timestampLines.length > 0) {
		return timestampLines.join("\n");
	}

	// 3. 마커도 타임스탬프도 없으면 전체 본문 반환
	return markdownBody.trim();
}
