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
- [x] `2-CPU-06` 도구 자동 검색 경로 보강: 기존 검색 루트에 개발용 경로가 누락되어 레노버 환경에서 런타임/모델이 0건 검색되던 현상 수정 → `src/cpuRuntimeDiscovery.ts`의 `getCpuToolSearchRoots`에 `%LOCALAPPDATA%\on-the-record-dev` 및 `%LOCALAPPDATA%\on-the-record` 추가. 레노버 환경에서 런타임 2종(`whisper-cli.exe`, `main.exe`) 및 모델 2종(`base`, `small`) 원클릭 검색 확인 완료 (경고 0건). 관련 단위 테스트 보강 통과.
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
  - 선행 조건 완료: `%LOCALAPPDATA%\on-the-record-dev\models\`에 `medium-q5_0`, `large-v3-turbo-q5_0`, `large-v3-q5_0` 모델 파일 3종 다운로드 및 SHA-256 해시 검증 완료. 5대 기준 모델 전체 구비 완료.
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
  - 프로젝트 소유권 및 저작권자 갱신: 본 프로젝트는 회사 지시나 업무상 위탁이 아닌, 업무 중 개인적 필요에 의해 착수한 **박성원(SUNGWON PARK) 개인의 독립 오픈소스 프로젝트(MIT)**로 확정. 기존 회사(에스넷시스템) 관련 표기 및 사내 혜택 계획을 공식 폐기하고 `LICENSE`, `README.md`, `SUPPORT.md`를 개인 오픈소스 프로젝트 기준으로 전면 갱신.
- [-] `0-ENV-15` 사내 GitLab 접속 인증서 검토 종료: 소스코드 배포처를 GitHub(`https://github.com/sparklings/ontherecord`)으로 공식 확정하고 개인 오픈소스 프로젝트로 독립함에 따라, 사내 GitLab 연동 과제를 공식 종료(취소) 처리.

#### 추가 등록 과제 (3단계: GPU Provider 평가 - 레노버 특화: GTX 1650 Ti 4GB VRAM)
- [ ] `3-GPU-01` whisper.cpp cuBLAS/CUDA 가속 빌드 성능 실측 및 CPU 대비 가속 배율 검증: 레노버 노트북의 외장 GPU(NVIDIA GeForce GTX 1650 Ti, CUDA 13.0)를 활용한 whisper.cpp cuBLAS/CUDA 가속 빌드 성능 실측 및 CPU 대비 가속 배율 검증.
- [ ] `3-GPU-02` VRAM 4GB 환경 모델 오프로딩 동작 확인 및 GPU Provider 인터페이스 검토: VRAM 4GB 환경에서 base~medium 모델의 GPU 오프로딩 동작 확인 및 인터페이스 검토.

## 2026-11-05

### 라이선스 및 공개 준비

- [x] `0-ENV-16` 실제 배포 구성요소의 라이선스·고지 확정 → 완료(2026-11-07): 외부 런타임/모델 번들링 배포를 제외(`0-ENV-08`)함에 따라 제3자 바이너리 SBOM 의무가 소멸되었고, 플러그인 배포물(`main.js`)은 npm 런타임 의존성 0개의 순수 자체 MIT 코드임을 확인하여 종료.
- 프로젝트 자체 코드에 MIT 정책을 적용한다. 본 프로젝트는 **박성원 개인의 오픈소스 프로젝트**이며 회사와는 아무런 관련이 없다(업무 중 개인적 필요에 의해 착수한 자발적 프로젝트). 저작권자는 `SUNGWON PARK (박성원)`이며 `LICENSE`에 반영했다.

## 2026-11-01

### 0단계: 기준선 및 환경

진행 순서대로 나열한다. 코드 번호는 순서와 무관하다. 순서 기준은 (1) 이름·저장소·라이선스 결정에 의존하지 않는 것, (2) 다른 작업의 입력이 되는 것을 앞에 둔다.

- [x] `0-ENV-14` 하드웨어 프로필 기록 형식 정의(기기, CPU/GPU, 드라이버, provider·모델 버전, 처리율, 메모리) → [HARDWARE_PROFILE.md](./docs/design/HARDWARE_PROFILE.md) 초안 작성(2026-11-01). 프로필 자료는 `benchmarks\` 폴더에 보관. Lenovo 프로필 작성 완료, Samsung 프로필 작성 완료(2026-11-02, `samsung-960xfg.json`). `0-BASE-04` 측정 중 부족한 항목이 나오면 수정 (`0-BASE-04` 측정 기록의 형식이 됨)
- [x] `0-ENV-04` `node_modules`·빌드 산출물의 OneDrive 동기화 제외 또는 재생성 방식 결정 (프로젝트 초기화 전에 정해야 함) → **결정(2026-11-01): AssistantEmily와 동일.** OneDrive 동기화는 허용하고 `.gitignore`로 Git에서만 제외한다. PC 전환 후 `npm ci`로 재생성할 수 있어야 하므로 `package-lock.json`을 버전 관리한다. 근거: OneDrive에는 폴더 단위 제외 기능이 없고(웹 검색 요약, 공식 문서 미확인), AssistantEmily의 `node_modules`(11,736개 파일, 108 MB)는 네이티브 `.node` 파일 없이 esbuild win32-x64 바이너리만 있어 두 PC(Windows x64)에서 문제가 없었다. 재검토 조건: 네이티브 모듈 의존성이 추가되거나 PC 간 `node_modules` 불일치가 발생하면 폴더를 프로젝트 밖으로 옮기고 junction으로 연결하는 방식을 검토한다. whisper.cpp 실행 파일·모델은 프로젝트 밖 사용자별 데이터 폴더에 설치하므로 이 결정과 무관하다.
- [x] `0-ENV-03` `.gitignore` 작성(`node_modules`, 빌드 산출물, 모델·런타임, 비밀 값) → [.gitignore](./.gitignore) 작성(2026-11-01). AssistantEmily 기준 항목에 모델·런타임(`*.gguf`, `ggml-*.bin`, `runtimes/`, `models/`), `.local/`, 표본 데이터 폴더 전체(`samples/`), OS 파일을 추가. Git 제외 동작은 `0-BASE-01` 표본으로 확인(2026-11-02); 0-BASE-02 시작 전 오디오뿐 아니라 표본의 전사문·메타데이터도 실수로 push되지 않도록 `samples/` 전체 제외로 강화(2026-11-02).
- [x] `0-ENV-13` 설정 저장 구조 설계: vault 설정과 PC별 설정 분리 → [SETTINGS_DESIGN.md](./docs/design/SETTINGS_DESIGN.md) 초안 작성(2026-11-01), 동기화 방식 비의존으로 수정(2026-11-01). vault 설정은 `data.json`, PC별 설정과 런타임·모델은 `%LOCALAPPDATA%\<plugin-id>\`. 미결정: 외부 경로 입력, 저장 직전 수정 시각 확인

- [x] `0-ENV-05` 플러그인 id, 이름 결정 → **결정(2026-11-01): 이름 `On the Record`, id `on-the-record`, 부제 `Local minutes for Obsidian`, 저자 `SUNGWON PARK`(변경: 기존 `Sungwon Park (SG)`), 저장소명 `ontherecord`(접근성 우선, 보고서의 기존 `obsidian-on-the-record`에서 변경).** 근거: [네이밍 보고서](./docs/research/OntheRecord_사업보고서_네이밍.md). id 규칙(소문자·하이픈, `obsidian` 미포함, `plugin` 미종료)과 커뮤니티 목록 중복 없음은 보고서 기준 확인됨(2026-11-01 목록 9,755개). 미확인: 국내·USPTO 상표 검색(9·42류), 도메인 확보. 상표 결과에 따라 이름이 바뀔 수 있으며, 그 경우 id는 공개 전까지만 변경 가능하다
- [x] `0-ENV-02` Git 저장소 생성 및 GitHub 원격 연결 → 완료(2026-11-01). 로컬 저장소(`main`, `.gitignore` 동작 확인) 첫 커밋 후 private 저장소 `https://github.com/sparklings/ontherecord` 생성·push. 공개 범위는 라이선스·회사 규정 확인(`0-ENV-06`~`09`) 후 재결정. Git 사용자 정보는 전역 설정, `gh` 2.103.3 설치·로그인(`sparklings`)

#### 출시 준비 확인

- [x] `0-ENV-11` 플러그인 프로젝트 초기화(AssistantEmily 구조 참조) → 완료(2026-11-01). 저장소 루트에 `manifest.json`(id `on-the-record`, `isDesktopOnly: true`), `versions.json`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `eslint.config.mjs`, `src/main.ts` 생성. `package.json`은 `private: false`, `license: MIT`. 잠정값: `minAppVersion` 1.7.2, 버전 0.0.0.
- [x] `0-ENV-12` PlugVaults 배포 절차 작성(빌드 결과를 `.obsidian\plugins\<id>\`에 복사) → 완료(2026-11-01). [scripts/deploy.mjs](./scripts/deploy.mjs)와 `npm run deploy` 추가. 절차: (1) 프로덕션 빌드 (2) `main.js`, `manifest.json`, `styles.css`(있을 때만)를 `<vault>\.obsidian\plugins\on-the-record\`에 복사 (3) Obsidian에서 플러그인 활성화(최초 1회) 또는 재활성화. 대상 vault는 환경 변수 `OTR_TEST_VAULT`, 없으면 `%USERPROFILE%\OneDrive\PlugVaults`.
- [x] `0-ENV-06` 라이선스 정책 확정 → **결정: 프로젝트 자체 코드는 완전한 MIT 라이선스 적용.** 박성원 개인의 오픈소스 프로젝트이며 회사와는 아무런 관련이 없다(기존 사내 혜택 계획은 공식 폐기).
- [x] `0-ENV-07` 소프트웨어 권리 귀속 확인 → 회사 지시나 직무발명이 아닌, 개인적 필요에 의해 착수한 **박성원 개인의 독립 프로젝트**임을 확인 완료. 저작권자 `SUNGWON PARK (박성원)` 표기를 `LICENSE`에 반영.
- [x] `0-ENV-08` 공개 GitHub 저장소와 Obsidian 커뮤니티 플러그인 등록 정책 확인 → 공식 정책·제출 요건·FAQ·제출/관리 절차를 2026-11-05 대조하고 [정책 검토 문서](./docs/research/Obsidian_디렉터리정책_상충검토.md), README에 반영. 플러그인·의존성 설치/업데이트 금지에 따라 런타임·모델 자동 다운로드·설치를 배제하고 사용자 직접 관리로 확정.
- [x] `0-ENV-10` 의존 구성 요소(`whisper.cpp`, 모델, 오디오 변환기)의 예비 라이선스 조사 → 플러그인이 바이너리/모델을 번들링 배포하지 않기로 확정함에 따라, 로컬 사용자 설치 소프트웨어로서 각각의 라이선스(whisper.cpp MIT, FFmpeg LGPL/GPL)를 따름을 확인.
- [x] `0-ENV-09` MIT 정책 표기, `LICENSE` 파일 저작권자(`SUNGWON PARK`) 반영, README 및 패키지 메타데이터 갱신, 오픈소스 프로젝트 지원 안내 문서(`SUPPORT.md`) 작성 완료.

#### 보류: 장소·장비 사유

- [-] `0-ENV-15` 사내 GitLab 접속의 `http.sslVerify=false` 대체 검토 → 종료(2026-11-07, 취소): 소스코드 배포처를 GitHub(`https://github.com/sparklings/ontherecord`)으로 공식 확정하고 개인 오픈소스 프로젝트로 정립함에 따라, 사내 GitLab 등 외부 저장소 연동 이슈는 모두 불필요하여 공식 종료(취소) 처리.

- [x] `0-ENV-01` Samsung PC에서 `Get-CimInstance Win32_VideoController` 조회, GPU 구성 확인 후 `systeminfo_Samsung_960XFG.md`와 개발계획서 수정 → 2026-11-02 확인: Intel Iris Xe Graphics, 드라이버 32.0.101.7088, `AdapterRAM` 2,147,479,552 bytes, `VEN_8086&DEV_A7A0`. 시스템 정보와 OntheRecord 개발계획서에 반영하고 [GPU 확인 기록](./docs/baselines/HARDWARE_CHECK_SAMSUNG_960XFG_2026-11-02.md) 추가. GPU provider 및 실제 가속은 별도 검증 필요.

### 0단계: 입력·전사 기준선
- [x] `0-BASE-01` 확장자별(`.m4a`, `.mp3`, `.wav`, `.aac`, `.ogg`) 오디오 표본 수집 → 2026-11-02 합성 표본 5종 및 실제 M4A 원본 3종과 변환본 12종을 확보해 FFmpeg 디코딩 확인. 실제 표본은 제공된 첨부 폴더에서 대표 3개를 익명 ID로 로컬 보관하고 나머지 파일은 복사하지 않음. SHA-256과 코덱·길이 기록: [형식 표본 기록](./docs/baselines/BASE-01_AUDIO_FORMAT_FIXTURES_2026-11-02.md). 다른 출처의 코덱 변형은 후속 검증 대상.
- [x] `0-BASE-02` 한국어 회의 샘플 준비(출처·해시 기록) → 2026-11-02 사용자가 한국어 회의 샘플임을 확인한 실제 녹음 3개를 `samples\real-audio\`에서 기준 오디오로 지정하고 출처·기술 메타데이터·SHA-256 기록. Git 제외·미추적 상태 확인. 전사 기준본/품질 채점 세트는 참여자 동의 및 조직 정책 확인 후 별도 준비. 상세: [샘플 출처·무결성 기록](./docs/baselines/BASE-02_KOREAN_MEETING_SAMPLES_2026-11-02.md)
- [x] `0-BASE-03` `whisper.cpp` Windows x64 CPU 빌드 또는 배포본 선정, 라이선스 확인 → 완료(2026-11-02): v1.9.5(=`b5454` 바이너리 태그) `whisper-bin-x64.zip`, MIT, 해시 고정. `whisper-cli`는 flac/mp3/ogg/wav만 읽음(m4a/aac 불가). [기록](./docs/baselines/BASE-03_WHISPER_CPP_RUNTIME_2026-11-02.md)
- [x] `0-BASE-04` 두 PC에서 `base`·`small` 양자화 모델의 처리율·메모리·전사 결과 측정 → 완료(2026-11-02, 장치별 기록 8건). Lenovo 긴 샘플 기준 base 14.5~14.7초/오디오 1분, small 25.5~26.4초/오디오 1분, 최대 RAM 약 0.72 GB. 전사 품질(CER)은 미평가. [결과](./docs/baselines/BASE-04_THROUGHPUT_MEASUREMENT_2026-11-02.md)
- [x] `0-BASE-05` 오디오 변환기(decoder) 후보 선정 및 라이선스 확인 → 완료(2026-11-02): FFmpeg 9.0.1 공식 소스의 LGPL 기본 빌드를 제품 후보로 선정하고, 합성 표본 5종 및 실제 Opus/M4A 3종의 Lenovo 디코딩 확인. 현재 PC의 GPLv3 빌드는 시험 전용이며 제품용 실행 파일·배포 고지·Obsidian 설치 정책 검토는 제품화 단계에서 별도 확인. [검토 기록](./docs/baselines/BASE-05_AUDIO_DECODER_2026-11-02.md)

- [x] `0-BASE-06` 상위 모델(`medium`, `large-v3-turbo`, `large-v3`) 입력 전사 기준선 확대 측정 → Samsung 완료(2026-11-03) 및 Lenovo 측정 완료(2026-11-07): 두 PC 모두 5대 모델 구비 및 실측 완료. `real-sample-01`(2.2분, 2회) 5개 전 모델 및 `real-sample-02`(21.5분, 1회) medium 측정 완료. 세그먼트 수가 두 PC에서 100% 일치(base 29, small 24, medium 15/171, turbo 25, large-v3 40)함을 확인. Lenovo 1시간 환산: base 14.6분, small 26.0분, medium 68.2분, turbo 82.5분, large-v3 171.3분. 모델 최종 선정은 `0-BASE-08` 육안 검증 후 결정. [결과](./docs/baselines/BASE-06_LARGER_MODELS_2026-11-03.md).
  - 모델: 각 `q5_0`, Hugging Face `ggerganov/whisper.cpp` 커밋 `5359861`로 고정, SHA-256 검증 완료(`medium` 514MB, `large-v3-turbo` 547MB, `large-v3` 1,031MB). `*.en`, `large-v1/v2`, `tiny`는 제외(영어 전용·구버전·한국어 품질 부족). 파일은 저장소 밖 `%LOCALAPPDATA%\on-the-record-dev\models\`
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

### 3단계 이후
- [ ] `3-CPU-01` whisper.cpp 전사 품질 개선 평가 → 기준 샘플을 사용해 검증된 모델·런타임 버전과 설정을 비교하고, 전사 품질과 처리 비용을 기록한다. 커뮤니티 플러그인 UI 작업과 분리해 모델 선택·변경 및 개선안을 검토한다.
- [ ] `3-CPU-02` 로컬 도구 검색 범위 및 설치 안내 검토 → 현재 알려진 폴더에 한정된 검색을 전체 로컬 PC 검색으로 확장할 필요와 성능·권한·개인정보 영향을 평가한다. 사용자 주도 다운로드·설치·업데이트·삭제 절차 또는 다운로드 명령어 안내 제공 여부와 정책·라이선스·보안 요건을 검토한다. 검토 전까지 플러그인은 런타임·모델을 자동으로 다운로드·설치·업데이트·삭제하지 않는다.
- [ ] `3-UX-01` 회의 녹음→회의록 완성 사용자 여정 정의 → 첫 실행, Obsidian 코어 녹음, 녹음 완료, 전사 실행, 검토·수정, 노트 반영, 재전사·검색까지 한 흐름으로 설계한다. 각 단계에서 사용자가 보는 상태·다음 행동·실패 복구를 명시하고 초보 사용자 시나리오로 검증한다. 현재 코드는 사용성 휴리스틱 검토이며 실제 사용자 테스트는 후속 검증이다.
- [ ] `3-UX-02` 설정 정보 구조와 기능 약속 정리 → vault 설정과 PC별 도구 설정의 범위를 설명하고, 녹음 감지·안정화·자동 전사·언어·모델·장치·검색어를 목적별로 묶는다. 특히 `자동 전사`는 현재 실제 전사 실행이 아니라 메모리 대기열 추가이며, 기본 모델 크기와 장치 선호는 실제 수동 CPU 전사 선택에 연결되지 않으므로, 구현을 연결하거나 미구현/비활성 상태를 명확히 표시하고 오해를 유발하는 항목은 정리한다. 각 설정의 효력·저장 범위·상호 의존성을 설정 화면에서 이해할 수 있는지 확인한다.
- [ ] `3-UX-03` 녹음 파일 찾기·대기열·전사 명령 통합 → "전사할 오디오 파일 선택"이 실제 전사가 아닌 대기열 추가라는 차이를 해소한다. 대기열의 상태·대상 노트·실행 가능 여부·실패·재시도·삭제를 사용자에게 보이고, 자동 감지와 현재 노트 embed 기반 수동 전사를 연결하거나 의도적으로 분리한다. 앱 재시작 시 메모리 대기열이 사라지는 동작도 명시하거나 복구 가능한 방식으로 설계한다.
- [ ] `3-UX-04` 첫 실행 도구 설정 및 검증 안내 → 런타임·모델·FFmpeg의 관계와 필요한 파일을 단계별로 설명하고, 경로 확인·버전/해시 검증·시험 추론 결과를 한 장소에서 확인하게 한다. 검색은 알려진 폴더만 대상으로 함을 정확히 안내하고, 누락 후보에 대한 경로 선택 및 사용자 주도 설치 안내는 `3-CPU-02`의 정책 결정 이후 제공한다.
- [ ] `3-UX-05` 현재 노트·전체 Vault 기능 범위와 결과 피드백 명료화 → 수동 전사는 현재 노트의 지원 오디오 embed만 대상으로 하고 검색은 전체 Markdown 노트를 훑는 차이를 명령과 모달에서 미리 알린다. 검색 범위·일치 건수·노트/녹음별 결과를 이해하기 쉽게 제시하고, embed가 없거나 결과가 없을 때 다음 행동을 제공한다. 삽입 승인, 재전사 추가/교체, 취소 및 실패 결과가 실제 노트 상태와 일치하는지 초보자 시나리오로 검증한다.
- [ ] `3-GPU-01` whisper.cpp cuBLAS/CUDA 가속 빌드 성능 실측 및 CPU 대비 가속 배율 검증 → 레노버 노트북의 외장 GPU(NVIDIA GeForce GTX 1650 Ti, CUDA 13.0)를 활용해 `real-sample-01~03`을 대상으로 cuBLAS/CUDA 런타임 추론 속도·VRAM 사용량을 실측하고 CPU 대비 가속 배율을 검증한다.
- [ ] `3-GPU-02` VRAM 4GB 환경 모델 오프로딩 동작 확인 및 GPU Provider 인터페이스 검토 → VRAM 4GB 한계 내에서 `base`~`medium` 모델의 GPU 오프로딩 동작 확인 및 기존 CPU Provider(`WhisperCppCpuRuntime`)와 일관된 GPU Provider 인터페이스를 검토한다.
- [ ] `3-GPU-03` Intel Iris Xe/UHD GPU 환경 가속 지원 가능성 조사 (삼성 960XFG 연계)
- [ ] 분석 기능 기술 검증
- [ ] 프로필 확장

### 상용성·제품화 보완 과제
- [ ] `3-PROD-01` 사용자 주도 원클릭 도구 준비 도우미(Setup Helper) 개발 → Obsidian 정책(플러그인 자체 다운로드/실행파일 설치 금지)을 준수하면서도, 초보 사용자가 손쉽게 `whisper.cpp`, `FFmpeg`, `GGML 모델`을 다운로드받아 적정 위치에 배치할 수 있도록 돕는 독립 실행형 셋업 스크립트(Windows winget/PowerShell 스크립트) 및 설정 탭 내 원클릭 링크/복사 명령어 제공.
- [ ] `3-PROD-02` 상태표시줄(Status Bar) 진행률 표시 및 비차단 백그라운드 처리 → 장시간(30분~1시간 이상) 회의 전사 시 모달이나 앱이 멈추지 않고, Obsidian 하단 상태표시줄에서 진행 상태(%, 경과시간/예상시간, 처리 중인 파일명)를 확인하며 다른 노트를 작성할 수 있도록 백그라운드 비동기 처리 및 작업 완료 OS 알림(Notification) 구현.
- [ ] `3-PROD-03` 타임스탬프-오디오 재생 동기화(Audio Playback Sync) → 전사 결과 미리보기 모달 및 노트 본문에서 세그먼트 타임스탬프(`[02:15]`) 클릭 시, 해당 오디오 파일의 해당 위치로 즉시 이동해 재생하는 오디오 플레이어 싱크 기능 검토(전사 오탈자 확인 및 빠른 청취 검토 지원).
- [ ] `3-PROD-04` 글로벌 배포를 위한 다국어(i18n) 지원 체계 구축 → Obsidian 공식 커뮤니티 플러그인 글로벌 공개를 위해 UI 기본 언어를 영어(en)로 구성하고, 한국어(ko) 번역 사전을 제공하는 경량 i18n 체계 도입.
- [ ] `3-PROD-05` 로컬 LLM 연동 회의록 요약·액션 아이템 템플릿(Post-processing) 연계 검토 → 완전한 프라이빗 환경을 유지하기 위해 클라우드 API 대신 로컬 LLM(Ollama, LM Studio 등 로컬 호스트 API)과 연동하여, 전사 완료 후 '핵심 요약', '할 일(Action Items)', '결정 사항'을 자동 추출해 노트 템플릿으로 출력하는 선택 기능 설계.

### 기능 확장: 음성 녹음 라이프사이클 및 노트 연동 (녹음 노트 플러그인 기획 통합)
> 기획 문서(`X\녹음 노트 플러그인 프로젝트(가칭)`)를 바탕으로 `On the Record`와 결합할 기능 확장 과제 목록이다. 플러그인 ID(`on-the-record`)와 Desktop Only 정책을 유지하며, 개별 구현 단계에서 상세 아이데이션 및 설계를 구체화한다.

- [ ] `3-REC-01` 코어 Audio recorder 제어 및 노트 기반 시작 트리거 (`F-01`, `F-02`, `F-03`, `C-01`, `C-03`) → 새 노트 생성 시 frontmatter 마커(`recorder: auto | confirm | manual`) 또는 설정된 폴더 규칙을 감지해 녹음 흐름을 개시한다. 시작 방식 3종(확인 알림형 `confirm`(기본), 자동 `auto`, 수동 `manual`)을 지원하고, Obsidian 코어 Audio recorder(`audio-recorder:start`, `stop`) 실행 및 단일 활성 세션을 관리하며 세션 상태를 디스크에 영속화한다(`{ notePath, startedAt, seq }`).
- [ ] `3-REC-02` 탭 닫힘 감지 및 녹음 자동 중지·안전 연결 (`F-04`, `F-05`, `C-02`) → 녹음 중인 노트 탭이 닫힐 때(`WorkspaceLeaf.prototype.detach` 래핑 또는 닫힘 이벤트 감지) 녹음을 자동 중지하고 생성된 오디오를 해당 노트에 안전하게 연결(attach)한다. 코어가 새 탭으로 오디오 파일을 여는 동작 자동 닫기(`S-09`) 및 에디터 내 임베드 중복 삽입 정리(`S-10`)를 처리하고, 닫힘 시 동작 옵션(중지·연결/확인/무시)을 제공한다.
- [ ] `3-REC-03` 단일 문서 내 다중 녹음 파일 지원 및 전사 연계 확장 (`F-08`, 다중 세션 확장) → 마크다운 문서 하나에 여러 개의 녹음 파일/임베드가 존재할 수 있는 모델로 확장한다(현재 커서 위쪽 오디오 자동 선택 기능 연계). 회의 중단/재개 시 추가 녹음 파일을 순차적으로 누적(`seq = recording_count + 1`)하고, 문서 내 각 오디오 임베드별로 전사 결과를 매핑·관리할 수 있는 구조를 정립한다.
- [ ] `3-REC-04` Frontmatter 메타데이터 및 본문 녹음 블록 2중 기록 (`F-06`, `F-07`) → Bases 및 Dataview 친화적인 Frontmatter 평면 메타데이터(`recording_state`, `recordings` 링크 배열, `recording_count`, `recording_total_seconds`, `recording_total_size_mb`, `recording_first_start`, `recording_last_end`)와 본문 섹션(기본 `## 녹음 기록`) 아래 세션별 상세 블록(`### 녹음 N · 시각 (소요)`, 임베드, 파일 경로, 용량 등)을 `vault.process`로 안전하게 동시 기록한다.
- [ ] `3-REC-05` 녹음 정보 재계산 및 메타데이터 동기화 명령 (`C-05`) → 본문 내 실제 오디오 임베드/블록과 파일 메타데이터(`adapter.stat`)를 다시 읽어 누락되거나 변경된 Frontmatter 집계 속성을 재구성·동기화하는 명령(`이 노트 녹음 정보 재계산`)을 구현한다.
- [ ] `3-REC-06` 미아(고아) 오디오 파일 방지 및 복구 체계 (`F-09`, `C-04`) → 비정상 종료(Obsidian 강제 종료 등) 후 재시작 시 영속 세션 레코드와 미연결 `Recording *` 파일을 대조해 복구 알림을 제공하고, 볼트 내 백링크가 0인 고아 오디오 파일을 모달로 검색해 특정 노트에 즉시 연결하는 명령(`고아 녹음 파일 점검`)을 구현한다.
- [ ] `3-REC-07` 녹음 상태바 UI 및 원클릭 제어 (`F-10`, `S-13`) → Obsidian 상태표시줄(Status Bar)에 현재 녹음 중인 노트명과 경과 시간(`● 12:34 회의록`)을 표시하고, 클릭 시 즉시 중지 및 연결을 수행하도록 한다. 리본 아이콘 및 토글 명령(`C-03`)도 함께 연계한다.
- [ ] `3-REC-08` 녹음 완료 후 로컬 전사(STT) 파이프라인 자동 연결 워크플로 → 녹음이 중지되어 노트에 안전하게 연결된 직후, 설정(`autoTranscribe`)에 따라 `On the Record`의 로컬 STT 대기열 또는 자동 전사 파이프라인으로 매끄럽게 인계되는 통합 워크플로를 설계·구현한다.
