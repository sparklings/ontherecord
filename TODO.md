# TODO

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

- [x] `0-ENV-14` 하드웨어 프로필 기록 형식 정의(기기, CPU/GPU, 드라이버, provider·모델 버전, 처리율, 메모리) → [HARDWARE_PROFILE.md](./HARDWARE_PROFILE.md) 초안 작성(2026-11-01). 프로필 자료는 `benchmarks\` 폴더에 보관. Lenovo 프로필 작성 완료, Samsung 프로필은 `0-ENV-01` 이후 작성. `0-BASE-04` 측정 중 부족한 항목이 나오면 수정 (`0-BASE-04` 측정 기록의 형식이 됨)
- [x] `0-ENV-04` `node_modules`·빌드 산출물의 OneDrive 동기화 제외 또는 재생성 방식 결정 (프로젝트 초기화 전에 정해야 함) → **결정(2026-11-01): AssistantEmily와 동일.** OneDrive 동기화는 허용하고 `.gitignore`로 Git에서만 제외한다. PC 전환 후 `npm ci`로 재생성할 수 있어야 하므로 `package-lock.json`을 버전 관리한다. 근거: OneDrive에는 폴더 단위 제외 기능이 없고(웹 검색 요약, 공식 문서 미확인), AssistantEmily의 `node_modules`(11,736개 파일, 108 MB)는 네이티브 `.node` 파일 없이 esbuild win32-x64 바이너리만 있어 두 PC(Windows x64)에서 문제가 없었다. 재검토 조건: 네이티브 모듈 의존성이 추가되거나 PC 간 `node_modules` 불일치가 발생하면 폴더를 프로젝트 밖으로 옮기고 junction으로 연결하는 방식을 검토한다. whisper.cpp 실행 파일·모델은 프로젝트 밖 사용자별 데이터 폴더에 설치하므로 이 결정과 무관하다.
- [x] `0-ENV-03` `.gitignore` 작성(`node_modules`, 빌드 산출물, 모델·런타임, 비밀 값) → [.gitignore](./.gitignore) 작성(2026-11-01). AssistantEmily 기준 항목에 모델·런타임(`*.gguf`, `ggml-*.bin`, `runtimes/`, `models/`), `.local/`, 오디오 표본 원본(`samples/**` 오디오 확장자), OS 파일을 추가. 아직 Git 저장소가 없어 `git check-ignore`로 동작 확인은 `0-ENV-02` 이후 수행. 오디오 표본 폴더명 `samples/`는 `0-BASE-01`에서 확정 시 갱신
- [x] `0-ENV-13` 설정 저장 구조 설계: vault 설정과 PC별 설정 분리 → [SETTINGS_DESIGN.md](./SETTINGS_DESIGN.md) 초안 작성(2026-11-01), 동기화 방식 비의존으로 수정(2026-11-01). vault 설정은 `data.json`, PC별 설정과 런타임·모델은 `%LOCALAPPDATA%\<plugin-id>\`. 미결정: 외부 경로 입력, 저장 직전 수정 시각 확인

- [x] `0-ENV-05` 플러그인 id, 이름 결정 → **결정(2026-11-01): 이름 `On the Record`, id `on-the-record`, 부제 `Local minutes for Obsidian`, 저자 `Sungwon Park (SG)`, 저장소명 `ontherecord`(접근성 우선, 보고서의 기존 `obsidian-on-the-record`에서 변경).** 근거: [네이밍 보고서](./docs/STT_사업보고서_OnTheRecord_네이밍.md). id 규칙(소문자·하이픈, `obsidian` 미포함, `plugin` 미종료)과 커뮤니티 목록 중복 없음은 보고서 기준 확인됨(2026-11-01 목록 9,755개). 미확인: 국내·USPTO 상표 검색(9·42류), 도메인 확보. 상표 결과에 따라 이름이 바뀔 수 있으며, 그 경우 id는 공개 전까지만 변경 가능하다
- [x] `0-ENV-02` Git 저장소 생성 및 GitHub 원격 연결 → 완료(2026-11-01). 로컬 저장소(`main`, `.gitignore` 동작 확인) 첫 커밋 후 private 저장소 `https://github.com/sparklings/ontherecord` 생성·push. 공개 범위는 라이선스·회사 규정 확인(`0-ENV-06`~`09`) 후 재결정. Git 사용자 정보는 전역 설정, `gh` 2.103.3 설치·로그인(`sparklings`)

#### 보류: 정책·이름 결정 후 진행

라이선스 정책이 정해져야 시작할 수 있는 항목이다. 결정 시점은 미정이다.

- [ ] `0-ENV-11` 플러그인 프로젝트 초기화(AssistantEmily 구조 참조) (`0-ENV-05` 이후)
- [ ] `0-ENV-12` PlugVaults 배포 절차 작성(빌드 결과를 `.obsidian\plugins\<id>\`에 복사) (`0-ENV-05`, `0-ENV-11` 이후)
- [ ] `0-ENV-06` 라이선스 정책 확정: 회사 구성원 대상 무료 제공, 대상 그룹사·계열사·관계사 회사명 목록 작성
- [ ] `0-ENV-07` 회사의 소프트웨어 배포·소유권 관련 규정 확인(공개 GitHub 저장소 게시 가능 여부 포함)
- [ ] `0-ENV-08` 공개 GitHub 저장소와 Obsidian 커뮤니티 플러그인 등록에 맞는 라이선스 조건 확인
- [ ] `0-ENV-10` 의존 구성 요소(`whisper.cpp`, 모델, 오디오 변환기)의 라이선스와 위 정책의 충돌 여부 확인 (`0-ENV-06` 이후)
- [ ] `0-ENV-09` `LICENSE` 파일 작성, `README.md` 라이선스 항목 갱신 (`0-ENV-06`~`08`, `10` 이후)

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
