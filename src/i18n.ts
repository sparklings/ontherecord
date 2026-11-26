export type SupportedLocale = "en" | "ko";

export const DEFAULT_LOCALE: SupportedLocale = "en";

export interface TranslationDict {
	// Commands
	"cmd.startRecording": string;
	"cmd.stopRecording": string;
	"cmd.selectAudioFile": string;
	"cmd.previewSampleResult": string;
	"cmd.transcribeAudioInsert": string;
	"cmd.searchTranscripts": string;
	"cmd.recalculateRecordings": string;
	"cmd.checkOrphanAudio": string;

	// Status Bar
	"status.recording": string;
	"status.transcribing": string;
	"status.idle": string;
	"status.queued": string;

	// Notices
	"notice.recordingStarted": string;
	"notice.recordingStopped": string;
	"notice.transcriptionComplete": string;
	"notice.recalculateComplete": string;
	"notice.recalculateEmpty": string;
	"notice.orphanEmpty": string;
	"notice.orphanDetected": string;
	"notice.setupCopied": string;

	// Settings Headings
	"settings.heading.recording": string;
	"settings.heading.transcription": string;
	"settings.heading.localTools": string;
	"settings.heading.setupHelper": string;
	"settings.heading.gpuAcceleration": string;
	"settings.gpuBackend.name": string;
	"settings.gpuBackend.desc": string;
	"settings.gpuLayers.name": string;
	"settings.gpuLayers.desc": string;
	"settings.gpuDeviceId.name": string;
	"settings.gpuDeviceId.desc": string;
}

export const translations: Record<SupportedLocale, TranslationDict> = {
	en: {
		"cmd.startRecording": "Start voice recording in active note",
		"cmd.stopRecording": "Stop voice recording",
		"cmd.selectAudioFile": "Select audio file to transcribe",
		"cmd.previewSampleResult": "Preview sample transcription",
		"cmd.transcribeAudioInsert": "Transcribe audio and insert result",
		"cmd.searchTranscripts": "Search transcripts",
		"cmd.recalculateRecordings": "Recalculate recording metadata for this note",
		"cmd.checkOrphanAudio": "Check orphan audio recordings",

		"status.recording": "🔴 {time} {name}",
		"status.transcribing": "🎙️ Transcribing [{percent}%]: {file}",
		"status.idle": "No ongoing transcription tasks.",
		"status.queued": "{count} recordings waiting in queue.",

		"notice.recordingStarted": "Voice recording started.",
		"notice.recordingStopped": "Voice recording stopped and attached to note.",
		"notice.transcriptionComplete": "Transcription completed and inserted into note.",
		"notice.recalculateComplete": "Recalculation complete: {count} recordings (Total: {time} · {size} MB)",
		"notice.recalculateEmpty": "No recording entries found in this note.",
		"notice.orphanEmpty": "No orphan audio files found. All recordings are linked.",
		"notice.orphanDetected": "Detected unfinished recording session from previous crash.\nTarget note: {note}",
		"notice.setupCopied": "Setup command copied to clipboard.\nPaste and run in your PowerShell terminal.",

		"settings.heading.recording": "Voice Recording & Session Lifecycle",
		"settings.heading.transcription": "Speech-to-Text Transcription",
		"settings.heading.localTools": "Local Machine Tools & Status",
		"settings.heading.setupHelper": "One-Click Setup Helper",
		"settings.heading.gpuAcceleration": "Hardware & GPU Acceleration",
		"settings.gpuBackend.name": "GPU Acceleration Backend",
		"settings.gpuBackend.desc": "Select acceleration backend for whisper.cpp (Auto, CPU, NVIDIA CUDA, Vulkan, OpenVINO).",
		"settings.gpuLayers.name": "GPU Offload Layers (-ngl)",
		"settings.gpuLayers.desc": "Number of model layers to offload to GPU VRAM (0: CPU only, 99: full model offload).",
		"settings.gpuDeviceId.name": "GPU Device Index (-dev)",
		"settings.gpuDeviceId.desc": "Target GPU device ID when multiple GPUs are installed (default: 0).",
	},
	ko: {
		"cmd.startRecording": "현재 활성 노트에서 음성 녹음 시작",
		"cmd.stopRecording": "음성 녹음 중지",
		"cmd.selectAudioFile": "전사할 오디오 파일 선택",
		"cmd.previewSampleResult": "샘플 전사 결과 미리보기 시험",
		"cmd.transcribeAudioInsert": "오디오 전사 및 결과 삽입",
		"cmd.searchTranscripts": "전사문 검색",
		"cmd.recalculateRecordings": "이 노트 녹음 정보 재계산",
		"cmd.checkOrphanAudio": "고아 녹음 파일 점검",

		"status.recording": "🔴 {time} {name}",
		"status.transcribing": "🎙️ 전사 중 [{percent}%]: {file}",
		"status.idle": "현재 진행 중인 전사 작업이 없습니다.",
		"status.queued": "대기열에 {count}개 파일이 대기 중입니다.",

		"notice.recordingStarted": "음성 녹음을 시작합니다.",
		"notice.recordingStopped": "음성 녹음이 안전하게 중지되고 노트에 연결되었습니다.",
		"notice.transcriptionComplete": "전사가 완료되어 노트에 자동 반영되었습니다.",
		"notice.recalculateComplete": "녹음 정보 재계산 완료: 총 {count}개 녹음 (소요: {time} · {size} MB)",
		"notice.recalculateEmpty": "이 노트에서 녹음 정보를 찾을 수 없습니다.",
		"notice.orphanEmpty": "어떤 노트에도 연결되지 않은 고아 녹음 파일이 없습니다.",
		"notice.orphanDetected": "비정상 종료된 녹음 세션 감지\n대상 노트: {note}",
		"notice.setupCopied": "외부 도구 자동 셋업 명령어가 클립보드에 복사되었습니다.\nPowerShell 터미널을 열고 붙여넣어 실행하세요.",

		"settings.heading.recording": "음성 녹음 및 세션 라이프사이클",
		"settings.heading.transcription": "음성 전사 파이프라인",
		"settings.heading.localTools": "이 기기의 CPU 전사 도구 경로 및 상태",
		"settings.heading.setupHelper": "원클릭 도구 자동 셋업 스크립트 (Setup Helper)",
		"settings.heading.gpuAcceleration": "하드웨어 및 GPU 가속 설정",
		"settings.gpuBackend.name": "GPU 가속 백엔드",
		"settings.gpuBackend.desc": "whisper.cpp 추론 가속 백엔드를 선택합니다 (자동 감지, CPU 전용, NVIDIA CUDA, Vulkan, OpenVINO).",
		"settings.gpuLayers.name": "GPU 오프로드 레이어 수 (-ngl)",
		"settings.gpuLayers.desc": "GPU VRAM에 오프로드할 신경망 레이어 수입니다 (0: CPU 전용, 99: 모델 전체 오프로드).",
		"settings.gpuDeviceId.name": "GPU 장치 번호 (-dev)",
		"settings.gpuDeviceId.desc": "여러 GPU가 장착된 경우 연산에 사용할 GPU 인덱스 번호입니다 (기본값: 0).",
	},
};

/**
 * 현재 환경의 로케일을 감지하거나 지정된 로케일을 반환한다.
 */
export function getCurrentLocale(): SupportedLocale {
	try {
		// 1. Obsidian 전역 moment 로케일 감지 (가장 정확한 앱 설정)
		if (typeof window !== "undefined") {
			const win = window as unknown as { moment?: { locale?: () => string }; i18next?: { language?: string } };
			const momentLocale = win.moment?.locale?.();
			if (momentLocale && momentLocale.toLowerCase().startsWith("ko")) {
				return "ko";
			}
			const i18nLang = win.i18next?.language;
			if (i18nLang && i18nLang.toLowerCase().startsWith("ko")) {
				return "ko";
			}
		}

		// 2. 시스템 및 브라우저 기본 로케일 확인
		if (typeof navigator !== "undefined" && navigator.language) {
			if (navigator.language.toLowerCase().startsWith("ko")) {
				return "ko";
			}
		}
	} catch {
		// 접근 불가 환경
	}
	return "en";
}

/**
 * 지정된 키에 대한 번역 문자열을 반환하며, 템플릿 변수 치환을 지원한다 (3-PIPE-04).
 */
export function t(
	key: keyof TranslationDict,
	params?: Record<string, string | number>,
	locale: SupportedLocale = getCurrentLocale(),
): string {
	const dict = translations[locale] ?? translations[DEFAULT_LOCALE];
	let text: string = dict[key] ?? translations[DEFAULT_LOCALE][key] ?? key;

	if (params) {
		for (const [k, v] of Object.entries(params)) {
			text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
		}
	}

	return text;
}
