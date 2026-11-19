import { isSupportedAudioExtension } from "./audioFiles.ts";
import { hasExistingResult } from "./resultPreview.ts";

export interface AudioEmbedItem {
	audioPath: string;
	filename: string;
	lineNumber: number; // 1-based
	transcribed: boolean;
	rawLineText: string;
}

/**
 * 마크다운 본문에서 오디오 임베드 및 전사 상태, 행 번호(Line N)를 파싱합니다 (3-PIPE-05, 3-UX-05).
 */
export function parseAudioEmbedsFromMarkdown(markdownBody: string): AudioEmbedItem[] {
	if (!markdownBody || markdownBody.trim().length === 0) {
		return [];
	}

	const lines = markdownBody.split(/\r?\n/);
	const items: AudioEmbedItem[] = [];

	// Obsidian 임베드 정규식: ![[filename.ext]] 또는 ![[folder/filename.ext|alias]]
	const embedRegex = /!\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		let match: RegExpExecArray | null;

		embedRegex.lastIndex = 0;
		while ((match = embedRegex.exec(line)) !== null) {
			const rawPath = match[1].trim();
			const parts = rawPath.split(/[\\/]/);
			const filename = parts.pop() ?? rawPath;
			const extMatch = /\.([a-zA-Z0-9]+)$/.exec(filename);

			if (extMatch && isSupportedAudioExtension(extMatch[1])) {
				// 전사 완료 여부 판정 (결과 마커 및 전사문 블록 존재 여부)
				const encodedPath = encodeURIComponent(rawPath);
				const encodedName = encodeURIComponent(filename);
				const transcribed =
					hasExistingResult(markdownBody, rawPath) ||
					hasExistingResult(markdownBody, filename) ||
					markdownBody.includes(`audio="${encodedPath}"`) ||
					markdownBody.includes(`audio="${encodedName}"`) ||
					markdownBody.includes(`audio="${rawPath}"`) ||
					markdownBody.includes(`audio="${filename}"`);

				items.push({
					audioPath: rawPath,
					filename,
					lineNumber: i + 1,
					transcribed,
					rawLineText: line,
				});
			}
		}
	}

	return items;
}

/**
 * 활성 에디터에서 특정 라인 번호(Line N)로 커서를 이동하고 스크롤을 맞춥니다 (3-UX-11).
 */
export function jumpToLineInActiveEditor(app: any, lineNumber: number): boolean {
	const activeLeaf = app?.workspace?.activeLeaf;
	const view = activeLeaf?.view;
	const editor = view?.editor;
	if (!editor) return false;

	const targetLine = Math.max(0, lineNumber - 1);
	if (typeof editor.focus === "function") editor.focus();
	if (typeof editor.setCursor === "function") editor.setCursor({ line: targetLine, ch: 0 });
	if (typeof editor.scrollIntoView === "function") {
		editor.scrollIntoView(
			{
				from: { line: targetLine, ch: 0 },
				to: { line: targetLine, ch: 0 },
			},
			true,
		);
	}

	return true;
}
