import test from "node:test";
import assert from "node:assert/strict";
import { findOrphanAudioFiles } from "../src/orphanAudioHandler.ts";
import type { OrphanAudioFileInfo } from "../src/orphanAudioHandler.ts";

test("findOrphanAudioFiles: 어떤 노트에도 링크되지 않은 고아 오디오 파일을 정확히 검출한다 (3-REC-06)", () => {
	const allAudios: OrphanAudioFileInfo[] = [
		{ path: "recordings/attached1.m4a", name: "attached1.m4a", sizeBytes: 1024 * 1024, mtime: 1700000000000 },
		{ path: "recordings/attached2.m4a", name: "attached2.m4a", sizeBytes: 2048 * 1024, mtime: 1700000001000 },
		{ path: "recordings/orphan1.m4a", name: "orphan1.m4a", sizeBytes: 3072 * 1024, mtime: 1700000002000 },
		{ path: "orphan2.wav", name: "orphan2.wav", sizeBytes: 4096 * 1024, mtime: 1700000003000 },
	];

	const linkedPaths = new Set<string>([
		"recordings/attached1.m4a",
		"attached2.m4a", // 파일명만 링크된 형태
	]);

	const orphans = findOrphanAudioFiles(allAudios, linkedPaths);

	assert.equal(orphans.length, 2);
	assert.equal(orphans[0].path, "recordings/orphan1.m4a");
	assert.equal(orphans[1].path, "orphan2.wav");
});

test("findOrphanAudioFiles: 모든 파일이 링크되어 있으면 빈 배열을 반환한다", () => {
	const allAudios: OrphanAudioFileInfo[] = [
		{ path: "rec1.m4a", name: "rec1.m4a", sizeBytes: 1000, mtime: 1000 },
	];
	const linked = new Set(["rec1.m4a"]);
	const orphans = findOrphanAudioFiles(allAudios, linked);
	assert.equal(orphans.length, 0);
});
