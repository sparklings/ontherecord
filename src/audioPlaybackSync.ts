import { parseTimestampToSeconds } from "./noteMetadataHandler.ts";

/**
 * 타임스탬프 정규식: [MM:SS] 또는 [HH:MM:SS]
 */
export const TIMESTAMP_REGEX = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;

/**
 * 타겟 DOM 요소 기준 가장 인접하거나 현재 활성 문서 내의 <audio> 요소를 찾는다 (3-PIPE-03).
 */
export function findAudioElementForTimestamp(targetEl: HTMLElement): HTMLAudioElement | null {
	// 1. 같은 상위 섹션/블록 내 audio 탐색
	const parentBlock = targetEl.closest(".markdown-preview-section, .cm-line, .otr-preview-container, .workspace-leaf.mod-active");
	if (parentBlock) {
		const audio = parentBlock.querySelector("audio");
		if (audio) return audio;
	}

	// 2. 활성 리프(Active Leaf) 내 전체 audio 탐색
	const activeLeaf = document.querySelector(".workspace-leaf.mod-active");
	if (activeLeaf) {
		const audio = activeLeaf.querySelector("audio");
		if (audio) return audio;
	}

	// 3. 문서 전체에서 가장 최근 audio 태그 탐색
	const allAudios = document.querySelectorAll("audio");
	if (allAudios.length > 0) {
		return allAudios[allAudios.length - 1];
	}

	return null;
}

/**
 * 오디오 요소의 재생 위치를 특정 초로 이동하고 재생을 시작한다 (3-PIPE-03).
 */
export function syncAudioPlayback(audioEl: HTMLAudioElement, seconds: number): boolean {
	try {
		audioEl.currentTime = Math.max(0, seconds);
		const playPromise = audioEl.play();
		if (playPromise !== undefined) {
			playPromise.catch(() => {
				// 자동 재생 정책 등으로 차단된 경우 무시
			});
		}
		return true;
	} catch {
		return false;
	}
}

/**
 * 클릭된 타겟 또는 텍스트가 타임스탬프일 경우 오디오 싱크 재생을 처리한다 (3-PIPE-03).
 */
export function handleTimestampClick(target: HTMLElement): boolean {
	const text = target.textContent || "";
	const match = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/.exec(text);
	if (!match) return false;

	const seconds = parseTimestampToSeconds(match[1]);
	const audioEl = findAudioElementForTimestamp(target);
	if (audioEl) {
		syncAudioPlayback(audioEl, seconds);
		return true;
	}
	return false;
}

/**
 * 마크다운 렌더링된 요소 내의 [MM:SS] 텍스트를 클릭 가능한 상호작용 요소로 변환하는 포스트 프로세서 (3-PIPE-03).
 */
export function postProcessTimestamps(el: HTMLElement): void {
	// 텍스트 노드 탐색 및 타임스탬프 span 감싸기
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	const textNodes: Text[] = [];

	let node: Node | null;
	while ((node = walker.nextNode())) {
		if (node.nodeValue && TIMESTAMP_REGEX.test(node.nodeValue)) {
			// 이미 otr-timestamp 내부인 경우 건너뜀
			if (node.parentElement?.classList.contains("otr-timestamp")) continue;
			textNodes.push(node as Text);
		}
	}

	for (const textNode of textNodes) {
		const text = textNode.nodeValue || "";
		TIMESTAMP_REGEX.lastIndex = 0;
		if (!TIMESTAMP_REGEX.test(text)) continue;

		const fragment = document.createDocumentFragment();
		let lastIdx = 0;
		TIMESTAMP_REGEX.lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = TIMESTAMP_REGEX.exec(text)) !== null) {
			const before = text.slice(lastIdx, match.index);
			if (before) fragment.appendChild(document.createTextNode(before));

			const timestampSpan = document.createElement("span");
			timestampSpan.className = "otr-timestamp";
			timestampSpan.textContent = match[0];
			timestampSpan.title = `${match[1]} 위치로 오디오 이동 재생`;

			const seconds = parseTimestampToSeconds(match[1]);
			timestampSpan.addEventListener("click", (evt) => {
				evt.preventDefault();
				evt.stopPropagation();
				const audioEl = findAudioElementForTimestamp(timestampSpan);
				if (audioEl) {
					syncAudioPlayback(audioEl, seconds);
				}
			});

			fragment.appendChild(timestampSpan);
			lastIdx = TIMESTAMP_REGEX.lastIndex;
		}

		const after = text.slice(lastIdx);
		if (after) fragment.appendChild(document.createTextNode(after));

		textNode.replaceWith(fragment);
	}
}
