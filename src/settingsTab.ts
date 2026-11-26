import { Notice, PluginSettingTab, Setting, setIcon } from "obsidian";
import type { App, Plugin } from "obsidian";
import type { LocalSettings, VaultSettings } from "./settings.ts";
import { SUPPORTED_MODELS, getModelMetadata, checkModelFileInstalled, buildModelDownloadCommand } from "./modelCatalog.ts";
import { testLocalLlmConnection } from "./localLlmClient.ts";
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

function renderStatusBadge(container: HTMLElement, status: { exists: boolean; sizeBytes?: number }, label = "정상"): void {
	const isReady = status.exists;
	const badge = container.createSpan({ cls: `otr-status-badge ${isReady ? "is-ready" : "is-missing"}` });

	badge.createSpan({ cls: "otr-status-badge-dot" });

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

function renderScopeHeading(containerEl: HTMLElement, title: string, scope: "vault" | "local"): void {
	const setting = new Setting(containerEl).setName(title).setHeading();
	const badge = setting.nameEl.createSpan({ cls: `otr-scope-badge ${scope === "vault" ? "is-vault" : "is-local"}` });
	const iconSpan = badge.createSpan({ cls: "otr-inline-icon" });
	setIcon(iconSpan, scope === "vault" ? "cloud" : "monitor");
	badge.createSpan({ text: scope === "vault" ? "Vault 동기화" : "이 PC 전용" });
}

function openLocalFilePicker(accept: string, onSelected: (filePath: string) => void): void {
	const input = document.body.createEl("input", { cls: "is-hidden" });
	input.type = "file";
	input.accept = accept;
	input.onchange = () => {
		const file = input.files?.[0];
		const selectedPath: unknown = file ? Reflect.get(file, "path") : undefined;
		if (typeof selectedPath === "string" && selectedPath.trim().length > 0) {
			onSelected(selectedPath);
		} else if (file) {
			new Notice("선택한 파일의 로컬 전체 경로를 읽을 수 없습니다. 경로를 직접 붙여넣어 주세요.");
		}
		input.remove();
	};
	input.click();
}

/* eslint obsidianmd/settings-tab/prefer-setting-definitions: off -- Retain compatibility with minAppVersion 1.7.2. */
export class OnTheRecordSettingTab extends PluginSettingTab {
	private activeTab: "workflow" | "transcription" | "acceleration" = "workflow";

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

		// 1. 설정 도움말 안내 배너
		const helpBanner = containerEl.createDiv({ cls: "otr-help-banner" });
		const bannerText = helpBanner.createDiv({ cls: "otr-help-banner-text" });
		const infoIcon = bannerText.createSpan({ cls: "otr-inline-icon" });
		setIcon(infoIcon, "help-circle");
		bannerText.createSpan({ text: "설정 옵션 상세 설명, 모델 권장 사양 및 GPU 튜닝 가이드" });

		const guideBtn = helpBanner.createEl("button", { text: "가이드 보기", cls: "otr-action-badge-btn" });
		guideBtn.onclick = () => {
			window.open("https://github.com/sparklings/ontherecord/blob/main/docs/SETTINGS_GUIDE.md", "_blank");
		};

		// 2. 상단 탭 세그먼트 네비게이션
		const tabNav = containerEl.createDiv({ cls: "otr-settings-tab-nav" });

		const tabs: Array<{ id: "workflow" | "transcription" | "acceleration"; label: string; icon: string }> = [
			{ id: "workflow", label: "워크플로", icon: "file-text" },
			{ id: "transcription", label: "전사 & 모델", icon: "mic" },
			{ id: "acceleration", label: "가속 & AI", icon: "zap" },
		];

		for (const t of tabs) {
			const btn = tabNav.createEl("button", {
				cls: `otr-tab-btn ${this.activeTab === t.id ? "is-active" : ""}`,
			});
			const iconSpan = btn.createSpan();
			setIcon(iconSpan, t.icon);
			btn.createSpan({ text: t.label });
			btn.onclick = () => {
				this.activeTab = t.id;
				this.display();
			};
		}

		// 3. 탭별 콘텐츠 렌더링
		const vaultSettings = this.getVaultSettings();
		const localSettings = this.getLocalSettings();

		if (this.activeTab === "workflow") {
			this.renderWorkflowTab(containerEl, vaultSettings);
		} else if (this.activeTab === "transcription") {
			this.renderTranscriptionTab(containerEl, vaultSettings, localSettings);
		} else {
			this.renderAccelerationTab(containerEl, vaultSettings, localSettings);
		}
	}

	/**
	 * 탭 1: 회의록 및 녹음 워크플로 설정
	 */
	private renderWorkflowTab(containerEl: HTMLElement, vaultSettings: VaultSettings): void {
		renderScopeHeading(containerEl, "회의록 및 녹음 워크플로", "vault");

		new Setting(containerEl)
			.setName("회의록 작성 시 녹음 시작 방식")
			.setDesc("새 회의록 작성 시 자동으로 음성 녹음을 시작할지 선택합니다.")
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
			.setDesc("녹음이 시작될 때 우측 상단에 팝업 알림을 표시합니다.")
			.addToggle((toggle) =>
				toggle
					.setValue(vaultSettings.recordStartNotification)
					.onChange((value) => {
						void this.updateVaultSettings({ recordStartNotification: value });
					}),
			);

		new Setting(containerEl)
			.setName("회의록 마크다운 노트 보관 폴더")
			.setDesc("이 폴더 하위에 새 마크다운 문서를 생성했을 때만 녹음 시작 규칙을 적용합니다.")
			.addText((text) =>
				text
					.setValue(vaultSettings.autoRecordFolder)
					.setPlaceholder("예: Meetings 또는 회의록")
					.onChange((value) => {
						void this.updateVaultSettings({ autoRecordFolder: value.trim() });
					}),
			);

		new Setting(containerEl)
			.setName("조건부 자동 시작 템플릿 파일")
			.setDesc("지정한 템플릿과 일치하는 문서가 생성되었을 때만 녹음이 자동 시작됩니다.")
			.addText((text) =>
				text
					.setValue(vaultSettings.autoRecordTemplatePath)
					.setPlaceholder("예: Templates/회의록 템플릿.md")
					.onChange((value) => {
						void this.updateVaultSettings({ autoRecordTemplatePath: value.trim() });
					}),
			);

		new Setting(containerEl)
			.setName("녹음 중 문서 탭 닫힘 시 동작")
			.setDesc("녹음 중인 탭이 닫혔을 때 녹음 파일 유실을 방지하는 안전 정책입니다.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("stop-and-attach", "녹음 안전 중지 후 자동 연결 (권장)")
					.addOption("ignore", "녹음 계속 진행 (백그라운드)")
					.setValue(vaultSettings.onTabCloseAction)
					.onChange((value) => {
						if (value === "stop-and-attach" || value === "ignore") {
							void this.updateVaultSettings({ onTabCloseAction: value });
						}
					}),
			);

		new Setting(containerEl)
			.setName("녹음 종료 후 자동 전사 시작")
			.setDesc("녹음이 중지되면 백그라운드 큐로 넘겨 자동으로 텍스트 변환을 개시합니다.")
			.addToggle((toggle) =>
				toggle
					.setValue(vaultSettings.autoTranscribe)
					.onChange((value) => {
						void this.updateVaultSettings({ autoTranscribe: value });
					}),
			);

		new Setting(containerEl)
			.setName("전사 결과 노트 반영 방식")
			.setDesc("전사 완료 시 노트 본문에 반영하는 절차를 지정합니다.")
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
			.setDesc("녹음기가 파일 쓰기를 완전히 마칠 때까지 대기하는 시간입니다 (기본값: 5초).")
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
	}

	/**
	 * 탭 2: 음성 전사 모델 및 런타임 설정
	 */
	private renderTranscriptionTab(containerEl: HTMLElement, vaultSettings: VaultSettings, localSettings: LocalSettings | null): void {
		// Runtime readiness 3단계 체크리스트 배너
		const readinessBanner = containerEl.createDiv({ cls: "otr-readiness-banner" });
		const readinessLeft = readinessBanner.createDiv({ cls: "otr-readiness-items" });
		readinessLeft.createSpan({ text: "도구 준비 상태", cls: "otr-readiness-title" });

		const tools: Array<{ label: string; ok: boolean }> = [
			{ label: "FFmpeg", ok: checkPathExists(localSettings?.ffmpegPath ?? "").exists },
			{ label: "whisper-cli", ok: checkPathExists(localSettings?.runtimePath ?? "").exists },
			{ label: "Model", ok: checkPathExists(localSettings?.modelPath ?? "").exists },
		];
		for (const item of tools) {
			const pill = readinessLeft.createSpan({ cls: `otr-readiness-pill ${item.ok ? "is-ready" : "is-missing"}` });
			const icon = pill.createSpan({ cls: "otr-inline-icon" });
			setIcon(icon, item.ok ? "check" : "alert-circle");
			pill.createSpan({ text: item.label });
		}

		const setupBtn = readinessBanner.createEl("button", { text: "1-클릭 셋업", cls: "otr-action-badge-btn" });
		setupBtn.onclick = async () => {
			const cmd = `powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/sparklings/ontherecord/main/scripts/setup-tools.ps1 | iex"`;
			await navigator.clipboard.writeText(cmd);
			new Notice("통합 자동 셋업 명령어가 클립보드에 복사되었습니다.\nPowerShell 터미널에 붙여넣어 실행하세요.", 5000);
		};

		renderScopeHeading(containerEl, "음성인식 모델 선택", "vault");

		new Setting(containerEl)
			.setName("기본 전사 언어")
			.setDesc("한국어 회의의 경우 '한국어'로 고정하면 잡음 구간에서의 외국어 환각을 차단합니다.")
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

		// 2열 정밀 모델 셀렉터 그리드
		const modelGrid = containerEl.createDiv({ cls: "otr-model-grid" });
		const selectedModelId = vaultSettings.defaultModelSize || "medium";

		const detailContainer = containerEl.createDiv({ cls: "otr-model-detail-wrap" });

		const renderDetailBox = (modelId: string) => {
			detailContainer.empty();
			const meta = getModelMetadata(modelId);
			const installStatus = checkModelFileInstalled(modelId, localSettings?.modelPath);

			const box = detailContainer.createDiv({ cls: "otr-model-detail-box" });
			const top = box.createDiv({ cls: "otr-model-detail-top" });
			top.createSpan({ text: `${meta.label} 상세 정보`, cls: "otr-model-detail-title" });

			const badge = top.createSpan({
				cls: `otr-status-badge ${installStatus.installed ? "is-ready" : "is-missing"}`,
			});
			badge.createSpan({ cls: "otr-status-badge-dot" });
			badge.createSpan({ text: installStatus.installed ? "설치됨" : "미설치" });

			box.createDiv({ text: meta.description, cls: "otr-model-detail-desc" });
			box.createDiv({
				text: `양자화: ${meta.quantization} · 파일 크기: ${meta.sizeMb} MB${meta.recommended ? " · 공식 권장 모델" : ""}`,
				cls: "otr-model-detail-meta",
			});

			if (!installStatus.installed) {
				const cmd = buildModelDownloadCommand(modelId);
				const codeRow = box.createDiv({ cls: "otr-code-copy-row" });
				codeRow.createSpan({ text: cmd, cls: "otr-code-copy-text" });
				const copyBtn = codeRow.createEl("button", { text: "명령어 복사", cls: "otr-action-badge-btn" });
				copyBtn.onclick = async () => {
					await navigator.clipboard.writeText(cmd);
					new Notice(`[${meta.label}] 다운로드 명령어가 복사되었습니다.\nPowerShell 터미널에 붙여넣어 실행하세요.`);
				};
			} else if (localSettings && localSettings.modelPath !== installStatus.resolvedPath) {
				const applyBtn = box.createEl("button", { text: "현재 전사 모델로 경로 즉시 적용", cls: "mod-cta otr-action-badge-btn" });
				applyBtn.onclick = async () => {
					await this.updateLocalSettings({ modelPath: installStatus.resolvedPath });
					new Notice(`[${meta.label}] 모델 경로가 적용되었습니다.`);
					this.display();
				};
			}
		};

		for (const m of SUPPORTED_MODELS) {
			const isSelected = m.id === selectedModelId;
			const installStatus = checkModelFileInstalled(m.id, localSettings?.modelPath);

			const card = modelGrid.createDiv({
				cls: `otr-model-card ${isSelected ? "is-selected" : ""}`,
			});

			const header = card.createDiv({ cls: "otr-model-card-header" });
			header.createSpan({ text: m.label, cls: "otr-model-card-title" });

			const badge = header.createSpan({
				cls: `otr-status-badge ${installStatus.installed ? "is-ready" : "is-missing"}`,
			});
			badge.createSpan({ text: installStatus.installed ? "준비됨" : "미설치" });

			card.createDiv({ text: `${m.sizeMb} MB · ${m.quantization}`, cls: "otr-model-card-meta" });
			card.createDiv({ text: m.recommended ? "공식 권장 표준 모델" : m.description, cls: "otr-model-card-desc" });

			card.onclick = () => {
				void this.updateVaultSettings({ defaultModelSize: m.id });
				this.display();
			};
		}

		renderDetailBox(selectedModelId);

		new Setting(containerEl)
			.setName("맞춤형 어휘 힌트 (--prompt)")
			.setDesc("한영 혼용 IT 전문용어나 고유명사를 쉼표로 구분해 입력하면 오인식을 줄일 수 있습니다.")
			.addText((text) =>
				text
					.setValue(vaultSettings.vocabularyPrompt ?? "")
					.setPlaceholder("API, Obsidian, Whisper, Docker, TypeScript")
					.onChange((value) => {
						void this.updateVaultSettings({ vocabularyPrompt: value.trim() });
					}),
			);

		renderScopeHeading(containerEl, "기기 전사 도구 경로", "local");

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
			.setDesc("whisper-cli.exe 경로입니다.")
			.addText((text) =>
				text
					.setValue(localSettings.runtimePath)
					.setPlaceholder("예: C:\\Tools\\whisper-cli.exe")
					.onChange((value) => {
						void this.updateLocalSettings({ runtimePath: value.trim() });
					}),
			)
			.addButton((button) =>
				button.setButtonText("찾아보기").onClick(() => {
					openLocalFilePicker(".exe", (selectedPath) => {
						void this.updateLocalSettings({ runtimePath: selectedPath }).then(() => this.display());
					});
				}),
			);
		renderStatusBadge(runtimeSetting.nameEl, runtimeStatus, "정상");

		const modelStatus = checkPathExists(localSettings.modelPath);
		const modelPathSetting = new Setting(containerEl)
			.setName("모델 파일")
			.setDesc("GGML 모델 파일(.bin) 경로입니다.")
			.addText((text) =>
				text
					.setValue(localSettings.modelPath)
					.setPlaceholder("예: C:\\Models\\ggml-medium-q5_0.bin")
					.onChange((value) => {
						void this.updateLocalSettings({ modelPath: value.trim() });
					}),
			)
			.addButton((button) =>
				button.setButtonText("찾아보기").onClick(() => {
					openLocalFilePicker(".bin,.gguf", (selectedPath) => {
						void this.updateLocalSettings({ modelPath: selectedPath }).then(() => this.display());
					});
				}),
			);
		renderStatusBadge(modelPathSetting.nameEl, modelStatus, "준비됨");

		const ffmpegStatus = checkPathExists(localSettings.ffmpegPath);
		const ffmpegSetting = new Setting(containerEl)
			.setName("FFmpeg 실행 파일")
			.setDesc("오디오 정규화용 ffmpeg.exe 경로입니다.")
			.addText((text) =>
				text
					.setValue(localSettings.ffmpegPath)
					.setPlaceholder("예: C:\\Tools\\ffmpeg.exe")
					.onChange((value) => {
						void this.updateLocalSettings({ ffmpegPath: value.trim() });
					}),
			)
			.addButton((button) =>
				button.setButtonText("찾아보기").onClick(() => {
					openLocalFilePicker(".exe", (selectedPath) => {
						void this.updateLocalSettings({ ffmpegPath: selectedPath }).then(() => this.display());
					});
				}),
			);
		renderStatusBadge(ffmpegSetting.nameEl, ffmpegStatus, "준비됨");

		new Setting(containerEl)
			.setName("도구 진단 및 시험")
			.setDesc("알려진 위치에서 도구를 검색하거나 변환 및 시험 전사를 수행합니다.")
			.addButton((button) =>
				button.setButtonText("도구 검색").onClick(() => this.discoverCpuSetup()),
			)
			.addButton((button) =>
				button.setButtonText("시험 시작").onClick(() => this.testCpuSetup()),
			);

		new Setting(containerEl)
			.setName("1-클릭 통합 자동 셋업")
			.setDesc("터미널에서 런타임, 기본 모델, FFmpeg를 원클릭 설치하는 명령어를 복사합니다.")
			.addButton((button) =>
				button.setButtonText("명령어 복사").onClick(async () => {
					const cmd = `powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/sparklings/ontherecord/main/scripts/setup-tools.ps1 | iex"`;
					await navigator.clipboard.writeText(cmd);
					new Notice("통합 자동 셋업 명령어가 클립보드에 복사되었습니다.", 5000);
				}),
			);
	}

	/**
	 * 탭 3: 하드웨어 가속 및 로컬 AI 요약 설정
	 */
	private renderAccelerationTab(containerEl: HTMLElement, vaultSettings: VaultSettings, localSettings: LocalSettings | null): void {
		renderScopeHeading(containerEl, "하드웨어 가속 (GPU 오프로딩)", "local");

		if (localSettings) {
			new Setting(containerEl)
				.setName("하드웨어 가속 백엔드")
				.setDesc("가속 엔진을 선택합니다. (외장 GPU: CUDA, 인텔 내장: Vulkan 권장)")
				.addDropdown((dropdown) =>
					dropdown
						.addOption("auto", "자동 감지 (권장)")
						.addOption("cuda", "NVIDIA CUDA (외장)")
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
				.setName("GPU VRAM 레이어 적재 수 (-ngl)")
				.setDesc("GPU VRAM으로 오프로드할 신경망 레이어 수입니다 (0: CPU, 99: GPU 전체 적재).")
				.addText((text) =>
					text
						.setValue(String(localSettings.gpuLayers ?? 0))
						.setPlaceholder("0 또는 99")
						.onChange((value) => {
							const num = parseInt(value.trim(), 10);
							if (!isNaN(num) && num >= 0 && num <= 999) {
								void this.updateLocalSettings({ gpuLayers: num });
							}
						}),
				);

			new Setting(containerEl)
				.setName("그래픽 카드 번호 (-dev)")
				.setDesc("연산에 사용할 GPU 장치 번호입니다 (기본값: 0).")
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
		}

		renderScopeHeading(containerEl, "로컬 AI 회의록 요약", "vault");

		new Setting(containerEl)
			.setName("로컬 AI 요약 사용")
			.setDesc("전사 완료 후 또는 버튼 클릭 시 로컬 LLM(Ollama / LM Studio 호환)으로 3단 회의록 요약을 생성합니다.")
			.addToggle((toggle) =>
				toggle
					.setValue(vaultSettings.enableLocalLlm)
					.onChange((value) => {
						void this.updateVaultSettings({ enableLocalLlm: value });
					}),
			);

		new Setting(containerEl)
			.setName("로컬 엔드포인트 URL")
			.setDesc("100% 프라이버시 보호를 위해 오직 localhost 및 127.0.0.1만 허용됩니다 (Ollama/OpenAI 호환 자동 감지).")
			.addText((text) =>
				text
					.setValue(vaultSettings.localLlmEndpoint)
					.setPlaceholder("http://127.0.0.1:11434")
					.onChange((value) => {
						void this.updateVaultSettings({ localLlmEndpoint: value.trim() });
					}),
			)
			.addButton((button) =>
				button.setButtonText("연결 테스트").onClick(async () => {
					button.setDisabled(true);
					new Notice("연결 확인 중...");
					const res = await testLocalLlmConnection(vaultSettings.localLlmEndpoint);
					button.setDisabled(false);
					if (res.ok) {
						new Notice(`연결 성공 (${res.serverType}, 감지된 모델 ${res.models.length}개)`);
					} else {
						new Notice(`연결 실패: ${res.error ?? "알 수 없는 오류"}`, 6000);
					}
				}),
			);

		new Setting(containerEl)
			.setName("요약 모델 이름")
			.setDesc("PC에 설치된 로컬 LLM 모델명을 입력하세요. (예: qwen2.5:7b, llama3.1:8b)")
			.addText((text) =>
				text
					.setValue(vaultSettings.localLlmModel)
					.setPlaceholder("qwen2.5:7b")
					.onChange((value) => {
						void this.updateVaultSettings({ localLlmModel: value.trim() });
					}),
			);

		new Setting(containerEl)
			.setName("전사 완료 시 자동 요약 생성")
			.setDesc("전사가 완료되어 노트에 삽입된 후 자동으로 요약 블록을 추가합니다.")
			.addToggle((toggle) =>
				toggle
					.setValue(vaultSettings.localLlmAutoSummarize)
					.onChange((value) => {
						void this.updateVaultSettings({ localLlmAutoSummarize: value });
					}),
			);
	}
}
