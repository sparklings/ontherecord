import { App, Modal, Setting } from "obsidian";
import type { WhisperCppCpuVerification } from "./whisperCppCpu.ts";

export interface VerifiedCpuToolPair {
	runtimePath: string;
	modelPath: string;
	verification: WhisperCppCpuVerification;
}

export interface CpuToolDiscoveryReport {
	runtimeCandidateCount: number;
	modelCandidateCount: number;
	pairs: readonly VerifiedCpuToolPair[];
	pairsTruncated: boolean;
	warnings: readonly string[];
	rejections: readonly string[];
	rejectionCount: number;
}

export class CpuRuntimeDiscoveryProgressModal extends Modal {
	private detailEl!: HTMLElement;

	onOpen(): void {
		this.setTitle("CPU 런타임·모델 검색");
		this.contentEl.createEl("p", {
			text: "알려진 로컬 설치 폴더만 검색하고, 설치나 파일 변경은 하지 않습니다.",
		});
		this.detailEl = this.contentEl.createEl("p", { cls: "setting-item-description" });
		this.setMessage("검색을 준비하는 중입니다.");
	}

	setMessage(message: string): void {
		this.detailEl?.setText(message);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export class CpuRuntimeDiscoveryResultsModal extends Modal {
	constructor(
		app: App,
		private readonly report: CpuToolDiscoveryReport,
		private readonly onApply: (pair: VerifiedCpuToolPair) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.modalEl.addClass("otr-cpu-discovery-results");
		this.setTitle("검증된 CPU 도구 조합");
		this.contentEl.createEl("p", {
			text: `런타임 후보 ${this.report.runtimeCandidateCount}개, 모델 후보 ${this.report.modelCandidateCount}개를 확인해 기준 버전과 SHA-256이 일치하는 조합 ${this.report.pairs.length}개를 찾았습니다. 적용 버튼을 누르기 전에는 설정을 변경하지 않습니다.`,
		});

		for (const pair of this.report.pairs) {
			const identity = pair.verification;
			new Setting(this.contentEl)
				.setName(`${identity.modelId} (${identity.modelQuantization}) · ${identity.runtimeVersion}`)
				.setDesc(
					`런타임: ${pair.runtimePath}\n모델: ${pair.modelPath}\n런타임 SHA-256: ${identity.runtimeSha256}\n모델 SHA-256: ${identity.modelSha256}`,
				)
				.addButton((button) =>
					button.setButtonText("이 조합을 설정에 적용").setCta().onClick(() => {
						this.close();
						this.onApply(pair);
					}),
				);
		}

		if (this.report.pairs.length === 0) {
			this.contentEl.createEl("p", {
				text: "검증된 조합이 없습니다. 설정의 경로를 직접 입력하거나 검색 대상 폴더에 도구를 배치한 뒤 다시 검색하세요.",
				cls: "mod-warning",
			});
		}
		for (const warning of this.report.warnings) {
			this.contentEl.createEl("p", { text: warning, cls: "setting-item-description" });
		}
		if (this.report.pairsTruncated) {
			this.contentEl.createEl("p", {
				text: "검증된 조합이 많아 앞의 25개만 표시합니다. 표시된 조합은 모두 기준 버전과 sha-256을 통과했습니다.",
				cls: "setting-item-description",
			});
		}
		for (const rejection of this.report.rejections) {
			this.contentEl.createEl("p", { text: `검증에서 제외: ${rejection}`, cls: "setting-item-description" });
		}
		if (this.report.rejectionCount > this.report.rejections.length) {
			this.contentEl.createEl("p", {
				text: `그 외 ${this.report.rejectionCount - this.report.rejections.length}개 후보의 검증 실패는 생략했습니다.`,
				cls: "setting-item-description",
			});
		}
		new Setting(this.contentEl).addButton((button) =>
			button.setButtonText("닫기").onClick(() => this.close()),
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
