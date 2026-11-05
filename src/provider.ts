import type { DevicePreference } from "./settings.ts";

export type ProviderDevice = "cpu" | "cuda" | "openvino";

export type ProviderReadiness =
	| { status: "ready" }
	| { status: "unavailable"; reason: string }
	| { status: "unverified"; reason: string };

export interface ProviderPlatform {
	os: string;
	architecture: string;
}

export interface ProviderDescriptor {
	id: string;
	version: string;
	license: string;
	platforms: readonly ProviderPlatform[];
	supportedAudioExtensions: readonly string[];
	supportedDevices: readonly ProviderDevice[];
	requirements: readonly string[];
	readiness: ProviderReadiness;
}

export interface TranscriptionRequest {
	audio: {
		path: string;
		sizeBytes: number;
		extension: string;
	};
	model: {
		id: string;
		path: string;
	};
	options: {
		language: string;
		devicePreference: DevicePreference;
	};
}

export type TranscriptionProgressStage = "preparing" | "loading-model" | "transcribing";

export interface TranscriptionProgress {
	stage: TranscriptionProgressStage;
	percentComplete?: number;
	message?: string;
}

export interface TranscriptionSegment {
	startSeconds: number;
	endSeconds: number;
	text: string;
}

export interface TranscriptionResult {
	language: string;
	text: string;
	segments: readonly TranscriptionSegment[];
	engine: {
		providerId: string;
		providerVersion: string;
		modelId: string;
		device: ProviderDevice;
	};
	warnings: readonly string[];
}

export type ProviderErrorCode =
	| "cancelled"
	| "unsupported-audio"
	| "invalid-model"
	| "runtime-unavailable"
	| "permission-denied"
	| "resource-exhausted"
	| "execution-failed"
	| "invalid-output";

export class ProviderError extends Error {
	readonly code: ProviderErrorCode;
	readonly providerId: string;
	readonly cause?: Error;

	constructor(
		message: string,
		code: ProviderErrorCode,
		providerId: string,
		cause?: Error,
	) {
		super(message);
		this.name = "ProviderError";
		this.code = code;
		this.providerId = providerId;
		this.cause = cause;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export interface ProviderRunContext {
	signal: AbortSignal;
	onProgress(progress: TranscriptionProgress): void;
}

export interface TranscriptionProvider {
	readonly descriptor: ProviderDescriptor;
	transcribe(
		request: TranscriptionRequest,
		context: ProviderRunContext,
	): Promise<TranscriptionResult>;
}
