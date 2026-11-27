import test from "node:test";
import * as assert from "node:assert/strict";
import {
	formatMeetingNoteFileName,
	getUniqueNotePath,
	resolveTemplateVariables,
	isContentMatchingTemplate,
	createMeetingNote,
} from "../src/meetingNoteCreator.ts";

test("formatMeetingNoteFileName: 날짜 기반 기본 파일명 포매팅 (3-REC-10)", () => {
	const fixedDate = new Date("2026-11-20T14:30:00");
	const name = formatMeetingNoteFileName(fixedDate, "회의록");
	assert.equal(name, "2026-11-20 1430 회의록.md");
});

test("getUniqueNotePath: 동일 파일명 존재 시 고유 순번 부여", () => {
	const existingPaths = new Set(["Meetings/2026-11-20 1430 회의록.md", "Meetings/2026-11-20 1430 회의록 (1).md"]);
	const mockApp = {
		vault: {
			getAbstractFileByPath: (p: string) => existingPaths.has(p) ? {} : null,
		},
	};

	const uniquePath = getUniqueNotePath(mockApp, "Meetings", "2026-11-20 1430 회의록.md");
	assert.equal(uniquePath, "Meetings/2026-11-20 1430 회의록 (2).md");
});

test("resolveTemplateVariables: {{date}}, {{time}}, {{title}} 변수 치환 (3-REC-11)", () => {
	const template = "# {{title}}\n- 일시: {{date}} {{time}}\n- 참석자:\n";
	const resolved = resolveTemplateVariables(template, "전략 회의", new Date("2026-11-20T09:15:00"));

	assert.ok(resolved.includes("# 전략 회의"));
	assert.ok(resolved.includes("2026-11-20 09:15"));
});

test("isContentMatchingTemplate: 템플릿 일치 여부 판정 (3-REC-09)", () => {
	const template = "# {{title}}\n## 회의 안건\n- 안건 1\n";
	const matchingNote = "# 2026-11-20 회의\n## 회의 안건\n- 안건 1\n- 추가 내용";
	const otherNote = "# 자유 메모장\n오늘 할 일...";

	assert.equal(isContentMatchingTemplate(matchingNote, template), true);
	assert.equal(isContentMatchingTemplate(otherNote, template), false);
});

test("createMeetingNote: 파일 생성 및 템플릿 적용 모의 검증", async () => {
	let createdPath = "";
	let createdContent = "";
	const mockApp = {
		vault: {
			getAbstractFileByPath: () => null,
			createFolder: async () => {},
			create: async (path: string, content: string) => {
				createdPath = path;
				createdContent = content;
				return { path };
			},
		},
	};

	const file = await createMeetingNote(mockApp, {
		folder: "Meetings",
		titlePrefix: "주간회의",
		customDate: new Date("2026-11-20T10:00:00"),
	});

	assert.equal(file.path, "Meetings/2026-11-20 1000 주간회의.md");
	assert.ok(createdContent.includes("# 2026-11-20 1000 주간회의"));
});

test("createMeetingNote: 템플릿 파일이 주어지면 템플릿 변수를 치환하여 회의록 생성", async () => {
	let createdPath = "";
	let createdContent = "";
	const mockTemplate = "# {{title}}\n- 날짜: {{date}}\n- 시간: {{time}}\n## 안건";
	const mockApp = {
		vault: {
			getAbstractFileByPath: (p: string) => (p === "Templates/Meeting.md" ? { path: p } : null),
			createFolder: async () => {},
			read: async () => mockTemplate,
			create: async (path: string, content: string) => {
				createdPath = path;
				createdContent = content;
				return { path };
			},
		},
	};

	const file = await createMeetingNote(mockApp, {
		folder: "Meetings",
		templatePath: "Templates/Meeting.md",
		customDate: new Date("2026-11-20T14:00:00"),
	});

	assert.equal(file.path, "Meetings/2026-11-20 1400 회의록.md");
	assert.ok(createdContent.includes("# 2026-11-20 1400 회의록"));
	assert.ok(createdContent.includes("- 날짜: 2026-11-20"));
	assert.ok(createdContent.includes("- 시간: 14:00"));
	assert.ok(createdContent.includes("## 안건"));
});
