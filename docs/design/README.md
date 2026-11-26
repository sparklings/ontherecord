# On the Record - Stitch UI 시안 및 디자인 가이드

본 디렉터리는 Google Stitch MCP(`projects/15695117177036898361`)를 통해 제작된 **On the Record** 옵시디언 커뮤니티 플러그인의 공식 디자인 시안 전체 세트를 보관합니다.

---

## 1. Google Stitch 프로젝트 정보

- **Project ID**: `projects/15695117177036898361`
- **Project Title**: `On the Record (Obsidian Plugin)`
- **Design System**: `assets/17724542724472707759` (`On the Record`)
- **기본 테마 사양**:
  - Color Mode: Dark Theme (`#131313` background, `#1e1e1e` modal surface, `#252525` cards)
  - Primary Accent: `#7b6cd9` (Obsidian Purple)
  - Secondary Accent: `#48a56a` (Ready Green)
  - Tertiary Accent: `#e05252` (Recording Red)
  - Typography: `Inter` (UI 텍스트), `JetBrains Mono` (경로, 숫자, 토큰)

---

## 2. 공식 시안 5종 카탈로그

| # | 시안명 | Stitch Screen ID | HTML 파일 | 스크린샷 이미지 | 대응 소스 코드 |
|---|---|---|---|---|---|
| 1 | 사이드바 제어 패널 & 플로팅 표시기 | `c97ec39e06574a588961d1c95d183492` | [`stitch-sidebar-and-floating.html`](./stitch-sidebar-and-floating.html) | - | `src/sidebarView.ts`<br>`src/floatingIndicator.ts` |
| 2 | 환경설정 - 전사 & 모델 탭 | `d863df4f20d846fb8245df34b899b81a` | [`stitch-settings-modal.html`](./stitch-settings-modal.html) | - | `src/settingsTab.ts` |
| 3 | 환경설정 - 워크플로 탭 | `5f85aab5bf3c4ae8aaac2b548edcd9b3` | [`stitch-workflow-tab.html`](./stitch-workflow-tab.html) | [`stitch-workflow-tab.png`](./stitch-workflow-tab.png) | `src/settingsTab.ts` |
| 4 | 환경설정 - 하드웨어 가속 & AI 탭 | `b09aa44d6a394dc390e16bc1304be4e4` | [`stitch-acceleration-tab.html`](./stitch-acceleration-tab.html) | [`stitch-acceleration-tab.png`](./stitch-acceleration-tab.png) | `src/settingsTab.ts` |
| 5 | 전사 결과 검토 및 삽입 모달 | `c46defc3c9c5491eb7dfd575ce5bc908` | [`stitch-review-modal.html`](./stitch-review-modal.html) | [`stitch-review-modal.png`](./stitch-review-modal.png) | `src/resultPreviewModal.ts` |

---

## 3. 화면별 세부 인터랙션 및 컴포넌트 규격

### 3.1. 사이드바 제어 패널 (`stitch-sidebar-and-floating.html`)
- **Target Note 인셋 박스**: 활성 마크다운 노트 링크와 `● Record` 알약 버튼을 상단에 고정
- **오디오 임베드 카드**: 좌측 `[Jump]`(해당 행 즉시 이동)과 우측 보라색 `[Transcribe]`(재전사) 버튼을 양끝 정렬(`justify-between`)
- **전사 대기열 위젯**: 백그라운드 큐 처리 상태를 프로그레스 바 및 항목 수치로 표시

### 3.2. 환경설정 - 전사 & 모델 탭 (`stitch-settings-modal.html`)
- **도구 설정 카드**: `FFmpeg`, `whisper-cli`, `Model Directory` 3종의 상단 타이틀/상태 배지 + 하단 풀폭 경로 및 `[찾아보기]` 버튼 2단 구조
- **하단 진단 바**: `[도구 자동 검색]` 및 `[시험 시작]`(보라색) 우측 정렬
- **5대 모델 카드 & 어휘 힌트**: `tiny`, `base`, `small`, `medium`, `large-v3` 카드 레이아웃 및 `--prompt` 전용 입력 카드

### 3.3. 환경설정 - 워크플로 탭 (`stitch-workflow-tab.html`)
- **시작 모드 셀렉트**: `새 회의록 작성 시 자동 시작 (권장)` / `수동 시작`
- **보관 폴더 & 템플릿**: 디렉터리 경로 및 조건부 시작 템플릿 지정
- **탭 닫힘 안전 정책**: 탭 종료 시 녹음 안전 중지 및 연결

### 3.4. 환경설정 - 가속 & AI 탭 (`stitch-acceleration-tab.html`)
- **하드웨어 가속 (GPU)**: CUDA / Vulkan / CPU 전용 백엔드 셀렉트, `-ngl` 레이어 수 및 `-dev` GPU 번호 2열 카드
- **로컬 AI 회의록 요약**: 100% Private 로컬 엔드포인트(`http://localhost:11434`), `[연결 테스트]` 액션, 요약 모델명 및 자동 요약 토글

### 3.5. 전사 결과 검토 모달 (`stitch-review-modal.html`)
- **오디오 싱크 컨트롤러**: 36px 보라색 재생 버튼, `01:24 / 04:12` 시계, `Synced to segment N` 싱크 배지, 스크러버 트랙, 배속(`1.0x`~`2.0x`)
- **세그먼트 리스트**: 타임스탬프 클릭 시 오디오 점프, 인라인 텍스트 편집, 현재 재생 중인 세그먼트 보라색 하이라이트(`border-2 #7b6cd9`)
- **결과 삽입 선택기**: `Replace existing block` vs `Append below` 알약 선택기

---

## 4. 로컬 브라우저 미리보기 방법

본 디렉터리의 `.html` 파일들은 Tailwind CDN과 Google Fonts를 포함하여 빌드 없이 모든 최신 웹 브라우저에서 독립 실행 가능합니다:

```powershell
# 기본 브라우저에서 시안 열기
Start-Process "docs\design\stitch-workflow-tab.html"
Start-Process "docs\design\stitch-acceleration-tab.html"
Start-Process "docs\design\stitch-review-modal.html"
```
