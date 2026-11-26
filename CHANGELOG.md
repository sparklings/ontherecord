# 변경 기록

작업 내용을 일자별로 기록한다. 최신 일자를 위에 둔다. 항목은 변경 사실만 적는다.

분류: 추가 / 변경 / 삭제 / 결정 / 이슈

## 2026-11-27

### 수정 및 최적화
- **핵심 음성 전사 파이프라인 및 노트 연동 견고성 강화 (`CORE-01`~`CORE-07`)**:
  - `src/whisperCppCpu.ts`:
    - **타임아웃 분리**: 스모크 테스트용 타임아웃(5분)과 실제 전사용 타임아웃(2시간)을 분리하여 장시간 녹음 파일 전사 시 타임아웃으로 크래시되던 문제 해결
    - **CPU 스레드 최적화**: 하드코딩된 4스레드 대신 `os.cpus()` 논리 코어 수의 75%를 자동 감지·할당하는 `getDefaultCpuThreads()` 적용
    - **모델/런타임 검증 캐싱**: 파일 수정시각 및 크기가 동일할 경우 메모리 캐시를 반환하여 1.5GB~3.1GB 모델 파일의 매 전사 시 불필요한 전체 재해싱 I/O 병목 완전 제거
    - **작업 취소 연동**: `AbortSignal`을 FFmpeg 및 whisper.cpp 자식 프로세스 실행 시 전달하여 작업 취소 시 즉각 안전 종료
    - **임시 폴더 삭제 방어**: 임시 디렉터리 정리 실패가 본래의 전사 오류를 은폐하지 않도록 예외 처리 격리
  - `src/resultPreview.ts`:
    - **동적 오디오 임베드 재탐색**: 백그라운드 전사가 진행되는 동안 사용자가 노트 상단에 텍스트를 입력하여 라인이 밀려도, 오디오 링크를 기준으로 본문 내 embed를 동적으로 재탐색하여 안전하게 결과 삽입
  - `src/main.ts`:
    - `checkUnfinishedSessionOnStartup`: 비정상 종료된 녹음 세션 감지 시 사용자 Notice 알림 콜백 연결
    - `setupQueueWorker`: `signal`을 `runtime.transcribe()`에 연결하여 백그라운드 작업 취소 응답성 극대화
  - `test/whisperCppCpu.test.ts`, `test/resultPreview.test.ts`:
    - 검증 캐시 적중, 전사 취소, 라인 밀림 동적 재탐색에 대한 단위 테스트 3건 신규 추가 (전체 117건 통과)

### 추가
- **Stitch MCP 공식 연동 누락 시안 3종 정식 생성 및 에셋 추출 (`DESIGN-01`, Issue #15)**:
  - Google Stitch MCP (`projects/15695117177036898361`, 디자인 시스템 `assets/17724542724472707759`)에 3개 화면(`Workflow Tab`, `Acceleration & AI Tab`, `Review Modal`)을 생성 등록
  - 생성된 원본 HTML 및 고해상도 PNG 스크린샷 3종을 `docs/design/`(`stitch-workflow-tab.*`, `stitch-acceleration-tab.*`, `stitch-review-modal.*`)에 저장 완료
- **신규 확정 Stitch 시안 플러그인 소스 1:1 정밀 구현 (`UI-07`, Issue #16)**:
  - `src/settingsTab.ts`: 회의록 및 녹음 워크플로 탭 및 하드웨어 가속/로컬 AI 탭을 Stitch 카드 스택 및 2열 그리드 구조로 개편
  - `src/resultPreviewModal.ts`: Stitch 시안과 1:1로 일치하는 전사 검토 모달(원형 보라색 플레이어, 오디오 싱크 바, 세그먼트 인라인 에디터, 기존 결과 교체/추가 알약 선택기) 구현
  - `styles.css`: Stitch 전용 다크 테마 컴포넌트(`.otr-setting-card`, `.otr-custom-toggle`, `.otr-setting-2col-grid`, `.otr-review-modal` 등) 추가 및 UI 정밀 보정
  - 로컬 테스트 볼트(`PlugVaults`) 배포 및 무결성 검증 통과 (`tsc`, `eslint`, `npm test` 114건 통과)
- **Stitch 사이드바 및 전사 탭 1:1 정밀 이식 완료 (`UI-05`, `UI-06`, Issue #13, #14)**:
  - `src/sidebarView.ts`: Target note 박스, 알약 레코드 버튼, Jump/Transcribe 양끝 정렬 반영
  - `src/settingsTab.ts`: 2단 계층형 로컬 도구 카드, 진단 바, 5대 모델 카드 및 `--prompt` 어휘 보관 카드 반영

### 변경
- **문서 무결성 복구 및 최신화**:
  - `TODO.md`: UTF-8 인코딩 깨짐 현상 완전 복구 및 최신 작업 완료(`[x]`) 상태 동기화
  - `docs/design/README.md`: Stitch 5대 전체 시안 카탈로그 및 컴포넌트 매핑 명세 문서 신규 작성

## 2026-11-26

### 점검
- **Wave 1~3 완료 후 전체 산출물 및 문서 일관성 점검**:
  - 코드·테스트·빌드 충돌 여부 확인: `tsc --noEmit` 오류 0건, 단위·통합 테스트 114건 전체 통과, 프로덕션 번들 빌드 이상 없음.
  - 문서 간 상충 해소: `docs/wiki/Installation-and-Setup.md`의 레거시 `-dev` 경로를 표준 `%LOCALAPPDATA%\on-the-record` 경로로 통일하고, `docs/SETTINGS_GUIDE.md`의 모델 파일 크기 표기(`q5_0` `medium` 514 MB 등)를 `src/modelCatalog.ts`와 일치시킴. `docs/wiki/Settings-Reference.md` 및 `Workflow-Guide.md`에 플로팅 상태 표시기, 어휘 힌트(`--prompt`), 파일 선택기, 검토 모달 오디오 싱크 내용을 반영.
  - 잔여 후속 항목 확인: GitHub Open Issues 0건(Wave 1~3 관련 `#1`~`#12` 종료 확인), `TODO.md`상 잔여 과제는 Wave 4(`3-PROD-03` 린트 규격 정리, `3-GPU-01` CUDA 실측 등)로 일관되게 유지.

### 추가
- **Wave 3 (`FEAT-04`, `UI-04` 검토 모달) 전사 결과 검토 모달 오디오 싱크 재생 및 인라인 편집 구현**:
  - `src/resultPreviewModal.ts`, `src/main.ts`, `styles.css`: 모달 상단 미니 오디오 플레이어(`play`/`pause`, 시크바, `1.0x`~`2.0x` 재생 속도 전환), 타임스탬프 클릭 시 해당 위치 점프 재생, 재생 위치에 따른 활성 세그먼트 강조, 세그먼트별 인라인 텍스트 편집 및 원문 복사 버튼 추가
- **Wave 2 (`FEAT-03`, `UI-04` 설정부, `3-QUAL-01`) 환경설정 및 어휘 프롬프트 연동**:
  - `src/settings.ts`, `src/whisperCppCpu.ts`, `src/transcriptionQueueWorker.ts`, `src/main.ts`: `DEFAULT_VAULT_SETTINGS.defaultModelSize` 기본값을 `base`에서 `medium`으로 변경하고 `vocabularyPrompt` 설정을 추가해 `whisper-cli` 실행 시 `--prompt` 인자로 전달하도록 연결
  - `src/settingsTab.ts`, `styles.css`: `전사 & 모델` 탭 상단에 `FFmpeg`·`whisper-cli`·`Model` 준비 상태 배너와 `1-클릭 셋업` 복사 버튼 추가, 섹션별 `Vault 동기화` / `이 PC 전용` 범위 배지 표시, 로컬 파일 선택기(`찾아보기` 버튼) 및 어휘 힌트 입력란 추가
  - 단위 테스트: `test/settings.test.ts`, `test/whisperCppCpu.test.ts`에 기본값(`medium`) 및 `--prompt` 인자 생성 검증 추가 (총 114개 테스트 통과)
- **Wave 1 (`FEAT-02`, `UI-02`) 플로팅 녹음 상태 표시기 구현**:
  - `src/floatingIndicator.ts`: 녹음 시작(`starting`), 녹음 중(`recording`), 일시정지(`paused`) 상태에서 표시되고, `idle` 상태 및 플러그인 종료(`onunload`) 시 숨김 및 DOM 제거 처리되는 플로팅 표시기 구현
  - 단위 테스트: `test/floatingIndicator.test.ts` 추가 및 통과

### 변경
- **외부 도구 설치 안내를 GitHub Wiki로 일원화 (`src/settingsTab.ts`, `docs/wiki/Installation-and-Setup.md`)**:
  - 비공개 저장소 `404` 오류 및 Obsidian 플러그인 의존성 설치 금지 정책과의 충돌을 방지하기 위해 설정 탭의 원격 PowerShell 스크립트(`irm ... | iex`) 복사 버튼을 제거하고 GitHub Wiki 설치 가이드 링크로 대체
  - `docs/wiki/Installation-and-Setup.md`를 공식 수동 설치 절차(`winget`, `whisper.cpp` 릴리스, Hugging Face 모델, `[도구 검색]`/`[찾아보기]`) 중심으로 정비
- **Wave 4 (`3-PROD-03`) Obsidian 커뮤니티 플러그인 린트 규격 준수 (`eslint src/` 오류 0건 달성)**:
  - `src/orphanAudioModal.ts`, `styles.css`: 인라인 `element.style.*` 할당을 `.otr-orphan-list`, `.otr-orphan-item` CSS 클래스로 이전하고 비동기 클릭 핸들러의 `no-misused-promises` 오류 수정
  - `src/noteAudioExplorer.ts`, `src/noteMetadataHandler.ts`, `src/meetingNoteCreator.ts`: `any` 타입 제거, 템플릿 리터럴 배열 처리 및 정규식 이스케이프 정리
  - `src/main.ts`, `src/settingsTab.ts`: `WorkspaceLeaf.prototype.detach` 래핑 타입 안전화, `Reflect.get` 반환 타입 명시, `createEl()` 사용 통일
  - `src/audioPlaybackSync.ts`, `src/resultPreviewModal.ts`, `src/recordingStatusBar.ts`, `src/localLlmClient.ts`, `src/i18n.ts`: `createFragment()`/`createSpan()` 사용, `window.*` 타이머 호환성 유지, `localStorage` 직접 참조 제거 (`eslint` 0 errors, `tsc` 0 errors, 테스트 114건 통과)
- **Wave 1 (`UI-03`) 우측 사이드바 제어 패널 구조 변경**:
  - `src/sidebarView.ts`: 기존 대형 타이머 및 파형 영역을 제거하고 1줄 녹음 컨트롤 바, 활성 노트 부재 시 버튼 비활성화, 도구 미설정 안내 배너, 전사 대기열 진행률 위젯, 오디오 상태(`전사됨`/`대기`) 배지로 재구성
- **리본 아이콘 변경 및 CSS 클래스 정리 (`FEAT-01`, `UI-01`)**:
  - `src/main.ts`, `src/sidebarView.ts`: 기존 `microphone`·`search` 리본 아이콘을 제거하고 SVG 아이콘(`otr-record-deck`) 1개로 통합
  - `src/settingsTab.ts`, `src/sidebarView.ts`, `src/audioPlaybackSync.ts`, `styles.css`: 미정의 Tailwind 클래스와 인라인 `element.style.*` 할당을 제거하고 `.otr-*` CSS 클래스로 대체
- **TypeScript 타입 오류 수정 (`FEAT-01`)**:
  - `src/settingsTab.ts`, `src/main.ts`, `src/localLlmClient.ts`, `src/orphanAudioHandler.ts`, `src/meetingNoteCreator.ts` 내 인터페이스 및 반환 타입 불일치 수정 (`tsc --noEmit` 오류 0건)

## 2026-11-20

### 추가
- **`3-ENV-17` 프로젝트 구조 및 로컬 저장소 폴더명 `-dev` 접미사 제거 및 fallback 없는 단일 경로 정규화**:
  - `src/modelCatalog.ts`, `scripts/setup-tools.ps1`, `src/cpuRuntimeDiscovery.ts`: 임시 `-dev` 폴더를 완전히 배제하고, 공식 표준 폴더인 `%LOCALAPPDATA%\on-the-record\models` 및 `tools`로 단일화 (사용자 결정에 따라 레거시 fallback 미지원)
  - 단위 테스트: `test/modelCatalog.test.ts`, `test/cpuRuntimeDiscovery.test.ts` 갱신 및 통과
- **`3-PROD-02` 플러그인 ID `on-the-record` 변경 없이 유지 확정**:
  - 사용자 결정에 따라 `obsidian-ontherecord`로의 ID 변경을 취소하고, Obsidian 공식 커뮤니티 등록 정책 준수 및 기존 설정 영속성 보존을 위해 `on-the-record` 유지 확정 (`TODO.md`)
- **`3-REC-08` ~ `3-REC-11`, `3-UX-04`, `3-UX-05`, `3-UX-09` ~ `3-UX-13` 전용 사이드바 제어 패널 및 플레이어형 녹음·전사 워크플로**:
  - `src/sidebarView.ts`: 오른쪽 사이드바 전용 `ItemView`(`OnTheRecordSidebarView`) 구현
  - 플레이어형 컨트롤러: 대형 디지털 타이머, 녹음 진행 펄스 인디케이터, 녹음 시작(`●`), 일시정지(`❚❚`), 계속하기(`▶`), 안전 중지 및 연결(`■`) 4버튼 바
  - 스마트 분할 세션(Split-Session): Obsidian 코어 레코더의 pause 미지원 한계를 극복하여 일시정지 시 오디오 연결 마감, 계속하기 시 `seq=2`로 후속 녹음을 매끄럽게 결합
  - `src/noteAudioExplorer.ts`: 활성 마크다운 노트 본문의 다중 오디오 임베드(`![[...]]`) 실시간 파싱, `Line N` 행 번호 및 전사 상태 뱃지 렌더링, [이동](에디터 커서 즉시 포커스) 및 [전사](백그라운드 큐 인계) 인터페이스 제공
  - `src/meetingNoteCreator.ts`: 날짜·시간 기반 표준 회의록(`YYYY-MM-DD HHmm 회의록.md`) 안전 생성기, 동적 템플릿 변수 치환(`{{date}}`, `{{time}}`, `{{title}}`) 및 템플릿 일치 시에만 녹음 자동 시작 트리거(`autoRecordTemplatePath`) 연계
  - 명령 연동: "새 회의록 작성 및 음성 녹음 시작(`create-meeting-note-and-record`)", "오른쪽 사이드바 회의록 제어 패널 열기(`open-sidebar-panel`)" 명령 및 리본 마이크 아이콘 등록
  - 테마 스타일링(`styles.css`): 모던 플레이어 테마, 펄스 애니메이션, Line N 뱃지 및 카드 그리드 완성
  - 단위 테스트: `test/meetingNoteCreator.test.ts`, `test/noteAudioExplorer.test.ts`, `test/sidebarView.test.ts` 추가 및 전건 통과
- **`3-POST-01` 로컬 LLM 연동 회의록 요약·액션 아이템 템플릿 연계**:
  - `src/localLlmClient.ts`: 프라이버시 보호를 위해 오직 `localhost`/`127.0.0.1` 로컬 호스트만 허용하는 로컬 LLM 클라이언트 구현 (외부 클라우드 URL 원천 차단)
  - Ollama(`/api/tags`, `/api/chat`) 및 OpenAI 호환 엔드포인트(LM Studio 등 `/v1/models`, `/v1/chat/completions`) 듀얼 지원 및 원클릭 연결 테스트 기능 제공
  - `src/summaryPrompt.ts`: 한국어 비즈니스 회의 맞춤형 3단 구조(📌 핵심 요약, 🎯 주요 결정 사항, ✅ 액션 아이템) 프롬프트 및 마크다운 포매터, 본문 전사문 자동 추출기 구현
  - 설정 탭(`src/settingsTab.ts`): "🤖 로컬 AI 회의록 요약 (Ollama / LM Studio)" 독립 섹션, 엔드포인트/모델 입력, 원클릭 연결 확인 버튼, 자동 요약 토글 추가
  - 명령 연동(`src/main.ts`): "현재 활성 노트 전사문 로컬 AI 요약 생성(`summarize-active-note-transcript`)" 명령 추가 및 백그라운드 전사 완료 시 자동 요약 삽입 옵션 연동
  - 단위 테스트: `test/localLlm.test.ts` 5개 항목 추가 및 통과
- **`3-UX-08` 지원 모델 선택지 전체 확장 및 모델별 원클릭 다운로드 가이드 UI**:
  - `src/modelCatalog.ts`: 공식 5대 GGML 양자화 모델(`base`, `small`, `medium`, `large-v3-turbo`, `large-v3`) 메타데이터 테이블, 파일명, 권장 여부, 다운로드 URL 매핑 함수 정의
  - 설정 탭(`src/settingsTab.ts`): 모델 선택 시 실시간 로컬 설치 여부 뱃지(`이 PC에 준비됨` / `미설치`), 모델 규격 및 설명 카드 렌더링
  - 원클릭 다운로드 가이드: 미설치 모델 선택 시 Hugging Face 공식 출처 링크 및 PowerShell 다운로드 명령어를 클립보드에 1초 만에 복사할 수 있는 원클릭 버튼 제공
  - 모델 경로 즉시 적용: 설치된 모델 선택 시 현재 PC 전사 모델 경로로 즉시 반영(`updateLocalSettings`) 기능 연동
  - 단위 테스트: `test/modelCatalog.test.ts` 5개 항목 추가 및 통과

## 2026-11-19

### 추가
- **GitHub 공식 위키(Wiki) 문서 세트 구축 (`docs/wiki/`)**:
  - `Home.md`: 프로젝트 개요, 빠른 시작 및 위키 전체 목차
  - `_Sidebar.md`: GitHub 위키 내비게이션 사이드바
  - `Installation-and-Setup.md`: 원클릭 셋업 스크립트 및 수동 도구 준비 가이드
  - `Workflow-Guide.md`: 회의 녹음 라이프사이클, 탭 닫힘 방어, 백그라운드 전사 및 싱크 재생 워크플로 가이드
  - `Settings-Reference.md`: 볼트/로컬 환경 설정 전 항목 상세 레퍼런스
  - `Hardware-and-GPU.md`: NVIDIA CUDA 및 Intel Iris Xe Vulkan 하드웨어 가속 튜닝 가이드
  - `Architecture-and-Privacy.md`: 100% 로컬 오프라인 무전송 보안 원칙 및 세션 마커 아키텍처
- **사용자 편의성 고도화를 위한 아이데이션 및 요구사항 정의 (`TODO.md`)**:
  - `3-UX-08`: 지원 모델 선택지 전체 확장(`medium`, `large-v3`) 및 모델별 원클릭 다운로드 가이드·검증 안내 UI
  - `3-REC-09`: 선택 템플릿 파일 기반 회의록 생성 시 녹음 자동 시작 트리거
  - `3-REC-08`: 명시적 회의록 생성 및 단축키 기반 녹음 시작 워크플로
  - `3-UX-04`: 오른쪽 사이드바 전용 패널(`ItemView`) 및 플레이어형 녹음 제어 UI
  - `3-UX-05`: 활성 노트 내 다중 레코딩 임베드 탐색기 및 선택형 개별 전사/이동 UI
- **`3-UX-07` 설정 화면 UI/UX 전면 리팩토링 및 사용자 중심 어휘·구조 개편**:
  - 사용자 지적에 따라 개발자 중심 왜곡 명칭 전면 폐기: "녹음 자동 시작 대상 폴더"를 "회의록 마크다운 노트 보관 폴더"로 수정하고, 실제 오디오(.m4a) 파일 저장 위치에 대한 안내 카드 신설
  - 복잡한 기술 용어 정비: "파일 안정화 대기" → "오디오 저장 완료 대기 시간 (초)", "장치 선호" → "연산 프로세서 선호도" 등 직관적 사용자 언어로 개편
  - 중복 노출되던 GPU/도구 설정을 정리하고, 5대 논리적 섹션(음성 녹음 및 세션 → 음성 전사 파이프라인 → 하드웨어 및 GPU 가속 → 전사 도구 경로 및 상태 → 원클릭 셋업)으로 완전 재배치
- **`3-UX-06` 설정 화면 상태 뱃지 모던 리디자인 및 완벽한 한국어 현지화**:
  - 기존 둔탁한 직사각형 블록 형태의 원색 뱃지를 Obsidian 네이티브 디자인 가이드라인에 부합하는 부드러운 알약 캡슐(`pill`) 및 미니 원형 인디케이터(`dot`) 스타일로 전면 리디자인 (`styles.css`, `settingsTab.ts`)
  - 설정 화면 내 불필요한 영문 표현(`(Local Tools)`, `(Setup Helper)` 등)을 자연스러운 한국어로 정비
  - Obsidian 전역 `moment.locale()` 및 `localStorage` 로케일 감지 체계를 보강하여 한국어 환경에서 100% 한글 UI 노출 보장
- **`3-DOCS-01` 설정 옵션 상세 가이드 및 도움말 문서 작성**:
  - 볼트/로컬 2단계 설정 아키텍처, 회의록 녹음 시작 모드, 탭 닫힘 방어, 모델 크기별 품질·소요시간, GPU 오프로딩(`-ngl`) 튜닝 효과 및 발열 완화 가이드를 집대성한 [docs/SETTINGS_GUIDE.md](./docs/SETTINGS_GUIDE.md) 작성 완료
  - 설정 탭 최상단에 "상세 설정 가이드 보기" 원클릭 바로가기 배너 연동
- **설정 파일 UTF-8 with BOM 자동 제거(Strip BOM) 호환성 패치**:
  - Windows PowerShell 5.1의 `Set-Content` 또는 메모장 저장 시 생성되는 UTF-8 BOM(`\uFEFF`, `EF BB BF`)으로 인한 JSON 파싱 에러(`SyntaxError: Unexpected token '﻿'`)를 원천 차단하기 위해 `LocalSettingsStore`에 BOM 자동 제거 파서 구현
  - `setup-tools.ps1`에서 BOM 없는 UTF-8 인코딩(`[System.Text.UTF8Encoding]::new($false)`) 저장 적용
- **`3-GPU-02` GPU 레이어 오프로딩 및 가속 백엔드 추상화 인터페이스 연계**:
  - `ProviderDevice` 추상화에 `"vulkan"` 공식 추가 (`"cpu" | "cuda" | "openvino" | "vulkan"`)
  - 머신별 `LocalSettings`에 하드웨어 가속 설정(`gpuBackend`, `gpuLayers`, `gpuDeviceId`) 지원 및 검증 정규화
  - `buildWhisperInferenceArgs`에서 레이어 오프로딩(`-ngl N`), 디바이스 번호(`-dev N`), CPU 전용 강제(`-ng`) 인수 생성 지원
  - 백그라운드 전사 큐 워커(`TranscriptionQueueWorker`)에 로컬 GPU 설정 파라미터 연동
  - 설정 UI([src/settingsTab.ts](./src/settingsTab.ts)) 내 "하드웨어 및 GPU 가속 설정" 섹션 및 백엔드/레이어/디바이스 입력 제공
  - 단위 테스트 7개 항목(`test/whisperGpuOffload.test.ts`) 추가 및 통과
- **`3-GPU-03` Intel Iris Xe 내장 GPU 가속 가능성 기술 조사 완료**:
  - 삼성 노트북 환경(Intel Iris Xe 80/96 EU)의 아키텍처적 특성 및 UMA 메모리 대역폭 병목 분석
  - Vulkan 1.4(`ggml-vulkan`)와 OpenVINO(`-oved GPU`) 백엔드의 의존성·모델 호환성·배포 복잡도 비교 검토
  - Windows 내장 `vulkan-1.dll` 활용 및 원본 GGML 모델 무변환 구동 가능한 Vulkan 백엔드 공식 채택 권고 및 로드맵 수립
  - 기술 보고서 작성: [GPU-03_INTEL_IRIS_XE_FEASIBILITY.md](./docs/baselines/GPU-03_INTEL_IRIS_XE_FEASIBILITY.md)
- 전체 93개 단위 테스트 전건 통과 및 production build 성공 검증
- **`3-UX-01` 사용자 주도 원클릭 도구 준비 도우미 (Setup Helper)**:
  - 초보 사용자가 터미널 한 줄 실행으로 whisper.cpp, 기본 모델 및 FFmpeg를 자동 설치하고 설정을 연결할 수 있는 독립 실행형 스크립트(`scripts/setup-tools.ps1`) 구현
  - 플러그인 설정 화면 내 원클릭 명령어 복사 버튼 연동
- **`3-CPU-01` whisper.cpp 장시간 전사 환각(Hallucination) 방지 파라미터 최적화**:
  - `buildWhisperInferenceArgs` 함수 구현 및 whisper.cpp CLI 인수에 `--max-context 0` (이전 컨텍스트 전염 방지), `--suppress-nst` (비음성 잡음 토큰 억제), `--temperature 0.0` 기본 옵션 적용
  - 단위 테스트 추가
- **`3-PIPE-04` 글로벌 배포를 위한 경량 다국어(i18n) 체계 구축**:
  - 외부 의존성 없는 TypeScript 순수 딕셔너리 기반 경량 다국어 모듈(`src/i18n.ts`) 구현
  - 기본 영어(`en`) 및 한국어(`ko`) 사전 구축 및 템플릿 변수 치환 지원
  - 단위 테스트 4개 항목(`test/i18n.test.ts`) 추가 및 통과
- **`3-UX-03` 회의 녹음→자동 전사→회의록 완성 통합 사용자 여정(E2E) 검증**:
  - 노트 생성, 음성 녹음 연결, 백그라운드 전사 결과 삽입, 다중 녹음 격리 및 메타데이터 재계산 동기화까지 전 과정을 검증하는 End-to-End 통합 테스트(`test/e2eUserJourney.test.ts`) 구축
- 전체 86개 단위 테스트 전건 통과 및 production build 성공 검증
- **오픈소스 프로젝트 저작권 문구 관리 및 표기 정돈**:
  - 프로젝트 전반(README.md, SUPPORT.md, TODO.md, CHANGELOG.md, 설계/조사 문서)에서 독자에게 거부감이나 불필요한 오해를 유발할 수 있는 방어적·해명성 사족 문구 제거
  - "박성원(SUNGWON PARK)이 개발한 독립 오픈소스 프로젝트(MIT)" 표준 문체로 일관되게 정비
- **`3-REC-05` 녹음 정보 재계산 및 메타데이터 동기화 명령 (`C-05`, `이 노트 녹음 정보 재계산`)**:
  - 활성 마크다운 노트의 본문 내 상세 녹음 블록, 세션 마커, 오디오 임베드를 파싱(`parseRecordingsFromBody`)하고 파일 메타데이터를 대조
  - Frontmatter 평면 집계 속성(`recording_count`, `recording_total_seconds`, `recording_total_size_mb`, `recordings` 배열 등)을 완전 재계산·동기화하는 명령(`recalculate-note-recordings`) 구현
  - 녹음이 완전히 삭제된 노트의 경우 불필요한 recording_* 메타데이터를 안전하게 정리
  - 단위 테스트 4개 항목(`test/recalculateMetadata.test.ts`) 추가 및 통과
- **`3-REC-06` 미아(고아) 오디오 파일 방지 및 복구 체계 (`F-09`, `C-04`, `고아 녹음 파일 점검`)**:
  - 앱 시작 시 비정상 종료된 영속 녹음 세션(`active-session.json`)을 자동 점검하여 복구 안내 토스트 제공(`checkUnfinishedSessionOnStartup`)
  - 볼트 내 백링크가 0개인 고아 녹음 파일들을 자동 탐지(`findOrphanAudioFiles`)하고 모달로 검색하여 활성 노트에 즉시 연결하는 명령(`check-orphan-audio`, `OrphanAudioModal`) 구현
  - 단위 테스트 2개 항목(`test/orphanAudio.test.ts`) 추가 및 통과
- **`3-PIPE-03` 타임스탬프-오디오 재생 동기화 (Audio Playback Sync)**:
  - 전사 결과 본문 내 세그먼트 타임스탬프(`[02:15]`)를 클릭 가능한 상호작용 요소로 변환하는 마크다운 포스트 프로세서(`postProcessTimestamps`) 등록
  - 타임스탬프 클릭 시 인접 오디오 플레이어(`<audio>`)의 재생 위치를 즉시 해당 초로 동기화 이동하고 자동 재생하는 이벤트 핸들러(`handleTimestampClick`, `syncAudioPlayback`) 구현
  - 단위 테스트 2개 항목(`test/audioPlaybackSync.test.ts`) 추가 및 통과
- **`3-UX-02` 설정 화면 정보 구조 개편 및 도구 무결성 검증 UI**:
  - Vault 공통 설정(동기화 정책)과 PC별 로컬 도구 설정(`local-settings.json`)의 시각적 영역 분리
  - 런타임 실행 파일, 모델 파일, FFmpeg 실행 파일의 실시간 존재/크기 검증 뱃지(`✅ 정상 / 준비됨 (MB)` / `⚠️ 파일 없음`) 렌더링
  - PowerShell 터미널용 FFmpeg 원클릭 설치 스크립트 복사 버튼(Setup Helper) 추가
- 전체 80개 단위 테스트 통과 및 production build(`main.js`, 155KB) 성공 검증
- **새 노트북 환경(Samsung 930XDB) 개발환경 구축 및 외부 참조 모듈 설치**:
  - `winget`을 통해 FFmpeg 9.0.2 설치 완료 (`%LOCALAPPDATA%\Microsoft\WinGet\Packages\...`)
  - `whisper.cpp` v1.9.5(b5454) x64 CPU 공식 빌드 다운로드 및 SHA-256 검증 완료 (`%LOCALAPPDATA%\on-the-record-dev\runtimes\...`)
  - `base-q5_1` 및 `small-q5_1` 모델 다운로드 및 SHA-256 무결성 검증 완료 (`%LOCALAPPDATA%\on-the-record-dev\models\...`)
  - `%LOCALAPPDATA%\on-the-record\local-settings.json` 초기화 및 실제 오디오(`format-fixture.wav`) 추론 실기 검증 완료
- **`3-REC-02` 탭 닫힘 감지 및 녹음 자동 안전 중지·연결 (`F-04`, `F-05`, `C-02`)**:
  - `WorkspaceLeaf.prototype.detach` 가로채기를 통해 녹음 중인 노트 탭 닫힘 감지 및 자동 안전 중지 구현
  - 코어 Audio recorder가 생성 직후 새 탭으로 오디오를 여는 동작 자동 닫기(`S-09`) 구현
  - 노트 본문 내 오디오 임베드 존재 여부 판별(`hasAudioEmbedInMarkdown`) 및 미존재 시 본문 끝 안전 연결(`attachAudioEmbedToMarkdown`, `S-10`) 구현
  - `onTabCloseAction` 설정(`stop-and-attach`(기본값) | `ignore`) 지원
  - 단위 테스트 5개 항목(`test/tabClose.test.ts`) 추가 및 전건 통과
- **`3-PIPE-01` 비차단 백그라운드 전사 큐 워커 및 상태표시줄(Status Bar) 진행률 표시**:
  - UI 블로킹 없는 비동기 큐 워커(`TranscriptionQueueWorker`) 및 작업 생명주기(시작/취소/완료/오류) 관리 구현
  - Obsidian 하단 상태표시줄 아이템 생성 및 실시간 전사 진행률(`🎙️ 전사 중 [45%]: filename.m4a`) 및 클릭 시 상세 상태 표시 구현
  - `RecordingQueue` 상태 모델 확장(`QueuedRecording`, `update()`, `get()`)
  - 단위 테스트 4개 항목(`test/transcriptionQueueWorker.test.ts`) 추가 및 전건 통과
- **`3-PIPE-02` 녹음 완료 후 자동 전사 인계 및 노트 삽입 워크플로 통합**:
  - 녹음 파일 안정화 후 백그라운드 전사 큐로 즉시 인계(`this.queueWorker.trigger()`)
  - 전사 완료 후 반영 모드(`transcriptionInsertMode`: `auto`(기본값) | `review`) 지원:
    - 자동 삽입 모드: 대상 노트의 해당 오디오 embed 바로 아래에 `applyAudioEmbedInsertion`을 통해 백그라운드 안전 자동 삽입 및 토스트 알림
    - 수동 검토 모드: 알림 클릭 또는 미리보기 모달을 통한 검토 후 삽입 안내
- **`3-REC-07` 녹음 상태표시줄 UI 및 원클릭 제어 (`F-10`, `S-13`)**:
  - `RecordingStatusBar` 모듈 구현: 녹음 세션 시작 시 Obsidian 하단 상태표시줄에 실시간 경과 시간(`🔴 01:23 파일명`) 1초 주기 타이머 렌더링
  - 상태표시줄 클릭 이벤트 핸들러: 클릭 한 번으로 녹음 안전 중지, 대상 노트 연결 및 전사 대기열 자동 인계 수행
  - 앱 재시작 시 디스크 복원 세션 감지 및 상태표시줄 즉시 복원 연동
  - 단위 테스트 2개 항목(`test/recordingStatusBar.test.ts`) 추가 및 전건 통과
- **`3-REC-04` Frontmatter 집계 속성 및 본문 녹음 블록 2중 기록 (`F-06`, `F-07`)**:
  - Dataview / Bases 호환 Frontmatter 평면 메타데이터(`recording_state`, `recordings` 위키링크 배열, `recording_count`, `recording_total_seconds`, `recording_total_size_mb`, `recording_first_start`, `recording_last_end`) 자동 기록 및 누적 집계
  - 본문 섹션(기본 `## 녹음 기록`) 아래 세션별 상세 블록(`### 녹음 N · 일시 (소요: MM:SS · 용량)`)을 `vault.process` 단일 트랜잭션으로 안전하게 동시 생성
- **`3-REC-03` 단일 문서 내 다중 녹음 파일 지원 및 세션 격리 매핑 (`F-08`)**:
  - 단일 노트 내 다중 녹음 순차 누적(`seq = recording_count + 1`) 시 각 세션별 고유 마커(`<!-- on-the-record:start audio="..." seq="N" -->`) 부여 및 블록 격리
  - 동일 오디오 재호출 시 중복 블록 생성 방지 및 세션 간 전사문 덮어쓰기 원천 차단
  - 단위 테스트 5개 항목(`test/noteMetadata.test.ts`) 추가 및 전건 통과
- 전체 72개 단위 테스트 통과 및 production build(`main.js`, 134KB) 성공 검증

## 2026-11-07

### 추가
- `3-REC-01` 코어 Audio recorder 제어 및 노트 기반 녹음 세션 시작 구현:
  - 시작 방식 2종(자동 `auto` / 수동 `manual`) 및 알림 피드백(`recordStartNotification`)으로 재정의:
    - 자동 시작형 `auto`(기본값): 새 노트 생성 시 즉시 개시. 알림 설정(켬 기본값)에 따라 우측 상단 토스트 알림(`Notice("음성 녹음을 시작합니다.", 4000)`) 표시 후 즉시 개시하거나 무음 개시.
    - 수동 시작형 `manual`: 새 노트 생성 시 자동 개시를 방지하고 명시적 사용자 명령 실행 시에만 개시.
  - 노트 Frontmatter(`recorder: auto | manual | silent | confirm | false/off`) 우선 판별 및 대상 폴더 필터(`autoRecordFolder`) 설정 지원
  - 단일 활성 녹음 세션 관리(`RecordingSessionManager`) 및 Obsidian 플러그인 폴더 내 `active-session.json` 디스크 영속화/앱 재시작 시 자동 복원
  - 수동 녹음 제어 명령 등록: "현재 활성 노트에서 음성 녹음 시작"(`start-recording`), "음성 녹음 중지"(`stop-recording`)
  - 단위 테스트 11개 항목(`test/recordingSession.test.ts`) 및 설정 검증 테스트 추가 (전체 56개 단위 테스트 통과)
- 레노버 노트북(다산동, Lenovo IdeaPad Gaming 3 15IMH05)의 `%LOCALAPPDATA%\on-the-record\local-settings.json`을 초기화하고 whisper-cli b5454, base 모델, Chocolatey FFmpeg 경로를 저장 및 검증
- 레노버 노트북에서 `real-sample-01` 5개 모델 전수(`base`, `small`, `medium`, `large-v3-turbo`, `large-v3`) 및 `real-sample-02` `medium` 모델의 CPU 음성전사 성능 실측 완료. 두 PC 간 세그먼트 수 100% 일치 확인 및 집계표 갱신 (`0-BASE-06`, `0-BASE-09` 완료)
- Hugging Face `ggerganov/whisper.cpp` 커밋 `5359861`에서 상위 모델 3종(`medium-q5_0`, `large-v3-turbo-q5_0`, `large-v3-q5_0`)을 다운로드하고 SHA-256 검증 완료 (5대 기준 모델 전수 구비)
- `0-BASE-08` 모델별 전사 결과 정량/품질 검증 보고서([BASE-08_MODEL_SELECTION_2026-11-07.md](./docs/baselines/BASE-08_MODEL_SELECTION_2026-11-07.md)) 작성 완료
- `TODO.md` 3단계 과제 통합 재편: 분산되어 있던 3단계 이후, 상용성·제품화, 녹음 노트 기획 과제를 현행 구현 현황과 상충 요소를 반영해 5대 영역 단일 3단계(제품 완성 및 녹음·전사 워크플로 통합)로 일원화 (`3-REC-01~07`, `3-PIPE-01~04`, `3-GPU-01~03` & `3-CPU-01`, `3-UX-01~03`, `3-POST-01`)

### 결정
- **프로젝트 소유권 및 라이선스 귀속 확정**: 본 프로젝트를 **박성원(SUNGWON PARK)의 독립 오픈소스 프로젝트(MIT)**로 확정. 저작권자를 `SUNGWON PARK`으로 확정하고 `LICENSE`, `README.md`, `SUPPORT.md`를 오픈소스 프로젝트 기준으로 전면 갱신
- **`0-ENV-16` 배포 라이선스 완료 종결**: 외부 런타임/모델 번들링 배포를 제외(`0-ENV-08`)함에 따라 제3자 바이너리 재배포 SBOM 의무가 소멸되었고, 실제 플러그인 배포물(`main.js`)은 npm 런타임 의존성 0개의 순수 자체 MIT 코드임을 확인하여 `0-ENV-16`을 완료 처리
- **`0-ENV-15` 외부 GitLab 연동 과제 공식 종료**: 소스코드 배포처를 GitHub(`https://github.com/sparklings/ontherecord`)으로 공식 확정하고 독립 오픈소스 프로젝트로 정립함에 따라, 외부 저장소 연동 이슈를 공식 종료(취소) 처리
- **기본 권장 모델**: 실무 회의 IT/외래어(CMDB, syslog, config 등) 복원력과 장시간 회의 환각 억제력(고유율 92.6%, 최대 반복 12회)이 압도적인 **`medium-q5_0`**을 기본 모델로 확정
- **보조 선택 모델**: 30분 이하 빠른 초안 확인용 경량 모델로 **`small-q5_1`**, GPU 연계 고정밀 모델로 **`large-v3-q5_0`** 선정 (`base`와 `large-v3-turbo`는 장시간 무한 루프로 부적격 탈락)
- **1시간 회의 처리 허용 시간 목표**: 기본 모델 기준 **70분 이내** 처리 완료(1:1 준실시간 허용), 고속 모델 기준 **30분 이내** 완료로 확정

### 삭제
- OneDrive 동기화 충돌 사본인 `package-G2300227.json`, `benchmarks/summary/records-G2300227.csv`, `docs/baselines/BASE-06_LARGER_MODELS_2026-11-03-G2300227.md` 및 미사용 0바이트 파일 `scripts/update_todo.js`를 삭제

### 변경
- `package.json`의 `test` 스크립트에 `--experimental-strip-types` 플래그를 추가해 Node.js v22.16.0 환경에서 `.ts` 단위 테스트 실행 호환성 확보. 45개 단위 테스트 전건 통과
- `src/cpuRuntimeDiscovery.ts`의 `getCpuToolSearchRoots`에 `%LOCALAPPDATA%\on-the-record-dev` 및 `%LOCALAPPDATA%\on-the-record`를 추가해 로컬 앱데이터/개발 폴더 내 whisper.cpp 런타임 및 모델 자동 검색을 지원. 레노버 환경에서 런타임 2종·모델 2종 정상 검색 확인 및 단위 테스트 갱신
- 레노버 노트북 환경에서 whisper.cpp b5454 SHA-256·버전 검증, Chocolatey FFmpeg 9.0.1 기반 M4A 오디오 정규화, 시험 추론 및 JSON segment 초 단위 timestamp 파싱 실기 검증 완료
- `PlugVaults`의 실제 오디오(`Recording 20261103130854.m4a`) 및 테스트 노트(`On the Record Test Case 1.md`)를 대상으로 실제 whisper.cpp 전사, embed 바로 아래 교체/추가 삽입 로직 및 전사문 검색어 매칭 실기 검증 완료
- NVIDIA GeForce GTX 1650 Ti (4GB VRAM, 드라이버 580.88, CUDA 13.0) GPU 구동 상태 및 VRAM 적재 용량 분석 완료
- TypeScript 검사, lint, production build 통과 후 `PlugVaults`에 배포하고 해시 일치 확인

## 2026-11-06

### 추가
- `2-CPU-01`~`2-CPU-04`: 사용자 설치 whisper.cpp 런타임·모델 검증과 시험 추론, FFmpeg 기반 16 kHz 모노 PCM WAV 정규화, JSON segment timestamp 반환, 전사문 검색을 구현. PC별 FFmpeg 경로 설정, 줄 단위 검색어 설정, 검색 결과에서 일치 segment로 이동하는 기능을 추가
- CPU 시험 모달의 폭과 긴 SHA-256 표시를 개선
- `2-CPU-05`: 현재 노트의 오디오 embed를 커서 위치 기준으로 선택하고, 전사 결과를 선택된 embed 바로 아래에 삽입. PlugVaults에서 새 선택 UX와 삽입 위치의 실기 확인 완료(2026-11-06, 사용자 확인)
- `2-CPU-06`: 알려진 로컬 설치 폴더에서 whisper.cpp 런타임과 기준 모델을 검색하고 버전·SHA-256을 확인한 뒤, 사용자가 승인한 조합만 PC별 설정에 적용. PlugVaults에서 검색 기능 정상 동작 확인(2026-11-06, 사용자 확인)

### 변경
- 프로젝트 명칭을 `OntheRecord`로 통일하고 설계·조사 문서 파일명(`docs/design/`, `docs/research/`) 및 상호 참조 링크, 개발 환경 작업 경로 표기를 일괄 갱신
- 시험 입력의 정규화 오디오·전사 결과를 임시 폴더에서 처리 후 정리하도록 연결. 런타임·모델·FFmpeg의 다운로드나 설치는 하지 않음
- `TODO.md`에서 `2-CPU-01`~`2-CPU-06`을 완료 처리. 전체 PC 검색 및 다운로드·설치·업데이트·삭제·명령어 안내 검토를 `3-CPU-02`로 이관
- TypeScript 검사, lint, production build 통과. CPU 전사·검색 및 기존 기능 테스트 38개 통과. PlugVaults 시험용 빌드를 배포하고 소스·배포 파일 해시 일치 확인

## 2026-11-05

### 변경
- 개발계획서, README, SUPPORT 및 라이선스 정책 보고서에서 MIT 정책의 범위를 프로젝트 자체 코드로 명확히 함. 제3자 artifact를 MIT로 간주하지 않도록 정리하고, 해당 구성요소 검토를 출시 차단 조건으로 명시
- 저작권자를 박성원의 독립 오픈소스 프로젝트(MIT)로 확정하고 저작권자 `SUNGWON PARK (박성원)`으로 갱신 완료(`0-ENV-07` 완료)
- `0-ENV-10`을 upstream/설계 후보 예비 검토로 한정하고, 실제 배포 구성요소별 출처·revision·해시·라이선스·고지·재배포 의무와 SBOM 확인을 `0-ENV-16`으로 분리
- Obsidian 디렉터리 정책 검토와 whisper.cpp 기준선 문서의 라이선스 단정 표현을 정정. MIT 호환성, 저작권 승인, 실제 artifact 재배포 조건 및 Obsidian의 자동 설치 정책을 서로 독립된 검토 항목으로 구분
- 2026-11-05 기준 Obsidian 공식 정책·제출 요건·FAQ·관리 절차·조직 문서를 재확인. 런타임·모델의 다운로드·설치·업데이트·삭제는 플러그인 기능에서 제외하고 사용자 관리 방식으로 전환; README의 네트워크 및 vault 밖 파일 공개 요건을 추가
- `0-ENV-08`을 완료 처리하고 TODO, 개발계획서, 라이선스 보고서와 정책 검토서를 일치시킴. 남은 공개 차단 항목은 artifact 단위 권리·의무 검토(`0-ENV-16`)와 제출 직전 체크리스트로 한정
- `0-OBS-03` 실제 녹음 1회에서 오디오 파일 생성 후 Markdown 노트 수정까지 약 2.008초를 관찰하고, 노트의 오디오 embed를 확인. 단일 시험 한계를 기록하고 안정화 후 MetadataCache 링크 확인을 구현 기준으로 추가
- 1단계 공통 파이프라인 작업에 `1-PIPE-01`~`1-PIPE-05` ID 부여: 설정 화면, 녹음 감지·대기열, 파일 찾기, provider 계약, 결과 미리보기
- `1-PIPE-01` 설정 탭 구현: vault 설정과 PC별 런타임·모델 경로를 분리 저장하고, 감지 설정·안정화 시간·언어·모델 크기·장치 선호를 편집할 수 있도록 추가. PC별 설정은 동시 창 갱신을 직렬화한다. Obsidian 설정 저장·복원은 사용자가 확인했으며, 자동 전사 대기열 연결은 `1-PIPE-02`에서 진행
- `1-PIPE-02` 설정 기반 녹음 감지, 안정화 후 MetadataCache 오디오 embed 확인(최대 30초), 메모리 대기열 및 파일 경로 중복 방지를 구현. 삭제·이름 변경·설정 비활성화를 처리하고, 전사 엔진은 아직 연결되지 않았음을 사용자에게 알림. TypeScript 검사·lint·21개 테스트·production build 통과 후 PlugVaults에 배포했으며, 배포 `main.js` 해시가 빌드 결과와 일치함. Obsidian 실제 녹음 감지와 설정 토글 수동 시험 완료(2026-11-05, 사용자 확인)
- `1-PIPE-03` 파일 찾기: 리본 아이콘·명령 팔레트에서 vault의 지원 오디오를 선택하고, 파일 존재·크기·안정화 상태를 검증한 뒤 기존 메모리 대기열에 연결. Obsidian에서 안정 파일 추가 및 같은 파일 재선택 시 중복 거부 알림을 확인(2026-11-05, 사용자 확인). 컨테이너·코덱·손상 파일 검증은 디코더 도입 단계에 남김
- `1-PIPE-04` provider 계약 정의 완료: `src/provider.ts`에 provider 설명·준비 상태, 요청, 진행 이벤트, 초 단위 segment 결과, 공통 오류 코드 및 `AbortSignal` 취소 인터페이스를 선언하고 오류 타입 테스트 추가. 타입 검사·lint·23개 테스트·production build 통과. 구체 엔진, registry, worker 및 mock-provider 통합은 후속 범위
- `1-PIPE-05` 결과 미리보기 완료(Obsidian 수동 시험 사용자 확인, 모달 한글 깨짐 수정): 전사 결과를 검토·편집·승인·취소하는 모달, 지정 헤딩 아래 삽입, 마커 기반 기존 결과 교체/추가 선택 및 시험용 명령 "샘플 전사 결과 미리보기 시험" 추가. 승인 전에는 노트를 수정하지 않는다. 타입 검사·lint·29개 테스트·production build 통과, PlugVaults 배포 해시 일치. 커서/새 노트 삽입과 삽입 설정은 후속 범위

## 2026-11-03

### 추가
- `0-BASE-06`~`0-BASE-09`: 큰 모델(medium, large-v3-turbo, large-v3) 기준선, 장비별 측정 기록 구조와 요약 스크립트, 1시간 회의 소요 시간 집계표. `0-OBS-02`: 녹음 파일 안정화 감지 구현과 코어 녹음기 시험
- 샘플 폴더 구조(`samples\`)를 `.gitkeep`으로만 제공

### 변경
- `.gitignore`: `samples\` 내용 전체와 오디오·자막 확장자(`*.m4a`, `*.wav`, `*.srt` 등)를 제외. `.gitkeep`만 추적
- 회사명·부서명·실명·계열사 명단·사내 서버 주소를 README, SUPPORT, CHANGELOG, TODO, 보고서 일부에서 일반 표현으로 바꿈. 라이선스 정책 검토 보고서는 검토 이력 보존을 위해 유지

## 2026-11-02

### 추가
- `0-ENV-01`: Samsung 960XFG의 GPU를 재확인해 Intel Iris Xe Graphics, 드라이버 32.0.101.7088, `VEN_8086&DEV_A7A0`를 기록. Lenovo IdeaPad Gaming 3도 재확인해 하드웨어 프로필 revision 2에 Windows 11 build 26300과 최신 GPU 정보를 반영
- `0-BASE-01`: 합성 오디오 5종과 실제 녹음 3개의 원본·변환본 12종을 확보하고 컨테이너·코덱·길이·SHA-256 및 FFmpeg 디코딩 결과 기록
- `0-BASE-02`: 한국어 회의 샘플 3개의 출처·기술 메타데이터·SHA-256 기록. 음성 내용은 열람·전사하지 않았으며, 기준 전사본과 CER 평가는 동의 및 조직 정책 확인 후 진행
- `0-BASE-03`: whisper.cpp v1.9.5 CPU 배포본(b5454)과 MIT 라이선스, 실행 파일·배포본 해시 및 `base`·`small` q5_1 모델 해시 기록
- `0-BASE-04`: Samsung과 Lenovo에서 `base`·`small` 모델을 각 2개 샘플로 2회씩 측정해 장치별 JSON 8건 추가. 처리율·최대 메모리 결과는 `docs\baselines\BASE-04_THROUGHPUT_MEASUREMENT_2026-11-02.md`에 정리
- `0-BASE-05`: FFmpeg 9.0.1을 디코더 후보로 선정. 합성 표본 5종과 실제 Opus/M4A 3종을 Lenovo에서 정규화 디코딩 확인하고, LGPL 기본 빌드와 현재 GPLv3 개발용 빌드의 구분 및 배포 조건을 기록
- Samsung GPU 확인 기록 `docs\baselines\HARDWARE_CHECK_SAMSUNG_960XFG_2026-11-02.md` 및 하드웨어 프로필 `benchmarks\hardware\samsung-960xfg.json` 추가
- `0-OBS-01`: Obsidian 1.14.4의 `PlugVaults`에서 공개 `app.vault` 이벤트로 코어 Audio recorder `.m4a` 생성 1건 감지. `modify` 이벤트는 미관찰. [시험 기록](./docs/baselines/OBS-01_AUDIO_RECORDER_EVENT_PROBE_2026-11-02.md)

### 변경
- `0-BASE-04` Lenovo 기준선 반영: 긴 샘플 기준 `base` 14.543~14.735초/오디오 1분, `small` 25.508~26.415초/오디오 1분. TODO 항목을 완료로 변경. 전사 품질(CER)은 미평가
- `.gitignore`에서 `samples\` 전체를 제외해 오디오뿐 아니라 전사문·라벨·메타데이터도 Git 추적 대상에서 제외
- 측정 스크립트의 전사문 저장 위치를 동기화 폴더 밖 `%LOCALAPPDATA%\on-the-record-dev\transcripts\`로 변경하고, 측정 기록에는 사용자 경로 대신 환경 변수 토큰을 기록
- `docs\design\HARDWARE_PROFILE.md`의 전사문 경로 규칙 및 Lenovo 프로필 예시를 실제 확인값에 맞게 갱신. Lenovo 시스템 정보 문서에 OS 빌드·GPU 메모리·드라이버·저장 공간 재확인 결과 반영
- 문서 폴더를 `docs\design\`(설계), `docs\baselines\`(시험·기준선), `docs\research\`(정책·조사)로 분류하고 [문서 안내](./docs/README.md)에 목록화. 내부 링크도 새 위치로 갱신
- 루트 README에 저장소 디렉터리 용도를 명시하고, 새 문서는 문서 안내와 CHANGELOG에 등록하도록 규칙 추가
- 사용자가 삭제를 요청한 OneDrive 충돌 사본 `SUPPORT-G2300227.md`와 이후 발견된 `src/main-G2300227.ts`를 삭제하고 `SUPPORT.md` 및 `src/main.ts`는 보존. 저장소의 Markdown 로컬 링크를 점검해 깨진 링크가 없음을 확인

## 2026-11-01

### 결정
- `0-ENV-07`: 회사 규정은 확인되지 않음. 방침으로 기록: 소유는 소속 회사 구성원 모두, 관리는 소속 회사 담당 조직, 현재 저장소는 개발자 개인 계정이 관리하고 회사 공식 GitHub 저장소 확정 시 이관. 규정 확인 전까지 저장소는 private 유지. `LICENSE` 저작권자 표기 형식은 미정
- `0-ENV-06`: 공개 코드는 MIT 적용. (초기 사내 혜택 검토 보고서는 2026-11-07 개인 오픈소스 프로젝트 확정에 따라 공식 폐기됨)
- `0-ENV-05`: 이름 `On the Record`, 플러그인 id `on-the-record`, 부제 `Local minutes for Obsidian`, 저장소명 `ontherecord`(주소 `https://github.com/sparklings/ontherecord`, 접근성 우선. 네이밍 보고서의 기존 `obsidian-on-the-record`에서 변경). 근거는 `docs\research\OntheRecord_사업보고서_네이밍.md`. 상표 검색과 도메인 확보는 미확인

### 추가
- `docs\research\Obsidian_디렉터리정책_상충검토.md` 작성(`0-ENV-08`): Obsidian 공식 문서 5건 원문과 프로젝트 결정 대조, 상충·확인 필요 11건 정리. 주요 사항: 런타임·모델 다운로드와 "Install or update themselves or their dependencies" 금지의 충돌 가능성, 등재 후 저장소 이전은 관리자 절차, README에 네트워크 사용·vault 밖 접근 고지 필요
- `0-ENV-12` 완료: `scripts/deploy.mjs`, `npm run deploy` 추가. PlugVaults 시험 vault의 `.obsidian\plugins\on-the-record\`에 복사 확인. `ObsidianVaults` 경로 거부와 비 vault 폴더 거부 동작 확인
- `0-ENV-11` 완료: 플러그인 프로젝트 골격 생성(`manifest.json`, `versions.json`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `eslint.config.mjs`, `src/main.ts`). `check`·`lint`·`build` 통과. `minAppVersion` 1.7.2는 잠정값
- `TODO.md`에 `0-ENV-15`(사내 GitLab 인증서 신뢰 등록 검토) 보류 항목 추가
- `0-ENV-02` 완료: private 저장소 `sparklings/ontherecord` 생성, 첫 커밋(`12881ff`) push. 공개 범위는 라이선스·회사 규정 확인 후 재결정

### 변경
- 설계·참조 문서 `GLOSSARY.md`, `SETTINGS_DESIGN.md`, `HARDWARE_PROFILE.md`를 루트에서 `docs\design\`으로 이동하고 README, TODO, `benchmarks\README.md`, 개발계획서의 링크를 갱신. `README.md`, `LICENSE`, `CHANGELOG.md`, `TODO.md`, `SUPPORT.md`는 루트 유지
- 프로젝트 문서의 일반 설명을 한국어로 정리하고 `SUPPORT.md`를 한국어로 작성. 제품명·기술 식별자·공식 문서의 원문 인용은 정확한 식별을 위해 원어 유지
- 저자 표기를 `SUNGWON PARK`으로 변경(`manifest.json`, `package.json`, 네이밍 보고서, TODO). 기존 `Sungwon Park (SG)` 삭제
- Git 전역 설정 `http.sslVerify=false`를 제거하고 사내 GitLab 호스트에만 URL 단위로 적용. GitHub는 기본값(검증 사용)으로 복귀. 개발 PC 환경 설정이며 프로젝트 파일 변경 없음(이 PC만 적용, 다른 PC는 별도 설정 필요)
- `docs\design\SETTINGS_DESIGN.md`의 `<plugin-id>`를 `on-the-record`로 확정
- README 제목에 제품명 반영

### 추가
- 프로젝트 관리 문서 `README.md`, `CHANGELOG.md`, `TODO.md` 초안 작성
- 용어집 `docs\design\GLOSSARY.md` 작성(provider, provider 계약, provider manifest, segment, 가속기). 항목별 작성일·변경 이력 표기 추가
- `TODO.md` 0단계 항목에 식별코드 부여(`0-ENV-01`~`14`, `0-BASE-01`~`05`, `0-OBS-01`~`03`)와 코드 관리 규칙 추가
- `docs\design\SETTINGS_DESIGN.md` 작성(`0-ENV-13`): 공유 설정(`data.json`)과 PC별 설정(`%LOCALAPPDATA%\<plugin-id>\local-settings.json`) 분리 기준, 항목 분류 초안, 충돌·불일치 처리 규칙
- `.gitignore` 작성(`0-ENV-03`)
- `benchmarks\` 폴더 생성(`hardware\`, `records\`, `README.md`). Lenovo 장치 프로필 `lenovo-ideapad-gaming3-15imh05.json` 작성(메모리 17,041,244,160 B, NVIDIA 전용 메모리 4 GiB 확인)
- `docs\design\HARDWARE_PROFILE.md` 작성(`0-ENV-14`): 장치 프로필과 측정 기록의 JSON 형식, 공통 규칙, Lenovo 예시
- `TODO.md` 0단계 환경 항목을 진행 순서로 재배열. 플러그인 이름, GitHub 저장소, 라이선스 정책 관련 항목(`0-ENV-02`, `05`~`12`)은 보류로 분리
- `TODO.md` `0-ENV-01`을 보류로 이동(Samsung 노트북이 다른 장소에 있음, 2026-11-02 수행 예정)

### 변경
- 개발계획서 §4~§5, §10, §12~§15: 다중 PC 개발 방식 반영
  - PC 2대 이상, 순차 작업(동시 편집 없음)
  - OneDrive `STT` 작업 폴더 유지, Git 연결 후에도 동일
  - PC 전환 절차, 저장소·동기화 대상 구분, 공유 설정과 PC별 설정 분리
  - AssistantEmily와 같은 PlugVaults 테스트 볼트 배포 방식
- 개발계획서 §5 PC 전환 절차: OneDrive 안의 `.git` 위험 평가를 수정. 병합 충돌은 발생 조건이 없고, 동기화 지연에 의한 불완전 상태만 남는다고 정리
- 개발계획서 경로 표기를 `%USERPROFILE%`로 통일(PC별 사용자 계정이 다름)

- OneDrive 전제 검토: OneDrive 동기화는 개발자 개인 환경이며 사용자 vault 동기화 방식은 다양하므로 제품 설계에서 가정하지 않도록 수정. `docs\design\SETTINGS_DESIGN.md`(배경·저장 위치·규칙 6, "공유 설정"→"vault 설정"), 개발계획서(§5 개발자 개인 방식 표기, §12, §13, §14, §15-2), README 개발 환경 절을 변경
- README 링크를 `docs\` 이동 후 경로로 수정
- `systeminfo_*.md` 2개를 `docs\`에서 `benchmarks\hardware\`로 이동하고 README·개발계획서 링크를 수정

### 결정
- `0-ENV-04`: `node_modules`·빌드 산출물은 AssistantEmily와 같이 OneDrive 동기화를 허용하고 `.gitignore`로 Git에서만 제외한다. `package-lock.json`을 버전 관리하고 PC 전환 후 `npm ci`로 재생성한다. 네이티브 모듈 추가 또는 PC 간 불일치가 생기면 재검토한다.
- 라이선스: 미정 유지. 소속 회사 구성원(그룹사·계열사·관계사, 회사명 명시)에게 무료 제공하는 방식을 계획

### 이슈
- Samsung 960XFG의 GPU 구성 불일치. `systeminfo_Samsung_960XFG.md`에는 Intel Iris Xe만 기록되어 있으나 UHD Graphics도 있다는 사용자 의견이 있음. Samsung PC에서 `Win32_VideoController` 조회 후 확인 필요. 개발계획서 표는 원본 문서와 일치함

## 2026-10-31

### 추가
- 개발계획서 `docs\design\OntheRecord_회의록_커뮤니티플러그인_개발계획서.md` 작성

## 2026-10-30

### 추가
- 시스템 정보 문서 작성: `systeminfo_Samsung_960XFG.md`, `systeminfo_Lenovo_IdeaPad_Gaming3.md`
