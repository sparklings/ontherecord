import { Notice, PluginSettingTab, Setting, setIcon } from "obsidian";
import type { App, Plugin } from "obsidian";
import type { LocalSettings, VaultSettings } from "./settings.ts";
import { SUPPORTED_MODELS, checkModelFileInstalled, buildModelDownloadCommand } from "./modelCatalog.ts";
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
	private activeTab: "workflow" | "transcription" | "acceleration" = "transcription";

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
		containerEl.addClass("otr-settings-container");

		// 1. Stitch 스타일 상단 헤더 + 가이드 버튼
		const heroEl = containerEl.createDiv({ cls: "otr-settings-hero" });
		const heroLeft = heroEl.createDiv({ cls: "otr-settings-hero-left" });
		const heroIcon = heroLeft.createSpan({ cls: "otr-brand-icon-box" });
		setIcon(heroIcon, "otr-record-deck");
		const heroText = heroLeft.createDiv();
		const titleRow = heroText.createDiv();
		titleRow.createSpan({ text: "On the Record", cls: "otr-model-detail-title" });
		titleRow.createSpan({ text: "v0.1.0", cls: "otr-settings-version-pill" });
		heroText.createDiv({
			text: "Obsidian 로컬 음성 녹음 및 whisper.cpp 회의록 전사",
			cls: "otr-settings-hero-desc",
		});

		const guideBtn = heroEl.createEl("button", { text: "가이드 보기", cls: "otr-guide-ghost-btn" });
		guideBtn.onclick = () => {
			window.open("https://github.com/sparklings/ontherecord/wiki", "_blank");
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

		// 4. Stitch 스타일 하단 상태 푸터 바
		const footerEl = containerEl.createDiv({ cls: "otr-settings-footer" });
		const allReady =
			checkPathExists(localSettings?.ffmpegPath ?? "").exists &&
			checkPathExists(localSettings?.runtimePath ?? "").exists &&
			checkPathExists(localSettings?.modelPath ?? "").exists;
		const statusGroup = footerEl.createDiv({ cls: "otr-settings-footer-status" });
		statusGroup.createSpan({ cls: `otr-status-badge-dot ${allReady ? "is-ready" : "is-warning"}` });
		statusGroup.createSpan({
			text: allReady
				? "오프라인 엔진 상태: 정상 준비됨 (FFmpeg · whisper-cli · Model)"
				: "오프라인 엔진 상태: 도구 경로 설정 필요",
		});

		const wikiLink = footerEl.createEl("button", { text: "문서 (Wiki)", cls: "otr-link-btn" });
		wikiLink.onclick = () => {
			window.open("https://github.com/sparklings/ontherecord/wiki", "_blank");
		};
	}

	/**
	 * 탭 1: 회의록 및 녹음 워크플로 설정 (Stitch stitch-workflow-tab.html 1:1 이식)
	 */
	private renderWorkflowTab(containerEl: HTMLElement, vaultSettings: VaultSettings): void {
		renderScopeHeading(containerEl, "회의록 및 녹음 워크플로", "vault");

		const stack = containerEl.createDiv({ cls: "otr-settings-card-stack" });

		// Card 1: 녹음 시작 방식
		const card1 = stack.createDiv({ cls: "otr-setting-card" });
		const info1 = card1.createDiv({ cls: "otr-setting-card-info" });
		info1.createDiv({ text: "회의록 작성 시 녹음 시작 방식", cls: "otr-setting-card-title" });
		info1.createDiv({ text: "새 회의록 작성 시 자동으로 음성 녹음을 시작할지 선택합니다.", cls: "otr-setting-card-desc" });
		const select1 = card1.createEl("select", { cls: "otr-setting-select" });
		const optAuto1 = select1.createEl("option", { text: "새 회의록 작성 시 자동 시작 (권장)", value: "auto" });
		const optManual1 = select1.createEl("option", { text: "단축키 또는 버튼으로 수동 시작", value: "manual" });
		if (vaultSettings.recordStartMode === "manual") optManual1.selected = true;
		else optAuto1.selected = true;
		select1.onchange = () => {
			const val = select1.value;
			if (val === "auto" || val === "manual") {
				void this.updateVaultSettings({ recordStartMode: val });
			}
		};

		// Card 2: 알림 토글
		const card2 = stack.createDiv({ cls: "otr-setting-card" });
		const info2 = card2.createDiv({ cls: "otr-setting-card-info" });
		info2.createDiv({ text: "녹음 시작 안내 알림 표시", cls: "otr-setting-card-title" });
		info2.createDiv({ text: "녹음이 시작될 때 우측 상단에 팝업 알림을 표시합니다.", cls: "otr-setting-card-desc" });
		const toggleLabel2 = card2.createEl("label", { cls: "otr-custom-toggle" });
		const toggleInput2 = toggleLabel2.createEl("input", { type: "checkbox" });
		toggleInput2.checked = vaultSettings.recordStartNotification;
		toggleLabel2.createDiv({ cls: "otr-toggle-slider" });
		toggleInput2.onchange = () => {
			void this.updateVaultSettings({ recordStartNotification: toggleInput2.checked });
		};

		// Card 3: 마크다운 보관 폴더
		const card3 = stack.createDiv({ cls: "otr-setting-card" });
		const info3 = card3.createDiv({ cls: "otr-setting-card-info" });
		info3.createDiv({ text: "회의록 마크다운 노트 보관 폴더", cls: "otr-setting-card-title" });
		info3.createDiv({ text: "이 폴더 하위에 새 마크다운 문서를 생성했을 때만 녹음 시작 규칙을 적용합니다.", cls: "otr-setting-card-desc" });
		const input3 = card3.createEl("input", {
			type: "text",
			cls: "otr-setting-input font-mono-tabular",
			value: vaultSettings.autoRecordFolder,
			placeholder: "예: Meetings 또는 회의록",
		});
		input3.onchange = () => {
			void this.updateVaultSettings({ autoRecordFolder: input3.value.trim() });
		};

		// Card 4: 조건부 템플릿 파일
		const card4 = stack.createDiv({ cls: "otr-setting-card" });
		const info4 = card4.createDiv({ cls: "otr-setting-card-info" });
		info4.createDiv({ text: "조건부 자동 시작 템플릿 파일", cls: "otr-setting-card-title" });
		info4.createDiv({ text: "지정한 템플릿과 일치하는 문서가 생성되었을 때만 녹음이 자동 시작됩니다.", cls: "otr-setting-card-desc" });
		const input4 = card4.createEl("input", {
			type: "text",
			cls: "otr-setting-input font-mono-tabular",
			value: vaultSettings.autoRecordTemplatePath,
			placeholder: "예: Templates/회의록 템플릿.md",
		});
		input4.onchange = () => {
			void this.updateVaultSettings({ autoRecordTemplatePath: input4.value.trim() });
		};

		// Card 5: 탭 닫힘 동작
		const card5 = stack.createDiv({ cls: "otr-setting-card" });
		const info5 = card5.createDiv({ cls: "otr-setting-card-info" });
		info5.createDiv({ text: "녹음 중 문서 탭 닫힘 시 동작", cls: "otr-setting-card-title" });
		info5.createDiv({ text: "녹음 중인 탭이 닫혔을 때 녹음 파일 유실을 방지하는 안전 정책입니다.", cls: "otr-setting-card-desc" });
		const select5 = card5.createEl("select", { cls: "otr-setting-select" });
		const optStop5 = select5.createEl("option", { text: "녹음 안전 중지 후 자동 연결 (권장)", value: "stop-and-attach" });
		const optIgnore5 = select5.createEl("option", { text: "녹음 계속 진행 (백그라운드)", value: "ignore" });
		if (vaultSettings.onTabCloseAction === "ignore") optIgnore5.selected = true;
		else optStop5.selected = true;
		select5.onchange = () => {
			const val = select5.value;
			if (val === "stop-and-attach" || val === "ignore") {
				void this.updateVaultSettings({ onTabCloseAction: val });
			}
		};

		// Card 6: 자동 전사 시작
		const card6 = stack.createDiv({ cls: "otr-setting-card" });
		const info6 = card6.createDiv({ cls: "otr-setting-card-info" });
		info6.createDiv({ text: "녹음 종료 후 자동 전사 시작", cls: "otr-setting-card-title" });
		info6.createDiv({ text: "녹음이 중지되면 백그라운드 큐로 넘겨 자동으로 텍스트 변환을 개시합니다.", cls: "otr-setting-card-desc" });
		const toggleLabel6 = card6.createEl("label", { cls: "otr-custom-toggle" });
		const toggleInput6 = toggleLabel6.createEl("input", { type: "checkbox" });
		toggleInput6.checked = vaultSettings.autoTranscribe;
		toggleLabel6.createDiv({ cls: "otr-toggle-slider" });
		toggleInput6.onchange = () => {
			void this.updateVaultSettings({ autoTranscribe: toggleInput6.checked });
		};

		// Card 7: 전사 결과 노트 반영 방식
		const card7 = stack.createDiv({ cls: "otr-setting-card" });
		const info7 = card7.createDiv({ cls: "otr-setting-card-info" });
		info7.createDiv({ text: "전사 결과 노트 반영 방식", cls: "otr-setting-card-title" });
		info7.createDiv({ text: "전사 완료 시 노트 본문에 반영하는 절차를 지정합니다.", cls: "otr-setting-card-desc" });
		const select7 = card7.createEl("select", { cls: "otr-setting-select" });
		const optAuto7 = select7.createEl("option", { text: "오디오 임베드 아래 자동 삽입 (권장)", value: "auto" });
		const optReview7 = select7.createEl("option", { text: "미리보기 모달로 검토 후 승인 삽입", value: "review" });
		if (vaultSettings.transcriptionInsertMode === "review") optReview7.selected = true;
		else optAuto7.selected = true;
		select7.onchange = () => {
			void this.updateVaultSettings({ transcriptionInsertMode: select7.value as "auto" | "review" });
		};

		// Card 8: 오디오 저장 안정화 대기 시간
		const card8 = stack.createDiv({ cls: "otr-setting-card" });
		const info8 = card8.createDiv({ cls: "otr-setting-card-info" });
		info8.createDiv({ text: "오디오 저장 완료 대기 시간 (초)", cls: "otr-setting-card-title" });
		info8.createDiv({ text: "녹음기가 파일 쓰기를 완전히 마칠 때까지 대기하는 시간입니다 (기본값: 5초).", cls: "otr-setting-card-desc" });
		const input8 = card8.createEl("input", {
			type: "number",
			cls: "otr-setting-input font-mono-tabular otr-input-narrow",
			value: String(vaultSettings.stabilizationSeconds),
		});
		input8.min = "1";
		input8.max = "60";
		input8.onchange = () => {
			const seconds = Number(input8.value);
			if (Number.isInteger(seconds) && seconds >= 1 && seconds <= 60) {
				void this.updateVaultSettings({ stabilizationSeconds: seconds });
			}
		};
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

		const guideLinkBtn = readinessBanner.createEl("button", { text: "설치 가이드", cls: "otr-action-badge-btn" });
		guideLinkBtn.onclick = () => {
			window.open("https://github.com/sparklings/ontherecord/wiki/Installation-and-Setup", "_blank");
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

		// 2열 정밀 모델 셀렉터 그리드 (Stitch 2x2 + Large-v3 풀폭)
		const modelGrid = containerEl.createDiv({ cls: "otr-model-grid" });
		const selectedModelId = vaultSettings.defaultModelSize || "medium";

		for (const m of SUPPORTED_MODELS) {
			const isSelected = m.id === selectedModelId;
			const installStatus = checkModelFileInstalled(m.id, localSettings?.modelPath);
			const isFullWidth = m.id === "large-v3";
			const shortTitle = m.label.split(" (")[0];

			const card = modelGrid.createDiv({
				cls: `otr-model-card ${isSelected ? "is-selected" : ""} ${isFullWidth ? "is-full-width" : ""}`,
			});

			const header = card.createDiv({ cls: "otr-model-card-header" });
			const titleWrap = header.createDiv({ cls: "otr-model-card-title-wrap" });
			titleWrap.createSpan({ text: shortTitle, cls: "otr-model-card-title" });
			if (m.recommended) {
				titleWrap.createSpan({ text: "권장", cls: "otr-model-rec-pill" });
			}

			const badge = header.createSpan({
				cls: `otr-status-badge ${installStatus.installed ? "is-ready" : "is-missing"}`,
			});
			badge.createSpan({ text: installStatus.installed ? "설치됨" : "미설치" });

			card.createDiv({ text: m.description, cls: "otr-model-card-desc" });

			const footer = card.createDiv({ cls: "otr-model-card-footer" });
			footer.createSpan({ text: `${m.sizeMb.toLocaleString()} MB`, cls: "otr-model-card-meta font-mono-tabular" });

			const footerRight = footer.createDiv({ cls: "otr-model-card-footer-right" });
			if (!installStatus.installed) {
				const copyBtn = footerRight.createEl("button", {
					text: "다운로드 명령 복사",
					cls: "otr-model-dl-btn",
					title: `${shortTitle} (${m.filename}) PowerShell 다운로드 명령 복사`,
				});
				copyBtn.onclick = async (e) => {
					e.stopPropagation();
					const cmd = buildModelDownloadCommand(m.id);
					await navigator.clipboard.writeText(cmd);
					new Notice(`[${shortTitle}] 다운로드 명령어가 복사되었습니다.\nPowerShell 터미널에 붙여넣어 실행하세요.`);
				};
			} else if (localSettings && localSettings.modelPath !== installStatus.resolvedPath) {
				const applyBtn = footerRight.createEl("button", {
					text: "경로 적용",
					cls: "otr-action-badge-btn",
				});
				applyBtn.onclick = async (e) => {
					e.stopPropagation();
					await this.updateLocalSettings({ modelPath: installStatus.resolvedPath });
					new Notice(`[${shortTitle}] 모델 경로가 적용되었습니다.`);
					this.display();
				};
			}
			footerRight.createSpan({ text: m.quantization, cls: "otr-model-quant-pill font-mono-tabular" });

			card.onclick = () => {
				void this.updateVaultSettings({ defaultModelSize: m.id });
				this.display();
			};
		}

		// Stitch 스타일 풀폭 맞춤형 어휘 힌트 카드
		const vocabCard = containerEl.createDiv({ cls: "otr-vocab-card" });
		const vocabTop = vocabCard.createDiv({ cls: "otr-vocab-top" });
		const vocabInfo = vocabTop.createDiv();
		vocabInfo.createDiv({ text: "맞춤형 어휘 힌트", cls: "otr-vocab-title" });
		vocabInfo.createDiv({
			text: "한영 혼용 IT 전문용어나 고유명사를 쉼표로 구분해 입력하면 오인식을 줄일 수 있습니다.",
			cls: "otr-vocab-desc",
		});
		vocabTop.createSpan({ text: "--prompt", cls: "otr-model-rec-pill font-mono-tabular" });

		const vocabInput = vocabCard.createEl("input", {
			type: "text",
			cls: "otr-vocab-input font-mono-tabular",
		});
		vocabInput.value = vaultSettings.vocabularyPrompt ?? "";
		vocabInput.placeholder = "API, Obsidian, Whisper, Docker, TypeScript, Markdown";
		vocabInput.oninput = () => {
			void this.updateVaultSettings({ vocabularyPrompt: vocabInput.value.trim() });
		};

		renderScopeHeading(containerEl, "기기 전사 도구 경로", "local");

		if (!localSettings) {
			containerEl.createEl("p", {
				text: this.localSettingsError ?? "PC별 설정을 불러올 수 없습니다.",
				cls: "mod-warning",
			});
			return;
		}

		// Stitch 도구 카드 3종 컨테이너 (Stitch lines 343-406)
		const toolsStack = containerEl.createDiv({ cls: "otr-tools-stack" });

		const renderToolCard = (options: {
			title: string;
			versionHint: string;
			filePath: string;
			accept: string;
			placeholder: string;
			onSave: (path: string) => Promise<void>;
		}) => {
			const status = checkPathExists(options.filePath);
			const card = toolsStack.createDiv({ cls: "otr-tool-card" });

			const topRow = card.createDiv({ cls: "otr-tool-card-top" });
			const leftGroup = topRow.createDiv({ cls: "otr-tool-card-left" });
			leftGroup.createSpan({ text: options.title, cls: "otr-tool-card-title" });

			const pill = leftGroup.createSpan({
				cls: `otr-status-badge ${status.exists ? "is-ready" : "is-missing"}`,
			});
			pill.createSpan({ cls: "otr-status-badge-dot" });
			pill.createSpan({ text: status.exists ? "Ready" : "Missing" });

			topRow.createSpan({ text: options.versionHint, cls: "otr-tool-card-hint font-mono-tabular" });

			const inputRow = card.createDiv({ cls: "otr-tool-card-input-row" });
			const inputEl = inputRow.createEl("input", {
				type: "text",
				cls: "otr-tool-card-input font-mono-tabular",
			});
			inputEl.value = options.filePath;
			inputEl.placeholder = options.placeholder;
			inputEl.onchange = () => {
				void options.onSave(inputEl.value.trim());
			};

			const browseBtn = inputRow.createEl("button", {
				text: "Browse...",
				cls: "otr-tool-browse-btn",
			});
			browseBtn.onclick = () => {
				openLocalFilePicker(options.accept, (selectedPath) => {
					void options.onSave(selectedPath).then(() => this.display());
				});
			};
		};

		// 1. Whisper runtime executable
		renderToolCard({
			title: "Whisper runtime executable",
			versionHint: "whisper.cpp v1.5.4+",
			filePath: localSettings.runtimePath,
			accept: ".exe",
			placeholder: "예: C:\\Tools\\whisper-cli.exe",
			onSave: (val) => this.updateLocalSettings({ runtimePath: val }),
		});

		// 2. GGML model file
		renderToolCard({
			title: "GGML model file",
			versionHint: "ggml-medium-q5_0.bin",
			filePath: localSettings.modelPath,
			accept: ".bin,.gguf",
			placeholder: "예: C:\\Models\\ggml-medium-q5_0.bin",
			onSave: (val) => this.updateLocalSettings({ modelPath: val }),
		});

		// 3. FFmpeg executable
		renderToolCard({
			title: "FFmpeg executable",
			versionHint: "ffmpeg 6.0+",
			filePath: localSettings.ffmpegPath,
			accept: ".exe",
			placeholder: "예: C:\\Tools\\ffmpeg.exe",
			onSave: (val) => this.updateLocalSettings({ ffmpegPath: val }),
		});

		// Stitch 도구 하단 액션 바 (Stitch lines 408-428)
		const actionRow = containerEl.createDiv({ cls: "otr-tool-actions-row" });
		actionRow.createSpan({
			text: "경로는 Obsidian 시작 시 자동으로 유효성을 검사합니다.",
			cls: "otr-tool-actions-desc",
		});

		const actionBtnGroup = actionRow.createDiv({ cls: "otr-tool-actions-group" });

		const discoverBtn = actionBtnGroup.createEl("button", {
			cls: "otr-tool-action-btn",
			text: "도구 자동 검색",
		});
		const searchIcon = discoverBtn.createSpan({ cls: "otr-inline-icon" });
		setIcon(searchIcon, "search");
		discoverBtn.prepend(searchIcon);
		discoverBtn.onclick = () => this.discoverCpuSetup();

		const testBtn = actionBtnGroup.createEl("button", {
			cls: "otr-tool-action-btn mod-primary",
			text: "시험 전사 실행",
		});
		const playIcon = testBtn.createSpan({ cls: "otr-inline-icon" });
		setIcon(playIcon, "play");
		testBtn.prepend(playIcon);
		testBtn.onclick = () => this.testCpuSetup();
	}

	/**
	 * 탭 3: 하드웨어 가속 및 로컬 AI 요약 설정 (Stitch stitch-acceleration-tab.html 1:1 이식)
	 */
	private renderAccelerationTab(containerEl: HTMLElement, vaultSettings: VaultSettings, localSettings: LocalSettings | null): void {
		renderScopeHeading(containerEl, "하드웨어 가속 (GPU 오프로딩)", "local");

		const gpuStack = containerEl.createDiv({ cls: "otr-settings-card-stack" });

		if (localSettings) {
			// Card 1: GPU Backend
			const cardGpu = gpuStack.createDiv({ cls: "otr-setting-card" });
			const infoGpu = cardGpu.createDiv({ cls: "otr-setting-card-info" });
			infoGpu.createDiv({ text: "하드웨어 가속 백엔드", cls: "otr-setting-card-title" });
			infoGpu.createDiv({ text: "가속 엔진을 선택합니다. (외장 GPU: CUDA, 인텔 내장: Vulkan 권장)", cls: "otr-setting-card-desc" });
			const selectGpu = cardGpu.createEl("select", { cls: "otr-setting-select" });
			const backends: Array<{ id: string; label: string }> = [
				{ id: "auto", label: "자동 감지 (권장)" },
				{ id: "cuda", label: "NVIDIA CUDA (외장)" },
				{ id: "vulkan", label: "Vulkan (Intel Iris Xe / AMD / NVIDIA)" },
				{ id: "cpu", label: "CPU 전용" },
				{ id: "openvino", label: "Intel OpenVINO" },
			];
			for (const b of backends) {
				const opt = selectGpu.createEl("option", { text: b.label, value: b.id });
				if ((localSettings.gpuBackend ?? "auto") === b.id) opt.selected = true;
			}
			selectGpu.onchange = () => {
				const val = selectGpu.value;
				if (val === "auto" || val === "cpu" || val === "cuda" || val === "vulkan" || val === "openvino") {
					void this.updateLocalSettings({ gpuBackend: val });
				}
			};

			// Card 2: 2-Col Grid (GPU Layers + Device ID)
			const gridGpu = gpuStack.createDiv({ cls: "otr-setting-2col-grid" });

			const colLayers = gridGpu.createDiv({ cls: "otr-setting-col-box" });
			colLayers.createDiv({ text: "GPU VRAM 레이어 적재 수 (-ngl)", cls: "otr-setting-card-title" });
			colLayers.createDiv({ text: "0: CPU 전용, 99: GPU VRAM 전체 적재", cls: "otr-setting-card-desc" });
			const inputLayers = colLayers.createEl("input", {
				type: "number",
				cls: "otr-setting-input font-mono-tabular",
				value: String(localSettings.gpuLayers ?? 0),
			});
			inputLayers.min = "0";
			inputLayers.max = "999";
			inputLayers.onchange = () => {
				const num = parseInt(inputLayers.value.trim(), 10);
				if (!isNaN(num) && num >= 0 && num <= 999) {
					void this.updateLocalSettings({ gpuLayers: num });
				}
			};

			const colDev = gridGpu.createDiv({ cls: "otr-setting-col-box" });
			colDev.createDiv({ text: "그래픽 카드 번호 (-dev)", cls: "otr-setting-card-title" });
			colDev.createDiv({ text: "연산에 사용할 GPU 장치 번호 (기본값: 0)", cls: "otr-setting-card-desc" });
			const inputDev = colDev.createEl("input", {
				type: "number",
				cls: "otr-setting-input font-mono-tabular",
				value: String(localSettings.gpuDeviceId ?? 0),
			});
			inputDev.min = "0";
			inputDev.max = "64";
			inputDev.onchange = () => {
				const num = parseInt(inputDev.value.trim(), 10);
				if (!isNaN(num) && num >= 0 && num <= 64) {
					void this.updateLocalSettings({ gpuDeviceId: num });
				}
			};
		}

		renderScopeHeading(containerEl, "로컬 AI 회의록 요약", "vault");

		const aiStack = containerEl.createDiv({ cls: "otr-settings-card-stack" });

		// Card 3: 로컬 AI 요약 토글
		const cardAiToggle = aiStack.createDiv({ cls: "otr-setting-card" });
		const infoAiToggle = cardAiToggle.createDiv({ cls: "otr-setting-card-info" });
		infoAiToggle.createDiv({ text: "로컬 AI 요약 사용", cls: "otr-setting-card-title" });
		infoAiToggle.createDiv({ text: "전사 완료 후 또는 버튼 클릭 시 로컬 LLM으로 3단 회의록 요약을 생성합니다.", cls: "otr-setting-card-desc" });
		const toggleLabelAi = cardAiToggle.createEl("label", { cls: "otr-custom-toggle" });
		const toggleInputAi = toggleLabelAi.createEl("input", { type: "checkbox" });
		toggleInputAi.checked = vaultSettings.enableLocalLlm;
		toggleLabelAi.createDiv({ cls: "otr-toggle-slider" });
		toggleInputAi.onchange = () => {
			void this.updateVaultSettings({ enableLocalLlm: toggleInputAi.checked });
		};

		// Card 4: 로컬 엔드포인트 URL + 100% Private 배지 + 연결 테스트
		const cardEndpoint = aiStack.createDiv({ cls: "otr-tool-card" });
		const endTop = cardEndpoint.createDiv({ cls: "otr-tool-card-top" });
		const endInfo = endTop.createDiv();
		endInfo.createDiv({ text: "로컬 엔드포인트 URL", cls: "otr-tool-card-title" });
		endInfo.createDiv({
			text: "오직 localhost 및 127.0.0.1만 허용됩니다 (Ollama / OpenAI 규격 자동 감지).",
			cls: "otr-tool-card-hint",
		});
		endTop.createSpan({ text: "100% Private", cls: "otr-status-badge is-ready font-mono-tabular" });

		const endInputRow = cardEndpoint.createDiv({ cls: "otr-tool-card-input-row" });
		const endInput = endInputRow.createEl("input", {
			type: "text",
			cls: "otr-tool-card-input font-mono-tabular",
			value: vaultSettings.localLlmEndpoint,
			placeholder: "http://localhost:11434",
		});
		endInput.onchange = () => {
			void this.updateVaultSettings({ localLlmEndpoint: endInput.value.trim() });
		};

		const testConnBtn = endInputRow.createEl("button", {
			text: "연결 테스트",
			cls: "otr-tool-browse-btn",
		});
		testConnBtn.onclick = async () => {
			testConnBtn.disabled = true;
			new Notice("연결 확인 중...");
			const res = await testLocalLlmConnection(vaultSettings.localLlmEndpoint);
			testConnBtn.disabled = false;
			if (res.ok) {
				new Notice(`연결 성공 (${res.serverType}, 감지된 모델 ${res.models.length}개)`);
			} else {
				new Notice(`연결 실패: ${res.error ?? "알 수 없는 오류"}`, 6000);
			}
		};

		// Card 5: 2-Col Grid (모델명 + 자동 요약 토글)
		const gridAi = aiStack.createDiv({ cls: "otr-setting-2col-grid" });

		const colModel = gridAi.createDiv({ cls: "otr-setting-col-box" });
		colModel.createDiv({ text: "요약 모델 이름", cls: "otr-setting-card-title" });
		colModel.createDiv({ text: "PC에 설치된 모델명 (예: qwen2.5:7b, llama3.1:8b)", cls: "otr-setting-card-desc" });
		const inputModel = colModel.createEl("input", {
			type: "text",
			cls: "otr-setting-input font-mono-tabular",
			value: vaultSettings.localLlmModel,
			placeholder: "qwen2.5:7b",
		});
		inputModel.onchange = () => {
			void this.updateVaultSettings({ localLlmModel: inputModel.value.trim() });
		};

		const colAutoAi = gridAi.createDiv({ cls: "otr-setting-card" });
		const infoAutoAi = colAutoAi.createDiv({ cls: "otr-setting-card-info" });
		infoAutoAi.createDiv({ text: "전사 완료 시 자동 요약", cls: "otr-setting-card-title" });
		infoAutoAi.createDiv({ text: "노트 본문 삽입 후 자동 실행", cls: "otr-setting-card-desc" });
		const toggleLabelAuto = colAutoAi.createEl("label", { cls: "otr-custom-toggle" });
		const toggleInputAuto = toggleLabelAuto.createEl("input", { type: "checkbox" });
		toggleInputAuto.checked = vaultSettings.localLlmAutoSummarize;
		toggleLabelAuto.createDiv({ cls: "otr-toggle-slider" });
		toggleInputAuto.onchange = () => {
			void this.updateVaultSettings({ localLlmAutoSummarize: toggleInputAuto.checked });
		};
	}
}
