import test from "node:test";
import * as assert from "node:assert/strict";
import { FloatingRecordingIndicator } from "../src/floatingIndicator.ts";

interface MockElement {
	tag: string;
	classes: Set<string>;
	text: string;
	attrs: Record<string, string>;
	children: MockElement[];
	removed: boolean;
	onclick?: () => void;
	createDiv: (opts?: { cls?: string }) => MockElement;
	createSpan: (opts?: { cls?: string; text?: string }) => MockElement;
	createEl: (tag: string, opts?: { cls?: string; text?: string; title?: string }) => MockElement;
	addClass: (...cls: string[]) => void;
	removeClass: (...cls: string[]) => void;
	hasClass: (cls: string) => boolean;
	setText: (text: string) => void;
	setAttribute: (k: string, v: string) => void;
	empty: () => void;
	remove: () => void;
	appendChild: (node: unknown) => void;
}

function createMockElement(tag = "div", cls = "", text = ""): MockElement {
	const classes = new Set(cls.split(/\s+/).filter(Boolean));
	const el: MockElement = {
		tag,
		classes,
		text,
		attrs: {},
		children: [],
		removed: false,
		createDiv(opts) {
			const child = createMockElement("div", opts?.cls ?? "");
			el.children.push(child);
			return child;
		},
		createSpan(opts) {
			const child = createMockElement("span", opts?.cls ?? "", opts?.text ?? "");
			el.children.push(child);
			return child;
		},
		createEl(t, opts) {
			const child = createMockElement(t, opts?.cls ?? "", opts?.text ?? "");
			if (opts?.title) child.attrs.title = opts.title;
			el.children.push(child);
			return child;
		},
		addClass(...names) {
			for (const name of names) {
				for (const part of name.split(/\s+/).filter(Boolean)) classes.add(part);
			}
		},
		removeClass(...names) {
			for (const name of names) {
				for (const part of name.split(/\s+/).filter(Boolean)) classes.delete(part);
			}
		},
		hasClass(name) {
			return classes.has(name);
		},
		setText(val) {
			el.text = val;
		},
		setAttribute(k, v) {
			el.attrs[k] = v;
		},
		empty() {
			el.children = [];
		},
		remove() {
			el.removed = true;
		},
		appendChild() {
			// setIcon 등에서 SVG 추가 시 호출될 수 있는 no-op
		},
	};
	return el;
}

test("FloatingRecordingIndicator: idle 및 destroy 시 비노출, starting/recording/paused 상태 구분 (FEAT-02, UI-02)", () => {
	const host = createMockElement("body");
	let now = 1000_000;

	const indicator = new FloatingRecordingIndicator(
		{
			onPause: () => undefined,
			onResume: () => undefined,
			onStop: () => undefined,
		},
		{
			hostEl: host as unknown as HTMLElement,
			getNow: () => now,
		},
	);

	// 1. 초기 상태(idle): 화면에 보이지 않아야 함
	assert.equal(indicator.getState(), "idle");
	assert.equal(indicator.isVisible(), false);
	assert.equal(host.children.length, 0);

	// 2. starting 상태: 소프트 퍼플 링 상태 및 "Starting..." 표시
	indicator.setState("starting");
	assert.equal(indicator.getState(), "starting");
	assert.equal(indicator.isVisible(), true);
	const root = host.children[0];
	assert.equal(root.hasClass("is-starting"), true);
	assert.equal(root.children[1].text, "Starting...");

	// 3. recording 상태: 타이머 표시 및 시간 경과 반영
	indicator.setState("recording", now);
	assert.equal(indicator.getState(), "recording");
	assert.equal(indicator.isVisible(), true);
	assert.equal(root.hasClass("is-recording"), true);
	assert.equal(root.children[1].text, "00:00");

	now += 65_000;
	// paused로 전환 시 경과 시간(01:05)이 보존되어야 함
	indicator.setState("paused");
	assert.equal(indicator.getState(), "paused");
	assert.equal(indicator.isVisible(), true);
	assert.equal(root.hasClass("is-paused"), true);
	assert.equal(root.children[1].text, "01:05");

	// 4. idle 복귀 시 숨김 처리
	indicator.setState("idle");
	assert.equal(indicator.getState(), "idle");
	assert.equal(indicator.isVisible(), false);
	assert.equal(root.hasClass("is-hidden"), true);

	// 5. destroy() (Obsidian 종료 시): DOM 요소 완전 제거
	indicator.setState("recording", now);
	assert.equal(indicator.isVisible(), true);
	indicator.destroy();
	assert.equal(indicator.isVisible(), false);
	assert.equal(root.removed, true);
});
