export type AppLike = {
	vault: {
		getAbstractFileByPath: (path: string) => unknown;
		createFolder: (folder: string) => Promise<void>;
		create: (path: string, content: string) => Promise<{ path: string }>;
		read?: (file: any) => Promise<string>;
	};
};

export function normalizePath(p: string): string {
	return p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
}

export interface CreateMeetingNoteOptions {
	folder?: string;
	templatePath?: string;
	titlePrefix?: string;
	customDate?: Date;
}

/**
 * 0으로 채운 2자리 문자열을 반환합니다.
 */
function pad(n: number): string {
	return String(n).padStart(2, "0");
}

/**
 * 날짜 및 시간 기반 회의록 기본 파일명을 생성합니다 (3-REC-10).
 * 예: 2026-11-20 1030 회의록.md
 */
export function formatMeetingNoteFileName(date: Date = new Date(), prefix = "회의록"): string {
	const yyyy = date.getFullYear();
	const mm = pad(date.getMonth() + 1);
	const dd = pad(date.getDate());
	const hh = pad(date.getHours());
	const min = pad(date.getMinutes());
	return `${yyyy}-${mm}-${dd} ${hh}${min} ${prefix}.md`;
}

/**
 * 볼트 내에서 파일명 중복을 방지하여 고유한 전체 경로를 반환합니다.
 */
export function getUniqueNotePath(app: AppLike, folderPath: string, fileName: string): string {
	const baseName = fileName.replace(/\.md$/i, "");
	const folder = folderPath ? normalizePath(folderPath) : "";
	let candidate = folder ? `${folder}/${fileName}` : fileName;
	let counter = 1;

	while (app.vault.getAbstractFileByPath(candidate)) {
		const newName = `${baseName} (${counter}).md`;
		candidate = folder ? `${folder}/${newName}` : newName;
		counter++;
	}

	return normalizePath(candidate);
}

/**
 * 템플릿 내의 기본 변수({{date}}, {{time}}, {{title}})를 치환합니다 (3-REC-11).
 */
export function resolveTemplateVariables(templateContent: string, noteTitle: string, date: Date = new Date()): string {
	const yyyy = date.getFullYear();
	const mm = pad(date.getMonth() + 1);
	const dd = pad(date.getDate());
	const hh = pad(date.getHours());
	const min = pad(date.getMinutes());
	const dateStr = `${yyyy}-${mm}-${dd}`;
	const timeStr = `${hh}:${min}`;

	return templateContent
		.replace(/\{\{\s*date\s*\}\}/gi, dateStr)
		.replace(/\{\{\s*time\s*\}\}/gi, timeStr)
		.replace(/\{\{\s*title\s*\}\}/gi, noteTitle);
}

/**
 * 템플릿 기반 또는 표준 마크다운 회의록 문서를 생성합니다 (3-REC-08, 3-REC-10).
 */
export async function createMeetingNote(app: AppLike, options: CreateMeetingNoteOptions = {}): Promise<{ path: string }> {
	const date = options.customDate ?? new Date();
	const folder = options.folder ? normalizePath(options.folder.trim()) : "";

	// 폴더가 없으면 생성
	if (folder && !app.vault.getAbstractFileByPath(folder)) {
		await app.vault.createFolder(folder);
	}

	const fileName = formatMeetingNoteFileName(date, options.titlePrefix ?? "회의록");
	const filePath = getUniqueNotePath(app, folder, fileName);
	const noteTitle = fileName.replace(/\.md$/i, "");

	let noteContent = `# ${noteTitle}\n\n`;

	// 템플릿 파일이 지정된 경우 템플릿 내용 읽기
	if (options.templatePath && options.templatePath.trim().length > 0) {
		const normalizedTemplatePath = normalizePath(options.templatePath.trim());
		const templateFile = app.vault.getAbstractFileByPath(normalizedTemplatePath);
		if (templateFile && app.vault.read) {
			try {
				const rawTemplate = await app.vault.read(templateFile);
				noteContent = resolveTemplateVariables(rawTemplate, noteTitle, date);
			} catch {
				// 템플릿 읽기 실패 시 기본 내용 유지
			}
		}
	}

	return await app.vault.create(filePath, noteContent);
}

/**
 * 새로 생성된 노트 내용이 지정된 템플릿과 일치하는지 판별합니다 (3-REC-09).
 */
export function isContentMatchingTemplate(noteContent: string, templateContent: string): boolean {
	if (!noteContent || !templateContent) return false;

	const templateLines = templateContent
		.split(/\r?\n/)
		.map((line) => line.replace(/\{\{\s*[^}]+\s*\}\}/g, "").trim())
		.filter((line) => line.length > 3);

	if (templateLines.length === 0) return true;

	const matchCount = templateLines.filter((line) => noteContent.includes(line)).length;
	return matchCount >= Math.ceil(templateLines.length * 0.5);
}
