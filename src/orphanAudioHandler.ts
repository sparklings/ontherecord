import type { App } from "obsidian";
import type { ActiveRecordingSession } from "./recordingSession.ts";

export const SUPPORTED_AUDIO_EXTENSIONS = new Set(["m4a", "mp3", "wav", "ogg", "flac", "aac"]);

export interface OrphanAudioFileInfo {
	path: string;
	name: string;
	sizeBytes: number;
	mtime: number;
}

/**
 * 볼트 내의 오디오 파일과 링크된 경로들을 비교하여 고아 오디오 파일 목록을 반환한다 (3-REC-06 순수 함수).
 */
export function findOrphanAudioFiles(
	audioFiles: OrphanAudioFileInfo[],
	linkedAudioPaths: Set<string>,
): OrphanAudioFileInfo[] {
	return audioFiles.filter((audio) => {
		const normPath = audio.path.replace(/\\/g, "/");
		const normName = audio.name;
		// 전체 경로 일치 또는 파일명 일치 검사
		for (const linked of linkedAudioPaths) {
			const normLinked = linked.replace(/\\/g, "/");
			if (normLinked === normPath || normLinked.endsWith(`/${normName}`) || normLinked === normName) {
				return false;
			}
		}
		return true;
	});
}

/**
 * 볼트의 resolvedLinks 캐시 또는 파일 본문 링크 집합을 수집한다.
 */
export function collectAllLinkedAudioPaths(app: App): Set<string> {
	const linked = new Set<string>();
	const resolvedLinks = app.metadataCache.resolvedLinks;
	if (resolvedLinks) {
		for (const sourcePath in resolvedLinks) {
			const targets = resolvedLinks[sourcePath];
			for (const targetPath in targets) {
				const ext = targetPath.split(".").pop()?.toLowerCase();
				if (ext && SUPPORTED_AUDIO_EXTENSIONS.has(ext)) {
					linked.add(targetPath);
				}
			}
		}
	}
	return linked;
}

/**
 * 앱 기동 시 이전 비정상 종료된 세션을 점검하고 복구 안내 메시지를 도출한다 (3-REC-06 순수 함수).
 */
export async function checkUnfinishedSessionOnStartup(
	app: App,
	sessionStore: { get: () => Promise<ActiveRecordingSession | null> },
	onDetected?: (message: string) => void,
): Promise<string | null> {
	try {
		const session = await sessionStore.get();
		if (!session) return null;

		const targetNote = app.vault.getAbstractFileByPath(session.notePath);
		const noteName = targetNote ? targetNote.name : session.notePath;
		const msg = `[On the Record] 비정상 종료된 녹음 세션 감지\n대상 노트: ${noteName}\n새 녹음을 시작하거나 수동으로 점검해주세요.`;
		if (onDetected) {
			onDetected(msg);
		}
		return msg;
	} catch {
		return null;
	}
}
