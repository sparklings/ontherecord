export type DevicePreference = "auto" | "cpu" | "accelerator";
export type RecordStartMode = "confirm" | "auto" | "manual";

export interface VaultSettings {
	schemaVersion: 1;
	language: string;
	defaultModelSize: string;
	devicePreference: DevicePreference;
	autoDetectRecording: boolean;
	autoTranscribe: boolean;
	stabilizationSeconds: number;
	transcriptSearchTerms: string[];
	recordStartMode: RecordStartMode;
	autoRecordFolder: string;
}

export interface LocalSettings {
	schemaVersion: 1;
	runtimePath: string;
	modelPath: string;
	ffmpegPath: string;
}

export const DEFAULT_VAULT_SETTINGS: VaultSettings = {
	schemaVersion: 1,
	language: "auto",
	defaultModelSize: "base",
	devicePreference: "auto",
	autoDetectRecording: true,
	autoTranscribe: true,
	stabilizationSeconds: 5,
	transcriptSearchTerms: [],
	recordStartMode: "confirm",
	autoRecordFolder: "",
};

export const DEFAULT_LOCAL_SETTINGS: LocalSettings = {
	schemaVersion: 1,
	runtimePath: "",
	modelPath: "",
	ffmpegPath: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertSupportedSchemaVersion(value: Record<string, unknown>): void {
	const schemaVersion = value.schemaVersion;
	if (typeof schemaVersion === "number" && schemaVersion > 1) {
		throw new Error("설정 파일의 스키마 버전이 플러그인보다 최신입니다.");
	}
}

export function normalizeVaultSettings(value: unknown): VaultSettings {
	if (value === null || value === undefined) return { ...DEFAULT_VAULT_SETTINGS };
	if (!isRecord(value)) throw new Error("vault 설정 형식이 올바르지 않습니다.");
	assertSupportedSchemaVersion(value);

	const result = { ...DEFAULT_VAULT_SETTINGS };
	if (value.language !== undefined) {
		if (typeof value.language !== "string") throw new Error("language 설정이 올바르지 않습니다.");
		result.language = value.language;
	}
	if (value.defaultModelSize !== undefined) {
		if (typeof value.defaultModelSize !== "string") {
			throw new Error("defaultModelSize 설정이 올바르지 않습니다.");
		}
		result.defaultModelSize = value.defaultModelSize;
	}
	if (value.devicePreference !== undefined) {
		if (value.devicePreference !== "auto" && value.devicePreference !== "cpu" && value.devicePreference !== "accelerator") {
			throw new Error("devicePreference 설정이 올바르지 않습니다.");
		}
		result.devicePreference = value.devicePreference;
	}
	if (value.autoDetectRecording !== undefined) {
		if (typeof value.autoDetectRecording !== "boolean") {
			throw new Error("autoDetectRecording 설정이 올바르지 않습니다.");
		}
		result.autoDetectRecording = value.autoDetectRecording;
	}
	if (value.autoTranscribe !== undefined) {
		if (typeof value.autoTranscribe !== "boolean") {
			throw new Error("autoTranscribe 설정이 올바르지 않습니다.");
		}
		result.autoTranscribe = value.autoTranscribe;
	}
	if (value.stabilizationSeconds !== undefined) {
		if (
			typeof value.stabilizationSeconds !== "number" ||
			!Number.isInteger(value.stabilizationSeconds) ||
			value.stabilizationSeconds < 1 ||
			value.stabilizationSeconds > 60
		) {
			throw new Error("stabilizationSeconds 설정은 1~60 사이의 정수여야 합니다.");
		}
		result.stabilizationSeconds = value.stabilizationSeconds;
	}
	if (value.transcriptSearchTerms !== undefined) {
		if (
			!Array.isArray(value.transcriptSearchTerms) ||
			!value.transcriptSearchTerms.every((term) => typeof term === "string")
		) {
			throw new Error("transcriptSearchTerms 설정은 문자열 배열이어야 합니다.");
		}
		result.transcriptSearchTerms = value.transcriptSearchTerms
			.map((term) => term.trim())
			.filter((term, index, terms) => term.length > 0 && terms.indexOf(term) === index);
	}
	if (value.recordStartMode !== undefined) {
		if (value.recordStartMode !== "confirm" && value.recordStartMode !== "auto" && value.recordStartMode !== "manual") {
			throw new Error("recordStartMode 설정이 올바르지 않습니다.");
		}
		result.recordStartMode = value.recordStartMode;
	}
	if (value.autoRecordFolder !== undefined) {
		if (typeof value.autoRecordFolder !== "string") {
			throw new Error("autoRecordFolder 설정이 올바르지 않습니다.");
		}
		result.autoRecordFolder = value.autoRecordFolder.trim();
	}
	return result;
}

export function normalizeLocalSettings(value: unknown): LocalSettings {
	if (value === null || value === undefined) return { ...DEFAULT_LOCAL_SETTINGS };
	if (!isRecord(value)) throw new Error("PC별 설정 형식이 올바르지 않습니다.");
	assertSupportedSchemaVersion(value);

	const result = { ...DEFAULT_LOCAL_SETTINGS };
	if (value.runtimePath !== undefined) {
		if (typeof value.runtimePath !== "string") throw new Error("runtimePath 설정이 올바르지 않습니다.");
		result.runtimePath = value.runtimePath;
	}
	if (value.modelPath !== undefined) {
		if (typeof value.modelPath !== "string") throw new Error("modelPath 설정이 올바르지 않습니다.");
		result.modelPath = value.modelPath;
	}
	if (value.ffmpegPath !== undefined) {
		if (typeof value.ffmpegPath !== "string") throw new Error("ffmpegPath 설정이 올바르지 않습니다.");
		result.ffmpegPath = value.ffmpegPath;
	}
	return result;
}
