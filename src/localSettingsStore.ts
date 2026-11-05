import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import * as path from "path";
import type { FileHandle } from "fs/promises";
import { DEFAULT_LOCAL_SETTINGS, normalizeLocalSettings } from "./settings.ts";
import type { LocalSettings } from "./settings.ts";

export class LocalSettingsStore {
	private readonly filePath: string;
	private readonly lockPath: string;
	private readonly sleep: (ms: number) => Promise<void>;

	constructor(
		localAppData: string,
		pluginId: string,
		sleep?: (ms: number) => Promise<void>,
	) {
		if (!localAppData.trim()) throw new Error("LOCALAPPDATA 환경 변수를 찾을 수 없습니다.");
		this.filePath = path.join(localAppData, pluginId, "local-settings.json");
		this.lockPath = `${this.filePath}.lock`;
		this.sleep = sleep ?? ((ms) => new Promise((resolve) => window.setTimeout(resolve, ms)));
	}

	async load(): Promise<LocalSettings> {
		await fs.mkdir(path.dirname(this.filePath), { recursive: true });

		return this.readOrDefault();
	}

	async save(settings: LocalSettings): Promise<void> {
		await fs.mkdir(path.dirname(this.filePath), { recursive: true });
		await this.withLock(() => this.writeAtomically(normalizeLocalSettings(settings)));
	}

	async update(patch: Partial<LocalSettings>): Promise<LocalSettings> {
		await fs.mkdir(path.dirname(this.filePath), { recursive: true });
		return this.withLock(async () => {
			const updated = normalizeLocalSettings({ ...(await this.readOrDefault()), ...patch });
			await this.writeAtomically(updated);
			return updated;
		});
	}

	private async readOrDefault(): Promise<LocalSettings> {
		let contents: string;
		try {
			contents = await fs.readFile(this.filePath, "utf8");
		} catch (error) {
			if (!isNodeError(error) || error.code !== "ENOENT") throw error;
			return { ...DEFAULT_LOCAL_SETTINGS };
		}
		return normalizeLocalSettings(JSON.parse(contents) as unknown);
	}

	private async writeAtomically(settings: LocalSettings): Promise<void> {
		const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
		await fs.writeFile(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
		await fs.rename(temporaryPath, this.filePath);
	}

	private async withLock<T>(operation: () => Promise<T>): Promise<T> {
		const deadline = Date.now() + 5000;
		let lock: FileHandle | null = null;
		while (!lock) {
			try {
				lock = await fs.open(this.lockPath, "wx");
			} catch (error) {
				if (!isNodeError(error) || error.code !== "EEXIST") throw error;
				if (Date.now() >= deadline) {
					throw new Error("PC별 설정 파일이 다른 Obsidian 창에서 사용 중입니다.");
				}
				await this.sleep(50);
			}
		}

		try {
			return await operation();
		} finally {
			try {
				await lock.close();
			} finally {
				await fs.unlink(this.lockPath);
			}
		}
	}
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error;
}
