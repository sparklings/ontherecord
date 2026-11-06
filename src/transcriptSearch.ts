export interface TranscriptSearchMatch {
	notePath: string;
	audioPath: string;
	timestamp: string;
	text: string;
	line: number;
}

const TRANSCRIPT_BLOCK = /<!-- on-the-record:begin audio="([^"]*)" -->[ \t]*\r?\n([\s\S]*?)<!-- on-the-record:end -->/g;
const TIMESTAMPED_SEGMENT = /^\s*-\s+\[(\d+:\d{2}(?::\d{2})?)\]\s+(.+?)\s*$/;

export function findTranscriptMatches(
	notePath: string,
	content: string,
	query: string,
): TranscriptSearchMatch[] {
	const normalizedQuery = query.trim().toLocaleLowerCase();
	if (!normalizedQuery) return [];

	const matches: TranscriptSearchMatch[] = [];
	for (const block of content.matchAll(TRANSCRIPT_BLOCK)) {
		const encodedAudioPath = block[1];
		const body = block[2];
		const bodyStart = (block.index ?? 0) + block[0].indexOf(body);
		let audioPath = encodedAudioPath;
		try {
			audioPath = decodeURIComponent(encodedAudioPath);
		} catch {
			// Keep the encoded value visible for a manually edited marker.
		}

		let lineOffset = 0;
		for (const line of body.split(/\r?\n/)) {
			const segment = TIMESTAMPED_SEGMENT.exec(line);
			if (segment && segment[2].toLocaleLowerCase().includes(normalizedQuery)) {
				const precedingNewlines = content.slice(0, bodyStart).match(/\n/g)?.length ?? 0;
				matches.push({
					notePath,
					audioPath,
					timestamp: segment[1],
					text: segment[2],
					line: precedingNewlines + lineOffset,
				});
			}
			lineOffset += 1;
		}
	}
	return matches;
}
