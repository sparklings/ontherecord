import { PluginSettingTab, Setting } from "obsidian";
import type { App, Plugin } from "obsidian";
import type { LocalSettings, VaultSettings } from "./settings.ts";

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

		new Setting(containerEl).setName("음성 전사").setHeading();

		const vaultSettings = this.getVaultSettings();
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
			.setDesc("녹음 파일이 안정화되고 노트 링크가 확인되면 전사 대기열에 추가합니다. 실제 엔진 실행은 아직 지원하지 않습니다.")
			.addToggle((toggle) =>
				toggle.setValue(vaultSettings.autoTranscribe).onChange((value) => {
					void this.updateVaultSettings({ autoTranscribe: value });
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

		new Setting(containerEl).setName("이 기기의 CPU 전사 도구 경로").setHeading();
		containerEl.createEl("p", {
			text: "경로는 이 기기에만 저장됩니다. 런타임·모델·ffmpeg는 플러그인 밖에서 직접 설치·관리하세요.",
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

		new Setting(containerEl)
			.setName("런타임 실행 파일")
			.setDesc("사용자가 직접 설치한 실행 파일의 전체 경로입니다.")
			.addText((text) =>
				text
					.setValue(localSettings.runtimePath)
					.setPlaceholder("예: C:\\Tools\\whisper-cli.exe")
					.onChange((value) => {
						void this.updateLocalSettings({ runtimePath: value.trim() });
					}),
			);

		new Setting(containerEl)
			.setName("모델 파일")
			.setDesc("사용자가 직접 설치한 모델 파일의 전체 경로입니다.")
			.addText((text) =>
				text
					.setValue(localSettings.modelPath)
					.setPlaceholder("예: C:\\Models\\ggml-base.bin")
					.onChange((value) => {
						void this.updateLocalSettings({ modelPath: value.trim() });
					}),
			);

		new Setting(containerEl)
			.setName("Ffmpeg 실행 파일")
			.setDesc("사용자가 직접 설치한 ffmpeg.exe의 전체 경로입니다. 설치·업데이트하지 않습니다.")
			.addText((text) =>
				text
					.setValue(localSettings.ffmpegPath)
					.setPlaceholder("예: C:\\Tools\\ffmpeg.exe")
					.onChange((value) => {
						void this.updateLocalSettings({ ffmpegPath: value.trim() });
					}),
			);

		new Setting(containerEl)
			.setName("설치된 CPU 도구 자동 검색")
			.setDesc("사용자 폴더의 whisper.cpp, models, programs 등 알려진 위치만 검색해 기준 SHA-256·버전을 검증합니다. 전체 드라이브는 검색하지 않으며, 설정 적용은 직접 승인해야 합니다.")
			.addButton((button) =>
				button.setButtonText("검색").onClick(() => this.discoverCpuSetup()),
			);

		new Setting(containerEl)
			.setName("런타임·모델 검증 및 시험 추론")
			.setDesc("whisper.cpp 기준선 버전·SHA-256을 확인하고, 선택한 오디오를 FFmpeg로 16 kHz 모노 PCM WAV로 변환해 시험 전사합니다. 결과문과 변환 파일은 저장하지 않습니다.")
			.addButton((button) =>
				button.setButtonText("시험 시작").onClick(() => this.testCpuSetup()),
			);
	}
}
