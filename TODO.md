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

## 2026-11-01

### 0단계: 기준선 및 환경

진행 순서대로 나열한다. 코드 번호는 순서와 무관하다. 순서 기준은 (1) 이름·저장소·라이선스 결정에 의존하지 않는 것, (2) 다른 작업의 입력이 되는 것을 앞에 둔다.

- [x] `0-ENV-14` 하드웨어 프로필 기록 형식 정의(기기, CPU/GPU, 드라이버, provider·모델 버전, 처리율, 메모리) → [HARDWARE_PROFILE.md](./docs/HARDWARE_PROFILE.md) 초안 작성(2026-11-01). 프로필 자료는 `benchmarks\` 폴더에 보관. Lenovo 프로필 작성 완료, Samsung 프로필은 `0-ENV-01` 이후 작성. `0-BASE-04` 측정 중 부족한 항목이 나오면 수정 (`0-BASE-04` 측정 기록의 형식이 됨)
- [x] `0-ENV-04` `node_modules`·빌드 산출물의 OneDrive 동기화 제외 또는 재생성 방식 결정 (프로젝트 초기화 전에 정해야 함) → **결정(2026-11-01): AssistantEmily와 동일.** OneDrive 동기화는 허용하고 `.gitignore`로 Git에서만 제외한다. PC 전환 후 `npm ci`로 재생성할 수 있어야 하므로 `package-lock.json`을 버전 관리한다. 근거: OneDrive에는 폴더 단위 제외 기능이 없고(웹 검색 요약, 공식 문서 미확인), AssistantEmily의 `node_modules`(11,736개 파일, 108 MB)는 네이티브 `.node` 파일 없이 esbuild win32-x64 바이너리만 있어 두 PC(Windows x64)에서 문제가 없었다. 재검토 조건: 네이티브 모듈 의존성이 추가되거나 PC 간 `node_modules` 불일치가 발생하면 폴더를 프로젝트 밖으로 옮기고 junction으로 연결하는 방식을 검토한다. whisper.cpp 실행 파일·모델은 프로젝트 밖 사용자별 데이터 폴더에 설치하므로 이 결정과 무관하다.
- [x] `0-ENV-03` `.gitignore` 작성(`node_modules`, 빌드 산출물, 모델·런타임, 비밀 값) → [.gitignore](./.gitignore) 작성(2026-11-01). AssistantEmily 기준 항목에 모델·런타임(`*.gguf`, `ggml-*.bin`, `runtimes/`, `models/`), `.local/`, 오디오 표본 원본(`samples/**` 오디오 확장자), OS 파일을 추가. 아직 Git 저장소가 없어 `git check-ignore`로 동작 확인은 `0-ENV-02` 이후 수행. 오디오 표본 폴더명 `samples/`는 `0-BASE-01`에서 확정 시 갱신
- [x] `0-ENV-13` 설정 저장 구조 설계: vault 설정과 PC별 설정 분리 → [SETTINGS_DESIGN.md](./docs/SETTINGS_DESIGN.md) 초안 작성(2026-11-01), 동기화 방식 비의존으로 수정(2026-11-01). vault 설정은 `data.json`, PC별 설정과 런타임·모델은 `%LOCALAPPDATA%\<plugin-id>\`. 미결정: 외부 경로 입력, 저장 직전 수정 시각 확인

- [x] `0-ENV-05` 플러그인 id, 이름 결정 → **결정(2026-11-01): 이름 `On the Record`, id `on-the-record`, 부제 `Local minutes for Obsidian`, 저자 `SUNGWON PARK`(변경: 기존 `Sungwon Park (SG)`), 저장소명 `ontherecord`(접근성 우선, 보고서의 기존 `obsidian-on-the-record`에서 변경).** 근거: [네이밍 보고서](./docs/STT_사업보고서_OnTheRecord_네이밍.md). id 규칙(소문자·하이픈, `obsidian` 미포함, `plugin` 미종료)과 커뮤니티 목록 중복 없음은 보고서 기준 확인됨(2026-11-01 목록 9,755개). 미확인: 국내·USPTO 상표 검색(9·42류), 도메인 확보. 상표 결과에 따라 이름이 바뀔 수 있으며, 그 경우 id는 공개 전까지만 변경 가능하다
- [x] `0-ENV-02` Git 저장소 생성 및 GitHub 원격 연결 → 완료(2026-11-01). 로컬 저장소(`main`, `.gitignore` 동작 확인) 첫 커밋 후 private 저장소 `https://github.com/sparklings/ontherecord` 생성·push. 공개 범위는 라이선스·회사 규정 확인(`0-ENV-06`~`09`) 후 재결정. Git 사용자 정보는 전역 설정, `gh` 2.103.3 설치·로그인(`sparklings`)

#### 보류: 정책·이름 결정 후 진행

라이선스 정책이 정해져야 시작할 수 있는 항목이다. 결정 시점은 미정이다.

- [x] `0-ENV-11` 플러그인 프로젝트 초기화(AssistantEmily 구조 참조) → 완료(2026-11-01). 저장소 루트에 `manifest.json`(id `on-the-record`, `isDesktopOnly: true`), `versions.json`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `eslint.config.mjs`, `src/main.ts`(빈 `Plugin` 클래스) 생성. `npm install` 후 `npm run check`, `npm run lint`, `npm run build` 통과, `main.js` 생성 확인. AssistantEmily와 다른 점: PlugVaults 자동 배포와 `.env` 로드는 넣지 않음(배포는 `0-ENV-12`), 라이선스 미정이라 `package.json`은 `private: true`, `license: UNLICENSED`. 잠정값: `minAppVersion` 1.7.2(AssistantEmily 값, 이 플러그인 요구 API로 검증하지 않음 → `0-OBS` 검증 후 확정), 버전 0.0.0. `npm install`에서 `npm audit` 경고가 출력됨(내용 미확인)
- [x] `0-ENV-12` PlugVaults 배포 절차 작성(빌드 결과를 `.obsidian\plugins\<id>\`에 복사) → 완료(2026-11-01). [scripts/deploy.mjs](./scripts/deploy.mjs)와 `npm run deploy` 추가. 절차: (1) 프로덕션 빌드 (2) `main.js`, `manifest.json`, `styles.css`(있을 때만)를 `<vault>\.obsidian\plugins\on-the-record\`에 복사 (3) Obsidian에서 플러그인 활성화(최초 1회) 또는 재활성화. 대상 vault는 환경 변수 `OTR_TEST_VAULT`, 없으면 `%USERPROFILE%\OneDrive\PlugVaults`. 안전장치: 경로에 `ObsidianVaults`가 있으면 거부, `.obsidian`이 없는 폴더는 거부(두 경우 종료 코드 1 확인). 활성화 목록(`community-plugins.json`)은 수정하지 않음. 실제 실행으로 `main.js`, `manifest.json` 복사 확인. Obsidian 로드 확인 완료(2026-11-01, 사용자 확인): 커뮤니티 플러그인 목록에서 활성화되고 오류 없음. 빈 `onload()`라 리본·명령·설정 탭은 없음
- [x] `0-ENV-06` 라이선스 정책 확정 → **결정(2026-11-01): 공개 코드는 MIT, 소속 회사 구성원 혜택은 라이선스 제한이 아닌 사내 혜택(지원·반입 심의 패키지·프리셋·교육)으로 제공.** 근거: [라이선스 정책 보고서 V1.1.0](./docs/STT_라이선스정책_에스넷그룹_명세_및_체계검토.md). 이전 계획("구성원에게만 무료인 라이선스")에서 변경됨. 이유(보고서 §4.5~4.6): 대상을 지목한 라이선스는 OSI 승인을 받을 수 없고 Obsidian 디렉터리에서 'Custom license' 경고 대상이며, 설치 시 신원을 확인할 수단이 없다. 대상 조직 3층 명단(1순위 에스넷시스템과 계열 7개사, 2순위 인성정보와 계열 8개사, 3순위 블루로터스)은 보고서 §6.1이 정본이다. 미해결: `LICENSE` 저작권자 표기(`0-ENV-07` 결과 필요), 인성정보 계열 지분 변동 재확인(차기 사업보고서). 보고서의 DART 수치와 Obsidian 정책 인용은 이 세션에서 원문 대조하지 않음
- [~] `0-ENV-07` 회사의 소프트웨어 배포·소유권 관련 규정 확인(공개 GitHub 저장소 게시 가능 여부 포함) → **규정은 확인되지 않음(2026-11-01).** 확인되지 않은 상태에서 다음 방침을 기록한다(사용자 지시): (1) 소유권은 에스넷그룹 구성원 모두의 것으로 한다. (2) 관리는 에스넷시스템 오감지능연구소가 한다. (3) 현재 GitHub 저장소(`sparklings/ontherecord`)는 오감지능연구소에서 근무하는 박성원이 관리한다. (4) 회사 공식 GitHub 저장소가 확정되면 이관한다. 미해결: 위 방침은 회사 규정으로 확인된 것이 아니며, "구성원 모두의 소유"를 `LICENSE` 저작권자 표기에 어떻게 적을지(법인명, 부서명, 개인명 중 무엇인지) 정해지지 않았다. 저장소를 공개로 전환하기 전에 회사 규정 확인 또는 승인이 필요하다
- [~] `0-ENV-08` 공개 GitHub 저장소와 Obsidian 커뮤니티 플러그인 등록에 맞는 라이선스 조건 확인 → 공식 문서 5건 원문 대조 완료(2026-11-01), 상충 11건 정리: [Obsidian_디렉터리정책_상충검토.md](./docs/Obsidian_디렉터리정책_상충검토.md). 라이선스 조건(MIT, `LICENSE` 파일)은 충돌 없음. **미결정: 런타임·모델 다운로드 기능이 "Install or update themselves or their dependencies" 금지에 해당할 가능성(문서 §3의 선택지 A/B/C).** 등재 전 저장소 위치 확정 필요(등재 후 이전은 관리자 절차). Obsidian 상표 정책 원문은 미확인. 위 결정이 나면 완료 처리
- [x] `0-ENV-10` 의존 구성 요소(`whisper.cpp`, 모델, 오디오 변환기)의 라이선스와 MIT 공개의 충돌 여부 확인 → 완료(2026-11-01): 현재 설계에서 일괄 충돌 없음. `whisper.cpp`·`ggml`은 MIT, 모델 라이선스는 실제 출처별로 다르므로 배포 파일 기준으로 고정 필요, FFmpeg는 LGPL/GPL 및 빌드·배포 형태별 의무 확인. 자세한 내용: [라이선스 정책 보고서 §7 검토 결과](./docs/STT_라이선스정책_에스넷그룹_명세_및_체계검토.md). 현재 실제 런타임/모델/변환기는 미포함이므로 최종 SBOM은 `0-BASE-03`, `0-BASE-05`에서 선택한 버전·파일 기준으로 확정
- [x] `0-ENV-09` `LICENSE`(MIT) 작성, `README.md` 라이선스 항목 갱신, `package.json`을 `license: MIT`, `private: false`로 변경, 사내 혜택 안내 문서(`SUPPORT.md`) 작성 → 완료(2026-11-01). 불명확한 사항은 미정으로 기록: `LICENSE` 저작권자, 공개 저장소 승인 및 회사 규정 확인은 `0-ENV-07` 미해결이며 저장소는 비공개 유지. `SUPPORT.md`의 지원 연락처/채널, 임직원 확인 절차, 사내 배포·자료 위치는 미정; 대상 조직은 라이선스 정책 보고서 §6.1을 기준으로 하고 하이케어넷 포함 여부 재확인 필요. 미확정 운영 세부사항과 권리 귀속을 확정한 뒤 문서 및 저작권자 표기를 갱신한다

#### 보류: 장소·장비 사유

- [ ] `0-ENV-15` (보류, 우선순위 낮음) 사내 GitLab(`211.239.11.79:8443`) 접속의 `http.sslVerify=false`를 서버 인증서 신뢰 등록(`http.<url>.sslCAInfo`)으로 대체 검토. 인증서 SAN에 IP가 있는지 확인 필요. 현재는 두 GitLab 호스트에만 URL 단위로 검증을 끈 상태(2026-11-01 설정). 프로젝트 파일과 무관한 개발 PC 환경 항목

- [ ] `0-ENV-01` Samsung PC에서 `Get-CimInstance Win32_VideoController` 조회, GPU 구성 확인 후 `systeminfo_Samsung_960XFG.md`와 개발계획서 수정 (Samsung 노트북이 현재 다른 장소에 있어 2026-11-02에 수행 예정. 이후 측정 대상 장치가 확정됨)

### 0단계: 입력·전사 기준선
- [ ] `0-BASE-01` 확장자별(`.m4a`, `.mp3`, `.wav`, `.aac`, `.ogg`) 오디오 표본 수집
- [ ] `0-BASE-02` 한국어 회의 샘플 준비(출처·해시 기록)
- [ ] `0-BASE-03` `whisper.cpp` Windows x64 CPU 빌드 또는 배포본 선정, 라이선스 확인
- [ ] `0-BASE-04` 두 PC에서 `base`·`small` 양자화 모델의 처리율·메모리·전사 결과 측정
- [ ] `0-BASE-05` 오디오 변환기(decoder) 후보 선정 및 라이선스 확인

### 0단계: Obsidian 연동 검증
- [ ] `0-OBS-01` 대상 Obsidian 버전에서 공개 API만으로 코어 Audio recorder 산출물 생성·변경 감지 가능 여부 확인
- [ ] `0-OBS-02` 파일 안정화 감지 조건(수정 시각·크기) 시험
- [ ] `0-OBS-03` 노트 링크 삽입 시점 확인

## 이후 단계(일정 미정)

### 1단계: 공통 파이프라인
- [ ] 설정 화면
- [ ] 녹음 감지와 자동 전사 대기열
- [ ] 파일 찾기 버튼
- [ ] provider 계약 정의
- [ ] 결과 미리보기

### 2단계: CPU 전사
- [ ] 런타임·모델 설치(다운로드, SHA-256 검증, 시험 추론)
- [ ] 오디오 정규화
- [ ] segment timestamp 출력
- [ ] 전사문 검색
- [ ] 결과 삽입(헤딩 아래, 재전사 시 추가/교체 확인)

### 3단계 이후
- [ ] GPU provider 평가(GTX 1650 Ti CUDA, Intel Iris Xe/UHD)
- [ ] 분석 기능 기술 검증
- [ ] 프로필 확장
