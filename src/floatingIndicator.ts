import { formatTimestamp } from "./resultPreview.ts";

export type FloatingIndicatorState = "idle" | "starting" | "recording" | "paused" | "transcribing" | "completed";

export interface FloatingIndicatorCallbacks {
	onPause: () => Promise<void> | void;
	onResume: () => Promise<void> | void;
	onStop: () => Promise<void> | void;
}

export interface FloatingIndicatorOptions {
	hostEl?: HTMLElement;
	getNow?: () => number;
	setIcon?: (el: HTMLElement, iconId: string) => void;
}

/**
 * Obsidian 에디터 우측 하단에 조용하게 떠 있는 Ambient Floating Recording Indicator (FEAT-02, UI-02).
 * - starting / recording / paused 상태에서만 표시되며, idle 상태 및 Obsidian 종료 시 완전히 숨김/제거됩니다.
 */
export class FloatingRecordingIndicator {
	private readonly callbacks: FloatingIndicatorCallbacks;
	private readonly hostEl?: HTMLElement;
	private readonly getNow: () => number;
	private readonly setIconFn?: (el: HTMLElement, iconId: string) => void;

	private state: FloatingIndicatorState = "idle";
	private startedAt: number | null = null;
	private accumulatedSeconds = 0;
	private timerHandle: number | null = null;
	private completionTimerHandle: number | null = null;

	private rootEl: HTMLElement | null = null;
	private dotEl: HTMLElement | null = null;
	private textEl: HTMLElement | null = null;
	private actionsEl: HTMLElement | null = null;
	private pauseResumeBtn: HTMLButtonElement | null = null;
	private stopBtn: HTMLButtonElement | null = null;

	constructor(callbacks: FloatingIndicatorCallbacks, options: FloatingIndicatorOptions = {}) {
		this.callbacks = callbacks;
		this.hostEl = options.hostEl;
		this.getNow = options.getNow ?? (() => Date.now());
		this.setIconFn = options.setIcon;
	}

	getState(): FloatingIndicatorState {
		return this.state;
	}

	isVisible(): boolean {
		return this.state !== "idle" && this.rootEl !== null && !this.rootEl.hasClass("is-hidden");
	}

	setState(nextState: FloatingIndicatorState, startedAt?: number): void {
		if (nextState === "idle") {
			this.resetToIdle();
			return;
		}

		this.ensureMounted();

		if (nextState === "starting") {
			this.state = "starting";
			this.stopTimer();
			this.accumulatedSeconds = 0;
			this.startedAt = null;
			this.renderState();
			return;
		}

		if (nextState === "recording") {
			if (this.state !== "recording") {
				this.startedAt = startedAt ?? this.getNow();
			}
			this.state = "recording";
			this.renderState();
			this.startTimer();
			return;
		}

		if (nextState === "paused") {
			if (this.state === "recording" && this.startedAt !== null) {
				this.accumulatedSeconds += Math.max(0, Math.floor((this.getNow() - this.startedAt) / 1000));
				this.startedAt = null;
			}
			this.state = "paused";
			this.stopTimer();
			this.renderState();
			return;
		}

		if (nextState === "transcribing") {
			this.state = "transcribing";
			this.stopTimer();
			this.renderState();
			return;
		}

		if (nextState === "completed") {
			this.state = "completed";
			this.stopTimer();
			this.renderState();
		}
	}

	setTranscribing(percent?: number): void {
		this.ensureMounted();
		this.clearCompletionTimer();
		this.stopTimer();
		this.state = "transcribing";
		if (this.rootEl && this.textEl && this.actionsEl) {
			this.rootEl.removeClass("is-hidden", "is-starting", "is-recording", "is-paused", "is-completed");
			this.rootEl.addClass("is-transcribing");
			this.actionsEl.addClass("is-hidden");
			const pctText = percent !== undefined && percent > 0 ? ` ${Math.round(percent)}%` : "...";
			this.textEl.setText(`전사 중${pctText}`);
		}
	}

	setCompleted(message = "전사 완료!"): void {
		this.ensureMounted();
		this.stopTimer();
		this.clearCompletionTimer();
		this.state = "completed";
		if (this.rootEl && this.textEl && this.actionsEl) {
			this.rootEl.removeClass("is-hidden", "is-starting", "is-recording", "is-paused", "is-transcribing");
			this.rootEl.addClass("is-completed");
			this.actionsEl.addClass("is-hidden");
			this.textEl.setText(`✓ ${message}`);
		}
		if (typeof window !== "undefined") {
			this.completionTimerHandle = window.setTimeout(() => {
				this.resetToIdle();
			}, 2200);
		}
	}

	private clearCompletionTimer(): void {
		if (this.completionTimerHandle !== null && typeof window !== "undefined") {
			window.clearTimeout(this.completionTimerHandle);
			this.completionTimerHandle = null;
		}
	}

	destroy(): void {
		this.stopTimer();
		this.clearCompletionTimer();
		this.state = "idle";
		this.startedAt = null;
		this.accumulatedSeconds = 0;
		if (this.rootEl) {
			this.rootEl.remove();
			this.rootEl = null;
			this.dotEl = null;
			this.textEl = null;
			this.actionsEl = null;
			this.pauseResumeBtn = null;
			this.stopBtn = null;
		}
	}

	private resetToIdle(): void {
		this.stopTimer();
		this.clearCompletionTimer();
		this.state = "idle";
		this.startedAt = null;
		this.accumulatedSeconds = 0;
		if (this.rootEl) {
			this.rootEl.addClass("is-hidden");
			this.rootEl.removeClass("is-starting", "is-recording", "is-paused", "is-transcribing", "is-completed");
		}
	}

	private ensureMounted(): void {
		if (this.rootEl) return;
		const parent = this.hostEl ?? (typeof document !== "undefined" ? document.body : null);
		if (!parent) return;

		const root = parent.createDiv({ cls: "otr-float-indicator is-hidden" });
		root.setAttribute("role", "status");
		root.setAttribute("aria-live", "polite");

		const dot = root.createSpan({ cls: "otr-float-dot" });
		const text = root.createSpan({ cls: "otr-float-text", text: "00:00" });

		const actions = root.createDiv({ cls: "otr-float-actions" });

		const pauseResumeBtn = actions.createEl("button", {
			cls: "otr-float-btn",
			title: "일시정지",
		});
		this.applyIcon(pauseResumeBtn, "pause");
		pauseResumeBtn.onclick = () => {
			if (this.state === "recording") {
				void this.callbacks.onPause();
			} else if (this.state === "paused") {
				void this.callbacks.onResume();
			}
		};

		const stopBtn = actions.createEl("button", {
			cls: "otr-float-btn is-stop",
			title: "녹음 중지 및 저장",
		});
		this.applyIcon(stopBtn, "square");
		stopBtn.onclick = () => {
			void this.callbacks.onStop();
		};

		this.rootEl = root;
		this.dotEl = dot;
		this.textEl = text;
		this.actionsEl = actions;
		this.pauseResumeBtn = pauseResumeBtn;
		this.stopBtn = stopBtn;
	}

	private applyIcon(el: HTMLElement, iconId: string): void {
		if (this.setIconFn) {
			this.setIconFn(el, iconId);
		} else {
			el.setText(iconId === "pause" ? "❚❚" : iconId === "play" ? "▶" : "■");
		}
	}

	private renderState(): void {
		if (!this.rootEl || !this.textEl || !this.actionsEl || !this.pauseResumeBtn || !this.dotEl) return;

		this.rootEl.removeClass("is-hidden", "is-starting", "is-recording", "is-paused");

		if (this.state === "starting") {
			this.rootEl.addClass("is-starting");
			this.textEl.setText("Starting...");
			this.actionsEl.addClass("is-hidden");
			return;
		}

		this.actionsEl.removeClass("is-hidden");

		if (this.state === "recording") {
			this.rootEl.addClass("is-recording");
			this.pauseResumeBtn.empty();
			this.applyIcon(this.pauseResumeBtn, "pause");
			this.pauseResumeBtn.setAttribute("title", "일시정지");
			this.updateTimerText();
			return;
		}

		if (this.state === "paused") {
			this.rootEl.addClass("is-paused");
			this.pauseResumeBtn.empty();
			this.applyIcon(this.pauseResumeBtn, "play");
			this.pauseResumeBtn.setAttribute("title", "녹음 계속하기");
			this.updateTimerText();
		}
	}

	private startTimer(): void {
		if (this.timerHandle !== null) return;
		this.updateTimerText();
		if (typeof window !== "undefined") {
			this.timerHandle = window.setInterval(() => {
				this.updateTimerText();
			}, 1000);
		}
	}

	private stopTimer(): void {
		if (this.timerHandle !== null && typeof window !== "undefined") {
			window.clearInterval(this.timerHandle);
			this.timerHandle = null;
		}
	}

	private updateTimerText(): void {
		if (!this.textEl) return;
		let total = this.accumulatedSeconds;
		if (this.state === "recording" && this.startedAt !== null) {
			total += Math.max(0, Math.floor((this.getNow() - this.startedAt) / 1000));
		}
		this.textEl.setText(formatTimestamp(total));
	}
}
