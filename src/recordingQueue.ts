export type RecordingQueueStatus = "queued" | "processing" | "completed" | "error" | "cancelled";

export interface QueuedRecording {
	filePath: string;
	notePaths: string[];
	size: number;
	queuedAt: number;
	status: RecordingQueueStatus;
	error?: string;
}

export class RecordingQueue {
	private readonly jobs = new Map<string, QueuedRecording>();

	enqueue(job: QueuedRecording): boolean {
		if (this.jobs.has(job.filePath)) return false;
		this.jobs.set(job.filePath, { ...job, notePaths: [...job.notePaths] });
		return true;
	}

	update(filePath: string, patch: Partial<QueuedRecording>): boolean {
		const existing = this.jobs.get(filePath);
		if (!existing) return false;
		this.jobs.set(filePath, {
			...existing,
			...patch,
			notePaths: patch.notePaths ? [...patch.notePaths] : existing.notePaths,
		});
		return true;
	}

	get(filePath: string): QueuedRecording | null {
		const job = this.jobs.get(filePath);
		if (!job) return null;
		return { ...job, notePaths: [...job.notePaths] };
	}

	remove(filePath: string): boolean {
		return this.jobs.delete(filePath);
	}

	rename(oldPath: string, newPath: string): void {
		const job = this.jobs.get(oldPath);
		if (!job) return;
		this.jobs.delete(oldPath);
		if (!this.jobs.has(newPath)) this.jobs.set(newPath, { ...job, filePath: newPath });
	}

	has(filePath: string): boolean {
		return this.jobs.has(filePath);
	}

	list(): QueuedRecording[] {
		return [...this.jobs.values()].map((job) => ({ ...job, notePaths: [...job.notePaths] }));
	}

	clear(): void {
		this.jobs.clear();
	}
}
