import { promises as fs } from "fs";
import * as path from "path";

export interface CpuToolSearchRoots {
	paths: readonly string[];
}

export interface CpuToolCandidates {
	runtimePaths: string[];
	modelPaths: string[];
	warnings: string[];
}

interface SearchEnvironment {
	userProfile?: string;
	localAppData?: string;
	programFiles?: string;
	programFilesX86?: string;
	programData?: string;
}

interface DirectoryEntry {
	name: string;
	isFile(): boolean;
	isDirectory(): boolean;
	isSymbolicLink(): boolean;
}

interface DirectoryReader {
	readdir(directory: string): Promise<DirectoryEntry[]>;
}

const RUNTIME_FILENAMES = new Set(["whisper-cli.exe", "main.exe", "whisper-cpp.exe", "whisper.exe"]);
const MODEL_FILENAME = /^ggml-(?:base|small|medium|large-v3(?:-turbo)?)(?:-q5_[01])?\.bin$/i;
const MAX_SEARCH_DEPTH = 5;
const MAX_VISITED_ENTRIES = 4000;
const MAX_CANDIDATES = 40;

export function getCpuToolSearchRoots(environment: SearchEnvironment): CpuToolSearchRoots {
	const roots = [
		joinIfSet(environment.userProfile, "whisper.cpp"),
		joinIfSet(environment.userProfile, "Tools", "whisper.cpp"),
		joinIfSet(environment.userProfile, "Downloads", "whisper.cpp"),
		joinIfSet(environment.userProfile, "Documents", "whisper.cpp"),
		joinIfSet(environment.localAppData, "Programs", "whisper.cpp"),
		joinIfSet(environment.localAppData, "whisper.cpp"),
		joinIfSet(environment.localAppData, "on-the-record"),
		joinIfSet(environment.programFiles, "whisper.cpp"),
		joinIfSet(environment.programFilesX86, "whisper.cpp"),
		joinIfSet(environment.programData, "whisper.cpp"),
		joinIfSet(environment.userProfile, "Models"),
	].filter((root): root is string => root !== null);
	return { paths: [...new Set(roots.map((root) => path.resolve(root)))] };
}

export async function scanCpuToolCandidates(
	roots: CpuToolSearchRoots,
	reader: DirectoryReader = {
		readdir: async (directory) => await fs.readdir(directory, { withFileTypes: true }),
	},
): Promise<CpuToolCandidates> {
	const runtimePaths: string[] = [];
	const modelPaths: string[] = [];
	const warnings: string[] = [];
	const seen = new Set<string>();
	let visitedEntries = 0;
	let limitReached = false;

	const visit = async (directory: string, depth: number): Promise<void> => {
		if (limitReached || depth > MAX_SEARCH_DEPTH) return;
		let entries: DirectoryEntry[];
		try {
			entries = await reader.readdir(directory);
		} catch (error) {
			if (isMissingDirectory(error)) return;
			warnings.push(`검색할 수 없는 폴더: ${directory} (${errorMessage(error)})`);
			return;
		}

		entries.sort((left, right) => left.name.localeCompare(right.name));
		for (const entry of entries) {
			visitedEntries += 1;
			if (visitedEntries > MAX_VISITED_ENTRIES) {
				warnings.push(`검색 안전 한도(${MAX_VISITED_ENTRIES}개 항목)에 도달해 나머지 폴더를 검색하지 않았습니다.`);
				limitReached = true;
				return;
			}

			const entryPath = path.join(directory, entry.name);
			if (entry.isSymbolicLink()) continue;
			if (entry.isDirectory()) {
				if (depth < MAX_SEARCH_DEPTH) await visit(entryPath, depth + 1);
				if (limitReached) return;
				continue;
			}
			if (!entry.isFile()) continue;

			const lowerName = entry.name.toLowerCase();
			if (!RUNTIME_FILENAMES.has(lowerName) && !MODEL_FILENAME.test(entry.name)) continue;
			const normalizedPath = path.resolve(entryPath);
			const key = normalizedPath.toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);

			if (RUNTIME_FILENAMES.has(lowerName)) runtimePaths.push(normalizedPath);
			else modelPaths.push(normalizedPath);
			if (runtimePaths.length >= MAX_CANDIDATES || modelPaths.length >= MAX_CANDIDATES) {
				warnings.push(`검색 후보 안전 한도(${MAX_CANDIDATES}개)에 도달했습니다.`);
				limitReached = true;
				return;
			}
		}
	};

	for (const root of roots.paths) {
		await visit(root, 0);
		if (limitReached) break;
	}

	return { runtimePaths, modelPaths, warnings };
}

function joinIfSet(root: string | undefined, ...parts: string[]): string | null {
	return root?.trim() ? path.join(root, ...parts) : null;
}

function isMissingDirectory(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
