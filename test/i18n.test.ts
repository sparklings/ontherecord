import test from "node:test";
import assert from "node:assert/strict";
import { t, translations } from "../src/i18n.ts";

test("t(): 영어(en) 기본 번역을 올바르게 반환한다 (3-PIPE-04)", () => {
	const text = t("cmd.startRecording", undefined, "en");
	assert.equal(text, "Start voice recording in active note");
});

test("t(): 한국어(ko) 번역을 올바르게 반환한다 (3-PIPE-04)", () => {
	const text = t("cmd.startRecording", undefined, "ko");
	assert.equal(text, "현재 활성 노트에서 음성 녹음 시작");
});

test("t(): 템플릿 매개변수 치환을 정확히 수행한다", () => {
	const enText = t("notice.recalculateComplete", { count: 3, time: "05:20", size: 4.5 }, "en");
	assert.equal(enText, "Recalculation complete: 3 recordings (Total: 05:20 · 4.5 MB)");

	const koText = t("notice.recalculateComplete", { count: 3, time: "05:20", size: 4.5 }, "ko");
	assert.equal(koText, "녹음 정보 재계산 완료: 총 3개 녹음 (소요: 05:20 · 4.5 MB)");
});

test("translations: 영어와 한국어 사전의 키 목록이 100% 일치한다", () => {
	const enKeys = Object.keys(translations.en).sort();
	const koKeys = Object.keys(translations.ko).sort();
	assert.deepEqual(enKeys, koKeys);
});
