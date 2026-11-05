import type { TranscriptionResult } from "./provider.ts";

export const DEFAULT_RESULT_HEADING = "전사 결과";

export type ExistingResultChoice = "replace" | "append";

export function formatTimestamp(seconds: number): string {
	const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const secs = total % 60;
	const pad = (value: number) => String(value).padStart(2, "0");
	return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
}

export function formatResultMarkdown(
	result: TranscriptionResult,
	options: { includeTimestamps: boolean },
): string {
	const lines = result.segments
		.map((segment) => ({ start: segment.startSeconds, text: segment.text.trim() }))
		.filter((segment) => segment.text.length > 0)
		.map((segment) =>
			options.includeTimestamps ? `- [${formatTimestamp(segment.start)}] ${segment.text}` : `- ${segment.text}`,
		);
	if (lines.length === 0 && result.text.trim().length > 0) return result.text.trim();
	return lines.join("\n");
}

function beginMarker(audioPath: string): string {
	return `<!-- on-the-record:begin audio="${encodeURIComponent(audioPath)}" -->`;
}

const END_MARKER = "<!-- on-the-record:end -->";

export function wrapResultBlock(audioPath: string, markdown: string): string {
	return `${beginMarker(audioPath)}\n${markdown.trim()}\n${END_MARKER}`;
}

export interface BlockRange {
	start: number;
	end: number;
}

export function findResultBlock(content: string, audioPath: string): BlockRange | null {
	const begin = beginMarker(audioPath);
	const start = content.indexOf(begin);
	if (start < 0) return null;
	const endIndex = content.indexOf(END_MARKER, start + begin.length);
	if (endIndex < 0) return null;
	return { start, end: endIndex + END_MARKER.length };
}

interface HeadingLine {
	level: number;
	offset: number;
	lineEnd: number;
	text: string;
}

function scanHeadings(content: string): HeadingLine[] {
	const headings: HeadingLine[] = [];
	let offset = 0;
	let fence: string | null = null;
	for (const line of content.split("\n")) {
		const lineEnd = offset + line.length;
		const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
		if (fenceMatch) {
			const marker = fenceMatch[1].charAt(0);
			if (fence === null) fence = marker;
			else if (fence === marker) fence = null;
		} else if (fence === null) {
			const match = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line.replace(/\r$/, ""));
			if (match) headings.push({ level: match[1].length, offset, lineEnd, text: match[2].trim() });
		}
		offset = lineEnd + 1;
	}
	return headings;
}

export function hasExistingResult(content: string, audioPath: string): boolean {
	return findResultBlock(content, audioPath) !== null;
}

// 지정 헤딩 섹션의 끝에 결과 블록을 넣는다. 헤딩이 없으면 문서 끝에 새 헤딩을 만든다.
export function applyHeadingInsertion(
	content: string,
	options: {
		heading: string;
		audioPath: string;
		markdown: string;
		existing?: ExistingResultChoice;
	},
): string {
	const heading = options.heading.trim() || DEFAULT_RESULT_HEADING;
	const block = wrapResultBlock(options.audioPath, options.markdown);
	const existing = findResultBlock(content, options.audioPath);

	if (existing && options.existing === "replace") {
		return content.slice(0, existing.start) + block + content.slice(existing.end);
	}

	const headings = scanHeadings(content);
	const index = headings.findIndex((candidate) => candidate.text === heading);
	if (index < 0) {
		const base = content.replace(/\s+$/, "");
		const prefix = base.length > 0 ? `${base}\n\n` : "";
		return `${prefix}## ${heading}\n\n${block}\n`;
	}

	const target = headings[index];
	const next = headings.slice(index + 1).find((candidate) => candidate.level <= target.level);
	const sectionEnd = next ? next.offset : content.length;
	const before = content.slice(0, sectionEnd).replace(/\s+$/, "");
	const after = content.slice(sectionEnd);
	return `${before}\n\n${block}\n${after.length > 0 ? `\n${after}` : ""}`;
}
