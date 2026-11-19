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
			newYamlLines.push(`${k}: ${v}`);
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
		// 섹션이 없으면 문서 맨 끝에 섹션과 함께 추가
		const trimmed = markdown.trimEnd();
		if (trimmed.length === 0) {
			return `${sectionHeading}\n\n${sessionBlock}\n`;
		}
		return `${trimmed}\n\n${sectionHeading}\n\n${sessionBlock}\n`;
	}

	// 섹션이 이미 존재하면 해당 섹션 헤딩 바로 아래에 새 블록을 추가하거나 다음 헤딩 직전에 추가
	const afterHeading = sectionIndex + sectionHeading.length;
	const rest = markdown.slice(afterHeading);
	const nextHeadingMatch = /\n##+\s/.exec(rest);

	if (nextHeadingMatch && nextHeadingMatch.index !== undefined) {
		const insertPos = afterHeading + nextHeadingMatch.index;
		const before = markdown.slice(0, insertPos).trimEnd();
		const after = markdown.slice(insertPos);
		return `${before}\n\n${sessionBlock}\n\n${after.trimStart()}`;
	} else {
		// 뒤에 다른 2레벨 이상 헤딩이 없으면 문서 끝에 덧붙임
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
