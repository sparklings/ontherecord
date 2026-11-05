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

		new Setting(containerEl).setName("이 기기의 런타임 및 모델 경로").setHeading();
		containerEl.createEl("p", {
			text: "경로는 이 기기에만 저장됩니다. 런타임과 모델은 플러그인 밖에서 직접 설치·관리하세요.",
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
	}
}
