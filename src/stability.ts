export interface FileStat {
	size: number;
	mtime: number;
}

export type StatFn = (path: string) => Promise<FileStat | null>;

export interface StabilityOptions {
	/** 상태 확인 간격 */
	intervalMs: number;
	/** 크기·수정 시각이 이 시간 동안 변하지 않으면 안정화로 판정 */
	quietMs: number;
	/** 이 시간까지 안정화되지 않으면 포기 */
	timeoutMs: number;
	/** 이 크기 이하(0 포함)는 안정화로 보지 않음 */
	minSizeBytes: number;
	/** 파일이 사라진 상태가 이 횟수만큼 연속되면 missing으로 종료 */
	maxMissingChecks: number;
}

export const DEFAULT_STABILITY: StabilityOptions = {
	intervalMs: 1000,
	quietMs: 5000,
	timeoutMs: 4 * 60 * 60 * 1000,
	minSizeBytes: 0,
	maxMissingChecks: 5,
};

export type StabilityStatus = "stable" | "timeout" | "missing" | "cancelled";

export interface StabilityResult {
	status: StabilityStatus;
	size: number | null;
	waitedMs: number;
	checks: number;
	/** 크기 또는 수정 시각이 바뀐 횟수(처음 관찰 제외). 0이면 생성 시점에 이미 완성된 파일 */
	changes: number;
}

export interface StabilityDeps {
	stat: StatFn;
	now: () => number;
	sleep: (ms: number) => Promise<void>;
	signal?: AbortSignal;
}

/**
 * 파일이 더 이상 커지지 않는 시점을 판정한다.
 * 기준: 크기가 minSizeBytes보다 크고, (크기, 수정 시각)이 quietMs 동안 동일.
 * 주의: 쓰기가 quietMs 이상 멈췄다 재개되는 경우(일시정지 등)는 구분할 수 없다.
 */
export async function waitForStable(
	path: string,
	deps: StabilityDeps,
	options: Partial<StabilityOptions> = {},
): Promise<StabilityResult> {
	const opt = { ...DEFAULT_STABILITY, ...options };
	const startedAt = deps.now();
	let checks = 0;
	let changes = 0;
	let missing = 0;
	let last: FileStat | null = null;
	let lastChangeAt = startedAt;

	const result = (status: StabilityStatus): StabilityResult => ({
		status,
		size: last ? last.size : null,
		waitedMs: deps.now() - startedAt,
		checks,
		changes,
	});

	for (;;) {
		if (deps.signal?.aborted) return result("cancelled");

		const current = await deps.stat(path);
		const now = deps.now();
		checks++;

		if (current === null) {
			missing++;
			if (missing >= opt.maxMissingChecks) return result("missing");
		} else {
			missing = 0;
			if (last === null) {
				lastChangeAt = now;
			} else if (current.size !== last.size || current.mtime !== last.mtime) {
				changes++;
				lastChangeAt = now;
			}
			last = current;

			if (current.size > opt.minSizeBytes && now - lastChangeAt >= opt.quietMs) {
				return result("stable");
			}
		}

		if (now - startedAt >= opt.timeoutMs) return result("timeout");
		await deps.sleep(opt.intervalMs);
	}
}
