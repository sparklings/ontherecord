import type { OnTabCloseAction } from "./settings.ts";
import type { ActiveRecordingSession, RecordingSessionManager } from "./recordingSession.ts";
import { applyRecordingSessionToMarkdown } from "./noteMetadataHandler.ts";
import type { RecordingMetadataEntry } from "./noteMetadataHandler.ts";

export interface TabCloseVaultAdapter {
	read(path: string): Promise<string>;
	process(path: string, fn: (content: string) => string): Promise<string>;
	exists(path: string): Promise<boolean>;
}

export interface TabCloseHandlerOptions {
	sessionManager: RecordingSessionManager;
	vault: TabCloseVaultAdapter;
	getAction: () => OnTabCloseAction;
	onNotice?: (message: string) => void;
}

/**
 * 노트 본문 내에 특정 오디오 파일에 대한 임베드가 이미 존재하는지 확인한다.
 */
export function hasAudioEmbedInMarkdown(content: string, audioPath: string): boolean {
	const filename = audioPath.split("/").pop() ?? audioPath;
	const escapedPath = audioPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const escapedName = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	// ![[path]] 또는 ![[filename]] 또는 ![[.../filename]] 형태
	const regex = new RegExp(`!\\[\\[\\s*(?:[^\\]]*\\/)?(?:${escapedPath}|${escapedName})(?:\\|[^\\]]*)?\\s*\\]\\]`, "i");
	return regex.test(content);
}

/**
 * 노트 본문 끝에 오디오 임베드를 안전하게 추가한다.
 * 이미 존재하면 원본 본문을 그대로 반환한다.
 */
export function attachAudioEmbedToMarkdown(content: string, audioPath: string): string {
	if (hasAudioEmbedInMarkdown(content, audioPath)) {
		return content;
	}

	const trimmed = content.trimEnd();
	const embedTag = `![[${audioPath}]]`;
	if (trimmed.length === 0) {
		return `${embedTag}\n`;
	}
	return `${trimmed}\n\n${embedTag}\n`;
}

export class TabCloseHandler {
	private readonly sessionManager: RecordingSessionManager;
	private readonly vault: TabCloseVaultAdapter;
	private readonly getAction: () => OnTabCloseAction;
	private readonly onNotice?: (message: string) => void;

	// 직전 중지된 세션과 연결 대기 중인 정보
	private recentlyStoppedSession: {
		session: ActiveRecordingSession;
		stoppedAt: number;
	} | null = null;

	constructor(options: TabCloseHandlerOptions) {
		this.sessionManager = options.sessionManager;
		this.vault = options.vault;
		this.getAction = options.getAction;
		this.onNotice = options.onNotice;
	}

	getRecentlyStoppedSession(): ActiveRecordingSession | null {
		if (!this.recentlyStoppedSession) return null;
		// 15초 이내의 세션만 유효한 것으로 처리
		if (Date.now() - this.recentlyStoppedSession.stoppedAt > 15_000) {
			this.recentlyStoppedSession = null;
			return null;
		}
		return this.recentlyStoppedSession.session;
	}

	setRecentlyStoppedSession(session: ActiveRecordingSession): void {
		this.recentlyStoppedSession = {
			session,
			stoppedAt: Date.now(),
		};
	}

	/**
	 * 탭(leaf)이 닫힐 때 호출된다.
	 * 닫히는 탭의 노트가 현재 녹음 중인 노트와 일치하면 설정에 따라 녹음을 안전 중지한다.
	 */
	async handleLeafClose(closedNotePath: string): Promise<boolean> {
		const activeSession = this.sessionManager.getActiveSession();
		if (!activeSession) return false;

		if (activeSession.notePath !== closedNotePath) {
			return false;
		}

		const action = this.getAction();
		if (action === "ignore") {
			return false;
		}

		try {
			const stopped = await this.sessionManager.stopSession();
			if (stopped) {
				this.recentlyStoppedSession = {
					session: stopped,
					stoppedAt: Date.now(),
				};
				this.onNotice?.(`녹음 중인 노트 탭이 닫혀 '${closedNotePath}'의 음성 녹음을 안전하게 중지했습니다.`);
				return true;
			}
		} catch (error) {
			console.error("[on-the-record] 탭 닫힘 시 녹음 중지 실패:", error);
		}

		return false;
	}

	/**
	 * 생성된 오디오 파일을 해당 노트에 안전하게 연결(attach)한다.
	 * 세션 메타데이터가 있으면 Frontmatter와 본문 녹음 블록을 2중 기록한다 (3-REC-04, 3-REC-03).
	 */
	async attachAudioToNote(
		notePath: string,
		audioPath: string,
		sessionMetadata?: Partial<RecordingMetadataEntry>,
	): Promise<boolean> {
		try {
			if (!(await this.vault.exists(notePath))) {
				return false;
			}

			const recently = this.getRecentlyStoppedSession();
			const now = Date.now();
			const entry: RecordingMetadataEntry = {
				audioPath,
				seq: sessionMetadata?.seq ?? recently?.seq ?? 1,
				startedAt: sessionMetadata?.startedAt ?? recently?.startedAt ?? (now - 60_000),
				endedAt: sessionMetadata?.endedAt ?? now,
				sizeBytes: sessionMetadata?.sizeBytes,
				durationSeconds: sessionMetadata?.durationSeconds,
			};

			await this.vault.process(notePath, (content) => {
				// 본문에 이미 해당 오디오 파일에 대한 임베드가 존재하면 중복 삽입하지 않고 원본 유지
				if (hasAudioEmbedInMarkdown(content, audioPath)) {
					return content;
				}
				return applyRecordingSessionToMarkdown(content, entry);
			});
			return true;
		} catch (error) {
			console.error(`[on-the-record] 오디오 파일('${audioPath}')의 노트('${notePath}') 연결 실패:`, error);
			return false;
		}
	}

	/**
	 * 코어 오디오 레코더가 녹음 완료 후 새 탭으로 오디오 파일을 여는 동작(S-09)을 감지하고 닫도록 판단한다.
	 */
	shouldAutoCloseAudioLeaf(openedPath: string): boolean {
		const recentlyStopped = this.getRecentlyStoppedSession();
		if (!recentlyStopped) return false;

		const ext = openedPath.split(".").pop()?.toLowerCase();
		if (ext === "m4a" || ext === "mp3" || ext === "wav" || ext === "ogg" || ext === "aac") {
			return true;
		}

		return false;
	}
}
