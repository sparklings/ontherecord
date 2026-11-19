import { Notice, PluginSettingTab, Setting } from "obsidian";
import type { App, Plugin } from "obsidian";
import type { LocalSettings, VaultSettings } from "./settings.ts";
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
	const badge = container.createSpan({ cls: "otr-status-badge" });
	badge.style.marginLeft = "0.5rem";
	badge.style.padding = "2px 6px";
	badge.style.borderRadius = "4px";
	badge.style.fontSize = "0.85em";
	badge.style.fontWeight = "bold";
	if (status.exists) {
		badge.style.backgroundColor = "var(--color-green, #2e7d32)";
		badge.style.color = "#ffffff";
		const sizeInfo = status.sizeBytes ? ` (${(status.sizeBytes / (1024 * 1024)).toFixed(1)} MB)` : "";
		badge.setText(`✅ ${label}${sizeInfo}`);
	} else {
		badge.style.backgroundColor = "var(--color-red, #c62828)";
		badge.style.color = "#ffffff";
		badge.setText("⚠️ 파일 없음");
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

		new Setting(containerEl).setName("음성 녹음 및 세션").setHeading();

		const vaultSettings = this.getVaultSettings();

		new Setting(containerEl)
			.setName("녹음 시작 방식")
			.setDesc("새 마크다운 노트 생성 시 녹음 개시 방식입니다. (노트 frontmatter에 recorder가 있으면 우선 적용)")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("auto", "자동 시작 (새 노트 생성 시 즉시 녹음)")
					.addOption("manual", "수동 시작 (자동 시작 안 함)")
					.setValue(vaultSettings.recordStartMode)
					.onChange((value) => {
						if (value === "auto" || value === "manual") {
							void this.updateVaultSettings({ recordStartMode: value });
						}
					}),
			);

		new Setting(containerEl)
			.setName("자동 시작 시 알림 표시")
			.setDesc("자동 녹음 시작 시 우측 상단에 알림 메시지를 표시합니다. 끄면 알림 없이 조용히 녹음을 시작합니다.")
			.addToggle((toggle) =>
				toggle
					.setValue(vaultSettings.recordStartNotification)
					.onChange((value) => {
						void this.updateVaultSettings({ recordStartNotification: value });
					}),
			);

		new Setting(containerEl)
			.setName("녹음 자동 시작 대상 폴더")
			.setDesc("지정한 폴더 하위의 새 노트에만 녹음 시작 방식을 적용합니다. 비워두면 볼트 내 모든 새 노트에 적용됩니다.")
			.addText((text) =>
				text
					.setValue(vaultSettings.autoRecordFolder)
					.setPlaceholder("예: Meetings 또는 회의록")
					.onChange((value) => {
						void this.updateVaultSettings({ autoRecordFolder: value.trim() });
					}),
			);

		new Setting(containerEl)
			.setName("노트 탭 닫힘 시 동작")
			.setDesc("녹음 중인 노트의 탭이 닫힐 때 처리 방식입니다.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("stop-and-attach", "녹음 자동 중지 및 오디오 안전 연결 (권장)")
					.addOption("ignore", "녹음 유지 (수동 중지)")
					.setValue(vaultSettings.onTabCloseAction)
					.onChange((value) => {
						void this.updateVaultSettings({ onTabCloseAction: value as "stop-and-attach" | "ignore" });
					}),
			);

		new Setting(containerEl).setName("음성 전사").setHeading();
		new Setting(containerEl)
			.setName("녹음 파일 감지")
			.setDesc("새 오디오 파일을 감지합니다.")
			.addToggle((toggle) =>
				toggle.setValue(vaultSettings.autoDetectRecording).onChange((value) => {
					void this.updateVaultSettings({ autoDetectRecording: value });
				}),
			);

		new Setting(containerEl)
			.setName("자동 전사")
			.setDesc("녹음 파일이 준비되면 백그라운드 전사 큐로 인계하여 자동 전사합니다.")
			.addToggle((toggle) =>
				toggle.setValue(vaultSettings.autoTranscribe).onChange((value) => {
					void this.updateVaultSettings({ autoTranscribe: value });
				}),
			);

		new Setting(containerEl)
			.setName("전사 결과 반영 방식")
			.setDesc("백그라운드 전사 완료 시 노트에 결과를 반영하는 방식입니다.")
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
			.setName("파일 안정화 대기")
			.setDesc("파일 크기와 수정 시각이 변하지 않아야 하는 시간(초)입니다.")
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
			.setName("언어")
			.setDesc("전사에 사용할 기본 언어입니다.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("auto", "자동")
					.addOption("ko", "한국어")
					.addOption("en", "영어")
					.setValue(vaultSettings.language)
					.onChange((value) => {
						void this.updateVaultSettings({ language: value });
					}),
			);

		new Setting(containerEl)
			.setName("기본 모델 크기")
			.setDesc("모델 파일을 자동으로 다운로드하거나 설치하지 않습니다.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("base", "Base")
					.addOption("small", "Small")
					.setValue(vaultSettings.defaultModelSize)
					.onChange((value) => {
						void this.updateVaultSettings({ defaultModelSize: value });
					}),
			);

		new Setting(containerEl)
			.setName("장치 선호")
			.setDesc("실행 장치가 지원되지 않으면 실제 사용 가능 여부를 별도로 검증해야 합니다.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("auto", "자동")
					.addOption("cpu", "CPU")
					.addOption("accelerator", "가속기")
					.setValue(vaultSettings.devicePreference)
					.onChange((value) => {
						if (value === "auto" || value === "cpu" || value === "accelerator") {
							void this.updateVaultSettings({ devicePreference: value });
						}
					}),
			);

		new Setting(containerEl)
			.setName("전사문 검색어")
			.setDesc("검색어를 한 줄에 하나씩 입력하세요. 검색 명령에서 이 목록을 제안하며, 전사 segment와 timestamp를 찾습니다.")
			.addTextArea((text) =>
				text
					.setValue(vaultSettings.transcriptSearchTerms.join("\n"))
					.setPlaceholder("예: 결정 사항\n담당자")
					.onChange((value) => {
						void this.updateVaultSettings({
							transcriptSearchTerms: value.split(/\r?\n/).map((term) => term.trim()).filter(Boolean),
						});
					}),
			);

		new Setting(containerEl).setName("이 기기의 CPU 전사 도구 경로 및 상태 (Local Tools)").setHeading();
		containerEl.createEl("p", {
			text: "경로는 이 기기에만 저장됩니다 (%LOCALAPPDATA%\\on-the-record\\local-settings.json). 런타임·모델·FFmpeg는 플러그인 외부에서 직접 관리하며 Obsidian 정책을 준수합니다.",
			cls: "setting-item-description",
		});

		const localSettings = this.getLocalSettings();
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
		const modelSetting = new Setting(containerEl)
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
		renderStatusBadge(modelSetting.nameEl, modelStatus, "준비됨");

		const ffmpegStatus = checkPathExists(localSettings.ffmpegPath);
		const ffmpegSetting = new Setting(containerEl)
			.setName("FFmpeg 실행 파일")
			.setDesc("오디오 16kHz 정규화에 사용되는 ffmpeg.exe의 전체 경로입니다.")
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
			.setName("설치된 CPU 도구 자동 검색")
			.setDesc("사용자 폴더의 whisper.cpp, models, programs 등 알려진 위치만 검색해 기준 SHA-256·버전을 검증합니다.")
			.addButton((button) =>
				button.setButtonText("검색").onClick(() => this.discoverCpuSetup()),
			);

		new Setting(containerEl)
			.setName("런타임·모델 검증 및 시험 추론")
			.setDesc("whisper.cpp 기준선 버전·SHA-256을 확인하고, 오디오를 변환해 시험 전사합니다.")
			.addButton((button) =>
				button.setButtonText("시험 시작").onClick(() => this.testCpuSetup()),
			);

		new Setting(containerEl)
			.setName("FFmpeg 원클릭 설치 스크립트 복사 (Setup Helper)")
			.setDesc("별도 PowerShell 터미널에서 실행하여 FFmpeg를 winget으로 설치할 수 있는 명령어를 클립보드에 복사합니다.")
			.addButton((button) =>
				button.setButtonText("명령어 복사").onClick(async () => {
					const cmd = "winget install Gyan.FFmpeg";
					await navigator.clipboard.writeText(cmd);
					new Notice("FFmpeg 설치 명령어가 클립보드에 복사되었습니다.\nPowerShell 터미널을 열고 붙여넣어 실행하세요.");
				}),
			);
	}
}
