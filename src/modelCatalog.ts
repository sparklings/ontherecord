import * as path from "path";
import * as fs from "fs";

export interface ModelMetadata {
	id: string;
	label: string;
	quantization: string;
	filename: string;
	sizeMb: number;
	sha256: string;
	recommended: boolean;
	description: string;
	huggingFaceUrl: string;
}

export const SUPPORTED_MODELS: readonly ModelMetadata[] = [
	{
		id: "base",
		label: "Base (초고속 · 가벼움)",
		quantization: "q5_1",
		filename: "ggml-base-q5_1.bin",
		sizeMb: 148,
		sha256: "422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898",
		recommended: false,
		description: "저사양 PC나 초고속 전사용. 일상 대화 인식은 가능하나 전문용어 오인이 발생할 수 있습니다.",
		huggingFaceUrl: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin",
	},
	{
		id: "small",
		label: "Small (균형 · 중간 속도)",
		quantization: "q5_1",
		filename: "ggml-small-q5_1.bin",
		sizeMb: 466,
		sha256: "ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb",
		recommended: false,
		description: "속도와 품질의 균형 모델. 일반 회의 및 발화자 전환 분리에 양호합니다.",
		huggingFaceUrl: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin",
	},
	{
		id: "medium",
		label: "Medium (공식 권장 ⭐ · 높은 정확도)",
		quantization: "q5_0",
		filename: "ggml-medium-q5_0.bin",
		sizeMb: 514,
		sha256: "19fea4b380c3a618ec4723c3eef2eb785ffba0d0538cf43f8f235e7b3b34220f",
		recommended: true,
		description: "한국어 비즈니스 및 IT 전문용어(CMDB, syslog, config 등) 복원력과 장시간 환각 억제력이 가장 우수한 공식 표준 모델입니다.",
		huggingFaceUrl: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q5_0.bin",
	},
	{
		id: "large-v3-turbo",
		label: "Large-v3-Turbo (고정밀 고속)",
		quantization: "q5_0",
		filename: "ggml-large-v3-turbo-q5_0.bin",
		sizeMb: 547,
		sha256: "394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2",
		recommended: false,
		description: "Large-v3 아키텍처를 디코더 4레이어로 경량화하여 정밀도와 속도를 동시에 추구한 모델입니다.",
		huggingFaceUrl: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin",
	},
	{
		id: "large-v3",
		label: "Large-v3 (최고 정밀도 · GPU 권장)",
		quantization: "q5_0",
		filename: "ggml-large-v3-q5_0.bin",
		sizeMb: 1031,
		sha256: "d75795ecff3f83b5faa89d1900604ad8c780abd5739fae406de19f23ecd98ad1",
		recommended: false,
		description: "최고 수준의 전사 정밀도. 다국어 혼용 회의 및 방언에 탁월하나 CPU에서는 속도가 느려 외장 GPU(CUDA) 환경을 권장합니다.",
		huggingFaceUrl: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-q5_0.bin",
	},
] as const;

export function getModelMetadata(modelId: string): ModelMetadata {
	return SUPPORTED_MODELS.find((m) => m.id === modelId) ?? SUPPORTED_MODELS[0];
}

export function getDefaultModelStorageDir(): string {
	const localAppData = process.env.LOCALAPPDATA || "";
	return path.join(localAppData, "on-the-record", "models");
}

export function resolveModelExpectedPath(modelId: string): string {
	const meta = getModelMetadata(modelId);
	return path.join(getDefaultModelStorageDir(), meta.filename);
}

export function checkModelFileInstalled(modelId: string, currentConfiguredPath?: string): { installed: boolean; resolvedPath: string; sizeBytes?: number } {
	const meta = getModelMetadata(modelId);
	// 1. 현재 설정된 경로가 존재하고 파일명이 일치하는지 확인
	if (currentConfiguredPath && currentConfiguredPath.trim().length > 0) {
		try {
			if (fs.existsSync(currentConfiguredPath) && path.basename(currentConfiguredPath).toLowerCase().startsWith(`ggml-${meta.id}`)) {
				const stat = fs.statSync(currentConfiguredPath);
				return { installed: true, resolvedPath: currentConfiguredPath, sizeBytes: stat.size };
			}
		} catch {
			// 무시
		}
	}

	// 2. 표준 저장 위치 확인 (%LOCALAPPDATA%\on-the-record\models\ggml-*.bin)
	const standardPath = resolveModelExpectedPath(modelId);
	try {
		if (fs.existsSync(standardPath)) {
			const stat = fs.statSync(standardPath);
			return { installed: true, resolvedPath: standardPath, sizeBytes: stat.size };
		}
	} catch {
		// 무시
	}

	return { installed: false, resolvedPath: standardPath };
}

export function buildModelDownloadCommand(modelId: string): string {
	const meta = getModelMetadata(modelId);
	const targetPath = resolveModelExpectedPath(modelId);
	const targetDir = getDefaultModelStorageDir();
	// PowerShell에서 디렉터리 생성 및 curl/Invoke-WebRequest로 다운로드하는 원클릭 명령어
	return `powershell -ExecutionPolicy Bypass -Command "if (-not (Test-Path '${targetDir}')) { New-Item -ItemType Directory -Path '${targetDir}' -Force | Out-Null }; Write-Host 'Downloading ${meta.filename} (${meta.sizeMb}MB)...' -ForegroundColor Cyan; Invoke-WebRequest -Uri '${meta.huggingFaceUrl}' -OutFile '${targetPath}'; Write-Host 'Complete: ${targetPath}' -ForegroundColor Green"`;
}
