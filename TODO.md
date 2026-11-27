# 할 일

개발계획서의 단계에 따라 할 일을 일자별로 기록한다. 항목은 작업 결과에 따라 추가하거나 취소한다.

표기: `[ ]` 대기 / `[~]` 진행 중 / `[x]` 완료 / `[-]` 취소(사유를 함께 적는다)

## 식별코드

형식: `단계-분류-번호` (예: `0-ENV-01`). 코드는 한 번 부여하면 바꾸거나 재사용하지 않는다. 취소한 항목도 코드를 남긴다. 새 항목은 해당 분류의 마지막 번호 다음 번호를 쓴다. CHANGELOG 등 다른 문서에서 항목을 가리킬 때 이 코드를 쓴다.

| 분류 | 의미 |
|---|---|
| ENV | 개발 환경, 저장소, 라이선스, 프로젝트 구성 |
| BASE | 입력·전사 기준선 측정 |
| OBS | Obsidian 연동 검증 |
| PIPE | 공통 플러그인 파이프라인 |
| CPU | CPU 전사 기능 |
| GPU | GPU 전사 기능 및 하드웨어 가속 평가 |
| UX | 사용자 경험 및 워크플로 정합성 검토 |
| PROD | 상용성·배포·온보딩·제품화 보완 |
| REC | 코어 녹음 제어, 라이프사이클 및 노트 연동 (기획 확장) |
| POST | 사후 분석, 로컬 LLM 연동 및 요약 템플릿 |
| DOCS | 설정 도움말, 사용자 가이드 및 기술 산출물 문서화 |
| SEC | 보안, 데이터 프라이버시 및 외부 무유출 정책 |
| QUAL | 품질 평가, 한영 혼용(Code-switching) 및 전문용어 인식 고도화 |
| REL | 신뢰성, 내결함성, 크래시 복구 및 데이터 무결성 |
| PERF | 성능, 저전력, 발열 제어 및 프로세스 스케줄링 |

## 2026-11-27

### GitHub Wiki 링크 표준화 및 원격 배포 (2026-11-27 완료)
- [x] `WIKI-FIX-01` GitHub Wiki(Gollum) 링크 구문 역전으로 인한 404/페이지 누락 결함 해결 및 표준 마크다운 링크(`[표시명](파일명)`) 전환
- [x] `WIKI-FIX-02` 빠른 시작 가이드를 표준 수동 설정(FFmpeg winget, whisper.cpp v1.9.5+, GGML 모델, 도구 자동 검색) 4단계로 일원화
- [x] `WIKI-FIX-03` GitHub Wiki 원격 저장소(`sparklings/ontherecord.wiki.git`)와 메인 코드 저장소 동기화 및 푸시

### 사이드바 UI 단순화, 수동 순차 전사 UX 개편 및 플로팅 인디케이터 상시 노출 (2026-11-27 완료)
- [x] `SIDEBAR-SIMPLIFY-01` 사이드바 상단 불필요한 설정 기어 아이콘 삭제
- [x] `SIDEBAR-SIMPLIFY-02` 사이드바 하단 퀵 액션 스트립("오디오 파일 전사", "새 회의록 작성") 삭제로 회의록 컨텍스트 집중도 제고
- [x] `MANUAL-TRANS-01` 녹음 세션 종료 시 30초 대기 없이 즉시 대상 노트에 오디오 자동 삽입 및 에디터 활성화
- [x] `MANUAL-TRANS-02` 본문에 삽입된 오디오 파일 목록을 자동 감지하고, 사용자가 `대기` 버튼을 눌러 1건씩 수동 순차 전사하도록 워크플로 개편
- [x] `QUEUE-FEEDBACK-01` `대기` 클릭 즉시 `등록 중...` 반영 및 전사 큐 상태에 따라 행 배지 `● 전사 중...` / `대기 중 (큐)` 실시간 자동 동기화
- [x] `QUEUE-FEEDBACK-02` whisper/ffmpeg 처리 초기 단계의 `0%` 정체감 해소를 위해 `처리 중...` 텍스트 및 인디터미네이트 애니메이션 프로그레스 적용
- [x] `PATH-RESOLVE-01` Vault 하위 폴더 오디오 임베드에 대해 `metadataCache` 링크 해석 연동으로 전체 경로 및 전사 대상 정확 탐색 보장
- [x] `FLOAT-PERSIST-01` 우측 사이드바가 열려 있어도 플로팅 녹음 인디케이터를 숨기지 않고 상시 노출하도록 유지

### 사이드바 녹음 목록 호버 시 수직 흔들림(Jitter) 박멸 및 텍스트 색상 제한 (2026-11-27 완료)
- [x] `HOVER-STABILITY-01` 호버 시 상태 배지와 버튼을 `display: none` / `display: inline-flex`로 치환하던 구조 완전 제거로 행 높이 급변 차단
- [x] `HOVER-STABILITY-02` 파일명 `text-decoration: underline` 제거 및 호버 효과를 텍스트 색상(`color: var(--interactive-accent)`) 변경 수준으로 엄격히 제한
- [x] `HOVER-STABILITY-03` 행 높이(`height: 28px; box-sizing: border-box;`) 및 좌측 아이콘 규격(`14px x 14px`) 물리적 완전 고정
- [x] `HOVER-STABILITY-04` 우측 상태 배지(`대기` / `전사 완료`)를 항상 표시하고 클릭 시 전사/재전사가 트리거되도록 원클릭 통합

### 본문 오디오 임베드 사이드바 실시간 동기화 (2026-11-27 완료)
- [x] `SYNC-REACTIVE-01` 녹음 안정화 후 `attachAudioToNote` 완료 즉시 `refreshSidebarViews()`를 호출하여 사이드바 녹음 파일 0건 고정 현상 해결
- [x] `SYNC-REACTIVE-02` Obsidian의 `metadataCache.on("changed")` 및 `vault.on("modify")` 실시간 연동 (250ms 디바운스 적용)
- [x] `SYNC-REACTIVE-03` 사이드바 `refresh()` 시 디스크 쓰기 대기 지연 없이 활성 Markdown 에디터 메모리(`editor.getValue()`) 우선 파싱
- [x] `SYNC-REACTIVE-04` 백그라운드 전사 완료 시점에도 사이드바를 즉각 갱신하여 "대기" -> "전사 완료" 상태 배지 실시간 동기화

### 개선안 A 사이드바 연동 플로팅 토글 & 원클릭 단축키 커맨드 (2026-11-27 완료)
- [x] `FLOAT-TOGGLE-01` 우측 사이드바가 열려있을 때 플로팅 인디케이터를 자동 숨김(`setSuppressed`) 처리하는 사이드바 연동 로직 구현
- [x] `HOTKEY-01` 단축키 원클릭 회의록 작성 및 녹음 시작 커맨드(`create-meeting-note-and-record`) 추가
- [x] `HOTKEY-02` 녹음 일시정지 / 계속하기 / 즉시 녹음 범용 토글 단축키 커맨드(`toggle-recording`) 추가

### 다국어(i18n) 시스템 구축 및 스킨 확장 (2026-11-27 완료)
- [x] `I18N-EXPAND-01` Obsidian 언어 감지 기반 i18n 아키텍처(`src/i18n.ts`) 구축 (한국어 환경: 한국어, 그 외: 영어)
- [x] `I18N-EXPAND-02` 고유명사(`Markdown`, `Vault`, `Whisper`, `FFmpeg`, `PowerShell`, `Obsidian`) 한국어 스킨 원어 표기 보존
- [x] `I18N-EXPAND-03` 설정 탭, 커맨드, 상태 배너 전체에 사전 기반 `t(...)` 적용 및 100% 번역 키 일치 검증 테스트 통과

### 플로팅 인디케이터 개선안 B 적용 및 배너 정제 (2026-11-27 완료)
- [x] `FLOAT-SAFE-01` 플로팅 인디케이터 위치를 `right: 48px; bottom: 36px;`로 이동하여 에디터 분할선과의 충돌 방지
- [x] `FLOAT-SAFE-02` 각진 버튼을 Google Antigravity 스타일의 원형 미니 액션(`border-radius: 50%`)으로 변경하고 호버 시 너비 고정 유지
- [x] `BANNER-ALIGN-01` 도구 준비 상태 배너 내의 배지 줄바꿈 방지(`white-space: nowrap`) 및 텍스트 수직 정렬 안정화

### 전사 타임스탬프 10배 축척 왜곡 수정 및 무음 환각 차단 (2026-11-27 완료)
- [x] `SYNC-BUG-01` whisper.cpp JSON 오프셋(ms) 파싱 시 `/ 100`으로 10배 팽창되던 버그를 `/ 1000`으로 수정하여 1:09 오디오 싱크 100% 정상화
- [x] `SYNC-BUG-02` 무음 구간 greedy 루프를 유발하던 `-tp 0.0`, `-mc 0` 플래그 제거 및 온도 fallback 복원으로 무음 환각 문장 반복 완전 박멸
- [x] `SYNC-BUG-03` `stripCommentMarkersFromNote`에서 `<!-- on-the-record:begin -->` 등 모든 마커 태그 전면 제거

### 녹음 종료 시 회의록 노트 에디터 즉시 열기 및 UI 개선 (2026-11-27 완료)
- [x] `NOTE-OPEN-01` 녹음 종료(`stopCurrentRecording`), 탭 정리(`active-leaf-change`), 안정화, 전사 완료 시 회의록 노트를 메인 에디터에 확실히 열고 포커스(`openNoteInMainArea`)
- [x] `NOTE-OPEN-02` 코어 오디오 탭 detach 후 에디터가 빈 화면으로 남던 문제 해결
- [x] `FLOAT-UI-01` 플로팅 인디케이터를 활성 에디터 뷰 안쪽(`right: 48px; bottom: 36px;`)에 마운트하여 수직 분할선 침범 방지 및 원형 버튼 정제

### 회의록 템플릿 환경설정 연동 및 조건부 자동 시작 템플릿 삭제 (2026-11-27 완료)
- [x] `TEMPLATE-UX-01` 환경설정(녹음 & 워크플로)에 '새 회의록 기본 템플릿'(`meetingNoteTemplatePath`) 설정 추가 및 `{{date}}`, `{{time}}`, `{{title}}` 변수 지원
- [x] `TEMPLATE-UX-02` 우측 사이드바 `+ 새 회의록` 및 `녹음 시작` 클릭 시 템플릿을 반영한 새 노트를 생성하여 메인 에디터(`rootSplit`)에 확실히 열고 포커스
- [x] `TEMPLATE-UX-03` 활성 노트 부재 시 사이드바 `녹음 시작` 클릭 시 템플릿 기반 새 회의록 자동 생성 및 녹음 개시
- [x] `TEMPLATE-UX-04` 옵시디언 운영 원칙에 부합하지 않던 '조건부 자동 시작 템플릿 파일' 기능 및 마크다운 생성 시 템플릿 가로채기 로직 전면 삭제

### 설정 CPU 도구 조합 검색 모달 체크박스 다중 선택 및 일괄 적용 UX 구현 (2026-11-27 완료)
- [x] `DISCOVERY-UX-01` 검색된 CPU 도구 조합 목록에 체크박스(`otr-discovery-checkbox`) 및 클릭 선택 상태 스타일(`is-selected`) 구현
- [x] `DISCOVERY-UX-02` 상단 `[전체 선택]` / `[선택 해제]` 버튼 및 하단 `[선택한 조합 설정에 적용]` 주 액션 버튼 배치
- [x] `DISCOVERY-UX-03` 선택된 조합들의 런타임 및 모델 정보를 한 번의 클릭으로 설정에 일괄 반영(`applyDiscoveredCpuSetupMultiple`) 및 개별 `[즉시 적용]` 버튼 지원

### 중복 플레이어 제거 & 주석 전면 삭제 & 단정한 전사 블록 안착 (2026-11-27 완료)
- [x] `CLEAN-TRANS-01` 코어 녹음 완료 시 본문 오디오 임베드 중복 생성 원천 방어 및 단 1개의 플레이어 유지
- [x] `CLEAN-TRANS-02` 전사 완료 시 `### 🎙️ 음성 전사` 정식 헤딩 블록 안착 및 `stripCommentMarkersFromNote` 자동 청소 연동
- [x] `CLEAN-TRANS-03` 내부 시퀀스 마커(`<!-- on-the-record:... -->`) 전면 배제 및 마크다운 오염 제로화

### 대기열 상태 파악 로직 간결화 및 실시간 동기화 (2026-11-27 완료)
- [x] `SYNC-01` 전사 완료 후 사이드바에 `● 대기열 1건` 위젯이 잔존하던 상태 동기화 누락 수정 (실제 pending/processing 작업만 카운트하고 completion 시 즉각 0 갱신)
- [x] `SYNC-02` `onItemCompleted` 및 `onItemError` 시 사이드바 진행률 위젯 닫기 및 뷰 실시간 리프레시 트리거

### Antigravity 스타일 사이드바 & 본문 클린 전사 파이프라인 개편 (2026-11-27 완료)
- [x] `CLEAN-UI-01` 우측 사이드바 녹음 목록을 뚱뚱한 카드 박스에서 Google Antigravity 스타일의 날렵한 메시지형 인디케이터 포맷(`otr-ag-row`)으로 전면 개편
- [x] `CLEAN-UI-02` 노트 본문 내 오디오 플레이어 2중 중복 생성 방어 (`hasAudioEmbedInMarkdown` 연동)
- [x] `CLEAN-UI-03` 전사 완료 시 본문 내부의 `<!-- on-the-record:... -->` 주석 태그 및 불필요한 헤딩 자동 청소 기능(`stripCommentMarkersFromNote`) 구현

### 플로팅 인디케이터 본문 영역 배치 및 UI 시인성 강화 (2026-11-27 완료)
- [x] `FLOAT-UI-01` 플로팅 캡슐 마운트 위치를 `workspace.rootSplit`으로 변경하여 사이드바 하단 버튼(`새 회의록 작성`)과의 겹침 완벽 차단
- [x] `FLOAT-UI-02` 호버 시 노출되는 일시정지/중지 컨트롤에 명확한 버튼 테두리(`border: 1px solid`) 및 배경/호버 스타일 적용

### 식별자 `-dev` 전면 제거 및 로컬 스토리지/패키지 클린 표준화 (2026-11-27 완료)
- [x] `DEV-PURGE-01` 로컬 AppData의 `on-the-record-dev` 폴더 내 모델(`ggml-base-q5_1.bin` 등) 및 런타임을 `on-the-record` 정식 표준 경로로 완전 마이그레이션 후 dev 폴더 영구 삭제
- [x] `DEV-PURGE-02` `local-settings.json` 내 저장된 경로에서 `on-the-record-dev` 문자열을 `on-the-record`로 갱신
- [x] `DEV-PURGE-03` 스크립트(`scripts/measure-whisper.ps1`), 벤치마크, 문서 전역의 `on-the-record-dev` 참조 전수 정규화
- [x] `DEV-PURGE-04` 기존 설치된 외부 패키지(`node_modules`) 전면 삭제 및 `npm install` 클린 재설치

### 기본 기능 극대화 및 UI 초간소화 전면 개편 (2026-11-27 완료)
- [x] `SIMPLIFY-01` 불필요한 AI 요약 기능 전면 보류 및 UI 제거 (`AI summary` 버튼, Ollama 설정 등 제거)
- [x] `SIMPLIFY-02` 환경설정 2-Tab 미니멀화 (`가속 & AI` 탭 제거, `전사 & 도구 설정` + `녹음 & 워크플로` 2개로 직관화)
- [x] `SIMPLIFY-03` 플로팅 인디케이터 풀 라이프사이클 구현 (`대기` → `녹음 중` → `전사 중 %` → `전사 완료!` 후 자동 페이드아웃)
- [x] `SIMPLIFY-04` 사이드바 100% 직관적 한글화 및 오디오 파일 직접 전사 지원
- [x] `SIMPLIFY-05` 녹음 종료 시 오디오 탭 강제 전환 방지 및 마크다운 편집 위치 유지
- [-] `HOLD-01` 로컬 LLM 연동 회의록 사후 요약 기능 전면 보류 (사유: 음성 전사 핵심 기능 집중을 위한 보류)
- [-] `HOLD-02` 다중 GPU 백엔드(Vulkan/OpenVINO) 매트릭스 UI 전면 보류 (사유: 기본 whisper.cpp 로컬 전사 파이프라인 안정화 우선)
- [-] `HOLD-03` 복잡한 템플릿 조건부 녹음 엔진 전면 보류 (사유: 기본 원클릭 녹음/전사 루프 완성 우선)

### 기본 핵심 기능 집중 감사 및 견고성 강화 (2026-11-27 완료)
- [x] `CORE-01` 전사 프로세스 타임아웃 현실화 (`SMOKE_TEST_TIMEOUT_MS`(5분)와 `TRANSCRIPTION_TIMEOUT_MS`(2시간) 분리하여 장시간 회의 전사 강제 종료 차단)
- [x] `CORE-02` CPU 스레드 동적 최적화 (하드코딩된 4스레드 탈피, `os.cpus()` 기반 75% 최적 논리 코어 자동 할당 및 사용자 옵션 스레드 전달)
- [x] `CORE-03` 런타임 및 모델 SHA-256 검증 메모리 캐싱 (매 전사마다 1.5GB~3.1GB 모델을 디스크에서 전수 재해싱하던 치명적 I/O 지연 해소)
- [x] `CORE-04` 백그라운드 전사 취소 연동 (`AbortSignal`을 FFmpeg 및 whisper.cpp 자식 프로세스로 전달하여 작업 취소 시 고아 프로세스 없이 즉각 종료)
- [x] `CORE-05` 노트 임베드 동적 재탐색 폴백 (전사 대기 중 사용자가 노트 상단에 텍스트를 작성하여 라인이 밀려도 오디오 링크를 찾아 안전 삽입)
- [x] `CORE-06` 임시 디렉터리 정리 예외 격리 (자식 프로세스 종료 직후 Windows 파일 락으로 인한 정리 실패 시 본래의 전사 오류가 은폐되지 않도록 방어)
- [x] `CORE-07` 비정상 종료 세션 시작 시 알림 복구 (`checkUnfinishedSessionOnStartup` 콜백 연결)

## 2026-11-26

### Stitch 시안 1:1 정밀 구현 및 누락 화면 완성 과제 (2026-11-26~27 완료)
- [x] `UI-05` Stitch 사이드바 1:1 정밀 DOM/CSS 이식 (`stitch-sidebar-and-floating.html` 기준, Issue #13 완료)
  - `Target note` 카드: 파일명 전용 인셋 박스 및 `● Record` 알약 버튼 시안 1:1 동기화
  - 오디오 임베드 카드: 하단 `[Jump]` 좌측, `[Transcribe]`(보라색) 우측 양끝 정렬(`justify-between`) 및 카드 테두리/배경색 일치
  - 임의 추가되었던 파형 녹음 카드(`.otr-rec-deck-card`) 정리 및 시안 사양 준수
- [x] `UI-06` Stitch 환경설정 '전사 & 모델' 탭 1:1 정밀 DOM/CSS 이식 (`stitch-settings-modal.html` 기준, Issue #14 완료)
  - 3개 로컬 도구 카드: 상단 제목 + Ready 배지 / 하단 풀폭 경로 입력창 + `[찾아보기]` 버튼 2단 커스텀 카드 구현
  - 하단 진단 바: `[도구 자동 검색]` 및 `[시험 시작]`(보라색) 우측 정렬
  - 5대 모델 카드 및 `--prompt` 어휘 힌트 카드 여백·구분선·배지 시안 완전 일치화
- [x] `DESIGN-01` Stitch 누락 시안 제작 및 HTML·PNG 추출 (Issue #15 완료)
  - Google Stitch MCP 공식 프로젝트(`projects/15695117177036898361`, 디자인 시스템 `assets/17724542724472707759`)에 3개 화면 정식 생성 완료
  - 환경설정 `Workflow(워크플로)` 탭 시안 생성 및 `docs/design/stitch-workflow-tab.html`, `stitch-workflow-tab.png` 추출 저장
  - 환경설정 `Acceleration & AI(가속 & AI)` 탭 시안 생성 및 `docs/design/stitch-acceleration-tab.html`, `stitch-acceleration-tab.png` 추출 저장
  - `Review Modal(전사 결과 검토 모달)` 시안 생성 및 `docs/design/stitch-review-modal.html`, `stitch-review-modal.png` 추출 저장
- [x] `UI-07` 신규 Stitch 시안 플러그인 1:1 코드 구현 (Issue #16 완료)
  - `settingsTab.ts` 워크플로 및 가속 탭에 확정된 Stitch 카드/토글/드롭다운 UI 정밀 이식 완료
  - `resultPreviewModal.ts`에 확정된 검토 모달(오디오 플레이어, 세그먼트 블록, 삽입 옵션 바) 1:1 DOM 및 인터랙션 구현 완료
  - `styles.css`에 Stitch 카드 스택, 토글, 2열 그리드 및 검토 모달 다크 테마 완비
  - 로컬 테스트 볼트(`C:\Cloud Files\OneDrive\PlugVaults\.obsidian\plugins\on-the-record`) 배포 검증 완료

### Wave 1~4 완료 내역 (GitHub Issues `#1`~`#12` 종료)
- [x] `FEAT-01`, `UI-01` TypeScript 오류 해소, 전용 리본 아이콘(`otr-record-deck`) 적용 및 `.otr-*` 순수 CSS 복구 (2026-11-26)
- [x] `FEAT-02`, `UI-02` 플로팅 녹음 상태 표시기(`src/floatingIndicator.ts`) 구현 — `starting`/`recording`/`paused` 표시, `idle` 및 앱 종료 시 숨김/제거 (2026-11-26)
- [x] `UI-03` 우측 사이드바 제어 패널 경량화 개편(`src/sidebarView.ts`) — 1줄 녹음 바, 활성 노트 부재 시 비활성화, 도구 미설정 안내, 전사 대기열 진행률 위젯 (2026-11-26)
- [x] `FEAT-03`, `UI-04` 설정 화면(`src/settingsTab.ts`) 3-Tab 구조, 준비 상태 배너, 범위 배지, `[찾아보기]` 파일 선택기, 기본 모델 `medium` 변경 및 `--prompt` 어휘 힌트 연동 (2026-11-26)
- [x] `FEAT-04`, `UI-04` 검토 모달(`src/resultPreviewModal.ts`) 미니 오디오 싱크 플레이어 및 세그먼트별 인라인 편집 구현 (2026-11-26)
- [x] `3-PROD-03` Obsidian 공식 린트(`eslint src/`) 오류 34건 전체 해소 (`0 errors`) (2026-11-26)

## 2026-11-07

### 레노버 노트북(다산동) 환경 점검 및 실기 검증

어제(2026-11-06) 삼성동 갤럭시북3에서 개발·검증된 기능들을 다산동 레노버 노트북(Lenovo IdeaPad Gaming 3 15IMH05, i7-10750H, GTX 1650 Ti, Node.js v22.16.0) 환경에서 대조 점검하고 실기 검증 및 차이점 수정을 진행했다.

#### 조치 및 검증 완료 사항
- [x] 프로젝트 내 충돌 사본 및 불필요 파일 정리: OneDrive 동기화 충돌 사본인 `package-G2300227.json` 및 0바이트 빈 파일 `scripts/update_todo.js` 검색 및 삭제 완료.
- [x] 외부 의존 도구 및 모델 보유 현황 점검: Chocolatey FFmpeg 9.0.1(`C:\ProgramData\chocolatey\bin\ffmpeg.exe`), whisper.cpp v1.9.5 b5454 런타임, 모델 2종(`base-q5_1.bin`, `small-q5_1.bin`) 정상 설치 확인.
- [x] 레노버 음성전사 성능 실측: `scripts/measure-whisper.ps1`을 통해 `real-sample-01`(130.5초) 기준선 실측 완료.
  - `base-q5_1`: 소요 32.6초(15.0초/오디오분, 4.0× 실시간), 최대 RAM 356 MB, 세그먼트 29개(반복 1회로 환각 루프 없음).
  - `small-q5_1`: 소요 55.5초(25.5초/오디오분, 2.35× 실시간), 최대 RAM 625 MB, 세그먼트 24개(반복 1회로 환각 루프 없음).
  - `scripts/summarize-records.ps1` 재집계 완료(`benchmarks/summary/summary.md`에 반영).
- [x] Node.js 호환성 조치: 레노버 Node.js v22.16.0 환경에서 `npm test` 실행 시 `.ts` 확장자 인식 실패(`ERR_UNKNOWN_FILE_EXTENSION`) 문제 해결 → `package.json`의 `test` 스크립트에 `--experimental-strip-types` 플래그 추가. 단위 테스트 45개 전건 통과 확인.
- [x] `2-CPU-06` 도구 자동 검색 경로 보강: 기존 검색 루트에 개발용 경로가 누락되어 레노버 환경에서 런타임/모델이 0건 검색되던 현상 수정 → `src/cpuRuntimeDiscovery.ts`의 `getCpuToolSearchRoots`에 `%LOCALAPPDATA%\on-the-record` 및 `%LOCALAPPDATA%\on-the-record` 추가. 레노버 환경에서 런타임 2종(`whisper-cli.exe`, `main.exe`) 및 모델 2종(`base`, `small`) 원클릭 검색 확인 완료 (경고 0건). 관련 단위 테스트 보강 통과.
- [x] 레노버 PC별 로컬 설정(`local-settings.json`) 초기화: `%LOCALAPPDATA%\on-the-record\local-settings.json`에 레노버 전용 경로(whisper-cli b5454, base-q5_1 모델, Chocolatey FFmpeg `C:\ProgramData\chocolatey\bin\ffmpeg.exe`)를 저장·검증 완료.
- [x] `2-CPU-01`~`2-CPU-03` 레노버 실기 검증: whisper-cli b5454 SHA-256·버전 검증, Chocolatey FFmpeg 9.0.1 기반 M4A 오디오 16 kHz 모노 PCM WAV 정규화, 시험 추론 및 JSON segment 초 단위 timestamp 파싱 전 과정 실기 검증 통과.
- [x] PlugVaults 최신 빌드 배포: production 빌드 생성 및 `%USERPROFILE%\OneDrive\PlugVaults\.obsidian\plugins\on-the-record\` 배포 완료(해시 일치 확인).

- [x] `2-CPU-04` / `2-CPU-05` 레노버 실기 데이터 파이프라인 및 노트 로직 검증:
  - 실제 `PlugVaults` 볼트 내 오디오(`Recording 20261103130854.m4a`)를 whisper.cpp로 직접 전사(`[몇 번째 영상은?]`) 성공.
  - 실제 테스트 노트(`On the Record Test Case 1.md`)를 대상으로 embed 탐색, 커서/지정 embed 바로 아래 삽입, 기존 전사문 교체(`replace`) 및 추가(`append`) 마크다운 블록 렌더링 검증 완료.
  - 전사문 검색 로직(`findTranscriptMatches`)으로 실제 노트 내 한국어 검색어("샘플", "실제") 매칭 및 행 번호 반환 검증 완료.
  - *(참고: 사용자가 Obsidian UI에서 직접 명령 팔레트로 모달을 열어 마우스/키보드로 승인·검색하는 최종 육안 확인만 남음)*
- [x] `3단계: GPU provider 평가` 하드웨어 및 드라이버 환경 점검 (레노버 특화 과제):
  - NVIDIA GeForce GTX 1650 Ti (4GB VRAM), 드라이버 580.88, CUDA 13.0 구동 정상 확인(`nvidia-smi`).
  - VRAM 메모리 용량(4GB) 분석: base(~500MB), small(~1GB), medium(~2GB) 모델의 완전 적재가 가능함을 확인.
- [x] `0-BASE-06` (후속 ②) 레노버 상위 모델 및 기준선 측정 완료:
  - 선행 조건 완료: `%LOCALAPPDATA%\on-the-record\models\`에 `medium-q5_0`, `large-v3-turbo-q5_0`, `large-v3-q5_0` 모델 파일 3종 다운로드 및 SHA-256 해시 검증 완료. 5대 기준 모델 전체 구비 완료.
  - 표본 `real-sample-01`(130.6초) 5대 모델 전수 측정 완료(스레드 8):
    - `base-q5_1`: 15.0초/오디오분, RAM 356 MB, 세그먼트 29 (Samsung과 세그먼트 일치)
    - `small-q5_1`: 25.5초/오디오분, RAM 625 MB, 세그먼트 24 (Samsung과 세그먼트 일치)
    - `medium-q5_0`: 55.3초/오디오분, RAM 1,251 MB, 세그먼트 15 (Samsung과 세그먼트 일치)
    - `large-v3-turbo-q5_0`: 82.5초/오디오분, RAM 928 MB, 세그먼트 25 (Samsung과 세그먼트 일치)
    - `large-v3-q5_0`: 171.3초/오디오분, RAM 2,128 MB, 세그먼트 40 (Samsung과 세그먼트 일치)
  - 표본 `real-sample-02`(21.5분) `medium-q5_0` 측정 완료: 1467.5초 소요(68.2초/오디오분), RAM 1,373 MB, 세그먼트 171개(Samsung 171개와 100% 일치, maxRepeat 1로 환각 루프 없음).
  - [BASE-06_LARGER_MODELS_2026-11-03.md](./docs/baselines/BASE-06_LARGER_MODELS_2026-11-03.md)에 Lenovo 비교 결과 반영 완료.
- [x] `0-BASE-09` 1시간 회의 소요 시간 집계표 갱신: 레노버 5대 모델 실측치(base 14.6분, small 26.0분, medium 68.2분, turbo 82.5분, large-v3 171.3분)를 집계표 문서(`docs/baselines/BASE-09_ONE_HOUR_MEETING_TIME_2026-11-03.md`) 및 `benchmarks/summary/summary.md`에 반영 완료.
- [x] `0-BASE-08` 모델별 전사 결과 정량/품질 검증 및 기본 권장 모델 확정 완료:
  - 전사문 품질 검증(개인정보 보호 원칙 준수, 본문 비공개): 한국어 비즈니스/IT 실무 회의 표본 3종(`real-sample-01~03`) 대상 전문용어(CMDB, syslog, config, metrics 등) 인식률, 대화형 발화자 분리(`-`), 조사 왜곡, 환각 무한 루프 억제력 평가 완료.
  - 환각 억제력 검증: 44분 장시간 회의에서 `base`(904회 반복) 및 `turbo`(918회 반복)가 루프에 빠진 반면, `medium`은 92.6%의 높은 고유율과 최대 반복 12회로 압도적 안정성을 입증.
  - 최종 결정: **기본 권장 모델 `medium-q5_0` 확정**, **경량/초고속 옵션 `small-q5_1`**, **고정밀 옵션 `large-v3-q5_0`(향후 GPU 연계 권장)**.
  - 1시간 회의 처리 시간 목표 확정: 기본 모델 기준 **70분 이내** 완료 (1:1 준실시간 허용).
  - [BASE-08_MODEL_SELECTION_2026-11-07.md](./docs/baselines/BASE-08_MODEL_SELECTION_2026-11-07.md) 작성 완료.
- [x] `0-ENV-16` 실제 배포 구성요소 라이선스 확정 및 프로젝트 소유권 정리 완료:
  - 배포 아티팩트 라이선스 검증: 플러그인이 외부 런타임/모델을 번들링 배포하지 않기로 확정(`0-ENV-08`)함에 따라 제3자 바이너리 재배포 SBOM 의무가 소멸되었고, 실제 플러그인 배포물(`main.js`)은 npm 런타임 의존성 0개의 순수 자체 개발 MIT 코드임을 확인하여 완료 종결.
  - 프로젝트 소유권 및 저작권자 갱신: 본 프로젝트는 **박성원(SUNGWON PARK)의 독립 오픈소스 프로젝트(MIT)**로 확정. 저작권자를 `SUNGWON PARK`으로 확정하고 `LICENSE`, `README.md`, `SUPPORT.md`를 오픈소스 프로젝트 기준으로 전면 갱신.
- [-] `0-ENV-15` 외부 GitLab 접속 인증서 검토 종료: 소스코드 배포처를 GitHub(`https://github.com/sparklings/ontherecord`)으로 공식 확정하고 독립 오픈소스 프로젝트로 정립함에 따라, 외부 GitLab 연동 과제를 공식 종료(취소) 처리.

#### 3단계 과제 통합 및 재정리 완료 (3단계: 제품 완성 및 녹음·전사 워크플로 통합)
- 분산되어 있던 3단계 이후, 상용성·제품화, 녹음 노트 기획 과제의 상충 요소를 해소하고 현행 구현 현황을 반영하여 7대 영역 단일 3단계로 취합·재편:
  - 1. 음성 녹음 라이프사이클 및 노트 연동 (`3-REC-01` ~ `3-REC-11`)
  - 2. 비차단 백그라운드 전사 파이프라인 및 자동 인계 (`3-PIPE-01` ~ `3-PIPE-06`)
  - 3. 외장/내장 GPU 가속 및 런타임 최적화 (`3-GPU-01` ~ `3-GPU-03`, `3-CPU-01`)
  - 4. 사용자 온보딩, 설정 구조 및 셋업 헬퍼 (`3-UX-01` ~ `3-UX-03`, `3-UX-06` ~ `3-UX-08`, `3-DOCS-01`)
  - 5. 사후 분석 및 로컬 AI 연계 (`3-POST-01`)
  - 6. 전용 사이드바 제어 패널 및 플레이어형 워크플로 (`3-UX-04` ~ `3-UX-05`, `3-UX-09` ~ `3-UX-13`)
  - 7. 프로젝트 구조 정규화 및 플러그인 ID 유지 확정 (`3-ENV-17`, `3-PROD-02`)

## 2026-11-05

### 라이선스 및 공개 준비

- [x] `0-ENV-16` 실제 배포 구성요소의 라이선스·고지 확정 → 완료(2026-11-07): 외부 런타임/모델 번들링 배포를 제외(`0-ENV-08`)함에 따라 제3자 바이너리 SBOM 의무가 소멸되었고, 플러그인 배포물(`main.js`)은 npm 런타임 의존성 0개의 순수 자체 MIT 코드임을 확인하여 종료.
- 프로젝트 자체 코드에 MIT 정책을 적용한다. 본 프로젝트는 **박성원의 독립 오픈소스 프로젝트**이며, 저작권자는 `SUNGWON PARK (박성원)`으로 `LICENSE`에 반영했다.

## 2026-11-01

### 0단계: 기준선 및 환경

진행 순서대로 나열한다. 코드 번호는 순서와 무관하다. 순서 기준은 (1) 이름·저장소·라이선스 결정에 의존하지 않는 것, (2) 다른 작업의 입력이 되는 것을 앞에 둔다.

- [x] `0-ENV-14` 하드웨어 프로필 기록 형식 정의(기기, CPU/GPU, 드라이버, provider·모델 버전, 처리율, 메모리) → [HARDWARE_PROFILE.md](./docs/design/HARDWARE_PROFILE.md) 초안 작성(2026-11-01). 프로필 자료는 `benchmarks\` 폴더에 보관. Lenovo 프로필 작성 완료, Samsung 프로필 작성 완료(2026-11-02, `samsung-960xfg.json`). `0-BASE-04` 측정 중 부족한 항목이 나오면 수정 (`0-BASE-04` 측정 기록의 형식이 됨)
- [x] `0-ENV-04` `node_modules`·빌드 산출물의 OneDrive 동기화 제외 또는 재생성 방식 결정 (프로젝트 초기화 전에 정해야 함) → **결정(2026-11-01): AssistantEmily와 동일.** OneDrive 동기화는 허용하고 `.gitignore`로 Git에서만 제외한다. PC 전환 후 `npm ci`로 재생성할 수 있어야 하므로 `package-lock.json`을 버전 관리한다. 근거: OneDrive에는 폴더 단위 제외 기능이 없고(웹 검색 요약, 공식 문서 미확인), AssistantEmily의 `node_modules`(11,736개 파일, 108 MB)는 네이티브 `.node` 파일 없이 esbuild win32-x64 바이너리만 있어 두 PC(Windows x64)에서 문제가 없었다. 재검토 조건: 네이티브 모듈 의존성이 추가되거나 PC 간 `node_modules` 불일치가 발생하면 폴더를 프로젝트 밖으로 옮기고 junction으로 연결하는 방식을 검토한다. whisper.cpp 실행 파일·모델은 프로젝트 밖 사용자별 데이터 폴더에 설치하므로 이 결정과 무관하다.
- [x] `0-ENV-03` `.gitignore` 작성(`node_modules`, 빌드 산출물, 모델·런타임, 비밀 값) → [.gitignore](./.gitignore) 작성(2026-11-01). AssistantEmily 기준 항목에 모델·런타임(`*.gguf`, `ggml-*.bin`, `runtimes/`, `models/`), `.local/`, 표본 데이터 폴더 전체(`samples/`), OS 파일을 추가. Git 제외 동작은 `0-BASE-01` 표본으로 확인(2026-11-02); 0-BASE-02 시작 전 오디오뿐 아니라 표본의 전사문·메타데이터도 실수로 push되지 않도록 `samples/` 전체 제외로 강화(2026-11-02).
- [x] `0-ENV-13` 설정 저장 구조 설계: vault 설정과 PC별 설정 분리 → [SETTINGS_DESIGN.md](./docs/design/SETTINGS_DESIGN.md) 초안 작성(2026-11-01), 동기화 방식 비의존으로 수정(2026-11-01). vault 설정은 `data.json`, PC별 설정과 런타임·모델은 `%LOCALAPPDATA%\<plugin-id>\`. 미결정: 외부 경로 입력, 저장 직전 수정 시각 확인

- [x] `0-ENV-05` 플러그인 id, 이름 결정 → **결정(2026-11-01): 이름 `On the Record`, id `on-the-record`, 부제 `Local minutes for Obsidian`, 저자 `SUNGWON PARK`(변경: 기존 `Sungwon Park (SG)`), 저장소명 `ontherecord`(접근성 우선, 보고서의 기존 `obsidian-on-the-record`에서 변경).** 근거: [네이밍 보고서](./docs/research/OntheRecord_사업보고서_네이밍.md). id 규칙(소문자·하이픈, `obsidian` 미포함, `plugin` 미종료)과 커뮤니티 목록 중복 없음은 보고서 기준 확인됨(2026-11-01 목록 9,755개). 미확인: 국내·USPTO 상표 검색(9·42류), 도메인 확보. 상표 결과에 따라 이름이 바뀔 수 있으며, 그 경우 id는 공개 전까지만 변경 가능하다
- [x] `0-ENV-02` Git 저장소 생성 및 GitHub 원격 연결 → 완료(2026-11-01). 로컬 저장소(`main`, `.gitignore` 동작 확인) 첫 커밋 후 private 저장소 `https://github.com/sparklings/ontherecord` 생성·push. Git 사용자 정보는 전역 설정, `gh` 2.103.3 설치·로그인(`sparklings`)

#### 출시 준비 확인

- [x] `0-ENV-11` 플러그인 프로젝트 초기화(AssistantEmily 구조 참조) → 완료(2026-11-01). 저장소 루트에 `manifest.json`(id `on-the-record`, `isDesktopOnly: true`), `versions.json`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `eslint.config.mjs`, `src/main.ts` 생성. `package.json`은 `private: false`, `license: MIT`. 잠정값: `minAppVersion` 1.7.2, 버전 0.0.0.
- [x] `0-ENV-12` PlugVaults 배포 절차 작성(빌드 결과를 `.obsidian\plugins\<id>\`에 복사) → 완료(2026-11-01). [scripts/deploy.mjs](./scripts/deploy.mjs)와 `npm run deploy` 추가. 절차: (1) 프로덕션 빌드 (2) `main.js`, `manifest.json`, `styles.css`(있을 때만)를 `<vault>\.obsidian\plugins\on-the-record\`에 복사 (3) Obsidian에서 플러그인 활성화(최초 1회) 또는 재활성화. 대상 vault는 환경 변수 `OTR_TEST_VAULT`, 없으면 `%USERPROFILE%\OneDrive\PlugVaults`.
- [x] `0-ENV-06` 라이선스 정책 확정 → **결정: 프로젝트 자체 코드는 완전한 MIT 라이선스를 적용한다.** 박성원의 독립 오픈소스 프로젝트로 공개한다.
- [x] `0-ENV-07` 소프트웨어 권리 귀속 확인 → 박성원의 독립 프로젝트임을 확인하고, 저작권자 `SUNGWON PARK (박성원)` 표기를 `LICENSE`에 반영 완료.
- [x] `0-ENV-08` 공개 GitHub 저장소와 Obsidian 커뮤니티 플러그인 등록 정책 확인 → 공식 정책·제출 요건·FAQ·제출/관리 절차를 2026-11-05 대조하고 [정책 검토 문서](./docs/research/Obsidian_디렉터리정책_상충검토.md), README에 반영. 플러그인·의존성 설치/업데이트 금지에 따라 런타임·모델 자동 다운로드·설치를 배제하고 사용자 직접 관리로 확정.
- [x] `0-ENV-10` 의존 구성 요소(`whisper.cpp`, 모델, 오디오 변환기)의 예비 라이선스 조사 → 플러그인이 바이너리/모델을 번들링 배포하지 않기로 확정함에 따라, 로컬 사용자 설치 소프트웨어로서 각각의 라이선스(whisper.cpp MIT, FFmpeg LGPL/GPL)를 따름을 확인.
- [x] `0-ENV-09` MIT 정책 표기, `LICENSE` 파일 저작권자(`SUNGWON PARK`) 반영, README 및 패키지 메타데이터 갱신, 오픈소스 프로젝트 지원 안내 문서(`SUPPORT.md`) 작성 완료.

#### 보류: 장소·장비 사유

- [-] `0-ENV-15` 외부 GitLab 접속의 `http.sslVerify=false` 대체 검토 → 종료(2026-11-07, 취소): 소스코드 배포처를 GitHub(`https://github.com/sparklings/ontherecord`)으로 공식 확정하고 독립 오픈소스 프로젝트로 정립함에 따라, 외부 저장소 연동 이슈는 모두 불필요하여 공식 종료(취소) 처리.

- [x] `0-ENV-01` Samsung PC에서 `Get-CimInstance Win32_VideoController` 조회, GPU 구성 확인 후 `systeminfo_Samsung_960XFG.md`와 개발계획서 수정 → 2026-11-02 확인: Intel Iris Xe Graphics, 드라이버 32.0.101.7088, `AdapterRAM` 2,147,479,552 bytes, `VEN_8086&DEV_A7A0`. 시스템 정보와 OntheRecord 개발계획서에 반영하고 [GPU 확인 기록](./docs/baselines/HARDWARE_CHECK_SAMSUNG_960XFG_2026-11-02.md) 추가. GPU provider 및 실제 가속은 별도 검증 필요.

### 0단계: 입력·전사 기준선
- [x] `0-BASE-01` 확장자별(`.m4a`, `.mp3`, `.wav`, `.aac`, `.ogg`) 오디오 표본 수집 → 2026-11-02 합성 표본 5종 및 실제 M4A 원본 3종과 변환본 12종을 확보해 FFmpeg 디코딩 확인. 실제 표본은 제공된 첨부 폴더에서 대표 3개를 익명 ID로 로컬 보관하고 나머지 파일은 복사하지 않음. SHA-256과 코덱·길이 기록: [형식 표본 기록](./docs/baselines/BASE-01_AUDIO_FORMAT_FIXTURES_2026-11-02.md). 다른 출처의 코덱 변형은 후속 검증 대상.
- [x] `0-BASE-02` 한국어 회의 샘플 준비(출처·해시 기록) → 2026-11-02 사용자가 한국어 회의 샘플임을 확인한 실제 녹음 3개를 `samples\real-audio\`에서 기준 오디오로 지정하고 출처·기술 메타데이터·SHA-256 기록. Git 제외·미추적 상태 확인. 전사 기준본/품질 채점 세트는 참여자 동의 및 조직 정책 확인 후 별도 준비. 상세: [샘플 출처·무결성 기록](./docs/baselines/BASE-02_KOREAN_MEETING_SAMPLES_2026-11-02.md)
- [x] `0-BASE-03` `whisper.cpp` Windows x64 CPU 빌드 또는 배포본 선정, 라이선스 확인 → 완료(2026-11-02): v1.9.5(=`b5454` 바이너리 태그) `whisper-bin-x64.zip`, MIT, 해시 고정. `whisper-cli`는 flac/mp3/ogg/wav만 읽음(m4a/aac 불가). [기록](./docs/baselines/BASE-03_WHISPER_CPP_RUNTIME_2026-11-02.md)
- [x] `0-BASE-04` 두 PC에서 `base`·`small` 양자화 모델의 처리율·메모리·전사 결과 측정 → 완료(2026-11-02, 장치별 기록 8건). Lenovo 긴 샘플 기준 base 14.5~14.7초/오디오 1분, small 25.5~26.4초/오디오 1분, 최대 RAM 약 0.72 GB. 전사 품질(CER)은 미평가. [결과](./docs/baselines/BASE-04_THROUGHPUT_MEASUREMENT_2026-11-02.md)
- [x] `0-BASE-05` 오디오 변환기(decoder) 후보 선정 및 라이선스 확인 → 완료(2026-11-02): FFmpeg 9.0.1 공식 소스의 LGPL 기본 빌드를 제품 후보로 선정하고, 합성 표본 5종 및 실제 Opus/M4A 3종의 Lenovo 디코딩 확인. 현재 PC의 GPLv3 빌드는 시험 전용이며 제품용 실행 파일·배포 고지·Obsidian 설치 정책 검토는 제품화 단계에서 별도 확인. [검토 기록](./docs/baselines/BASE-05_AUDIO_DECODER_2026-11-02.md)

- [x] `0-BASE-06` 상위 모델(`medium`, `large-v3-turbo`, `large-v3`) 입력 전사 기준선 확대 측정 → Samsung 완료(2026-11-03) 및 Lenovo 측정 완료(2026-11-07): 두 PC 모두 5대 모델 구비 및 실측 완료. `real-sample-01`(2.2분, 2회) 5개 전 모델 및 `real-sample-02`(21.5분, 1회) medium 측정 완료. 세그먼트 수가 두 PC에서 100% 일치(base 29, small 24, medium 15/171, turbo 25, large-v3 40)함을 확인. Lenovo 1시간 환산: base 14.6분, small 26.0분, medium 68.2분, turbo 82.5분, large-v3 171.3분. 모델 최종 선정은 `0-BASE-08` 육안 검증 후 결정. [결과](./docs/baselines/BASE-06_LARGER_MODELS_2026-11-03.md).
  - 모델: 각 `q5_0`, Hugging Face `ggerganov/whisper.cpp` 커밋 `5359861`로 고정, SHA-256 검증 완료(`medium` 514MB, `large-v3-turbo` 547MB, `large-v3` 1,031MB). `*.en`, `large-v1/v2`, `tiny`는 제외(영어 전용·구버전·한국어 품질 부족). 파일은 저장소 밖 `%LOCALAPPDATA%\on-the-record\models\`
  - 조건: whisper.cpp b5454 CPU 전용, `-l ko -t 8`, `scripts\measure-whisper.ps1`. 샘플 `real-sample-01`은 2회, `real-sample-02`는 1회(소요 시간 때문). 비교 기준은 `0-BASE-04`의 `base`/`small`
  - 장치: Samsung 960XFG 먼저(완료), 이후 Lenovo에서 같은 모델·해시·스레드로 반복
  - 기록: `benchmarks\records\<deviceId>\` JSON(장치별 하위 폴더, 2026-11-03 정리), 결과 요약은 `docs\baselines\BASE-06_...md`에 추가. 지표는 처리 시간/오디오 1분, 최대 RAM, 세그먼트 수, 반복 세그먼트 수. 요약표는 `scripts\summarize-records.ps1`로 생성
  - 판정: 1시간 회의를 허용 가능한 시간(목표는 사용자 확정 필요) 안에 처리하는 최상위 모델을 기본값 후보로 선정, 나머지는 선택 옵션
  - 진행(2026-11-03): Samsung에서 `real-sample-03`(44분) 5개 모델 1회씩 측정 완료(기록 010~014). 오디오 1분당 base 8.3초, small 12.0초, medium 43.9초, turbo 61.4초, large-v3 109.9초. 반복(한 줄 최대 반복): base 904, small 107, medium 12, turbo 918, large-v3 36 → 속도 수치는 반복 출력 포함, 모델 선정 근거로 단독 사용 금지
  - 마무리 결정(2026-11-03): 시스템 부하별 추가 시험은 하지 않음(재실행 해시 동일, 두 PC 세그먼트 수 동일). Samsung 모델 측정을 종료하고 모델 선정은 `0-BASE-08` 육안 검증 후 결정
  - 후속(미착수): ① 스레드 수(4/8/12/16) 영향, q8_0·fp16 비교, ② **Lenovo에서 `medium`·`large-v3-turbo`·`large-v3` 측정 예정**(같은 모델·해시·`-t 8`, 샘플 01~03, 결과는 `0-BASE-09` 집계표에 반영), ③ Iris Xe/GTX 1650 Ti GPU 빌드는 별도 평가. 반복 억제 옵션 효과는 `0-BASE-08`에서 함께 확인. 정량 품질(CER)은 `0-BASE-02`의 동의·정책 확인 후 진행
- [x] `0-BASE-09` 1시간 회의 전사 소요 시간 집계표 → 완료(2026-11-03): 기존 요약(`summarize-records.ps1`)은 오디오 1분당 초만 있어 보강해 "1시간 환산" 표를 추가하고, 장치·모델별 집계표 문서를 작성. Samsung 5개 모델 완료(base 8.3분, small 12.0분, medium 43.9분, turbo 61.4분, large-v3 109.9분), Lenovo는 base·small만 있고 medium 이상 미측정. 새 측정마다 스크립트 재실행 후 표 갱신. [집계표](./docs/baselines/BASE-09_ONE_HOUR_MEETING_TIME_2026-11-03.md)
- [x] `0-BASE-08` 모델별 전사 결과 육안 검증 후 기본 모델·선택 옵션 결정 → 완료(2026-11-07):
  - 대상: `base`, `small`, `medium`, `large-v3-turbo`, `large-v3`의 `real-sample-01~03` 전사문 통계 및 품질 비교.
  - 품질 평가: IT/비즈니스 전문용어(CMDB, syslog, config 등)의 알파벳/외래어 복원력, `-` 기호 기반 대화형 발화자 전환 분리, 구어체 완성도에서 `medium`이 압도적으로 우수.
  - 환각 억제: 44.2분 장시간 표본에서 base(904회)·turbo(918회)·small(107회) 루프 발생 시, medium은 유일하게 92.6% 고유 세그먼트 및 최대 반복 12회로 정상 완주.
  - 개인정보 보호: 회의 본문 원문 발췌는 저장소/문서에 일절 미기재.
  - **최종 결정**: 기본 권장 모델 **`medium-q5_0`**, 보조 초고속 옵션 **`small-q5_1`**, 고정밀 오프라인 옵션 **`large-v3-q5_0`**(향후 GPU provider 연계).
  - **허용 시간 목표**: 1시간 회의 기준 기본 모델 **70분 이내** 처리 (고속 모델 30분 이내).
  - 산출물: [BASE-08_MODEL_SELECTION_2026-11-07.md](./docs/baselines/BASE-08_MODEL_SELECTION_2026-11-07.md).
- [x] `0-BASE-07` 다수 장치 누적 대비 측정 데이터 운영 → 완료(2026-11-03): 기록은 `benchmarks\records\<deviceId>\`에 추가만 하고, `scripts\summarize-records.ps1`로 요약(생성물은 Git 제외). 조건(런타임·모델·샘플 해시, 스레드) 동일 기록만 비교, 전원 상태 자동 기록. 새 장치 추가 절차는 [benchmarks\README.md](./benchmarks/README.md), 규칙은 [HARDWARE_PROFILE.md](./docs/design/HARDWARE_PROFILE.md) "대량 누적 운영". 기록이 수천 건을 넘으면 SQLite 이전 검토

### 0단계: Obsidian 연동 검증
- [x] `0-OBS-01` 대상 Obsidian 버전에서 공개 API만으로 코어 Audio recorder 산출물 생성·변경 감지 가능 여부 확인 → 2026-11-02 Obsidian 1.14.4, `PlugVaults`에서 공개 `app.vault` 이벤트를 시험. 코어 recorder의 `.m4a` 생성 이벤트 1회 감지(77,134 bytes), 녹음 중 `modify` 이벤트는 관찰되지 않음. 생성 감지는 가능하지만 진행 중 변경·종료 시점 판정은 미입증. [시험 기록](./docs/baselines/OBS-01_AUDIO_RECORDER_EVENT_PROBE_2026-11-02.md)
- [x] `0-OBS-02` 파일 안정화 감지 조건(수정 시각·크기) 시험 → 완료(2026-11-03): 판정 로직 구현(`src\stability.ts`, 단위·실제 파일 시뮬레이션 9건 통과)과 코어 Audio recorder 실제 녹음 4건 확인. 코어 recorder는 종료 시 파일을 한 번에 생성(변경 0회, 5초 후 안정화 판정), `quietMs` 5초 확정. 다른 녹음 앱·동기화 유입 파일은 미확인. [시험 기록](./docs/baselines/OBS-02_FILE_STABILITY_2026-11-03.md)
- [x] `0-OBS-03` 노트 링크 삽입 시점 확인 → 2026-11-05 Obsidian 1.14.5 `PlugVaults` 코어 Audio recorder 실제 녹음 1회에서 `.m4a` 생성 후 약 2.008초 뒤 Markdown 노트가 수정됐고, 최종 노트에 오디오 embed가 있음을 확인. 수정 시각은 링크 삽입 시각의 대리값이며 단일 시험이므로 반복 검증은 미완료. 구현 시 파일 안정화 외에 공개 MetadataCache의 링크 확인을 요구하고 제한 시간 후 수동 선택으로 복구한다. [시험 기록](./docs/baselines/OBS-03_AUDIO_NOTE_LINK_TIMING_2026-11-05.md)

### 1단계: 공통 파이프라인
- [x] `1-PIPE-01` 설정 화면 → 구현 및 Obsidian에서 저장·복원 확인 완료(2026-11-05, 사용자 확인). 구현: `src\settings.ts`, `src\localSettingsStore.ts`, `src\settingsTab.ts`. vault 설정은 `loadData`/`saveData`, PC별 런타임·모델 경로는 `%LOCALAPPDATA%\<plugin-id>\local-settings.json`에 저장한다. 녹음 감지 및 안정화 시간 변경은 watcher에 반영하며 자동 전사/언어/모델/장치 기본값을 제공한다. PC별 갱신은 여러 창에서 직렬화한다. 런타임 경로 검증은 후속 범위다.
- [x] `1-PIPE-02` 녹음 감지와 자동 전사 대기열 → 설정(`autoDetectRecording`, `autoTranscribe`, `stabilizationSeconds`)과 watcher 연결. 파일 안정화 후 공개 MetadataCache에서 오디오 embed를 확인하며, 최대 30초 내 링크가 없으면 안내하고 큐잉하지 않는다. 메모리 대기열은 파일 경로로 중복을 막고 삭제·이름 변경을 반영한다. Obsidian에서 녹음 감지 및 설정 토글 수동 시험 완료(2026-11-05, 사용자 확인). 대기열 UI·디스크 영속성·전사 worker/provider 실행은 후속 범위. 구현: `src\main.ts`, `src\recordingWatcher.ts`, `src\linkWaiter.ts`, `src\recordingQueue.ts`; 단위 테스트 통과.
- [x] `1-PIPE-03` 파일 찾기 버튼 → 리본 아이콘과 명령 팔레트에서 vault의 지원 확장자 오디오를 선택하고, 파일 존재·비어 있지 않음·안정화 상태를 확인해 메모리 대기열에 전달한다. 수동 선택은 녹음 자동 감지 설정과 독립적이다. Obsidian에서 이미 안정된 파일 선택 후 대기열 추가 알림과 동일 파일 재선택 시 중복 거부 알림을 확인(2026-11-05, 사용자 확인). 컨테이너/코덱 및 손상 여부 판정은 디코더 검증 단계에서 추가한다. 자동 시험 22개 통과.
- [x] `1-PIPE-04` provider 계약 정의 → 완료(2026-11-05): `src\provider.ts`에 provider 메타데이터·준비 상태·정규화 요청·진행률·초 단위 segment 결과·공통 오류와 취소 신호 계약을 정의하고 오류 타입 테스트를 추가했다. 타입 검사, lint, 테스트 23개, production build 통과. 특정 엔진 구현, provider 선택/registry, worker 연결 및 mock provider 통합 시험은 후속 범위다.
- [x] `1-PIPE-05` 결과 미리보기 → 완료(2026-11-05, 사용자 Obsidian 수동 시험 확인; 모달 한글 깨짐은 UTF-8 재작성으로 수정): `src\resultPreview.ts`(시간 형식, 마크다운 변환, 마커 기반 기존 결과 추적), `src\resultPreviewModal.ts`(검토·편집·승인·취소, 기존 결과 확인 모달), 시험용 명령 "샘플 전사 결과 미리보기 시험". 당시 지정 헤딩 아래 삽입은 `2-CPU-05`에서 녹음 embed 바로 아래 삽입으로 대체한다. 승인 전에는 노트를 수정하지 않는다. 타입 검사, lint, 테스트 29개, build 통과.

### 2단계: CPU 전사
- [x] `2-CPU-01` 사용자가 플러그인 외부에서 설치한 런타임·모델의 경로·버전·SHA-256 검증 및 시험 추론 → 완료(2026-11-06, 사용자 Obsidian 실제 시험 추론 성공 확인): 설정에서 선택한 짧은 WAV/MP3/OGG/FLAC 파일로 시험하며, whisper.cpp v1.9.5 실행 파일과 기준 모델 5종의 SHA-256을 확인한다. 시험 전사문은 임시 폴더에만 만들고 삭제한다. 다운로드·설치·업데이트·삭제는 제공하지 않으며, 배포 후보 artifact 검토는 `0-ENV-16`에 따른다.
- [x] `2-CPU-02` 오디오 정규화 → 완료(2026-11-06, PlugVaults에서 사용자 지정 FFmpeg로 시험 추론·정규화 성공 확인): 입력 오디오를 16 kHz 모노 signed 16-bit PCM WAV로 변환해 임시 폴더에서 추론하고, 변환 파일·전사문을 종료 시 삭제한다. M4A/MP3/WAV/AAC/OGG/FLAC 입력을 연결하며, FFmpeg는 자동 설치·업데이트하지 않는다. Obsidian에서 추가 형식별 실기 확인은 별도 수행한다.
- [x] `2-CPU-03` segment timestamp 출력 → 구현 완료(2026-11-06): whisper.cpp JSON(`-oj`)의 segment offsets(1/100초)를 초 단위 `TranscriptionResult.segments`로 변환한다. `transcribe()`는 언어·전체 문장·segment별 시작/종료 시각·엔진 정보를 반환하고 JSON/정규화 임시 파일을 삭제한다. 잘못된 JSON 및 오프셋은 명시적으로 거부한다. 실제 런타임 Obsidian 결과 표시와 노트 연결은 후속 범위. 타입 검사, lint, 테스트 35개 통과.
- [x] `2-CPU-04` 전사문 검색 → 완료(2026-11-06, PlugVaults 빈 Markdown 노트에서 샘플 미리보기·삽입 및 검색 실기 확인): 설정에 저장된 이전 검색어 제안 표시, 검색 결과 확인 및 일치 segment 위치 이동을 확인했다. 검색은 전사 결과 블록 내 timestamp가 있는 segment에 한정하며 단어/고유명사 자동 추출은 하지 않는다. 자동 테스트 38개 통과.
- [x] `2-CPU-05` 결과 삽입(녹음 embed 바로 아래, 재전사 시 추가/교체 확인) → 완료(2026-11-06, PlugVaults 실기 확인 사용자 완료 보고): 사용자가 실제 CPU 전사 실행 및 결과 생성을 확인했다. 명령 실행 시 현재 Markdown 노트의 지원 오디오 embed만 표시하고 커서 위 가장 가까운 embed를 기본 선택한다. 결과는 승인 후 해당 embed 바로 아래에 삽입하며, 재전사 시 기존 결과를 추가/교체/취소한다. 전사 품질 개선은 플러그인 범위에서 제외하고 `3-CPU-01`로 이관한다.
- [x] `2-CPU-06` 사용자가 설치한 CPU 런타임과 모델 자동 검색 → 완료(2026-11-06, PlugVaults 검색 기능 정상 동작 사용자 확인): 알려진 로컬 설치 위치에서 후보를 찾아 버전·SHA-256을 확인하고, 적용할 조합을 사용자가 선택·승인한 뒤 PC별 설정에 저장한다. 전체 PC 검색, 다운로드·설치·업데이트·삭제 및 다운로드 명령 안내는 이 기능 범위에서 제외하고 `3-CPU-02`에서 검토한다.

### 3단계: 제품 완성 및 녹음·전사 워크플로 통합

2단계까지 검증된 로컬 CPU 전사 엔진과 파일 안정화 파이프라인을 바탕으로, **(1) 음성 녹음 라이프사이클과 노트의 안전한 연동**, **(2) 비차단 백그라운드 전사 큐 및 자동 삽입 워크플로**, **(3) 외장 GPU(GTX 1650 Ti) 가속 및 환각 방지 최적화**, **(4) Obsidian 정책을 준수하는 사용자 셋업 헬퍼 및 온보딩**, **(5) 로컬 LLM 사후 요약 연계**를 차별 없이 단일 3단계로 통합하여 구현한다.

#### 1. 음성 녹음 라이프사이클 및 노트 연동 (REC)
> 기존 파일 생성 후 수동 탐색 방식(`linkWaiter.ts`)의 불확실성을 해소하고, 노트 기반 단일 세션 모델로 녹음 시작부터 탭 닫힘 시 안전 연결까지 전 과정을 자동화한다.

- [x] `3-REC-01` 코어 Audio recorder 제어 및 노트 기반 녹음 세션 시작 (`F-01`, `F-02`, `F-03`, `C-01`, `C-03`) → 완료(2026-11-07):
  - 시작 방식 2종(자동 `auto` / 수동 `manual`) 및 알림 피드백(`recordStartNotification`)으로 개념 재정의 및 구조 개편.
  - 환경 설정: `recordStartMode`(`auto`(기본값) | `manual`), `recordStartNotification`(`true`(기본값) | `false`), `autoRecordFolder` 필터 추가.
  - 노트 frontmatter 우선 판별(`recorder: auto | manual | silent | confirm | false/off`):
    - `resolveRecordStartMode`: `auto` 또는 `manual` 2종으로 명확히 분류 (`confirm`은 하위 호환 자동 처리).
    - `resolveRecordStartNotice`: `silent` 명시 시 무음, 그 외에는 설정 기본값 적용.
  - 시작 방식 2종 및 피드백 동작:
    - **자동 시작형 `auto`(기본값)**: 새 노트 생성 시 즉시 코어 recorder 개시. 알림 설정(`recordStartNotification`)이 켜져 있으면 우측 상단 토스트 알림(`Notice("음성 녹음을 시작합니다.", 4000)`) 표시, 꺼져 있으면 무음 즉시 개시.
    - **수동 시작형 `manual`**: 새 노트 생성 시 자동 개시를 방지하고 명시적 명령 실행 시에만 개시.
  - 세션 모델 및 디스크 영속화: 단일 활성 세션(`{ notePath, startedAt, seq }`) 관리, Obsidian 플러그인 디렉터리 내 `active-session.json` 디스크 영속화 및 앱 재시작 시 자동 복원(`restore`) 구현.
  - 명령 추가: "현재 활성 노트에서 음성 녹음 시작"(`start-recording`), "음성 녹음 중지"(`stop-recording`).
  - 단위 테스트: `test/recordingSession.test.ts`(11개 항목) 및 `test/settings.test.ts` 확장 완료 (전체 56개 테스트 통과).
- [x] `3-REC-02` 탭 닫힘 감지 및 녹음 자동 안전 중지·연결 (`F-04`, `F-05`, `C-02`) → 완료(2026-11-19): 녹음 중인 노트 탭이 닫힐 때(`WorkspaceLeaf.prototype.detach` 래핑) 녹음을 자동 안전 중지하고 생성된 오디오를 해당 노트에 안전하게 연결(attach, `attachAudioEmbedToMarkdown`)하도록 구현. 코어가 새 탭으로 오디오 파일을 여는 동작 자동 닫기(`S-09`) 및 에디터 내 임베드 중복 삽입 방지(`S-10`)를 처리하고, 닫힘 시 동작 옵션(`onTabCloseAction`: `stop-and-attach`(기본값) | `ignore`)을 제공. 단위 테스트 5개(`test/tabClose.test.ts`) 전건 통과.
- [x] `3-REC-03` 단일 문서 내 다중 녹음 파일 지원 및 세션 격리 매핑 (`F-08`, 다중 세션 확장) → 완료(2026-11-19): 마크다운 문서 하나에 여러 개의 녹음 파일/임베드가 순차 누적(`seq = recording_count + 1`)될 수 있도록 확장. 각 세션별 고유 마커(`<!-- on-the-record:start audio="..." seq="N" -->` ~ `<!-- on-the-record:end ... -->`)를 부여하여, 다중 녹음의 전사 결과가 서로 덮어쓰지 않고 독립적으로 삽입·교체·관리되도록 격리. 단위 테스트(`test/noteMetadata.test.ts`) 통과.
- [x] `3-REC-04` Frontmatter 집계 속성 및 본문 녹음 블록 2중 기록 (`F-06`, `F-07`) → 완료(2026-11-19): Bases 및 Dataview 친화적인 Frontmatter 평면 메타데이터(`recording_state`, `recordings` 링크 배열, `recording_count`, `recording_total_seconds`, `recording_total_size_mb`, `recording_first_start`, `recording_last_end`)와 본문 섹션(기본 `## 녹음 기록`) 아래 세션별 상세 블록(`### 녹음 N · 시각 (소요: MM:SS · 용량)`, 임베드, 마커)을 `vault.process` 단일 트랜잭션으로 안전하게 동시 기록하도록 구현([noteMetadataHandler.ts](./src/noteMetadataHandler.ts)). 단위 테스트 통과.
- [x] `3-REC-05` 녹음 정보 재계산 및 메타데이터 동기화 명령 (`C-05`) → 완료(2026-11-19): 본문 내 실제 오디오 임베드/블록과 파일 메타데이터(`adapter.stat`)를 다시 읽어 누락되거나 변경된 Frontmatter 집계 속성을 재구성·동기화하는 명령(`이 노트 녹음 정보 재계산`)을 구현([noteMetadataHandler.ts](./src/noteMetadataHandler.ts)). 단위 테스트(`test/recalculateMetadata.test.ts`) 통과.
- [x] `3-REC-06` 미아(고아) 오디오 파일 방지 및 복구 체계 (`F-09`, `C-04`) → 완료(2026-11-19): 앱 시작 시 영속 세션 점검을 통한 비정상 종료 복구 안내 토스트 및 볼트 내 백링크가 0인 고아 오디오 파일을 모달로 검색해 활성 노트에 즉시 연결하는 명령(`고아 녹음 파일 점검`, [orphanAudioHandler.ts](./src/orphanAudioHandler.ts), [orphanAudioModal.ts](./src/orphanAudioModal.ts))을 구현. 단위 테스트(`test/orphanAudio.test.ts`) 통과.
- [x] `3-REC-07` 녹음 상태표시줄 UI 및 원클릭 제어 (`F-10`, `S-13`) → 완료(2026-11-19): Obsidian 상태표시줄(Status Bar)에 현재 녹음 중인 노트명과 경과 시간(`🔴 01:23 회의록`)을 1초 주기로 실시간 렌더링하고, 상태표시줄 클릭 시 즉시 녹음을 안전 중지하고 대상 노트 연결 및 전사 인계를 수행하도록 구현([recordingStatusBar.ts](./src/recordingStatusBar.ts)). 단위 테스트(`test/recordingStatusBar.test.ts`) 통과.

#### 2. 비차단 백그라운드 전사 파이프라인 및 자동 인계 (PIPE)
> 현재의 동기 모달 실행 및 단순 큐잉 한계를 극복하고, 긴 회의 전사 중에도 Obsidian 작업을 방해하지 않는 비동기 백그라운드 처리 파이프라인을 구축한다.

- [x] `3-PIPE-01` 비차단 백그라운드 전사 큐 워커 및 상태표시줄(Status Bar) 진행률 표시 → 완료(2026-11-19): 장시간 회의 전사 시 모달이나 앱이 멈추지 않고, Obsidian 하단 상태표시줄에서 진행 상태(`🎙️ 전사 중 [45%]: filename.m4a`, 경과시간/단계, 클릭 시 상세 안내)를 확인하며 다른 노트를 작성할 수 있도록 비동기 큐 워커(`TranscriptionQueueWorker`) 파이프라인 및 상태표시줄 UI 연동 구현. 단위 테스트 4개(`test/transcriptionQueueWorker.test.ts`) 전건 통과.
- [x] `3-PIPE-02` 녹음 완료 후 자동 전사 인계 및 노트 삽입 워크플로 통합 → 완료(2026-11-19): 녹음이 중지되어 노트에 안전하게 연결된 직후, 설정(`autoTranscribe`)에 따라 백그라운드 전사 큐로 즉시 인계(`worker.trigger()`). 완료 시 사용자 선택 모드(`transcriptionInsertMode`)에 따라 동작: (1) `auto`(기본값): 대상 노트의 해당 임베드 바로 아래에 `applyAudioEmbedInsertion`으로 백그라운드 안전 자동 삽입 및 인앱 알림, (2) `review`: 알림을 띄워 미리보기 모달 검토 후 승인 삽입 지원. 실제 오디오(`format-fixture.wav`) 추론 실기 검증 완료.
- [x] `3-PIPE-03` 타임스탬프-오디오 재생 동기화 (Audio Playback Sync) → 완료(2026-11-19): 마크다운 포스트 프로세서 및 전역 클릭 핸들러를 통해 전사문 내 세그먼트 타임스탬프(`[02:15]`) 클릭 시 인접 오디오 플레이어의 재생 위치를 즉시 동기화 이동·재생 구현([audioPlaybackSync.ts](./src/audioPlaybackSync.ts)). 단위 테스트(`test/audioPlaybackSync.test.ts`) 통과.
- [x] `3-PIPE-04` 글로벌 배포를 위한 다국어(i18n) 지원 체계 구축 → 완료(2026-11-19): Obsidian 공식 커뮤니티 플러그인 글로벌 공개를 위해 UI 기본 언어(영어 `en`)와 한국어(`ko`) 사전을 내장한 경량 i18n 체계([src/i18n.ts](./src/i18n.ts)) 구현. 단위 테스트(`test/i18n.test.ts`) 통과.

#### 3. 외장/내장 GPU 가속 및 런타임 최적화 (GPU & CPU)
> 2단계에서 확정된 기본 권장 모델(`medium-q5_0`) 및 고정밀 모델(`large-v3-q5_0`)의 추론 성능을 외장 GPU로 대폭 가속하고, 장시간 환각 루프를 원천 방지한다.

- [ ] `3-GPU-01` whisper.cpp cuBLAS/CUDA 가속 빌드 성능 실측 및 CPU 대비 가속 배율 검증 → 레노버 노트북의 외장 GPU(NVIDIA GeForce GTX 1650 Ti, CUDA 13.0) 환경에서 cuBLAS/CUDA 런타임 추론 속도·VRAM 사용량을 실측하고(`real-sample-01~03` 대상), CPU 8스레드 대비 가속 배율 및 처리율을 검증한다 (레노버 노트북 환경 연계 대기).
- [x] `3-GPU-02` VRAM 4GB 환경 모델 오프로딩 동작 확인 및 GPU Provider 통합 → 완료(2026-11-19): `ProviderDevice` 추상화(`cpu`, `cuda`, `vulkan`, `openvino`) 및 `LocalSettings` 연계(`gpuBackend`, `gpuLayers`, `gpuDeviceId`), whisper.cpp 레이어 오프로딩(`-ngl`), 디바이스 인덱스(`-dev`), CPU 강제(`-ng`) 파라미터 생성기 및 백그라운드 큐 워커 연동 완료. 설정 UI 및 단위 테스트(`test/whisperGpuOffload.test.ts`) 통과.
- [x] `3-GPU-03` Intel Iris Xe/UHD GPU 환경 가속 지원 가능성 조사 (삼성 960XFG 연계) → 완료(2026-11-19): Vulkan 1.4(`ggml-vulkan`)와 OpenVINO(`-oved GPU`) 비교 분석 완료. Zero-Conversion, 무설치 DLL 호환성, Windows 내장 드라이버(`vulkan-1.dll`) 이점으로 Vulkan 백엔드 공식 채택 권고 및 로드맵 수립. 상세: [GPU-03_INTEL_IRIS_XE_FEASIBILITY.md](./docs/baselines/GPU-03_INTEL_IRIS_XE_FEASIBILITY.md).
- [x] `3-CPU-01` whisper.cpp 장시간 전사 환각(Hallucination) 방지 파라미터 최적화 → 완료(2026-11-19): `0-BASE-08`에서 관측된 무음/잡음 구간 무한 루프를 원천 차단하기 위해 whisper.cpp CLI 인수에 `--max-context 0` (이전 컨텍스트 전염 방지), `--suppress-nst` (비음성 토큰 억제), `--temperature 0.0`을 빌드 옵션으로 기본 적용([whisperCppCpu.ts](./src/whisperCppCpu.ts)). 단위 테스트 통과.

#### 4. 사용자 온보딩, 설정 구조 및 셋업 헬퍼 (UX & SETUP)
> Obsidian 플러그인 제출 정책(바이너리 자동 다운로드 금지)을 100% 준수하면서도, 초보 사용자가 원클릭으로 로컬 도구를 세팅할 수 있는 독립 셋업 도우미와 직관적인 설정 환경을 제공한다.

- [x] `3-UX-01` 사용자 주도 원클릭 도구 준비 도우미 (Setup Helper) → 완료(2026-11-19): Obsidian 정책을 준수하기 위해 플러그인 코드 내부 다운로드를 배제하고, 사용자가 복사하여 본인의 터미널(PowerShell/winget)에서 실행할 수 있는 독립 실행형 셋업 스크립트([scripts/setup-tools.ps1](./scripts/setup-tools.ps1)) 작성 및 설정 탭 내 원클릭 명령어 복사 버튼 연동 완료.
- [x] `3-UX-02` 설정 화면 정보 구조 개편 및 도구 무결성 검증 UI → 완료(2026-11-19): Vault 공통 설정과 PC별 로컬 도구 설정을 시각적으로 분리하고, 런타임/모델/FFmpeg 경로의 실시간 존재/크기 검증 뱃지(`✅ 준비됨` / `⚠️ 파일 없음`) 및 원클릭 설치 스크립트 복사 기능 구현([settingsTab.ts](./src/settingsTab.ts)).
- [x] `3-UX-03` 회의 녹음→자동 전사→회의록 완성 통합 사용자 여정(User Journey) 검증 → 완료(2026-11-19): 첫 실행 설정부터 코어 녹음 개시, 탭 닫힘 시 안전 연결, 백그라운드 전사 및 노트 본문 자동 반영, 전사문 검색 및 메타데이터 재계산까지 이어지는 단절 없는 End-to-End 통합 사용자 여정 시나리오 검증 완료([test/e2eUserJourney.test.ts](./test/e2eUserJourney.test.ts)).
- [x] `3-UX-06` 설정 화면 다국어(i18n) 전면 정비 및 완벽한 한국어 현지화 → 완료(2026-11-19): 고유명사(whisper.cpp, FFmpeg, CUDA, Vulkan 등)를 제외한 모든 설정 화면 헤딩, 레이블, 설명, 드롭다운 옵션명에서 괄호 영문 표현을 정리하고, Obsidian 전역 moment 로케일(`moment.locale()`) 감지 보강을 통해 한국어 환경에서 100% 한글 UI 노출 보장. 투박한 직사각형 원색 뱃지를 모던 캡슐(Pill) 도트 인디케이터 스타일로 전면 리디자인([styles.css](./styles.css), [settingsTab.ts](./src/settingsTab.ts)).
- [x] `3-DOCS-01` 설정 옵션 상세 가이드 및 도움말 문서화 (`docs/SETTINGS_GUIDE.md`) → 완료(2026-11-19): 볼트/로컬 2단계 설정 구조부터 녹음 시작 모드, 탭 닫힘 방어, 모델 크기별 품질·소요시간 비교, GPU 오프로딩(-ngl) 튜닝 효과 및 발열 완화 가이드를 포함한 상세 가이드([docs/SETTINGS_GUIDE.md](./docs/SETTINGS_GUIDE.md)) 작성 완료 및 설정 화면 상단 도움말 배너 연동.
- [x] `3-UX-07` 설정 화면 UI/UX 전면 리팩토링 및 사용자 중심 어휘·구조 개편 → 완료(2026-11-19): 사용자 지적에 따라 개발자 중심 왜곡 명칭 전면 폐기("녹음 자동 시작 대상 폴더" → "회의록 마크다운 노트 보관 폴더" 및 오디오 파일 저장 위치 안내 카드 신설, "파일 안정화 대기" → "오디오 저장 완료 대기 시간" 등). 중복 노출되던 하드웨어 설정을 5대 섹션 카드 구조로 단일화하고 직관적인 설명과 권장값을 재정비([settingsTab.ts](./src/settingsTab.ts)).
- [x] `3-UX-08` 지원 모델 선택지 전체 확장(`medium`, `large-v3`) 및 모델별 원클릭 다운로드 가이드·검증 안내 UI → 완료(2026-11-20): 공식 5대 모델(`base`, `small`, `medium`, `large-v3-turbo`, `large-v3`) 전체 메타데이터 카탈로그 구축([src/modelCatalog.ts](./src/modelCatalog.ts)). 설정 화면에서 실시간 설치 여부 뱃지, 파일 크기·양자화 정보, 공식 Hugging Face 출처 링크, 미설치 시 1-클릭 PowerShell 다운로드 명령어 복사 버튼 및 설치 완료 시 전사 모델 경로 즉시 적용 버튼 구현. 단위 테스트 5개([test/modelCatalog.test.ts](./test/modelCatalog.test.ts)) 통과.

#### 5. 사후 분석 및 로컬 AI 연계 (POST - 선택 확장)
> 전사 완료 후 완전한 프라이빗 환경을 유지하면서 회의록의 가치를 극대화하는 로컬 LLM 후처리 파이프라인을 설계한다.

- [x] `3-POST-01` 로컬 LLM 연동 회의록 요약·액션 아이템 템플릿 연계 → 완료(2026-11-20): 100% 로컬 오프라인 프라이버시(localhost/127.0.0.1만 허용) 기반 로컬 LLM 클라이언트([src/localLlmClient.ts](./src/localLlmClient.ts)) 및 회의록 3단 구조(핵심 요약, 주요 결정 사항, 액션 아이템) 프롬프트 엔진([src/summaryPrompt.ts](./src/summaryPrompt.ts)) 구현. Ollama 및 OpenAI 호환 API(LM Studio 등) 원클릭 연결 테스트, 전사 완료 후 자동 요약 및 활성 노트 수동 요약 명령(`summarize-active-note-transcript`) 제공. 단위 테스트 5개([test/localLlm.test.ts](./test/localLlm.test.ts)) 통과.

#### 6. 전용 사이드바 제어 패널 및 플레이어형 녹음·전사 워크플로 (SIDEBAR & CONTROLS)
> 새 노트 자동 감지의 불확실성을 해소하고, 오른쪽 사이드바에서 플레이어형 제어(녹음/일시정지/재개/중지) 및 노트 내 다중 레코딩 임베드 탐색·선택형 전사를 원클릭으로 수행할 수 있는 직관적인 UI를 구축한다.

- [x] `3-REC-08` 명시적 회의록 생성 및 단축키 기반 녹음 시작 워크플로 (`create-meeting-note-and-record`) → 완료(2026-11-20): 명령 팔레트 및 단축키 바인딩 가능한 통합 명령 "새 회의록 작성 및 음성 녹음 시작" 구현. 회의록 문서 생성 즉시 에디터 포커스 및 seq=1 녹음 세션 바인딩, 사이드바 패널 활성화.
- [x] `3-REC-09` 선택 템플릿 파일 기반 회의록 생성 시 녹음 자동 시작 트리거 (`autoRecordTemplatePath`) → 완료(2026-11-20): 설정에 `autoRecordTemplatePath` 지정 시, 새 노트 생성 시 해당 템플릿 파일과의 구조적 내용 일치 여부를 대조하여 지정 템플릿으로 생성된 회의록에 대해서만 음성 녹음이 자동 개시되도록 조건부 필터링 구현.
- [x] `3-REC-10` 회의록 명시적 생성기 및 날짜·시간 기반 파일명 포매터 (`generate-meeting-note`) → 완료(2026-11-20): `formatMeetingNoteFileName` 및 `getUniqueNotePath` 구현([src/meetingNoteCreator.ts](./src/meetingNoteCreator.ts)). `YYYY-MM-DD HHmm 회의록.md` 표준 패턴 및 중복 방지 순번 `(N)` 처리.
- [x] `3-REC-11` 템플릿 적용 완료 감지 훅 및 비동기 변수 치환 안정화 처리 → 완료(2026-11-20): 템플릿 내 `{{date}}`, `{{time}}`, `{{title}}` 동적 변수 정밀 치환([src/meetingNoteCreator.ts](./src/meetingNoteCreator.ts)) 및 안정화 생성 처리.
- [x] `3-UX-04` 오른쪽 사이드바 전용 패널(Side Panel View) 및 플레이어형 녹음 제어 UI → 완료(2026-11-20): Obsidian 전용 `ItemView`인 `OnTheRecordSidebarView`([src/sidebarView.ts](./src/sidebarView.ts)) 구현. 플레이어 컨트롤러(녹음 시작 `●`, 일시정지 `❚❚`, 계속하기 `▶`, 안전 중지 및 연결 `■`), 실시간 대형 디지털 타이머 및 활성 대상 회의록 카드 제공.
- [x] `3-UX-09` 코어 오디오 레코더 일시정지/재개 한계 대응 및 스마트 분할 세션(Split-Session) 처리 → 완료(2026-11-20): 코어 레코더의 일시정지 미지원 한계를 극복하기 위해, 사이드바 일시정지(`❚❚`) 클릭 시 1차 녹음 안전 마감 및 오디오 연결 후, 계속하기(`▶`) 클릭 시 `seq=2`로 후속 세션을 즉시 개시하여 단일 문서 내에 무손실 연속 녹음으로 결합하는 스마트 분할 세션 폴백 구현.
- [x] `3-UX-10` 사이드바 뷰(`ItemView`) 생명주기 관리, 토글 명령/리본 연동 및 활성 노트 실시간 이벤트 동기화 → 완료(2026-11-20): `OTR_SIDEBAR_VIEW_TYPE` 뷰 등록, 리본 아이콘(마이크), "오른쪽 사이드바 회의록 제어 패널 열기" 명령 추가 및 `active-leaf-change`, `file-open` 이벤트 연동 실시간 동기화 구현.
- [x] `3-UX-05` 활성 노트 내 다중 레코딩 임베드 탐색기 및 선택형 전사/이동 UI → 완료(2026-11-20): 활성 마크다운 노트 본문의 다중 오디오 임베드를 파싱하여 "행 번호(Line N), 파일명, 전사 완료/미전사 뱃지"를 사이드바에 실시간 렌더링하고, 클릭 시 즉시 이동 및 선택형 개별 전사 인터페이스 제공([src/sidebarView.ts](./src/sidebarView.ts)).
- [x] `3-PIPE-05` 활성 문서 내 오디오 임베드 실시간 파서 및 전사 상태 머신(State Machine) 엔진 → 완료(2026-11-20): `parseAudioEmbedsFromMarkdown`([src/noteAudioExplorer.ts](./src/noteAudioExplorer.ts)) 구현. 대소문자 무관 지원 확장자 필터링, 행 번호 및 전사 마커 블록 상태 추적.
- [x] `3-UX-11` 사이드바 항목 클릭 시 에디터 커서 이동(Jump to Line) 및 선택형 개별 전사 디스패처 → 완료(2026-11-20): `jumpToLineInActiveEditor`([src/noteAudioExplorer.ts](./src/noteAudioExplorer.ts))로 해당 라인 커서 이동 및 에디터 스크롤 동기화, [전사] 버튼 클릭 시 `TranscriptionQueueWorker` 즉시 인계 디스패처 구현.
- [x] `3-UX-12` 사이드바 전용 모던 플레이어 컨트롤러 테마 스타일링 및 애니메이션 (`styles.css`) → 완료(2026-11-20): 디지털 타이머 폰트, 녹음 진행 중 펄스 애니메이션(`otr-pulse`), 버튼 그리드 바, 오디오 임베드 행 카드 및 Line N 뱃지 네이티브 테마 CSS 완성([styles.css](./styles.css)).
- [x] `3-UX-13` 오른쪽 사이드바 오디오 파일 선택(Vault 내부 및 외부 파일) 및 즉시 전사 시작 버튼 (`sidebar-audio-file-picker`) → 완료(2026-11-20): 사이드바 내 "오디오 파일 선택 전사" 버튼 배치 및 백그라운드 큐 인계 연동.
- [x] `3-PIPE-06` Vault 외부 오디오 파일 파이프라인 및 보관함 복사(Import)·외부 참조 전사 처리 (`external-audio-pipeline`) → 완료(2026-11-20): Vault 내외 오디오 파일 탐색 및 백그라운드 전사 큐 연동 파이프라인 정합성 검증 완료.

#### 7. 프로젝트 구조 정규화 및 플러그인 ID 유지 확정 (ENV & REPO)
> 개발 단계에서 생성된 임시 폴더명(`-dev`)을 정규화하고, 사용자 요청에 따른 `obsidian-ontherecord` 플러그인 ID 변경 타당성 및 커뮤니티 배포 정책 부합 여부를 검토하여 결론을 반영한다.

- [x] `3-ENV-17` 프로젝트 구조 및 로컬 저장소 폴더명 `-dev` 접미사 제거 정규화 → 완료(2026-11-20): 개발 단계의 임시 경로인 `%LOCALAPPDATA%\on-the-record`를 완전히 배제하고, 공식 릴리즈 표준 폴더인 `%LOCALAPPDATA%\on-the-record\models` 및 `tools`로 단일화([src/modelCatalog.ts](./src/modelCatalog.ts), [scripts/setup-tools.ps1](./scripts/setup-tools.ps1), [src/cpuRuntimeDiscovery.ts](./src/cpuRuntimeDiscovery.ts)). 사용자 결정에 따라 `-dev` 폴더에 대한 별도 레거시 fallback은 일절 지원하지 않고 깔끔하게 단일 표준 경로만 적용.
- [x] `3-PROD-02` 플러그인 ID `obsidian-ontherecord` 변경 검토 및 `on-the-record` 유지 확정 → 완료(2026-11-20):
  - **검토 결과 및 사용자 결정**: 플러그인 ID는 **`on-the-record`로 변경 없이 유지 확정**.
  - **결정 근거**:
    - **Obsidian 공식 심사 정책 준수**: Obsidian 공식 커뮤니티 플러그인 등록 요건([Submission requirements](https://docs.obsidian.md/Community+directory/Submission+requirements+for+plugins))상 플러그인 ID에 `obsidian` 단어 포함이 금지되어 있어(`id cannot contain 'obsidian'`), `obsidian-ontherecord`로 변경 시 공식 디렉터리 등재 심사에서 자동 반려됨.
    - **기존 데이터 및 설정 무결성 유지**: 볼트 내 `<vault>/.obsidian/plugins/on-the-record/data.json` 및 `%LOCALAPPDATA%\on-the-record\local-settings.json`의 영속 경로 변경에 따른 마이그레이션 리스크 방지.
  - 이에 따라 `obsidian-ontherecord`로의 플러그인 ID 변경은 미수행(취소/종료)하고, 공식 ID `on-the-record`를 변동 없이 유지한다.

#### 8. 음성 데이터 무유출 원칙, 표준 다구간 샘플링 및 한영 혼용(Code-switching) 환경 대응 (SEC, BASE & QUAL)
> 실제 음성 녹음 파일의 외부 유출을 원천 금지하고, 벤치마크 및 회귀 테스트에 필요한 1분·5분·10분·30분·60분 표준 샘플셋 확보 방안과 한국어 기반 IT/비즈니스 영어 전문용어 혼용 환경에서의 전사 품질 최적화 방안을 정립한다.

- [~] `3-SEC-01` 음성 녹음 파일 및 전사 데이터 100% 로컬 격리 및 외부 유출 원천 금지 (Zero-Leakage Privacy Policy) → 코드상 `whisperCppCpu.ts` 로컬 실행, `localLlmClient.ts` `isLocalhostEndpoint()` 제한 및 `.gitignore` `samples/` 제외는 적용됨. 콘솔/로그 원문 노출 마스킹 점검은 잔여 확인 대상.
  - 사용자의 실제 음성 녹음 파일 및 텍스트 전사문은 어떠한 경우에도 외부 클라우드, 원격 서버, 외부 분석 도구로 유출/전송되지 않도록 100% 로컬 실행(whisper.cpp 로컬 추론 및 localhost:11434 로컬 LLM)을 강제.
  - 개발, 테스트, 벤치마크 실행 시 실제 대화 내용 원문이 콘솔/터미널/로그 파일에 노출되거나 Git 저장소에 커밋되지 않도록 하는 엄격한 마스킹 및 제외 규칙 영구 유지.
- [ ] `3-BASE-10` 시간대별(1분, 5분, 10분, 30분, 60분) 외부 공개 한국어 표준 음성 표본 수집 및 벤치마크 샘플링 체계 구축
  - 사내 회의록 등 민감한 개인 음원 보호를 위해, 필요 시 외부 공개 데이터셋(AI Hub 공개 데이터, CC 라이선스 표준 회의 음원, 공공 자유 라이선스 한국어 발화)에서 구간별 표준 표본(1분, 5분, 10분, 30분, 60분)을 확보하여 `samples/standard/`로 체계화.
  - 구간별 오디오 샘플을 바탕으로 `scripts/measure-whisper.ps1`을 실행하여 모델별(base, small, medium, large 등) 처리율, 메모리 사용량, 장시간 환각 발생 지점을 정량적으로 계측·비교.
- [x] `3-QUAL-01` 한국어-영어 전문용어 및 고유명사 혼용(Code-switching) 환경 대응을 위한 whisper 어휘 프롬프팅(Vocabulary Prompting) 설계 → Wave 2(`FEAT-03`)에서 `VaultSettings.vocabularyPrompt` 설정 추가, 설정 탭 입력 UI 제공 및 `whisper-cli --prompt` 인자 전달 연동 완료(2026-11-26). 프리셋 프로필 관리 GUI는 `3-UX-14`에서 후속 검토.

#### 9. 상용급 완성도 및 회의 가치 극대화를 위한 기능 요구사항 (FR)
> 실제 엔터프라이즈 및 전문직 실무 회의에서 요구되는 다자간 화자 구분, 단어 수준 동기화, 어휘 사전 관리, 무음 트리밍, 오디오 압축, 맞춤형 템플릿 등 핵심 사용자 기능을 체계화한다.

- [ ] `3-QUAL-02` 화자 분리(Speaker Diarization) 및 발화자 명칭 일괄 치환 도구 (`FR-01`)
  - 다자간 회의에서 `whisper.cpp -tdrz`(tinydiarize) 모델 또는 로컬 경량 VAD/임베딩 모델을 연계하여 발화자 전환 시점을 자동 감지하고 `[화자 1]`, `[화자 2]`로 구분 전사.
  - 전사 후 미리보기 모달 또는 사이드바 패널에서 `[화자 1]`을 `[홍길동 팀장]` 등 실제 참여자 인명으로 노트 본문 전체에서 안전하게 일괄 변경(Batch Rename)할 수 있는 매핑 UI 제공.
- [ ] `3-QUAL-03` 단어 수준 타임스탬프(DTW) 및 오디오 재생 시 실시간 가라오케 하이라이트 동기화 (`FR-02`)
  - whisper.cpp Dynamic Time Warping(`-dtw`) 또는 토큰 타임스탬프를 활용해 단어 단위 정밀 발화 시각을 메타데이터로 획득.
  - 오디오 플레이어 재생 진행 시 마크다운 전사문 내 현재 발화 중인 단어를 실시간 가라오케 스타일로 하이라이트(Read-along highlighting)하는 시각적 동기화 구현.
- [ ] `3-UX-14` 사용자 맞춤형 도메인 어휘 & 고유명사 사전 관리자 GUI (`FR-03`)
  - 설정 화면에서 자주 쓰는 팀원 이름, 부서명, 약어, 도메인 전문용어를 태그 형태로 추가/삭제/관리할 수 있는 직관적인 사전 관리 인터페이스 구축.
  - 회의 유형별(개발팀, 인사팀, 세미나 등) 어휘 프로필 저장 및 전사 실행 시 whisper.cpp `--prompt` 파라미터로 자동 합성 주입.
- [ ] `3-PIPE-07` 오디오 무음 감지(VAD) 및 지능형 사전 트리밍 (`FR-04`)
  - 회의 중간 휴식 시간이나 발표 대기 등 긴 무음/잡음 구간을 whisper 추론 전에 Silero-VAD/내장 VAD(`--vad`)로 사전 감지.
  - 무음 구간을 자동으로 건너뛰거나 세그먼트를 분할하여 전사 추론 시간을 최대 30~50% 단축하고 whisper 환각 루프의 원인을 사전 차단.
- [ ] `3-PIPE-08` Vault 스토리지 최적화 오디오 자동 압축 및 보관 정책 (`FR-05`)
  - 코어 레코더의 대용량 WAV/M4A 파일로 인한 볼트 용량 비대화(1시간 약 600MB)를 방지하기 위해, 전사 완료 후 로컬 FFmpeg를 통해 고음질 저용량 코덱(Opus 32kbps 또는 AAC 64kbps)으로 자동 변환(용량 95% 절감).
  - 원본 무압축 파일 보관, Vault 외부 아카이브 이동, 또는 휴지통 정리 정책을 사용자가 직접 선택 가능.
- [ ] `3-POST-02` 회의 유형별 맞춤형 LLM 요약 템플릿 라이브러리 및 커스텀 섹션 빌더 (`FR-06`)
  - 회의 목적에 맞는 프롬프트 프리셋(1. 데일리 스크럼/스프린트, 2. 1:1 면담, 3. 고객 인터뷰/CS, 4. 전략/경영 회의) 기본 내장.
  - 사용자가 자신만의 프롬프트 템플릿과 섹션 구조를 마크다운으로 직접 작성·추가하고 기본 요약 템플릿으로 지정할 수 있는 커스텀 빌더 제공.
- [ ] `3-UX-15` 전사문 및 요약본 다중 포맷(SRT, VTT, Plain Text, CSV) 내보내기 및 클립보드 복사 (`FR-07`)
  - 마크다운 본문 외에 동영상 자막 표준 포맷(`.srt`, `.vtt`), 순수 텍스트(`.txt`), 타임스탬프 스프레드시트(`.csv`)로의 원클릭 내보내기 및 클립보드 복사 액션 제공.
- [ ] `3-REC-12` 회의 녹음 진행 중 단축키 기반 실시간 중요 안건 퀵 마킹 및 챕터 북마크 (`FR-08`)
  - 회의 진행 중 중요한 발언이나 결정사항 발생 시 전용 단축키(예: `Ctrl+Shift+M`)로 활성 노트에 현재 경과 시간 타임스탬프가 포함된 북마크 행(`- [ ] [MM:SS] ★ 중요 안건: `) 즉시 생성 및 에디터 포커스.

#### 10. 상용급 신뢰성·안정성·성능을 위한 비기능 요구사항 (NFR)
> 배터리 소진·크래시 시의 무결성 보장, 저전력/발열 제어, UI 0-Lag 렌더링, 100% 에어갭 보안 및 자가 진단 체계를 통해 제품의 내구성을 확보한다.

- [ ] `3-REL-01` 크래시 회복력(Crash Resilience) 및 세그먼트 체크포인트 기반 전사 이어하기 (`NFR-01`)
  - 회의 중 배터리 소진, Obsidian 비정상 종료 시에도 녹음 파일 손실을 방지하기 위한 1분 단위 저널링 및 부분 복구(Crash Recovery) 체계 구축.
  - 1시간 이상 장시간 회의 전사 중 프로세스 장애 발생 시, 처음부터 다시 전사하지 않고 완료된 세그먼트 체크포인트 파일부터 이어서 전사(Resume from checkpoint)하는 내결함성 확보.
- [ ] `3-PERF-01` 저전력·발열 완화 및 프로세스 우선순위 스케줄링 (`NFR-02`)
  - 노트북 배터리 구동 감지 시 자동으로 권장 스레드 수를 절반으로 조정(예: 8스레드 → 4스레드)하여 과열 및 팬 소음 방지.
  - 백그라운드 `whisper-cli.exe` 프로세스의 우선순위를 `Below Normal` 또는 `Idle`로 격리 실행하여 전사 중에도 Obsidian 문서 작성 및 타 프로그램 멀티태스킹 렉 방지.
- [ ] `3-PERF-02` 대용량 전사문 삽입 시 에디터 타이핑 0-Lag 및 무중단 UI 렌더링 보장 (`NFR-03`)
  - 1시간 분량(수만 자)의 대용량 전사문이 한 번에 노트에 삽입될 때 에디터가 일시적으로 멈추는 프레임 드롭(UI Freeze) 차단.
  - 비동기 청크 분할 삽입 및 마크다운 포스트 프로세서 렌더링 캐싱을 통해 사용자 키 입력 지연(Input Latency) 0ms 보장.
- [ ] `3-SEC-02` 100% 에어갭(Air-Gapped) 망분리 오프라인 무전송 검증 및 네트워크 차단 가드레일 (`NFR-04`)
  - 국가 기관, 금융, 방산, 의료 등 망분리 보안 환경을 위한 가드레일 단위 테스트 체계 구축.
  - 플러그인 소스코드 내 모든 외부 엔드포인트 네트워크 호출 0건 유지 및 `localhost / 127.0.0.1` 이외의 IP 접근 시 원천 차단하는 에어갭 보안 준수.
- [ ] `3-UX-16` 설정 탭 내 자가 진단(Self-Diagnostics) 도구 및 원클릭 문제해결 진단 리포트 생성기 (`NFR-05`)
  - 사용자 환경(FFmpeg 실행 가능 여부, whisper.cpp 런타임 권한, 디스크 여유 공간 2GB 확보 여부)을 1-클릭으로 자동 점검하는 자가 진단 패널 제공.
  - 문제 발생 시 개발자에게 전달할 수 있도록 개인정보 및 대화 내용을 100% 마스킹한 익명 진단 로그(OS, CPU/GPU, 모델, 에러 스택) 복사 버튼 구현.
- [x] `3-PROD-03` Obsidian 커뮤니티 플러그인 공식 심사 가이드라인 100% 지속 준수 (`NFR-06`) → Wave 4(2026-11-26)에서 `eslint src/` 오류 34건 전체 해소(0 errors 달성: `no-static-styles-assignment`, `no-unsafe-*`, `prefer-create-el`, `prefer-window-timers`, `prefer-get-language`). `localLlmClient.ts`의 `fetch` 경고 및 한국어 내 영문 대소문자 `sentence-case` 경고는 Node.js 테스트 호환 및 고유명사 표기 사유로 추적 유지.
  - 공식 디렉터리 등재 심사 요건을 영구 준수하여 `innerHTML` 배제, 안전한 `createEl` DOM 조작, 컴포넌트 언로드 시 모든 타이머/감시자/이벤트 리스너 완전 해제(`registerEvent`, `registerInterval`)를 보증하는 린트 및 무결성 검증 체계 유지.
