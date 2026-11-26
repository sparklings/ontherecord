import { App, Modal, Notice } from "obsidian";
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
	private readonly selectedIndices = new Set<number>();
	private checkboxEls: HTMLInputElement[] = [];
	private rowEls: HTMLElement[] = [];

	constructor(
		app: App,
		private readonly report: CpuToolDiscoveryReport,
		private readonly onApply: (pair: VerifiedCpuToolPair) => void,
		private readonly onApplyMultiple?: (pairs: readonly VerifiedCpuToolPair[]) => void,
	) {
		super(app);
		// 권장 모델(medium)이 있으면 우선 선택, 없으면 첫 번째 조합 기본 선택
		if (report.pairs.length > 0) {
			const mediumIdx = report.pairs.findIndex((p) => p.verification.modelId === "medium");
			this.selectedIndices.add(mediumIdx >= 0 ? mediumIdx : 0);
		}
	}

	onOpen(): void {
		this.modalEl.addClass("otr-cpu-discovery-results");
		this.setTitle("검증된 CPU 도구 조합");
		this.contentEl.createEl("p", {
			text: `런타임 후보 ${this.report.runtimeCandidateCount}개, 모델 후보 ${this.report.modelCandidateCount}개를 확인해 기준 버전과 SHA-256이 일치하는 조합 ${this.report.pairs.length}개를 찾았습니다. 적용할 조합을 체크한 후 하단의 [선택한 조합 설정에 적용] 버튼을 눌러 일괄 등록하세요.`,
		});

		if (this.report.pairs.length > 1) {
			const selectAllRow = this.contentEl.createDiv({ cls: "otr-discovery-select-all-row" });
			const selectAllBtn = selectAllRow.createEl("button", {
				text: "전체 선택",
				cls: "otr-tool-browse-btn font-mono-tabular",
			});
			selectAllBtn.onclick = () => {
				this.report.pairs.forEach((_, idx) => this.selectedIndices.add(idx));
				this.syncCheckboxes();
			};

			const deselectAllBtn = selectAllRow.createEl("button", {
				text: "선택 해제",
				cls: "otr-tool-browse-btn font-mono-tabular",
			});
			deselectAllBtn.onclick = () => {
				this.selectedIndices.clear();
				this.syncCheckboxes();
			};
		}

		const listContainer = this.contentEl.createDiv({ cls: "otr-discovery-list" });
		this.checkboxEls = [];
		this.rowEls = [];

		this.report.pairs.forEach((pair, idx) => {
			const identity = pair.verification;
			const isChecked = this.selectedIndices.has(idx);

			const rowEl = listContainer.createDiv({
				cls: `otr-discovery-row ${isChecked ? "is-selected" : ""}`,
			});
			this.rowEls.push(rowEl);

			// 1. 체크박스
			const checkWrapper = rowEl.createDiv({ cls: "otr-discovery-check-col" });
			const checkbox = checkWrapper.createEl("input", {
				type: "checkbox",
				cls: "otr-discovery-checkbox",
			});
			checkbox.checked = isChecked;
			this.checkboxEls.push(checkbox);

			checkbox.onchange = (e) => {
				e.stopPropagation();
				if (checkbox.checked) {
					this.selectedIndices.add(idx);
				} else {
					this.selectedIndices.delete(idx);
				}
				rowEl.toggleClass("is-selected", checkbox.checked);
			};

			// 2. 조합 정보 (클릭 시 토글)
			const infoEl = rowEl.createDiv({ cls: "otr-discovery-info" });
			infoEl.onclick = () => {
				checkbox.checked = !checkbox.checked;
				checkbox.dispatchEvent(new Event("change"));
			};

			const titleRow = infoEl.createDiv({ cls: "otr-discovery-row-title-row" });
			titleRow.createSpan({
				text: `${identity.modelId} (${identity.modelQuantization}) · ${identity.runtimeVersion}`,
				cls: "otr-discovery-title",
			});

			infoEl.createDiv({
				text: `런타임: ${pair.runtimePath}`,
				cls: "otr-discovery-desc",
				title: pair.runtimePath,
			});
			infoEl.createDiv({
				text: `모델: ${pair.modelPath}`,
				cls: "otr-discovery-desc",
				title: pair.modelPath,
			});

			// 3. 개별 즉시 적용 버튼
			const actionCol = rowEl.createDiv({ cls: "otr-discovery-action-col" });
			const applySingleBtn = actionCol.createEl("button", {
				text: "즉시 적용",
				cls: "otr-tool-browse-btn font-mono-tabular",
				title: "이 조합 하나만 즉시 설정에 적용합니다",
			});
			applySingleBtn.onclick = (e) => {
				e.stopPropagation();
				this.close();
				this.onApply(pair);
			};
		});

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

		// 하단 일괄 등록 및 닫기 액션 바
		const bottomBar = this.contentEl.createDiv({ cls: "otr-discovery-bottom-bar" });

		const closeBtn = bottomBar.createEl("button", {
			text: "닫기",
			cls: "otr-tool-browse-btn",
		});
		closeBtn.onclick = () => this.close();

		const applyBatchBtn = bottomBar.createEl("button", {
			text: "선택한 조합 설정에 적용",
			cls: "mod-cta otr-tool-browse-btn font-mono-tabular",
		});
		applyBatchBtn.onclick = () => {
			if (this.selectedIndices.size === 0) {
				new Notice("적용할 도구 조합을 1개 이상 선택하세요.");
				return;
			}
			const selectedPairs = Array.from(this.selectedIndices)
				.sort((a, b) => a - b)
				.map((i) => this.report.pairs[i])
				.filter(Boolean);

			if (selectedPairs.length === 0) return;

			this.close();
			if (this.onApplyMultiple) {
				this.onApplyMultiple(selectedPairs);
			} else {
				// 기본 onApply: 선택된 첫 번째(우선순위) 조합 적용
				this.onApply(selectedPairs[0]);
			}
		};
	}

	private syncCheckboxes(): void {
		this.checkboxEls.forEach((cb, idx) => {
			const isChecked = this.selectedIndices.has(idx);
			cb.checked = isChecked;
			this.rowEls[idx]?.toggleClass("is-selected", isChecked);
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
