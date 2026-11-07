import type { RecordStartMode } from "./settings.ts";

export interface ActiveRecordingSession {
	notePath: string;
	startedAt: number;
	seq: number;
}

export interface SessionStorageAdapter {
	read(): Promise<string | null>;
	write(data: string): Promise<void>;
	delete(): Promise<void>;
}

export interface CoreAudioRecorder {
	isRecording(): boolean;
	start(): Promise<boolean>;
	stop(): Promise<boolean>;
}

export interface StartSessionOptions {
	notePath: string;
	seq: number;
	mode: RecordStartMode;
	showNotice?: boolean;
	onNotice?: (message: string) => void;
}

export function resolveRecordStartMode(
	frontmatterRecorder: unknown,
	defaultMode: RecordStartMode,
): RecordStartMode {
	if (frontmatterRecorder === undefined || frontmatterRecorder === null || frontmatterRecorder === "") {
		return defaultMode;
	}

	if (typeof frontmatterRecorder === "boolean") {
		return frontmatterRecorder ? defaultMode : "manual";
	}

	if (typeof frontmatterRecorder === "string") {
		const normalized = frontmatterRecorder.trim().toLowerCase();
		if (normalized === "auto" || normalized === "confirm") {
			return "auto";
		}
		if (
			normalized === "manual" ||
			normalized === "false" ||
			normalized === "off" ||
			normalized === "none" ||
			normalized === "no" ||
			normalized === "disabled"
		) {
			return "manual";
		}
	}

	return defaultMode;
}

export function resolveRecordStartNotice(
	frontmatterRecorder: unknown,
	defaultShowNotice: boolean,
): boolean {
	if (typeof frontmatterRecorder === "string") {
		const normalized = frontmatterRecorder.trim().toLowerCase();
		if (normalized === "silent") return false;
		if (normalized === "confirm" || normalized === "notice") return true;
	}
	return defaultShowNotice;
}

export function calculateNextRecordingSeq(existingEmbedCount: number): number {
	return Math.max(1, existingEmbedCount + 1);
}

export class RecordingSessionManager {
	private currentSession: ActiveRecordingSession | null = null;
	private readonly storage: SessionStorageAdapter;
	private readonly recorder: CoreAudioRecorder;
	private readonly getNow: () => number;

	constructor(
		storage: SessionStorageAdapter,
		recorder: CoreAudioRecorder,
		getNow: () => number = () => Date.now(),
	) {
		this.storage = storage;
		this.recorder = recorder;
		this.getNow = getNow;
	}

	getActiveSession(): ActiveRecordingSession | null {
		return this.currentSession;
	}

	isRecording(): boolean {
		return this.currentSession !== null || this.recorder.isRecording();
	}

	async restore(): Promise<ActiveRecordingSession | null> {
		try {
			const raw = await this.storage.read();
			if (!raw) {
				this.currentSession = null;
				return null;
			}
			const parsed = JSON.parse(raw) as unknown;
			if (
				typeof parsed === "object" &&
				parsed !== null &&
				"notePath" in parsed &&
				typeof (parsed as Record<string, unknown>).notePath === "string" &&
				"startedAt" in parsed &&
				typeof (parsed as Record<string, unknown>).startedAt === "number" &&
				"seq" in parsed &&
				typeof (parsed as Record<string, unknown>).seq === "number"
			) {
				this.currentSession = parsed as ActiveRecordingSession;
				return this.currentSession;
			}
			await this.storage.delete();
			this.currentSession = null;
			return null;
		} catch {
			await this.storage.delete().catch(() => {});
			this.currentSession = null;
			return null;
		}
	}

	async startSession(options: StartSessionOptions): Promise<ActiveRecordingSession | null> {
		if (this.isRecording()) {
			options.onNotice?.("이미 녹음이 진행 중입니다.");
			return null;
		}

		if (options.mode === "manual") {
			return null;
		}

		if (options.showNotice !== false) {
			options.onNotice?.("음성 녹음을 시작합니다.");
		}

		let started = false;
		try {
			started = await this.recorder.start();
		} catch {
			started = false;
		}

		if (!started) {
			options.onNotice?.("코어 Audio recorder를 시작하지 못했습니다. 코어 플러그인이 활성화되어 있는지 확인하세요.");
			return null;
		}

		const session: ActiveRecordingSession = {
			notePath: options.notePath,
			startedAt: this.getNow(),
			seq: options.seq,
		};

		this.currentSession = session;
		try {
			await this.storage.write(JSON.stringify(session, null, 2));
		} catch {
			// 디스크 저장 실패 시에도 메모리 세션은 유지
		}

		return session;
	}

	async startManualSession(options: {
		notePath: string;
		seq: number;
		onNotice?: (message: string) => void;
	}): Promise<ActiveRecordingSession | null> {
		return this.startSession({
			notePath: options.notePath,
			seq: options.seq,
			mode: "auto",
			showNotice: true,
			onNotice: options.onNotice,
		});
	}

	async stopSession(): Promise<ActiveRecordingSession | null> {
		const session = this.currentSession;
		try {
			if (this.recorder.isRecording()) {
				await this.recorder.stop();
			}
		} finally {
			this.currentSession = null;
			await this.storage.delete().catch(() => {});
		}
		return session;
	}
}
