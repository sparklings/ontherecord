import { formatTimestamp } from "./resultPreview.ts";
import type { ActiveRecordingSession } from "./recordingSession.ts";

export interface RecordingStatusBarElement {
	setText(text: string): void;
	setAttribute(qualifiedName: string, value: string): void;
	removeAttribute(qualifiedName: string): void;
	addClass(className: string): void;
	removeClass(className: string): void;
}

export function formatRecordingStatusBarText(session: ActiveRecordingSession, elapsedSeconds: number): string {
	const filename = session.notePath.split("/").pop()?.replace(/\.md$/i, "") ?? session.notePath;
	const timeStr = formatTimestamp(elapsedSeconds);
	return `🔴 ${timeStr} ${filename}`;
}

export class RecordingStatusBar {
	private readonly element: RecordingStatusBarElement;
	private readonly onStopRequest: () => void;
	private timerHandle: number | null = null;
	private currentSession: ActiveRecordingSession | null = null;
	private readonly getNow: () => number;

	constructor(
		element: RecordingStatusBarElement,
		onStopRequest: () => void,
		getNow: () => number = () => Date.now(),
	) {
		this.element = element;
		this.onStopRequest = onStopRequest;
		this.getNow = getNow;
	}

	start(session: ActiveRecordingSession): void {
		this.currentSession = session;
		this.element.addClass("otr-recording-active");
		this.element.setAttribute(
			"title",
			`녹음 진행 중: ${session.notePath} (클릭 시 녹음 중지 및 저장)`,
		);
		this.tick();

		if (this.timerHandle !== null && typeof window !== "undefined") {
			window.clearInterval(this.timerHandle);
		}
		if (typeof window !== "undefined") {
			this.timerHandle = window.setInterval(() => this.tick(), 1000);
		}
	}

	stop(): void {
		if (this.timerHandle !== null && typeof window !== "undefined") {
			window.clearInterval(this.timerHandle);
			this.timerHandle = null;
		}
		this.currentSession = null;
		this.element.removeClass("otr-recording-active");
		this.element.setText("");
		this.element.removeAttribute("title");
	}

	handleClick(): void {
		if (this.currentSession) {
			this.onStopRequest();
		}
	}

	private tick(): void {
		if (!this.currentSession) return;
		const elapsedSeconds = Math.max(0, Math.floor((this.getNow() - this.currentSession.startedAt) / 1000));
		const text = formatRecordingStatusBarText(this.currentSession, elapsedSeconds);
		this.element.setText(text);
	}
}
