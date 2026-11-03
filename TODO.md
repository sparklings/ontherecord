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

- [x] `0-ENV-14` 하드웨어 프로필 기록 형식 정의(기기, CPU/GPU, 드라이버, provider·모델 버전, 처리율, 메모리) → [HARDWARE_PROFILE.md](./docs/design/HARDWARE_PROFILE.md) 초안 작성(2026-11-01). 프로필 자료는 `benchmarks\` 폴더에 보관. Lenovo 프로필 작성 완료, Samsung 프로필 작성 완료(2026-11-02, `samsung-960xfg.json`). `0-BASE-04` 측정 중 부족한 항목이 나오면 수정 (`0-BASE-04` 측정 기록의 형식이 됨)
- [x] `0-ENV-04` `node_modules`·빌드 산출물의 OneDrive 동기화 제외 또는 재생성 방식 결정 (프로젝트 초기화 전에 정해야 함) → **결정(2026-11-01): AssistantEmily와 동일.** OneDrive 동기화는 허용하고 `.gitignore`로 Git에서만 제외한다. PC 전환 후 `npm ci`로 재생성할 수 있어야 하므로 `package-lock.json`을 버전 관리한다. 근거: OneDrive에는 폴더 단위 제외 기능이 없고(웹 검색 요약, 공식 문서 미확인), AssistantEmily의 `node_modules`(11,736개 파일, 108 MB)는 네이티브 `.node` 파일 없이 esbuild win32-x64 바이너리만 있어 두 PC(Windows x64)에서 문제가 없었다. 재검토 조건: 네이티브 모듈 의존성이 추가되거나 PC 간 `node_modules` 불일치가 발생하면 폴더를 프로젝트 밖으로 옮기고 junction으로 연결하는 방식을 검토한다. whisper.cpp 실행 파일·모델은 프로젝트 밖 사용자별 데이터 폴더에 설치하므로 이 결정과 무관하다.
- [x] `0-ENV-03` `.gitignore` 작성(`node_modules`, 빌드 산출물, 모델·런타임, 비밀 값) → [.gitignore](./.gitignore) 작성(2026-11-01). AssistantEmily 기준 항목에 모델·런타임(`*.gguf`, `ggml-*.bin`, `runtimes/`, `models/`), `.local/`, 표본 데이터 폴더 전체(`samples/`), OS 파일을 추가. Git 제외 동작은 `0-BASE-01` 표본으로 확인(2026-11-02); 0-BASE-02 시작 전 오디오뿐 아니라 표본의 전사문·메타데이터도 실수로 push되지 않도록 `samples/` 전체 제외로 강화(2026-11-02).
- [x] `0-ENV-13` 설정 저장 구조 설계: vault 설정과 PC별 설정 분리 → [SETTINGS_DESIGN.md](./docs/design/SETTINGS_DESIGN.md) 초안 작성(2026-11-01), 동기화 방식 비의존으로 수정(2026-11-01). vault 설정은 `data.json`, PC별 설정과 런타임·모델은 `%LOCALAPPDATA%\<plugin-id>\`. 미결정: 외부 경로 입력, 저장 직전 수정 시각 확인

- [x] `0-ENV-05` 플러그인 id, 이름 결정 → **결정(2026-11-01): 이름 `On the Record`, id `on-the-record`, 부제 `Local minutes for Obsidian`, 저자 `SUNGWON PARK`(변경: 기존 `Sungwon Park (SG)`), 저장소명 `ontherecord`(접근성 우선, 보고서의 기존 `obsidian-on-the-record`에서 변경).** 근거: [네이밍 보고서](./docs/research/STT_사업보고서_OnTheRecord_네이밍.md). id 규칙(소문자·하이픈, `obsidian` 미포함, `plugin` 미종료)과 커뮤니티 목록 중복 없음은 보고서 기준 확인됨(2026-11-01 목록 9,755개). 미확인: 국내·USPTO 상표 검색(9·42류), 도메인 확보. 상표 결과에 따라 이름이 바뀔 수 있으며, 그 경우 id는 공개 전까지만 변경 가능하다
- [x] `0-ENV-02` Git 저장소 생성 및 GitHub 원격 연결 → 완료(2026-11-01). 로컬 저장소(`main`, `.gitignore` 동작 확인) 첫 커밋 후 private 저장소 `https://github.com/sparklings/ontherecord` 생성·push. 공개 범위는 라이선스·회사 규정 확인(`0-ENV-06`~`09`) 후 재결정. Git 사용자 정보는 전역 설정, `gh` 2.103.3 설치·로그인(`sparklings`)

#### 보류: 정책·이름 결정 후 진행

라이선스 정책이 정해져야 시작할 수 있는 항목이다. 결정 시점은 미정이다.

- [x] `0-ENV-11` 플러그인 프로젝트 초기화(AssistantEmily 구조 참조) → 완료(2026-11-01). 저장소 루트에 `manifest.json`(id `on-the-record`, `isDesktopOnly: true`), `versions.json`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `eslint.config.mjs`, `src/main.ts`(빈 `Plugin` 클래스) 생성. `npm install` 후 `npm run check`, `npm run lint`, `npm run build` 통과, `main.js` 생성 확인. AssistantEmily와 다른 점: PlugVaults 자동 배포와 `.env` 로드는 넣지 않음(배포는 `0-ENV-12`), 라이선스 미정이라 `package.json`은 `private: true`, `license: UNLICENSED`. 잠정값: `minAppVersion` 1.7.2(AssistantEmily 값, 이 플러그인 요구 API로 검증하지 않음 → `0-OBS` 검증 후 확정), 버전 0.0.0. `npm install`에서 `npm audit` 경고가 출력됨(내용 미확인)
- [x] `0-ENV-12` PlugVaults 배포 절차 작성(빌드 결과를 `.obsidian\plugins\<id>\`에 복사) → 완료(2026-11-01). [scripts/deploy.mjs](./scripts/deploy.mjs)와 `npm run deploy` 추가. 절차: (1) 프로덕션 빌드 (2) `main.js`, `manifest.json`, `styles.css`(있을 때만)를 `<vault>\.obsidian\plugins\on-the-record\`에 복사 (3) Obsidian에서 플러그인 활성화(최초 1회) 또는 재활성화. 대상 vault는 환경 변수 `OTR_TEST_VAULT`, 없으면 `%USERPROFILE%\OneDrive\PlugVaults`. 안전장치: 경로에 `ObsidianVaults`가 있으면 거부, `.obsidian`이 없는 폴더는 거부(두 경우 종료 코드 1 확인). 활성화 목록(`community-plugins.json`)은 수정하지 않음. 실제 실행으로 `main.js`, `manifest.json` 복사 확인. Obsidian 로드 확인 완료(2026-11-01, 사용자 확인): 커뮤니티 플러그인 목록에서 활성화되고 오류 없음. 빈 `onload()`라 리본·명령·설정 탭은 없음
- [x] `0-ENV-06` 라이선스 정책 확정 → **결정(2026-11-01): 공개 코드는 MIT, 소속 회사 구성원 혜택은 라이선스 제한이 아닌 사내 혜택(지원·반입 심의 패키지·프리셋·교육)으로 제공.** 근거: [라이선스 정책 보고서 V1.1.0](./docs/research/STT_라이선스정책_에스넷그룹_명세_및_체계검토.md). 이전 계획("구성원에게만 무료인 라이선스")에서 변경됨. 이유(보고서 §4.5~4.6): 대상을 지목한 라이선스는 OSI 승인을 받을 수 없고 Obsidian 디렉터리에서 'Custom license' 경고 대상이며, 설치 시 신원을 확인할 수단이 없다. 대상 조직 3층 명단(1순위 소속 회사와 계열사, 2순위 경영참여 출자 관계사와 계열사, 3순위 그 밖의 관계사)은 보고서 §6.1이 정본이다. 미해결: `LICENSE` 저작권자 표기(`0-ENV-07` 결과 필요), 관계사 지분 변동 재확인(차기 사업보고서). 보고서의 DART 수치와 Obsidian 정책 인용은 이 세션에서 원문 대조하지 않음
- [~] `0-ENV-07` 회사의 소프트웨어 배포·소유권 관련 규정 확인(공개 GitHub 저장소 게시 가능 여부 포함) → **규정은 확인되지 않음(2026-11-01).** 확인되지 않은 상태에서 다음 방침을 기록한다(사용자 지시): (1) 소유권은 소속 회사 구성원 모두의 것으로 한다. (2) 관리는 소속 회사 담당 조직이 한다. (3) 현재 GitHub 저장소는 개발자 개인 계정이 관리한다. (4) 회사 공식 GitHub 저장소가 확정되면 이관한다. 미해결: 위 방침은 회사 규정으로 확인된 것이 아니며, "구성원 모두의 소유"를 `LICENSE` 저작권자 표기에 어떻게 적을지(법인명, 부서명, 개인명 중 무엇인지) 정해지지 않았다. 저장소를 공개로 전환하기 전에 회사 규정 확인 또는 승인이 필요하다
- [~] `0-ENV-08` 공개 GitHub 저장소와 Obsidian 커뮤니티 플러그인 등록에 맞는 라이선스 조건 확인 → 공식 문서 5건 원문 대조 완료(2026-11-01), 상충 11건 정리: [Obsidian_디렉터리정책_상충검토.md](./docs/research/Obsidian_디렉터리정책_상충검토.md). 라이선스 조건(MIT, `LICENSE` 파일)은 충돌 없음. **미결정: 런타임·모델 다운로드 기능이 "Install or update themselves or their dependencies" 금지에 해당할 가능성(문서 §3의 선택지 A/B/C).** 등재 전 저장소 위치 확정 필요(등재 후 이전은 관리자 절차). Obsidian 상표 정책 원문은 미확인. 위 결정이 나면 완료 처리
- [x] `0-ENV-10` 의존 구성 요소(`whisper.cpp`, 모델, 오디오 변환기)의 라이선스와 MIT 공개의 충돌 여부 확인 → 완료(2026-11-01, FFmpeg 후보 추가 검토 2026-11-02): 현재 설계에서 일괄 충돌 없음. `whisper.cpp`·`ggml`은 MIT, 모델 라이선스는 실제 출처별로 다르므로 배포 파일 기준으로 고정 필요. FFmpeg 9.0.1은 LGPL 기본 빌드와 GPL·외부 라이브러리 포함 빌드를 구분하고, 제품용 후보를 GPL·version3·nonfree 옵션 및 외부 라이브러리가 없는 LGPL 구성으로 제한했다. 최종 바이너리와 배포 고지는 배포 전 확정한다. 자세한 내용: [라이선스 정책 보고서 §7 검토 결과](./docs/research/STT_라이선스정책_에스넷그룹_명세_및_체계검토.md) 및 [0-BASE-05 기록](./docs/baselines/BASE-05_AUDIO_DECODER_2026-11-02.md)
- [x] `0-ENV-09` `LICENSE`(MIT) 작성, `README.md` 라이선스 항목 갱신, `package.json`을 `license: MIT`, `private: false`로 변경, 사내 혜택 안내 문서(`SUPPORT.md`) 작성 → 완료(2026-11-01). 불명확한 사항은 미정으로 기록: `LICENSE` 저작권자, 공개 저장소 승인 및 회사 규정 확인은 `0-ENV-07` 미해결이며 저장소는 비공개 유지. `SUPPORT.md`의 지원 연락처/채널, 임직원 확인 절차, 사내 배포·자료 위치는 미정; 대상 조직은 라이선스 정책 보고서 §6.1을 기준으로 하고 하이케어넷 포함 여부 재확인 필요. 미확정 운영 세부사항과 권리 귀속을 확정한 뒤 문서 및 저작권자 표기를 갱신한다

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
- [ ] `0-OBS-03` 노트 링크 삽입 시점 확인

## 이후 단계(일정 미정)

### 1단계: 공통 파이프라인
- [ ] 설정 화면
- [~] 녹음 감지와 자동 전사 대기열 → 2026-11-03 녹음 감지 구현(`src\recordingWatcher.ts`): 레이아웃 준비 후 생성된 `.m4a/.mp3/.wav/.aac/.ogg` 파일을 감지하고 안정화(`0-OBS-02`)를 기다린 뒤 알림. 삭제·이름 변경 처리, 언로드 시 정리. 설정 화면(감지 켜기/끄기, 대기 시간)·전사 대기열은 미구현. 코어 Audio recorder 실제 녹음 4건에서 알림·로그 동작 확인(2026-11-03)
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
