import { Notice, PluginSettingTab, Setting } from "obsidian";
import type { App, Plugin } from "obsidian";
import type { LocalSettings, VaultSettings } from "./settings.ts";
import { t } from "./i18n.ts";
import { SUPPORTED_MODELS, getModelMetadata, checkModelFileInstalled, buildModelDownloadCommand } from "./modelCatalog.ts";
import * as fs from "fs";

function checkPathExists(filePath: string): { exists: boolean; sizeBytes?: number } {
	if (!filePath || filePath.trim().length === 0) return { exists: false };
	try {
		if (fs.existsSync(filePath)) {
			const stat = fs.statSync(filePath);
			return { exists: true, sizeBytes: stat.size };
		}
	} catch {
		// 파일 시스템 오류 또는 권한 문제
	}
	return { exists: false };
}

function renderStatusBadge(container: HTMLElement, status: { exists: boolean; sizeBytes?: number }, label = "준비됨"): void {
	const isReady = status.exists;
	const badge = container.createSpan({ cls: `otr-status-badge ${isReady ? "is-ready" : "is-missing"}` });

	// 부드러운 상태 표시 도트 (Point Indicator)
	badge.createSpan({ cls: "otr-status-badge-dot" });

	// 상태 레이블
	if (isReady) {
		badge.createSpan({ text: label });
		if (status.sizeBytes) {
			const sizeMb = (status.sizeBytes / (1024 * 1024)).toFixed(1);
			badge.createSpan({ text: `· ${sizeMb} MB`, cls: "otr-status-badge-size" });
		}
	} else {
		badge.createSpan({ text: "파일 없음" });
	}
}

/* eslint obsidianmd/settings-tab/prefer-setting-definitions: off -- Retain compatibility with minAppVersion 1.7.2. */
export class OnTheRecordSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly getVaultSettings: () => VaultSettings,
		private readonly updateVaultSettings: (patch: Partial<VaultSettings>) => Promise<void>,
		private readonly getLocalSettings: () => LocalSettings | null,
		private readonly updateLocalSettings: (patch: Partial<LocalSettings>) => Promise<void>,
		private readonly localSettingsError: string | null,
		private readonly testCpuSetup: () => void,
		private readonly discoverCpuSetup: () => void,
		plugin: Plugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// 설정 도움말 및 튜토리얼 상단 안내 배너
		const helpBanner = containerEl.createDiv({ cls: "setting-item-description" });
		helpBanner.style.padding = "10px 14px";
		helpBanner.style.marginBottom = "1.2rem";
		helpBanner.style.borderRadius = "8px";
		helpBanner.style.backgroundColor = "var(--background-secondary)";
		helpBanner.style.border = "1px solid var(--background-modifier-border)";
		helpBanner.style.display = "flex";
		helpBanner.style.justifyContent = "space-between";
		helpBanner.style.alignItems = "center";

		const bannerText = helpBanner.createSpan();
		bannerText.setText("💡 각 설정의 목적, 최적의 권장값 및 GPU 가속 튜닝 효과가 궁금하신가요?");

		const guideBtn = helpBanner.createEl("button", { text: "📖 상세 설정 가이드 보기" });
		guideBtn.style.cursor = "pointer";
		guideBtn.onclick = () => {
			window.open("https://github.com/sparklings/ontherecord/blob/main/docs/SETTINGS_GUIDE.md", "_blank");
		};

		new Setting(containerEl).setName("🎙️ 음성 녹음 및 회의록 세션").setHeading();

		const vaultSettings = this.getVaultSettings();
		const localSettings = this.getLocalSettings();

		new Setting(containerEl)
			.setName("회의록 작성 시 녹음 시작 방식")
			.setDesc("새 마크다운 회의록을 열었을 때 자동으로 음성 녹음을 시작할지 선택합니다. (노트 속성 recorder가 우선 적용)")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("auto", "새 회의록 작성 시 자동 시작 (권장)")
					.addOption("manual", "단축키 또는 버튼으로 수동 시작")
					.setValue(vaultSettings.recordStartMode)
					.onChange((value) => {
						if (value === "auto" || value === "manual") {
							void this.updateVaultSettings({ recordStartMode: value });
						}
					}),
			);

		new Setting(containerEl)
			.setName("녹음 시작 안내 알림 표시")
			.setDesc("녹음이 시작될 때 우측 상단에 팝업 알림을 표시합니다. 끄면 상태표시줄 타이머만 조용히 켜집니다.")
			.addToggle((toggle) =>
				toggle
					.setValue(vaultSettings.recordStartNotification)
					.onChange((value) => {
						void this.updateVaultSettings({ recordStartNotification: value });
					}),
			);

		new Setting(containerEl)
			.setName("회의록 마크다운 노트 보관 폴더")
			.setDesc("이 폴더 하위에 새 마크다운 문서를 생성했을 때만 녹음 시작 규칙을 적용합니다. (비워두면 볼트 내 모든 새 노트에 적용)")
			.addText((text) =>
				text
					.setValue(vaultSettings.autoRecordFolder)
					.setPlaceholder("예: Meetings 또는 회의록")
					.onChange((value) => {
						void this.updateVaultSettings({ autoRecordFolder: value.trim() });
					}),
			);

		// 음성 녹음 파일 저장 위치 안내 카드
		const audioStorageNote = containerEl.createDiv({ cls: "setting-item-description" });
		audioStorageNote.style.padding = "6px 12px";
		audioStorageNote.style.marginBottom = "1rem";
		audioStorageNote.style.borderRadius = "6px";
		audioStorageNote.style.backgroundColor = "var(--background-secondary)";
		audioStorageNote.style.fontSize = "0.85em";
		audioStorageNote.setText("💡 실제 녹음된 오디오(.m4a) 파일은 옵시디언의 '설정 > 파일 및 링크 > 새 첨부 파일의 위치'에 지정된 폴더에 안전하게 보관됩니다.");

		new Setting(containerEl)
			.setName("작성 중인 노트 탭을 닫을 때")
			.setDesc("회의 중 실수로 탭을 닫아도 녹음 파일이 유실되거나 고아가 되지 않도록 처리하는 방식입니다.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("stop-and-attach", "녹음 안전 중지 및 오디오 자동 연결 (권장)")
					.addOption("ignore", "녹음 유지 (수동 중지)")
					.setValue(vaultSettings.onTabCloseAction)
					.onChange((value) => {
						void this.updateVaultSettings({ onTabCloseAction: value as "stop-and-attach" | "ignore" });
					}),
			);

		new Setting(containerEl).setName("⚡ 음성 전사 파이프라인").setHeading();
		new Setting(containerEl)
			.setName("녹음 종료 즉시 백그라운드 전사 시작")
			.setDesc("녹음이 중지되면 별도 클릭 없이 로컬 whisper.cpp 엔진이 비동기로 전사를 시작합니다.")
			.addToggle((toggle) =>
				toggle.setValue(vaultSettings.autoTranscribe).onChange((value) => {
					void this.updateVaultSettings({ autoTranscribe: value });
				}),
			);

		new Setting(containerEl)
			.setName("외부 음성 파일 자동 감지")
			.setDesc("스마트폰 녹음기나 외부에서 볼트로 추가된 새 오디오 파일을 감지하여 전사 대기열에 등록합니다.")
			.addToggle((toggle) =>
				toggle.setValue(vaultSettings.autoDetectRecording).onChange((value) => {
					void this.updateVaultSettings({ autoDetectRecording: value });
				}),
			);

		new Setting(containerEl)
			.setName("전사 결과 노트 반영 방식")
			.setDesc("전사가 완료되었을 때 노트 본문에 반영하는 방식입니다.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("auto", "오디오 임베드 아래 자동 삽입 (권장)")
					.addOption("review", "미리보기 모달로 검토 후 승인 삽입")
					.setValue(vaultSettings.transcriptionInsertMode)
					.onChange((value) => {
						void this.updateVaultSettings({ transcriptionInsertMode: value as "auto" | "review" });
					}),
			);

		new Setting(containerEl)
			.setName("오디오 저장 완료 대기 시간 (초)")
			.setDesc("녹음기나 동기화 도구가 오디오 파일 저장을 완전히 끝마칠 때까지 기다리는 시간입니다 (기본값: 5초).")
			.addText((text) =>
				text
					.setValue(String(vaultSettings.stabilizationSeconds))
					.setPlaceholder("5")
					.onChange((value) => {
						const seconds = Number(value);
						if (Number.isInteger(seconds) && seconds >= 1 && seconds <= 60) {
							void this.updateVaultSettings({ stabilizationSeconds: seconds });
						}
					}),
			);

		new Setting(containerEl)
			.setName("기본 전사 언어")
			.setDesc("전사에 사용할 언어입니다. 한국어 회의의 경우 '한국어'로 고정하면 잡음 구간에서 외국어로 환각하는 현상을 방지합니다.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("ko", "한국어 (권장)")
					.addOption("auto", "다국어 자동 감지")
					.addOption("en", "영어")
					.setValue(vaultSettings.language)
					.onChange((value) => {
						void this.updateVaultSettings({ language: value });
					}),
			);

		const modelSizeSetting = new Setting(containerEl)
			.setName("음성인식 모델 크기")
			.setDesc("전사에 사용할 whisper 모델을 선택합니다. 한국어 비즈니스 회의에는 Medium 모델을 기본 권장합니다.");

		const modelInfoContainer = containerEl.createDiv({ cls: "otr-model-info-container" });
		modelInfoContainer.style.marginTop = "-0.5rem";
		modelInfoContainer.style.marginBottom = "1rem";

		const renderModelInfo = (modelId: string) => {
			modelInfoContainer.empty();
			const meta = getModelMetadata(modelId);
			const installStatus = checkModelFileInstalled(modelId, localSettings?.modelPath);

			const card = modelInfoContainer.createDiv({ cls: "setting-item-description" });
			card.style.padding = "10px 14px";
			card.style.borderRadius = "8px";
			card.style.backgroundColor = "var(--background-secondary)";
			card.style.border = "1px solid var(--background-modifier-border)";

			const topRow = card.createDiv();
			topRow.style.display = "flex";
			topRow.style.justifyContent = "space-between";
			topRow.style.alignItems = "center";
			topRow.style.marginBottom = "6px";

			const titleSpan = topRow.createSpan({ text: `📦 ${meta.filename} (약 ${meta.sizeMb} MB · ${meta.quantization})` });
			titleSpan.style.fontWeight = "bold";

			const badgeSpan = topRow.createSpan({
				cls: `otr-status-badge ${installStatus.installed ? "is-ready" : "is-missing"}`,
			});
			badgeSpan.createSpan({ cls: "otr-status-badge-dot" });
			badgeSpan.createSpan({ text: installStatus.installed ? "이 PC에 준비됨" : "미설치" });

			const descP = card.createEl("p", { text: meta.description });
			descP.style.margin = "4px 0 8px 0";
			descP.style.fontSize = "0.9em";

			const bottomRow = card.createDiv();
			bottomRow.style.display = "flex";
			bottomRow.style.justifyContent = "space-between";
			bottomRow.style.alignItems = "center";
			bottomRow.style.gap = "8px";
			bottomRow.style.flexWrap = "wrap";

			const linkA = bottomRow.createEl("a", { text: "🔗 Hugging Face 공식 출처 열기", href: meta.huggingFaceUrl });
			linkA.style.fontSize = "0.85em";
			linkA.target = "_blank";

			if (!installStatus.installed) {
				const downloadBtn = bottomRow.createEl("button", { text: "📥 다운로드 명령어 복사" });
				downloadBtn.style.cursor = "pointer";
				downloadBtn.onclick = async () => {
					const cmd = buildModelDownloadCommand(modelId);
					await navigator.clipboard.writeText(cmd);
					new Notice(
						`[${meta.filename}] 다운로드 명령어가 복사되었습니다.\nPowerShell 터미널을 열고 붙여넣어 실행하세요.`,
						7000,
					);
				};
			} else if (localSettings && localSettings.modelPath !== installStatus.resolvedPath) {
				const applyBtn = bottomRow.createEl("button", { text: "이 모델을 전사 경로로 적용" });
				applyBtn.style.cursor = "pointer";
				applyBtn.onclick = async () => {
					await this.updateLocalSettings({ modelPath: installStatus.resolvedPath });
					new Notice(`전사 모델 경로가 적용되었습니다: ${installStatus.resolvedPath}`, 4000);
					this.display();
				};
			}
		};

		modelSizeSetting.addDropdown((dropdown) => {
			for (const m of SUPPORTED_MODELS) {
				dropdown.addOption(m.id, m.label);
			}
			dropdown
				.setValue(vaultSettings.defaultModelSize)
				.onChange((value) => {
					void this.updateVaultSettings({ defaultModelSize: value });
					renderModelInfo(value);
				});
		});

		renderModelInfo(vaultSettings.defaultModelSize);

		new Setting(containerEl)
			.setName("연산 프로세서 선호도")
			.setDesc("실행 환경에서 선호할 연산 프로세서입니다.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("auto", "자동 선택 (권장)")
					.addOption("accelerator", "GPU 가속기 우선")
					.addOption("cpu", "CPU 전용")
					.setValue(vaultSettings.devicePreference)
					.onChange((value) => {
						if (value === "auto" || value === "cpu" || value === "accelerator") {
							void this.updateVaultSettings({ devicePreference: value });
						}
					}),
			);

		new Setting(containerEl)
			.setName("자주 찾는 회의 키워드 (검색 추천어)")
			.setDesc("전사문 검색 모달에서 한 번의 클릭으로 찾을 키워드(예: 결정 사항, 담당자, 마감일)를 줄바꿈으로 등록하세요.")
			.addTextArea((text) =>
				text
					.setValue(vaultSettings.transcriptSearchTerms.join("\n"))
					.setPlaceholder("예: 결정 사항\n담당자\nTODO")
					.onChange((value) => {
						void this.updateVaultSettings({
							transcriptSearchTerms: value.split(/\r?\n/).map((term) => term.trim()).filter(Boolean),
						});
					}),
			);

		new Setting(containerEl).setName("🛠️ 이 기기의 전사 도구 경로 및 상태").setHeading();
		containerEl.createEl("p", {
			text: "이 설정은 다른 기기로 동기화되지 않고 오직 이 PC에만 안전하게 격리 저장됩니다 (%LOCALAPPDATA%\\on-the-record\\local-settings.json).",
			cls: "setting-item-description",
		});

		if (!localSettings) {
			containerEl.createEl("p", {
				text: this.localSettingsError ?? "PC별 설정을 불러올 수 없습니다.",
				cls: "mod-warning",
			});
			return;
		}

		const runtimeStatus = checkPathExists(localSettings.runtimePath);
		const runtimeSetting = new Setting(containerEl)
			.setName("런타임 실행 파일")
			.setDesc("사용자가 직접 설치한 whisper-cli 실행 파일의 전체 경로입니다.")
			.addText((text) =>
				text
					.setValue(localSettings.runtimePath)
					.setPlaceholder("예: C:\\Tools\\whisper-cli.exe")
					.onChange((value) => {
						void this.updateLocalSettings({ runtimePath: value.trim() });
					}),
			);
		renderStatusBadge(runtimeSetting.nameEl, runtimeStatus, "정상");

		const modelStatus = checkPathExists(localSettings.modelPath);
		const modelPathSetting = new Setting(containerEl)
			.setName("모델 파일")
			.setDesc("사용자가 직접 설치한 GGML 양자화 모델 파일(.bin)의 전체 경로입니다.")
			.addText((text) =>
				text
					.setValue(localSettings.modelPath)
					.setPlaceholder("예: C:\\Models\\ggml-base.bin")
					.onChange((value) => {
						void this.updateLocalSettings({ modelPath: value.trim() });
					}),
			);
		renderStatusBadge(modelPathSetting.nameEl, modelStatus, "준비됨");

		const ffmpegStatus = checkPathExists(localSettings.ffmpegPath);
		const ffmpegSetting = new Setting(containerEl)
			.setName("FFmpeg 실행 파일")
			.setDesc("오디오 16kHz 무손실 정규화에 사용되는 ffmpeg.exe의 전체 경로입니다.")
			.addText((text) =>
				text
					.setValue(localSettings.ffmpegPath)
					.setPlaceholder("예: C:\\Tools\\ffmpeg.exe")
					.onChange((value) => {
						void this.updateLocalSettings({ ffmpegPath: value.trim() });
					}),
			);
		renderStatusBadge(ffmpegSetting.nameEl, ffmpegStatus, "준비됨");

		new Setting(containerEl)
			.setName("설치된 전사 도구 자동 검색")
			.setDesc("사용자 폴더의 whisper.cpp, models, programs 등 알려진 위치만 검색해 기준 SHA-256·버전을 검증합니다.")
			.addButton((button) =>
				button.setButtonText("도구 검색").onClick(() => this.discoverCpuSetup()),
			);

		new Setting(containerEl)
			.setName("도구 무결성 검증 및 시험 전사")
			.setDesc("whisper.cpp 기준선 버전·SHA-256을 확인하고, 오디오를 변환해 시험 전사를 수행합니다.")
			.addButton((button) =>
				button.setButtonText("시험 시작").onClick(() => this.testCpuSetup()),
			);

		new Setting(containerEl).setName("🚀 하드웨어 및 GPU 가속 설정").setHeading();
		containerEl.createEl("p", {
			text: "NVIDIA 외장 그래픽(CUDA) 또는 인텔 내장 그래픽(Vulkan)을 활용하면 CPU 과열과 팬 소음을 완전히 없애고 처리 속도를 최대 3~4배 가속할 수 있습니다.",
			cls: "setting-item-description",
		});

		new Setting(containerEl)
			.setName("하드웨어 가속 백엔드")
			.setDesc("whisper.cpp 추론 가속 엔진을 선택합니다. (외장 그래픽: CUDA, 인텔 내장: Vulkan 권장)")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("auto", "자동 감지 (권장)")
					.addOption("cuda", "NVIDIA CUDA (외장 그래픽)")
					.addOption("vulkan", "Vulkan (Intel Iris Xe / AMD / NVIDIA)")
					.addOption("cpu", "CPU 전용")
					.addOption("openvino", "Intel OpenVINO")
					.setValue(localSettings.gpuBackend ?? "auto")
					.onChange((value) => {
						if (value === "auto" || value === "cpu" || value === "cuda" || value === "vulkan" || value === "openvino") {
							void this.updateLocalSettings({ gpuBackend: value });
						}
					}),
			);

		new Setting(containerEl)
			.setName("GPU 전용 메모리(VRAM) 레이어 적재 수 (-ngl)")
			.setDesc("신경망 모델을 GPU VRAM으로 넘겨 처리합니다 (0: CPU 전용, 99: 모델 전체 적재). 외장 GPU 장착 시 99를 권장합니다.")
			.addText((text) =>
				text
					.setValue(String(localSettings.gpuLayers ?? 0))
					.setPlaceholder("0 (CPU) 또는 99 (GPU 전체 적재)")
					.onChange((value) => {
						const num = parseInt(value.trim(), 10);
						if (!isNaN(num) && num >= 0 && num <= 999) {
							void this.updateLocalSettings({ gpuLayers: num });
						}
					}),
			);

		new Setting(containerEl)
			.setName("사용할 그래픽 카드 번호 (-dev)")
			.setDesc("여러 개의 GPU가 장착된 듀얼 GPU 환경에서 연산에 사용할 GPU 번호입니다 (기본값: 0).")
			.addText((text) =>
				text
					.setValue(String(localSettings.gpuDeviceId ?? 0))
					.setPlaceholder("0")
					.onChange((value) => {
						const num = parseInt(value.trim(), 10);
						if (!isNaN(num) && num >= 0 && num <= 64) {
							void this.updateLocalSettings({ gpuDeviceId: num });
						}
					}),
			);

		new Setting(containerEl).setName("📦 외부 도구 원클릭 자동 셋업").setHeading();
		new Setting(containerEl)
			.setName("자동 셋업 명령어 클립보드 복사")
			.setDesc("PowerShell 터미널에서 실행하여 whisper.cpp, 기본 모델 및 FFmpeg를 한 번에 자동 설치하고 설정을 연결하는 명령어를 복사합니다.")
			.addButton((button) =>
				button.setButtonText("명령어 복사").onClick(async () => {
					const cmd = `powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/sparklings/ontherecord/main/scripts/setup-tools.ps1 | iex"`;
					await navigator.clipboard.writeText(cmd);
					new Notice(
						"On the Record 외부 도구 자동 셋업 명령어가 클립보드에 복사되었습니다.\nPowerShell 터미널을 열고 붙여넣어 실행하세요.",
						7000,
					);
				}),
			);
	}
}
