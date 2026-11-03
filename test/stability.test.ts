import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { waitForStable } from "../src/stability.ts";
import type { FileStat } from "../src/stability.ts";

// 가상 시계: sleep이 시간을 앞당기고, stat은 시각별 시나리오를 돌려준다.
function fake(script: (t: number) => FileStat | null) {
	let t = 0;
	return {
		stat: async () => script(t),
		now: () => t,
		sleep: async (ms: number) => {
			t += ms;
		},
	};
}

const opts = { intervalMs: 1000, quietMs: 3000, timeoutMs: 60000, maxMissingChecks: 3 };

test("이미 완성된 파일은 quietMs 후 안정화, 변경 0회", async () => {
	const deps = fake(() => ({ size: 1000, mtime: 1 }));
	const r = await waitForStable("a.m4a", deps, opts);
	assert.equal(r.status, "stable");
	assert.equal(r.changes, 0);
	assert.equal(r.waitedMs, 3000);
});

test("커지는 파일은 쓰기가 멈춘 뒤 quietMs가 지나야 안정화", async () => {
	// 0~9초: 매초 성장, 이후 고정
	const deps = fake((t) => {
		const s = Math.min(t, 9000);
		return { size: 100 + s, mtime: s };
	});
	const r = await waitForStable("a.m4a", deps, opts);
	assert.equal(r.status, "stable");
	assert.equal(r.size, 100 + 9000);
	assert.equal(r.waitedMs, 12000);
	assert.equal(r.changes, 9);
});

test("크기 0은 안정화로 보지 않는다(생성 직후)", async () => {
	const deps = fake((t) => (t < 5000 ? { size: 0, mtime: 0 } : { size: 50, mtime: 5000 }));
	const r = await waitForStable("a.m4a", deps, opts);
	assert.equal(r.status, "stable");
	assert.equal(r.size, 50);
	assert.ok(r.waitedMs >= 8000);
});

test("크기는 같고 수정 시각만 바뀌면 변경으로 본다", async () => {
	const deps = fake((t) => ({ size: 10, mtime: Math.min(t, 4000) }));
	const r = await waitForStable("a.m4a", deps, opts);
	assert.equal(r.status, "stable");
	assert.equal(r.changes, 4);
});

test("계속 커지면 timeout", async () => {
	const deps = fake((t) => ({ size: t + 1, mtime: t }));
	const r = await waitForStable("a.m4a", deps, { ...opts, timeoutMs: 10000 });
	assert.equal(r.status, "timeout");
});

test("파일이 사라지면 missing", async () => {
	const deps = fake(() => null);
	const r = await waitForStable("a.m4a", deps, opts);
	assert.equal(r.status, "missing");
	assert.equal(r.size, null);
	assert.equal(r.checks, 3);
});

test("잠깐 사라졌다 돌아오면 계속 판정", async () => {
	const deps = fake((t) => (t === 1000 ? null : { size: 5, mtime: 1 }));
	const r = await waitForStable("a.m4a", deps, opts);
	assert.equal(r.status, "stable");
});

test("취소 신호를 존중한다", async () => {
	const ac = new AbortController();
	const deps = { ...fake(() => ({ size: 1, mtime: 1 })), signal: ac.signal };
	ac.abort();
	const r = await waitForStable("a.m4a", deps, opts);
	assert.equal(r.status, "cancelled");
});

test("실제 파일: 쓰는 동안은 대기하고 쓰기가 끝나면 안정화", async () => {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "otr-stab-"));
	const file = path.join(dir, "rec.m4a");
	try {
		await fs.writeFile(file, "");
		const started = Date.now();
		const writer = (async () => {
			for (let i = 0; i < 8; i++) {
				await fs.appendFile(file, Buffer.alloc(4096, i));
				await new Promise((r) => setTimeout(r, 100));
			}
		})();
		const result = await waitForStable(
			file,
			{
				stat: async (p) => {
					try {
						const s = await fs.stat(p);
						return { size: s.size, mtime: s.mtimeMs };
					} catch {
						return null;
					}
				},
				now: Date.now,
				sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
			},
			{ intervalMs: 50, quietMs: 400, timeoutMs: 10000 },
		);
		await writer;
		assert.equal(result.status, "stable");
		assert.equal(result.size, 8 * 4096);
		assert.ok(result.changes >= 1, "쓰는 동안 변경을 관찰해야 함");
		assert.ok(Date.now() - started >= 8 * 100 + 300, "쓰기가 끝나기 전에 안정화로 판정하면 안 됨");
	} finally {
		await fs.rm(dir, { recursive: true, force: true });
	}
});
