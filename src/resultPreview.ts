import type { TranscriptionResult } from "./provider.ts";

export type ExistingResultChoice = "replace" | "append";

export interface AudioEmbedPosition {
	start: { line: number; ch: number };
	end: { line: number; ch: number };
	link: string;
}

export function prioritizeAudioEmbeds<T extends { position: { start: { line: number; col: number } } }>(
	embeds: readonly T[],
	cursor: { line: number; ch: number },
): T[] {
	const comparePosition = (left: T, right: T) =>
		left.position.start.line - right.position.start.line ||
		left.position.start.col - right.position.start.col;
	const atOrAbove = embeds
		.filter((embed) =>
			embed.position.start.line < cursor.line ||
			(embed.position.start.line === cursor.line && embed.position.start.col <= cursor.ch),
		)
		.sort((left, right) => comparePosition(right, left));
	const below = embeds
		.filter((embed) =>
			embed.position.start.line > cursor.line ||
			(embed.position.start.line === cursor.line && embed.position.start.col > cursor.ch),
		)
		.sort(comparePosition);
	return [...atOrAbove, ...below];
}

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

export function hasExistingResult(content: string, audioPath: string): boolean {
	return findResultBlock(content, audioPath) !== null;
}

export function applyAudioEmbedInsertion(
	content: string,
	options: {
		audioPath: string;
		markdown: string;
		embed: AudioEmbedPosition;
		existing?: ExistingResultChoice;
	},
): string {
	const lineStarts = [0];
	for (let index = 0; index < content.length; index += 1) {
		if (content[index] === "\n") lineStarts.push(index + 1);
	}
	const startLine = lineStarts[options.embed.start.line];
	const endLine = lineStarts[options.embed.end.line];
	if (startLine === undefined || endLine === undefined) {
		throw new Error("오디오 embed 위치가 현재 노트 범위를 벗어났습니다. 다시 시도하세요.");
	}
	const embedStart = startLine + options.embed.start.ch;
	const embedEnd = endLine + options.embed.end.ch;
	if (embedStart < 0 || embedEnd < embedStart || embedEnd > content.length) {
		throw new Error("오디오 embed 위치가 올바르지 않습니다. 다시 시도하세요.");
	}
	const embedText = content.slice(embedStart, embedEnd);
	const hasEmbedPrefix = embedText.startsWith("!") || (embedStart > 0 && content[embedStart - 1] === "!");
	if (!hasEmbedPrefix || !embedText.includes(options.embed.link)) {
		throw new Error("노트의 오디오 embed가 변경되었습니다. 검색 후 다시 시도하세요.");
	}

	const embedLine = options.embed.end.ch === 0 && options.embed.end.line > options.embed.start.line
		? options.embed.end.line - 1
		: options.embed.end.line;
	const lineStart = lineStarts[embedLine];
	if (lineStart === undefined) throw new Error("오디오 embed 행을 찾을 수 없습니다.");
	const nextNewline = content.indexOf("\n", lineStart);
	const anchor = nextNewline < 0 ? content.length : nextNewline + 1;
	const existingBlocks: BlockRange[] = [];
	const marker = new RegExp(
		`<!-- on-the-record:begin audio="${escapeRegExp(encodeURIComponent(options.audioPath))}" -->[\\s\\S]*?<!-- on-the-record:end -->`,
		"g",
	);
	for (const match of content.matchAll(marker)) {
		const start = match.index;
		existingBlocks.push({ start, end: start + match[0].length });
	}
	if (existingBlocks.length > 0 && options.existing === undefined) {
		throw new Error("기존 전사 결과의 처리 방법을 선택하세요.");
	}

	let adjustedAnchor = anchor;
	let result = content;
	for (const range of [...existingBlocks].reverse()) {
		result = result.slice(0, range.start) + result.slice(range.end);
		if (range.end <= anchor) adjustedAnchor -= range.end - range.start;
	}

	const blocks = options.existing === "append"
		? [...existingBlocks.map((range) => content.slice(range.start, range.end)), wrapResultBlock(options.audioPath, options.markdown)]
		: [wrapResultBlock(options.audioPath, options.markdown)];
	const before = result.slice(0, adjustedAnchor);
	const after = result.slice(adjustedAnchor);
	const prefix = before.endsWith("\n") ? "\n" : "\n\n";
	return `${before}${prefix}${blocks.join("\n\n")}\n${after}`;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
