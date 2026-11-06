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

## 2026-11-05

### 라이선스 및 공개 준비

- [ ] `0-ENV-16` 실제 배포 구성요소의 라이선스·고지·재배포 조건을 artifact 단위로 확정 → 런타임, 모델, 디코더, 선택 분석 기능 각각의 출처·정확한 버전/revision·SHA-256·라이선스 원문·빌드 옵션·고지·소스 제공 의무를 기록하고 SBOM을 작성한다. `0-ENV-10`은 upstream/설계 후보 예비 검토로만 간주한다. 의무를 충족할 수 없거나 권리 근거가 불명확한 구성요소는 배포 대상에서 제외한다. 실제 산출물과 고지 검토가 끝나기 전에는 공개 릴리스를 하지 않는다.
- 프로젝트 자체 코드에 MIT 정책을 적용한다. 저작권자 `에스넷시스템`과 권리 귀속·공개 승인은 2026-11-05 사용자 확인을 받았고 `LICENSE`에 반영했다. 공개 릴리스는 실제 배포 구성요소 검토(`0-ENV-16`) 및 제출 직전 Directory 체크리스트 완료 전까지 보류한다.

## 2026-11-01

### 0단계: 기준선 및 환경

진행 순서대로 나열한다. 코드 번호는 순서와 무관하다. 순서 기준은 (1) 이름·저장소·라이선스 결정에 의존하지 않는 것, (2) 다른 작업의 입력이 되는 것을 앞에 둔다.

- [x] `0-ENV-14` 하드웨어 프로필 기록 형식 정의(기기, CPU/GPU, 드라이버, provider·모델 버전, 처리율, 메모리) → [HARDWARE_PROFILE.md](./docs/design/HARDWARE_PROFILE.md) 초안 작성(2026-11-01). 프로필 자료는 `benchmarks\` 폴더에 보관. Lenovo 프로필 작성 완료, Samsung 프로필 작성 완료(2026-11-02, `samsung-960xfg.json`). `0-BASE-04` 측정 중 부족한 항목이 나오면 수정 (`0-BASE-04` 측정 기록의 형식이 됨)
- [x] `0-ENV-04` `node_modules`·빌드 산출물의 OneDrive 동기화 제외 또는 재생성 방식 결정 (프로젝트 초기화 전에 정해야 함) → **결정(2026-11-01): AssistantEmily와 동일.** OneDrive 동기화는 허용하고 `.gitignore`로 Git에서만 제외한다. PC 전환 후 `npm ci`로 재생성할 수 있어야 하므로 `package-lock.json`을 버전 관리한다. 근거: OneDrive에는 폴더 단위 제외 기능이 없고(웹 검색 요약, 공식 문서 미확인), AssistantEmily의 `node_modules`(11,736개 파일, 108 MB)는 네이티브 `.node` 파일 없이 esbuild win32-x64 바이너리만 있어 두 PC(Windows x64)에서 문제가 없었다. 재검토 조건: 네이티브 모듈 의존성이 추가되거나 PC 간 `node_modules` 불일치가 발생하면 폴더를 프로젝트 밖으로 옮기고 junction으로 연결하는 방식을 검토한다. whisper.cpp 실행 파일·모델은 프로젝트 밖 사용자별 데이터 폴더에 설치하므로 이 결정과 무관하다.
- [x] `0-ENV-03` `.gitignore` 작성(`node_modules`, 빌드 산출물, 모델·런타임, 비밀 값) → [.gitignore](./.gitignore) 작성(2026-11-01). AssistantEmily 기준 항목에 모델·런타임(`*.gguf`, `ggml-*.bin`, `runtimes/`, `models/`), `.local/`, 표본 데이터 폴더 전체(`samples/`), OS 파일을 추가. Git 제외 동작은 `0-BASE-01` 표본으로 확인(2026-11-02); 0-BASE-02 시작 전 오디오뿐 아니라 표본의 전사문·메타데이터도 실수로 push되지 않도록 `samples/` 전체 제외로 강화(2026-11-02).
- [x] `0-ENV-13` 설정 저장 구조 설계: vault 설정과 PC별 설정 분리 → [SETTINGS_DESIGN.md](./docs/design/SETTINGS_DESIGN.md) 초안 작성(2026-11-01), 동기화 방식 비의존으로 수정(2026-11-01). vault 설정은 `data.json`, PC별 설정과 런타임·모델은 `%LOCALAPPDATA%\<plugin-id>\`. 미결정: 외부 경로 입력, 저장 직전 수정 시각 확인

- [x] `0-ENV-05` 플러그인 id, 이름 결정 → **결정(2026-11-01): 이름 `On the Record`, id `on-the-record`, 부제 `Local minutes for Obsidian`, 저자 `SUNGWON PARK`(변경: 기존 `Sungwon Park (SG)`), 저장소명 `ontherecord`(접근성 우선, 보고서의 기존 `obsidian-on-the-record`에서 변경).** 근거: [네이밍 보고서](./docs/research/STT_사업보고서_OnTheRecord_네이밍.md). id 규칙(소문자·하이픈, `obsidian` 미포함, `plugin` 미종료)과 커뮤니티 목록 중복 없음은 보고서 기준 확인됨(2026-11-01 목록 9,755개). 미확인: 국내·USPTO 상표 검색(9·42류), 도메인 확보. 상표 결과에 따라 이름이 바뀔 수 있으며, 그 경우 id는 공개 전까지만 변경 가능하다
- [x] `0-ENV-02` Git 저장소 생성 및 GitHub 원격 연결 → 완료(2026-11-01). 로컬 저장소(`main`, `.gitignore` 동작 확인) 첫 커밋 후 private 저장소 `https://github.com/sparklings/ontherecord` 생성·push. 공개 범위는 라이선스·회사 규정 확인(`0-ENV-06`~`09`) 후 재결정. Git 사용자 정보는 전역 설정, `gh` 2.103.3 설치·로그인(`sparklings`)

#### 보류: 남은 출시 준비 확인 후 진행

MIT 라이선스 정책과 프로젝트 권리자·공개 승인, Obsidian 디렉터리 정책 검토는 완료됐다. 실제 배포 구성요소 검토(`0-ENV-16`)와 최종 제출 점검이 끝나기 전까지 공개·배포를 진행하지 않는다.

- [x] `0-ENV-11` 플러그인 프로젝트 초기화(AssistantEmily 구조 참조) → 완료(2026-11-01). 저장소 루트에 `manifest.json`(id `on-the-record`, `isDesktopOnly: true`), `versions.json`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `eslint.config.mjs`, `src/main.ts` 생성. 초기화 당시 `package.json`은 `private: true`, `license: UNLICENSED`였으나 `0-ENV-09`에서 MIT 정책에 맞게 `private: false`, `license: MIT`로 갱신했다. 이 메타데이터는 저장소 공개 승인이나 제3자 artifact의 재배포 허가를 의미하지 않는다. 잠정값: `minAppVersion` 1.7.2(AssistantEmily 값, 이 플러그인 요구 API로 검증하지 않음 → `0-OBS` 검증 후 확정), 버전 0.0.0. `npm install`에서 `npm audit` 경고가 출력됨(내용 미확인)
- [x] `0-ENV-12` PlugVaults 배포 절차 작성(빌드 결과를 `.obsidian\plugins\<id>\`에 복사) → 완료(2026-11-01). [scripts/deploy.mjs](./scripts/deploy.mjs)와 `npm run deploy` 추가. 절차: (1) 프로덕션 빌드 (2) `main.js`, `manifest.json`, `styles.css`(있을 때만)를 `<vault>\.obsidian\plugins\on-the-record\`에 복사 (3) Obsidian에서 플러그인 활성화(최초 1회) 또는 재활성화. 대상 vault는 환경 변수 `OTR_TEST_VAULT`, 없으면 `%USERPROFILE%\OneDrive\PlugVaults`. 안전장치: 경로에 `ObsidianVaults`가 있으면 거부, `.obsidian`이 없는 폴더는 거부(두 경우 종료 코드 1 확인). 활성화 목록(`community-plugins.json`)은 수정하지 않음. 실제 실행으로 `main.js`, `manifest.json` 복사 확인. Obsidian 로드 확인 완료(2026-11-01, 사용자 확인): 커뮤니티 플러그인 목록에서 활성화되고 오류 없음. 빈 `onload()`라 리본·명령·설정 탭은 없음
- [x] `0-ENV-06` 라이선스 정책 확정 → **결정(2026-11-01): 프로젝트 자체 코드는 MIT, 소속 회사 구성원 혜택은 라이선스 제한이 아닌 사내 혜택(지원·반입 심의 패키지·프리셋·교육)으로 제공.** 근거: [라이선스 정책 보고서](./docs/research/STT_라이선스정책_에스넷그룹_명세_및_체계검토.md). 이전 계획("구성원에게만 무료인 라이선스")에서 변경됨. 권리자 `에스넷시스템`과 공개 승인은 2026-11-05 확인 및 반영했다. 제3자 구성요소 검토는 `0-ENV-16`에서 별도 처리한다. 대상 조직 명세는 보고서 §6.1을 참조한다.
- [x] `0-ENV-07` 회사의 소프트웨어 권리 귀속·공개 규정 확인(공개 GitHub 저장소 게시 가능 여부 포함) → 2026-11-05 사용자 확인: 저작권자 `에스넷시스템`, 권리 귀속 및 공개 승인 완료. `LICENSE` 저작권자 표기를 반영했다. 관련 확인은 사용자 제공 정보에 근거하며, 제3자 artifact별 권리 검토는 `0-ENV-16`에서 별도 수행한다.
- [x] `0-ENV-08` 공개 GitHub 저장소와 Obsidian 커뮤니티 플러그인 등록 정책 확인 → 공식 정책·제출 요건·FAQ·제출/관리 절차·조직 문서를 2026-11-05 대조하고 [정책 검토 문서](./docs/research/Obsidian_디렉터리정책_상충검토.md), README, 개발계획서 및 라이선스 보고서에 반영. 플러그인·의존성 설치/업데이트 금지에 런타임·모델을 보수적으로 포함해 플러그인 자동 다운로드·설치·업데이트·삭제를 제외한다. README에 네트워크 미사용과 vault 밖 파일 접근 이유를 공개한다. 남은 출시 전 작업: `0-ENV-16`, 최종 저장소·Owner 결정, manifest·릴리스 자산·자동 검사 체크리스트. 정책상 허용 여부를 미확인한 설치 방식에 의존하지 않는다.
- [x] `0-ENV-10` 의존 구성 요소(`whisper.cpp`, 모델, 오디오 변환기)의 예비 라이선스 조사 → 설계 후보 수준 조사 완료(2026-11-01, FFmpeg 후보 추가 검토 2026-11-02): `whisper.cpp`·`ggml` upstream은 MIT로 확인했으나 실제 배포 바이너리/옵션의 포함물은 별도 확인이 필요하다. 모델은 실제 출처·revision별 확인이 필요하다. FFmpeg GPLv3 시험 바이너리는 제품 후보에서 제외하고 LGPL 후보도 정확한 빌드와 의무 확인 전에는 승인하지 않는다. 이 결과는 배포 승인이나 충돌 없음의 포괄적 보증이 아니다. 실제 artifact 검토와 SBOM은 `0-ENV-16`에서 완료한다. 자세한 내용: [라이선스 정책 보고서](./docs/research/STT_라이선스정책_에스넷그룹_명세_및_체계검토.md) 및 [0-BASE-05 기록](./docs/baselines/BASE-05_AUDIO_DECODER_2026-11-02.md)
- [x] `0-ENV-09` MIT 정책 표기, `LICENSE` 파일, README 및 패키지 메타데이터 반영, 사내 혜택 안내 문서(`SUPPORT.md`) 작성 → 정책 표기·문서 반영 완료. 2026-11-05 사용자 확인에 따라 저작권자를 `에스넷시스템`으로 기재했다. 실제 배포 구성요소 검토는 `0-ENV-16`에서 계속한다. `SUPPORT.md`의 연락처/채널, 임직원 확인 절차, 사내 배포·자료 위치는 미정이다.

#### 보류: 장소·장비 사유

- [ ] `0-ENV-15` (보류, 우선순위 낮음) 사내 GitLab 접속의 `http.sslVerify=false`를 서버 인증서 신뢰 등록(`http.<url>.sslCAInfo`)으로 대체 검토. 인증서 SAN에 IP가 있는지 확인 필요. 현재는 두 GitLab 호스트에만 URL 단위로 검증을 끈 상태(2026-11-01 설정). 프로젝트 파일과 무관한 개발 PC 환경 항목

- [x] `0-ENV-01` Samsung PC에서 `Get-CimInstance Win32_VideoController` 조회, GPU 구성 확인 후 `systeminfo_Samsung_960XFG.md`와 개발계획서 수정 → 2026-11-02 확인: Intel Iris Xe Graphics, 드라이버 32.0.101.7088, `AdapterRAM` 2,147,479,552 bytes, `VEN_8086&DEV_A7A0`. 시스템 정보와 STT 개발계획서에 반영하고 [GPU 확인 기록](./docs/baselines/HARDWARE_CHECK_SAMSUNG_960XFG_2026-11-02.md) 추가. GPU provider 및 실제 가속은 별도 검증 필요.

### 0단계: 입력·전사 기준선
- [x] `0-BASE-01` 확장자별(`.m4a`, `.mp3`, `.wav`, `.aac`, `.ogg`) 오디오 표본 수집 → 2026-11-02 합성 표본 5종 및 실제 M4A 원본 3종과 변환본 12종을 확보해 FFmpeg 디코딩 확인. 실제 표본은 제공된 첨부 폴더에서 대표 3개를 익명 ID로 로컬 보관하고 나머지 파일은 복사하지 않음. SHA-256과 코덱·길이 기록: [형식 표본 기록](./docs/baselines/BASE-01_AUDIO_FORMAT_FIXTURES_2026-11-02.md). 다른 출처의 코덱 변형은 후속 검증 대상.
- [x] `0-BASE-02` 한국어 회의 샘플 준비(출처·해시 기록) → 2026-11-02 사용자가 한국어 회의 샘플임을 확인한 실제 녹음 3개를 `samples\real-audio\`에서 기준 오디오로 지정하고 출처·기술 메타데이터·SHA-256 기록. Git 제외·미추적 상태 확인. 전사 기준본/품질 채점 세트는 참여자 동의 및 조직 정책 확인 후 별도 준비. 상세: [샘플 출처·무결성 기록](./docs/baselines/BASE-02_KOREAN_MEETING_SAMPLES_2026-11-02.md)
- [x] `0-BASE-03` `whisper.cpp` Windows x64 CPU 빌드 또는 배포본 선정, 라이선스 확인 → 완료(2026-11-02): v1.9.5(=`b5454` 바이너리 태그) `whisper-bin-x64.zip`, MIT, 해시 고정. `whisper-cli`는 flac/mp3/ogg/wav만 읽음(m4a/aac 불가). [기록](./docs/baselines/BASE-03_WHISPER_CPP_RUNTIME_2026-11-02.md)
- [x] `0-BASE-04` 두 PC에서 `base`·`small` 양자화 모델의 처리율·메모리·전사 결과 측정 → 완료(2026-11-02, 장치별 기록 8건). Lenovo 긴 샘플 기준 base 14.5~14.7초/오디오 1분, small 25.5~26.4초/오디오 1분, 최대 RAM 약 0.72 GB. 전사 품질(CER)은 미평가. [결과](./docs/baselines/BASE-04_THROUGHPUT_MEASUREMENT_2026-11-02.md)
- [x] `0-BASE-05` 오디오 변환기(decoder) 후보 선정 및 라이선스 확인 → 완료(2026-11-02): FFmpeg 9.0.1 공식 소스의 LGPL 기본 빌드를 제품 후보로 선정하고, 합성 표본 5종 및 실제 Opus/M4A 3종의 Lenovo 디코딩 확인. 현재 PC의 GPLv3 빌드는 시험 전용이며 제품용 실행 파일·배포 고지·Obsidian 설치 정책 검토는 제품화 단계에서 별도 확인. [검토 기록](./docs/baselines/BASE-05_AUDIO_DECODER_2026-11-02.md)

- [~] `0-BASE-06` 상위 모델(`medium`, `large-v3-turbo`, `large-v3`) 입력 전사 기준선 확대 측정 → Samsung 측정 마무리(2026-11-03, 기록 14건): 샘플 01~03, 5개 모델. 오디오 1분당 base 7~9초, small 12~19초, medium 44~52초, turbo 60~67초, large-v3 85~134초, 최대 RAM ≤2.4GB. 반복·환각 모델 전반에 확인(turbo·base 한 줄 900회 이상). **모델 선정은 `0-BASE-08` 육안 검증 후 결정**, Lenovo medium 이상은 측정 예정(후속 ②). 상태 `[~]`는 Lenovo 측정이 끝날 때까지 유지. [결과](./docs/baselines/BASE-06_LARGER_MODELS_2026-11-03.md). 계획:
  - 모델: 각 `q5_0`, Hugging Face `ggerganov/whisper.cpp` 커밋 `5359861`로 고정, SHA-256 검증 완료(`medium` 514MB, `large-v3-turbo` 547MB, `large-v3` 1,031MB). `*.en`, `large-v1/v2`, `tiny`는 제외(영어 전용·구버전·한국어 품질 부족). 파일은 저장소 밖 `%LOCALAPPDATA%\on-the-record-dev\models\`
  - 조건: whisper.cpp b5454 CPU 전용, `-l ko -t 8`, `scripts\measure-whisper.ps1`. 샘플 `real-sample-01`은 2회, `real-sample-02`는 1회(소요 시간 때문). 비교 기준은 `0-BASE-04`의 `base`/`small`
  - 장치: Samsung 960XFG 먼저(완료), 이후 Lenovo에서 같은 모델·해시·스레드로 반복
  - 기록: `benchmarks\records\<deviceId>\` JSON(장치별 하위 폴더, 2026-11-03 정리), 결과 요약은 `docs\baselines\BASE-06_...md`에 추가. 지표는 처리 시간/오디오 1분, 최대 RAM, 세그먼트 수, 반복 세그먼트 수. 요약표는 `scripts\summarize-records.ps1`로 생성
  - 판정: 1시간 회의를 허용 가능한 시간(목표는 사용자 확정 필요) 안에 처리하는 최상위 모델을 기본값 후보로 선정, 나머지는 선택 옵션
  - 진행(2026-11-03): Samsung에서 `real-sample-03`(44분) 5개 모델 1회씩 측정 완료(기록 010~014). 오디오 1분당 base 8.3초, small 12.0초, medium 43.9초, turbo 61.4초, large-v3 109.9초. 반복(한 줄 최대 반복): base 904, small 107, medium 12, turbo 918, large-v3 36 → 속도 수치는 반복 출력 포함, 모델 선정 근거로 단독 사용 금지
  - 마무리 결정(2026-11-03): 시스템 부하별 추가 시험은 하지 않음(재실행 해시 동일, 두 PC 세그먼트 수 동일). Samsung 모델 측정을 종료하고 모델 선정은 `0-BASE-08` 육안 검증 후 결정
  - 후속(미착수): ① 스레드 수(4/8/12/16) 영향, q8_0·fp16 비교, ② **Lenovo에서 `medium`·`large-v3-turbo`·`large-v3` 측정 예정**(같은 모델·해시·`-t 8`, 샘플 01~03, 결과는 `0-BASE-09` 집계표에 반영), ③ Iris Xe/GTX 1650 Ti GPU 빌드는 별도 평가. 반복 억제 옵션 효과는 `0-BASE-08`에서 함께 확인. 정량 품질(CER)은 `0-BASE-02`의 동의·정책 확인 후 진행
- [x] `0-BASE-09` 1시간 회의 전사 소요 시간 집계표 → 완료(2026-11-03): 기존 요약(`summarize-records.ps1`)은 오디오 1분당 초만 있어 보강해 "1시간 환산" 표를 추가하고, 장치·모델별 집계표 문서를 작성. Samsung 5개 모델 완료(base 8.3분, small 12.0분, medium 43.9분, turbo 61.4분, large-v3 109.9분), Lenovo는 base·small만 있고 medium 이상 미측정. 새 측정마다 스크립트 재실행 후 표 갱신. [집계표](./docs/baselines/BASE-09_ONE_HOUR_MEETING_TIME_2026-11-03.md)
- [ ] `0-BASE-08` 모델별 전사 결과 육안 검증 후 기본 모델·선택 옵션 결정 → 처리율·메모리·반복 통계로는 품질을 판단할 수 없어 사람이 직접 확인한다. 계획:
  - 대상: `base`, `small`, `medium`, `large-v3-turbo`, `large-v3`의 `real-sample-01~03` 전사문(`%LOCALAPPDATA%\on-the-record-dev\transcripts\`, 동기화 밖). 샘플 02·03의 반복 구간(turbo·base·small)을 우선 확인
  - 방법: 같은 구간(짧은 샘플 전체, 긴 샘플은 시작·중간·끝과 반복 발생 구간)을 모델별로 나란히 보며 평가. 평가 항목은 오탈자·누락, 고유명사·전문용어, 화자 전환 구간 문장 분리, 반복·환각, 숫자·날짜 표기, 구어체 처리
  - 개인정보: 전사문과 원문 발췌는 저장소·docs에 넣지 않는다. 기록에는 항목별 점수·메모와 모델별 결론만 남기며, 평가자는 해당 회의 참석자 또는 열람 권한자로 한정(`0-BASE-02` 동의·정책 확인 선행)
  - 추가 확인: 반복 억제 옵션(`--max-context 0`, VAD 등)을 켠 재전사가 반복을 줄이는지, 같은 조건 재실행 해시가 `medium` 이상에서도 동일한지
  - 산출물: `docs\baselines\BASE-08_...md`(평가표와 결정). 결정: 기본 모델 1개, 선택 옵션 모델, 시간 허용 목표(1시간 회의 기준)
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
- [x] `1-PIPE-05` 결과 미리보기 → 완료(2026-11-05, 사용자 Obsidian 수동 시험 확인; 모달 한글 깨짐은 UTF-8 재작성으로 수정): `src\resultPreview.ts`(시간 형식, 마크다운 변환, 지정 헤딩 아래 삽입, 코드 블록 헤딩 무시, 마커 기반 기존 결과 교체/추가), `src\resultPreviewModal.ts`(검토·편집·승인·취소, 기존 결과 확인 모달), 시험용 명령 "샘플 전사 결과 미리보기 시험". 타입 검사, lint, 테스트 29개, build 통과. 승인 전에는 노트를 수정하지 않는다. 커서 위치/새 노트 삽입, 삽입 설정(`insert.*`, `requireReview`)과 실제 엔진 연결은 후속 범위(시험용 명령은 엔진 연결 시 제거).

### 2단계: CPU 전사
- [x] `2-CPU-01` 사용자가 플러그인 외부에서 설치한 런타임·모델의 경로·버전·SHA-256 검증 및 시험 추론 → 완료(2026-11-06, 사용자 Obsidian 실제 시험 추론 성공 확인): 설정에서 선택한 짧은 WAV/MP3/OGG/FLAC 파일로 시험하며, whisper.cpp v1.9.5 실행 파일과 기준 모델 5종의 SHA-256을 확인한다. 시험 전사문은 임시 폴더에만 만들고 삭제한다. 다운로드·설치·업데이트·삭제는 제공하지 않으며, 배포 후보 artifact 검토는 `0-ENV-16`에 따른다.
- [x] `2-CPU-02` 오디오 정규화 → 완료(2026-11-06, PlugVaults에서 사용자 지정 FFmpeg로 시험 추론·정규화 성공 확인): 입력 오디오를 16 kHz 모노 signed 16-bit PCM WAV로 변환해 임시 폴더에서 추론하고, 변환 파일·전사문을 종료 시 삭제한다. M4A/MP3/WAV/AAC/OGG/FLAC 입력을 연결하며, FFmpeg는 자동 설치·업데이트하지 않는다. Obsidian에서 추가 형식별 실기 확인은 별도 수행한다.
- [x] `2-CPU-03` segment timestamp 출력 → 구현 완료(2026-11-06): whisper.cpp JSON(`-oj`)의 segment offsets(1/100초)를 초 단위 `TranscriptionResult.segments`로 변환한다. `transcribe()`는 언어·전체 문장·segment별 시작/종료 시각·엔진 정보를 반환하고 JSON/정규화 임시 파일을 삭제한다. 잘못된 JSON 및 오프셋은 명시적으로 거부한다. 실제 런타임 Obsidian 결과 표시와 노트 연결은 후속 범위. 타입 검사, lint, 테스트 35개 통과.
- [x] `2-CPU-04` 전사문 검색 → 완료(2026-11-06, PlugVaults 빈 Markdown 노트에서 샘플 미리보기·삽입 및 검색 실기 확인): 설정에 저장된 이전 검색어 제안 표시, 검색 결과 확인 및 일치 segment 위치 이동을 확인했다. 검색은 전사 결과 블록 내 timestamp가 있는 segment에 한정하며 단어/고유명사 자동 추출은 하지 않는다. 자동 테스트 38개 통과.
- [ ] `2-CPU-05` 결과 삽입(헤딩 아래, 재전사 시 추가/교체 확인)
- [ ] `2-CPU-06` 사용자가 설치한 CPU 런타임과 모델 자동 검색 → 알려진 로컬 설치 위치에서 후보를 찾아 버전·SHA-256을 확인하고, 결과를 설정에 적용하기 전 사용자가 선택·승인한다. 자동 다운로드·설치·업데이트·삭제는 하지 않는다.

### 3단계 이후
- [ ] GPU provider 평가(GTX 1650 Ti CUDA, Intel Iris Xe/UHD)
- [ ] 분석 기능 기술 검증
- [ ] 프로필 확장
