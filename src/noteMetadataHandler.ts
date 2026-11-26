import { formatTimestamp } from "./resultPreview.ts";

export interface RecordingMetadataEntry {
	audioPath: string;
	seq: number;
	durationSeconds?: number;
	sizeBytes?: number;
	startedAt: number;
	endedAt: number;
}

export interface NoteRecordingFrontmatter {
	recording_state?: "recorded" | "recording" | "transcribed";
	recordings?: string[];
	recording_count?: number;
	recording_total_seconds?: number;
	recording_total_size_mb?: number;
	recording_first_start?: string;
	recording_last_end?: string;
}

export function parseTimestampToSeconds(text: string): number {
	const cleaned = text.trim().replace(/^\[|\]$/g, "");
	const parts = cleaned.split(":").map((p) => parseInt(p, 10));
	if (parts.some(isNaN)) return 0;
	if (parts.length === 3) {
		return parts[0] * 3600 + parts[1] * 60 + parts[2];
	}
	if (parts.length === 2) {
		return parts[0] * 60 + parts[1];
	}
	if (parts.length === 1) {
		return parts[0];
	}
	return 0;
}

export interface ParsedRecordingItem {
	audioPath: string;
	seq: number;
	durationSeconds: number;
	sizeMb: number;
	dateTimeText?: string;
}

/**
 * 마크다운 본문에서 오디오 녹음 블록 및 임베드를 파싱한다 (3-REC-05).
 */
export function parseRecordingsFromBody(markdown: string): ParsedRecordingItem[] {
	const items: ParsedRecordingItem[] = [];
	const seenPaths = new Set<string>();

	// 1. "### 녹음 N" 헤딩 기반 블록 파싱:
	// ### 녹음 1 · 2026-11-19 12:00 (소요: 02:15 · 3.45 MB)
	// ![[audio.m4a]]
	const headingRegex = /^###\s*녹음\s*(\d+)([^\n]*)/gm;
	let headingMatch: RegExpExecArray | null;

	while ((headingMatch = headingRegex.exec(markdown)) !== null) {
		const seq = parseInt(headingMatch[1], 10) || items.length + 1;
		const restOfLine = headingMatch[2];

		let durationSeconds = 0;
		let sizeMb = 0;
		let dateTimeText: string | undefined;

		const durationMatch = /\(소요:\s*([0-9:]+)/i.exec(restOfLine);
		if (durationMatch) {
			durationSeconds = parseTimestampToSeconds(durationMatch[1]);
		}

		const sizeMatch = /([0-9.]+)\s*MB/i.exec(restOfLine);
		if (sizeMatch) {
			sizeMb = parseFloat(sizeMatch[1]) || 0;
		}

		const dateMatch = /·\s*([0-9]{4}-[0-9]{2}-[0-9]{2}[^(\n]*)/.exec(restOfLine);
		if (dateMatch) {
			dateTimeText = dateMatch[1].trim();
		}

		// 헤딩 바로 아래쪽에서 오디오 임베드 탐색
		const restFromHeading = markdown.slice(headingMatch.index + headingMatch[0].length);
		const embedMatch = /!\[\[([^\]]+\.(?:m4a|mp3|wav|ogg|flac|aac))\]\]/i.exec(restFromHeading);
		if (embedMatch) {
			// 다음 "### 녹음"이나 다른 "##" 헤딩이 나오기 전이어야 함
			const nextHeadingIdx = restFromHeading.search(/\n##+/);
			if (nextHeadingIdx === -1 || embedMatch.index < nextHeadingIdx) {
				const audioPath = embedMatch[1].trim();
				if (!seenPaths.has(audioPath)) {
					seenPaths.add(audioPath);
					items.push({
						audioPath,
						seq,
						durationSeconds,
						sizeMb,
						dateTimeText,
					});
				}
			}
		}
	}

	// 2. 세션 마커 패턴:
	// <!-- on-the-record:start audio="path.m4a" seq="1" -->
	const markerRegex = /<!--\s*on-the-record:start\s+audio="([^"]+)"(?:\s+seq="(\d+)")?\s*-->/gi;
	let match: RegExpExecArray | null;
	while ((match = markerRegex.exec(markdown)) !== null) {
		const audioPath = match[1].trim();
		const seq = match[2] ? parseInt(match[2], 10) : items.length + 1;
		if (audioPath && !seenPaths.has(audioPath)) {
			seenPaths.add(audioPath);
			items.push({
				audioPath,
				seq,
				durationSeconds: 0,
				sizeMb: 0,
			});
		}
	}

	// 3. 본문 내 단순 오디오 임베드 패턴: ![[...m4a]]
	const embedRegex = /!\[\[([^\]]+\.(?:m4a|mp3|wav|ogg|flac|aac))\]\]/gi;
	while ((match = embedRegex.exec(markdown)) !== null) {
		const audioPath = match[1].trim();
		if (audioPath && !seenPaths.has(audioPath)) {
			seenPaths.add(audioPath);
			items.push({
				audioPath,
				seq: items.length + 1,
				durationSeconds: 0,
				sizeMb: 0,
			});
		}
	}

	return items;
}

/**
 * 마크다운 문서의 Frontmatter를 본문 내용 및 파일 정보 기준으로 완전히 재계산한다 (3-REC-05).
 */
export function recalculateFrontmatterRecordings(
	markdown: string,
	statsResolver?: (audioPath: string) => { sizeBytes?: number; durationSeconds?: number; mtime?: number } | undefined,
): { updatedMarkdown: string; count: number; totalSeconds: number; totalSizeMb: number; recordings: string[] } {
	const parsedItems = parseRecordingsFromBody(markdown);
	const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
	const match = frontmatterRegex.exec(markdown);

	const existingNonRecordingLines: string[] = [];
	if (match) {
		const rawYaml = match[1];
		const lines = rawYaml.split(/\r?\n/);
		let inRecordings = false;
		for (const line of lines) {
			if (line.startsWith("recordings:")) {
				inRecordings = true;
				continue;
			}
			if (inRecordings) {
				if (/^\s*-\s*/.test(line)) {
					continue;
				} else {
					inRecordings = false;
				}
			}
			const colonIdx = line.indexOf(":");
			if (colonIdx > 0) {
				const key = line.slice(0, colonIdx).trim();
				if (!key.startsWith("recording_") && key !== "recordings") {
					existingNonRecordingLines.push(line);
				}
			} else {
				existingNonRecordingLines.push(line);
			}
		}
	}

	if (parsedItems.length === 0) {
		// 녹음이 전혀 없으면 Frontmatter의 recording_* 속성 제거
		if (match) {
			if (existingNonRecordingLines.length === 0) {
				const rest = markdown.slice(match[0].length).replace(/^\r?\n/, "");
				return { updatedMarkdown: rest, count: 0, totalSeconds: 0, totalSizeMb: 0, recordings: [] };
			} else {
				const newYaml = ["---", ...existingNonRecordingLines, "---"].join("\n");
				return {
					updatedMarkdown: markdown.replace(frontmatterRegex, newYaml),
					count: 0,
					totalSeconds: 0,
					totalSizeMb: 0,
					recordings: [],
				};
			}
		}
		return { updatedMarkdown: markdown, count: 0, totalSeconds: 0, totalSizeMb: 0, recordings: [] };
	}

	let totalSeconds = 0;
	let totalSizeMb = 0;
	const recordings: string[] = [];
	let firstStartIso: string | undefined;
	let lastEndIso: string | undefined;

	for (const item of parsedItems) {
		recordings.push(`"[[${item.audioPath}]]"`);
		let duration = item.durationSeconds;
		let sizeMb = item.sizeMb;

		if (statsResolver) {
			const stat = statsResolver(item.audioPath);
			if (stat) {
				if (duration === 0 && stat.durationSeconds) {
					duration = stat.durationSeconds;
				}
				if (sizeMb === 0 && stat.sizeBytes) {
					sizeMb = Math.round((stat.sizeBytes / (1024 * 1024)) * 100) / 100;
				}
				if (stat.mtime) {
					const iso = new Date(stat.mtime).toISOString();
					if (!firstStartIso) firstStartIso = iso;
					lastEndIso = iso;
				}
			}
		}

		totalSeconds += duration;
		totalSizeMb += sizeMb;
	}

	totalSizeMb = Math.round(totalSizeMb * 100) / 100;
	const nowIso = new Date().toISOString();
	if (!firstStartIso) firstStartIso = nowIso;
	if (!lastEndIso) lastEndIso = nowIso;

	const newYamlLines: string[] = [
		...existingNonRecordingLines,
		"recording_state: recorded",
		"recordings:",
		...recordings.map((r) => `  - ${r}`),
		`recording_count: ${recordings.length}`,
		`recording_total_seconds: ${totalSeconds}`,
		`recording_total_size_mb: ${totalSizeMb}`,
		`recording_first_start: "${firstStartIso}"`,
		`recording_last_end: "${lastEndIso}"`,
	];

	const newYaml = ["---", ...newYamlLines, "---"].join("\n");
	let updatedMarkdown: string;
	if (match) {
		updatedMarkdown = markdown.replace(frontmatterRegex, newYaml);
	} else {
		updatedMarkdown = `${newYaml}\n\n${markdown}`;
	}

	return {
		updatedMarkdown,
		count: recordings.length,
		totalSeconds,
		totalSizeMb,
		recordings,
	};
}

/**
 * 마크다운 문서의 Frontmatter(YAML)를 파싱하고 새 녹음 정보를 누적 갱신한다.
 */
export function updateFrontmatterRecordings(
	markdown: string,
	entry: RecordingMetadataEntry,
): string {
	const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
	const match = frontmatterRegex.exec(markdown);

	const duration = entry.durationSeconds ?? Math.max(0, Math.round((entry.endedAt - entry.startedAt) / 1000));
	const sizeMb = entry.sizeBytes ? Math.round((entry.sizeBytes / (1024 * 1024)) * 100) / 100 : 0;
	const isoStart = new Date(entry.startedAt).toISOString();
	const isoEnd = new Date(entry.endedAt).toISOString();
	const recordingWikiLink = `"[[${entry.audioPath}]]"`;

	if (!match) {
		// Frontmatter가 없으면 새로 생성
		const newFrontmatter = [
			"---",
			"recording_state: recorded",
			"recordings:",
			`  - ${recordingWikiLink}`,
			"recording_count: 1",
			`recording_total_seconds: ${duration}`,
			`recording_total_size_mb: ${sizeMb}`,
			`recording_first_start: "${isoStart}"`,
			`recording_last_end: "${isoEnd}"`,
			"---",
			"",
		].join("\n");
		return `${newFrontmatter}${markdown}`;
	}

	const rawYaml = match[1];
	const lines = rawYaml.split(/\r?\n/);
	const updatedYamlMap: Record<string, string | string[]> = {};
	const extraLines: string[] = [];
	let inRecordingsList = false;
	const currentRecordings: string[] = [];

	for (const line of lines) {
		if (line.startsWith("recordings:")) {
			inRecordingsList = true;
			continue;
		}
		if (inRecordingsList) {
			if (/^\s*-\s*/.test(line)) {
				const linkVal = line.replace(/^\s*-\s*/, "").trim();
				if (linkVal) currentRecordings.push(linkVal);
				continue;
			} else {
				inRecordingsList = false;
			}
		}

		const colonIdx = line.indexOf(":");
		if (colonIdx > 0) {
			const key = line.slice(0, colonIdx).trim();
			const val = line.slice(colonIdx + 1).trim();
			updatedYamlMap[key] = val;
		} else {
			extraLines.push(line);
		}
	}

	// 누적 계산
	if (!currentRecordings.some((r) => r.includes(entry.audioPath))) {
		currentRecordings.push(recordingWikiLink);
	}

	const prevCount = parseInt(String(updatedYamlMap["recording_count"] ?? "0"), 10) || 0;
	const newCount = Math.max(currentRecordings.length, prevCount + 1, entry.seq);

	const prevSeconds = parseInt(String(updatedYamlMap["recording_total_seconds"] ?? "0"), 10) || 0;
	const newSeconds = prevSeconds + duration;

	const prevSizeMb = parseFloat(String(updatedYamlMap["recording_total_size_mb"] ?? "0")) || 0;
	const newSizeMb = Math.round((prevSizeMb + sizeMb) * 100) / 100;

	const firstStart = updatedYamlMap["recording_first_start"]
		? String(updatedYamlMap["recording_first_start"]).replace(/^"|"$/g, "")
		: isoStart;

	// 새 YAML 블록 조합
	const newYamlLines: string[] = [];

	// 기존 키 중 recording 관련 제외하고 먼저 보존
	for (const [k, v] of Object.entries(updatedYamlMap)) {
		if (!k.startsWith("recording_") && k !== "recordings") {
			if (Array.isArray(v)) {
				newYamlLines.push(`${k}:`);
				for (const item of v) {
					newYamlLines.push(`  - ${item}`);
				}
			} else {
				newYamlLines.push(`${k}: ${v}`);
			}
		}
	}

	newYamlLines.push("recording_state: recorded");
	newYamlLines.push("recordings:");
	for (const rec of currentRecordings) {
		newYamlLines.push(`  - ${rec}`);
	}
	newYamlLines.push(`recording_count: ${newCount}`);
	newYamlLines.push(`recording_total_seconds: ${newSeconds}`);
	newYamlLines.push(`recording_total_size_mb: ${newSizeMb}`);
	newYamlLines.push(`recording_first_start: "${firstStart}"`);
	newYamlLines.push(`recording_last_end: "${isoEnd}"`);

	const newYaml = ["---", ...newYamlLines, "---"].join("\n");
	return markdown.replace(frontmatterRegex, newYaml);
}

/**
 * 특정 세션의 고유 마커 주석을 생성한다 (3-REC-03).
 */
export function getSessionMarker(audioPath: string, seq: number, type: "start" | "end"): string {
	return `<!-- on-the-record:${type} audio="${audioPath}" seq="${seq}" -->`;
}

/**
 * 본문 내에 특정 오디오에 대한 세션 마커 블록이 이미 존재하는지 검사한다.
 */
export function hasSessionMarkerInBody(markdown: string, audioPath: string): boolean {
	const escaped = audioPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(`<!--\\s*on-the-record:start\\s+audio="${escaped}"(?:\\s+seq="\\d+")?\\s*-->`, "i");
	return regex.test(markdown);
}

/**
 * 본문에 `## 녹음 기록` 섹션을 찾거나 생성하고, 세션별 상세 블록을 격리 추가한다 (3-REC-04, 3-REC-03).
 */
export function appendRecordingBlockToBody(
	markdown: string,
	entry: RecordingMetadataEntry,
): string {
	if (hasSessionMarkerInBody(markdown, entry.audioPath)) {
		return markdown;
	}

	const duration = entry.durationSeconds ?? Math.max(0, Math.round((entry.endedAt - entry.startedAt) / 1000));
	const durationFormatted = formatTimestamp(duration);
	const startDate = new Date(entry.startedAt);
	const pad = (n: number) => String(n).padStart(2, "0");
	const timeString = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())} ${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;

	const sizeText = entry.sizeBytes
		? ` · ${(entry.sizeBytes / (1024 * 1024)).toFixed(2)} MB`
		: "";

	const startMarker = getSessionMarker(entry.audioPath, entry.seq, "start");
	const endMarker = getSessionMarker(entry.audioPath, entry.seq, "end");

	const sessionBlock = [
		startMarker,
		`### 녹음 ${entry.seq} · ${timeString} (소요: ${durationFormatted}${sizeText})`,
		`![[${entry.audioPath}]]`,
		"",
		endMarker,
	].join("\n");

	const sectionHeading = "## 녹음 기록";
	const sectionIndex = markdown.indexOf(sectionHeading);

	if (sectionIndex === -1) {
		const trimmed = markdown.trimEnd();
		if (trimmed.length === 0) {
			return `${sectionHeading}\n\n${sessionBlock}\n`;
		}
		return `${trimmed}\n\n${sectionHeading}\n\n${sessionBlock}\n`;
	}

	const afterHeading = sectionIndex + sectionHeading.length;
	const rest = markdown.slice(afterHeading);
	const nextHeadingMatch = /\n##+\s/.exec(rest);

	if (nextHeadingMatch && nextHeadingMatch.index !== undefined) {
		const insertPos = afterHeading + nextHeadingMatch.index;
		const before = markdown.slice(0, insertPos).trimEnd();
		const after = markdown.slice(insertPos);
		return `${before}\n\n${sessionBlock}\n\n${after.trimStart()}`;
	} else {
		return `${markdown.trimEnd()}\n\n${sessionBlock}\n`;
	}
}

/**
 * Frontmatter와 본문 녹음 블록을 2중 기록하는 종합 트랜잭션 함수 (3-REC-04, 3-REC-03).
 */
export function applyRecordingSessionToMarkdown(
	markdown: string,
	entry: RecordingMetadataEntry,
): string {
	const withFrontmatter = updateFrontmatterRecordings(markdown, entry);
	return appendRecordingBlockToBody(withFrontmatter, entry);
}
