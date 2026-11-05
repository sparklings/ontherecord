export interface LinkWaitDependencies {
	findLinkedNotes(filePath: string): string[];
	onChange(callback: () => void): () => void;
	setTimeout(callback: () => void, ms: number): number;
	clearTimeout(handle: number): void;
}

export type LinkWaitResult =
	| { status: "linked"; notePaths: string[] }
	| { status: "timeout" }
	| { status: "cancelled" };

export function waitForLinkedNotes(
	filePath: string,
	dependencies: LinkWaitDependencies,
	timeoutMs: number,
	signal?: AbortSignal,
): Promise<LinkWaitResult> {
	if (signal?.aborted) return Promise.resolve({ status: "cancelled" });
	const existing = dependencies.findLinkedNotes(filePath);
	if (existing.length > 0) return Promise.resolve({ status: "linked", notePaths: existing });

	return new Promise((resolve) => {
		let finished = false;
		let unsubscribe = () => {};
		const timer = dependencies.setTimeout(() => finish({ status: "timeout" }), timeoutMs);

		const onAbort = () => finish({ status: "cancelled" });
		const onChange = () => {
			const notePaths = dependencies.findLinkedNotes(filePath);
			if (notePaths.length > 0) finish({ status: "linked", notePaths });
		};
		const finish = (result: LinkWaitResult) => {
			if (finished) return;
			finished = true;
			dependencies.clearTimeout(timer);
			unsubscribe();
			signal?.removeEventListener("abort", onAbort);
			resolve(result);
		};

		unsubscribe = dependencies.onChange(onChange);
		signal?.addEventListener("abort", onAbort, { once: true });
		onChange();
	});
}
