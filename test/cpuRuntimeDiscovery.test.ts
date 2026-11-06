import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { getCpuToolSearchRoots, scanCpuToolCandidates } from "../src/cpuRuntimeDiscovery.ts";

test("known local roots include user, app-local, and program installation folders", () => {
	const roots = getCpuToolSearchRoots({
		userProfile: "C:\\Users\\Tester",
		localAppData: "C:\\Users\\Tester\\AppData\\Local",
		programFiles: "C:\\Program Files",
		programFilesX86: "C:\\Program Files (x86)",
		programData: "C:\\ProgramData",
	});

	assert.ok(roots.paths.includes(path.resolve("C:\\Users\\Tester\\whisper.cpp")));
	assert.ok(roots.paths.includes(path.resolve("C:\\Users\\Tester\\Models")));
	assert.ok(roots.paths.includes(path.resolve("C:\\Users\\Tester\\AppData\\Local\\Programs\\whisper.cpp")));
	assert.ok(roots.paths.includes(path.resolve("C:\\Program Files (x86)\\whisper.cpp")));
});

test("scan finds only recognized runtime and model filenames under known roots", async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "otr-cpu-discovery-"));
	const nested = path.join(directory, "build", "bin");
	const models = path.join(directory, "models");
	const runtimePath = path.join(nested, "whisper-cli.exe");
	const modelPath = path.join(models, "ggml-base-q5_1.bin");
	try {
		await fs.mkdir(nested, { recursive: true });
		await fs.mkdir(models, { recursive: true });
		await Promise.all([
			fs.writeFile(runtimePath, "runtime"),
			fs.writeFile(modelPath, "model"),
			fs.writeFile(path.join(nested, "other.exe"), "not a runtime"),
			fs.writeFile(path.join(models, "unverified-model.bin"), "not a known model"),
		]);

		const result = await scanCpuToolCandidates({ paths: [directory, nested] });
		assert.deepEqual(result.runtimePaths, [runtimePath]);
		assert.deepEqual(result.modelPaths, [modelPath]);
		assert.deepEqual(result.warnings, []);
	} finally {
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test("missing known folders are skipped without being reported as scan failures", async () => {
	const result = await scanCpuToolCandidates({
		paths: [path.join(os.tmpdir(), `otr-cpu-discovery-missing-${Date.now()}`)],
	});
	assert.deepEqual(result, { runtimePaths: [], modelPaths: [], warnings: [] });
});

test("inaccessible known folders are reported as search warnings", async () => {
	const deniedReader = {
		async readdir(): Promise<never> {
			throw Object.assign(new Error("access denied"), { code: "EACCES" });
		},
	};
	const result = await scanCpuToolCandidates({ paths: ["C:\\Tools\\whisper.cpp"] }, deniedReader);
	assert.deepEqual(result.runtimePaths, []);
	assert.deepEqual(result.modelPaths, []);
	assert.match(result.warnings[0] ?? "", /C:\\Tools\\whisper\.cpp.*access denied/);
});
