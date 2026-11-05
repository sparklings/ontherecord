export interface QueuedRecording {
	filePath: string;
	notePaths: string[];
	size: number;
	queuedAt: number;
	status: "queued";
}

export class RecordingQueue {
	private readonly jobs = new Map<string, QueuedRecording>();

	enqueue(job: QueuedRecording): boolean {
		if (this.jobs.has(job.filePath)) return false;
		this.jobs.set(job.filePath, { ...job, notePaths: [...job.notePaths] });
		return true;
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
