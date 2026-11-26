import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { LocalSettingsStore } from "../src/localSettingsStore.ts";
import {
	DEFAULT_LOCAL_SETTINGS,
	DEFAULT_VAULT_SETTINGS,
	normalizeLocalSettings,
	normalizeVaultSettings,
} from "../src/settings.ts";

test("vault 설정은 기본값으로 초기화하고 저장된 값은 기본값과 병합한다", () => {
	assert.deepEqual(normalizeVaultSettings(null), DEFAULT_VAULT_SETTINGS);
	assert.equal(DEFAULT_VAULT_SETTINGS.defaultModelSize, "medium");
	assert.equal(DEFAULT_VAULT_SETTINGS.vocabularyPrompt, "");
	assert.equal(DEFAULT_VAULT_SETTINGS.recordStartMode, "auto");
	assert.equal(DEFAULT_VAULT_SETTINGS.recordStartNotification, true);
	assert.equal(DEFAULT_VAULT_SETTINGS.autoRecordFolder, "");
	assert.deepEqual(
		normalizeVaultSettings({
			autoTranscribe: false,
			recordStartMode: "manual",
			recordStartNotification: false,
			autoRecordFolder: "Meetings",
			vocabularyPrompt: "  Obsidian, Whisper  ",
		}),
		{
			...DEFAULT_VAULT_SETTINGS,
			autoTranscribe: false,
			recordStartMode: "manual",
			recordStartNotification: false,
			autoRecordFolder: "Meetings",
			vocabularyPrompt: "Obsidian, Whisper",
		},
	);
	// 하위 호환: confirm 모드는 auto + notification true로 변환
	assert.deepEqual(
		normalizeVaultSettings({ recordStartMode: "confirm" }),
		{ ...DEFAULT_VAULT_SETTINGS, recordStartMode: "auto", recordStartNotification: true },
	);
	assert.deepEqual(
		normalizeVaultSettings({ transcriptSearchTerms: [" 결정 ", "", "결정", "담당자"] }).transcriptSearchTerms,
		["결정", "담당자"],
	);
});

test("지원하지 않는 vault 설정 값과 미래 스키마를 거부한다", () => {
	assert.throws(() => normalizeVaultSettings({ stabilizationSeconds: 0 }));
	assert.throws(() => normalizeVaultSettings({ transcriptSearchTerms: "결정" }));
	assert.throws(() => normalizeVaultSettings({ recordStartMode: "invalid-mode" }));
	assert.throws(() => normalizeVaultSettings({ recordStartNotification: "yes" }));
	assert.throws(() => normalizeVaultSettings({ autoRecordFolder: 123 }));
	assert.throws(() => normalizeVaultSettings({ vocabularyPrompt: 123 }));
	assert.throws(() => normalizeVaultSettings({ schemaVersion: 2 }));
});

test("PC별 설정은 런타임, 모델, FFmpeg 경로를 저장한다", () => {
	assert.deepEqual(normalizeLocalSettings({ runtimePath: "C:\\Tools\\whisper.exe" }), {
		...DEFAULT_LOCAL_SETTINGS,
		runtimePath: "C:\\Tools\\whisper.exe",
	});
	assert.throws(() => normalizeLocalSettings({ modelPath: 42 }));
	assert.throws(() => normalizeLocalSettings({ ffmpegPath: 42 }));
});

test("PC별 설정 저장소는 초기 파일을 만들고 수정값을 복원한다", async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "otr-settings-"));
	try {
		const store = new LocalSettingsStore(directory, "on-the-record");
		assert.deepEqual(await store.load(), DEFAULT_LOCAL_SETTINGS);

		const updated = await store.update({
			runtimePath: "C:\\Tools\\whisper.exe",
			modelPath: "C:\\Models\\ggml-base.bin",
			ffmpegPath: "C:\\Tools\\ffmpeg.exe",
		});
		assert.deepEqual(await store.load(), updated);
	} finally {
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test("동일 PC 설정을 여러 창에서 수정해도 독립된 경로 값이 보존된다", async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "otr-settings-lock-"));
	const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
	try {
		const first = new LocalSettingsStore(directory, "on-the-record", sleep);
		const second = new LocalSettingsStore(directory, "on-the-record", sleep);
		await Promise.all([
			first.update({ runtimePath: "C:\\Tools\\whisper.exe" }),
			second.update({ modelPath: "C:\\Models\\ggml-base.bin" }),
		]);
		assert.deepEqual(await first.load(), {
			...DEFAULT_LOCAL_SETTINGS,
			runtimePath: "C:\\Tools\\whisper.exe",
			modelPath: "C:\\Models\\ggml-base.bin",
		});
	} finally {
		await fs.rm(directory, { recursive: true, force: true });
	}
});

test("UTF-8 with BOM(\\uFEFF)으로 저장된 local-settings.json도 안전하게 로드한다", async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "otr-settings-bom-"));
	try {
		const pluginDir = path.join(directory, "on-the-record");
		await fs.mkdir(pluginDir, { recursive: true });
		const filePath = path.join(pluginDir, "local-settings.json");
		const bomContent = "\uFEFF" + JSON.stringify({
			runtimePath: "C:\\Tools\\whisper.exe",
			modelPath: "C:\\Models\\ggml-base.bin",
			ffmpegPath: "C:\\Tools\\ffmpeg.exe",
		}, null, 2);
		await fs.writeFile(filePath, bomContent, "utf8");

		const store = new LocalSettingsStore(directory, "on-the-record");
		const loaded = await store.load();
		assert.equal(loaded.runtimePath, "C:\\Tools\\whisper.exe");
		assert.equal(loaded.modelPath, "C:\\Models\\ggml-base.bin");
		assert.equal(loaded.ffmpegPath, "C:\\Tools\\ffmpeg.exe");
	} finally {
		await fs.rm(directory, { recursive: true, force: true });
	}
});
