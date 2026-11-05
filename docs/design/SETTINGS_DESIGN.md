# 설정 저장 구조: vault 설정과 PC별 설정

작성일: 2026-11-01 · 구현 반영: 2026-11-05 / 관련 항목: `0-ENV-13`, `1-PIPE-01` / 상태: 1단계 설정 기본 기능 구현

플러그인 설정을 vault 안에 저장하는 **vault 설정**과 PC 로컬 폴더에 저장하는 **PC별 설정**으로 나누는 규칙이다. `<plugin-id>`는 플러그인 id `on-the-record`이다(`0-ENV-05`, 2026-11-01 결정).

이 설계는 사용자가 vault를 동기화하는 방식을 가정하지 않는다. 동기화 서비스의 종류(클라우드 드라이브, Obsidian Sync, Git, 기타), 동기화 여부, 동기화 범위는 사용자마다 다르고 플러그인이 알 수 없다. 개발자의 개인 환경(OneDrive)은 이 설계의 전제가 아니며 시험 시나리오의 하나로만 다룬다.

## 배경

분리하는 이유는 동기화 방식과 관계없이 성립하는 것만 둔다.

- **vault 설정은 vault에 속한다.** `.obsidian\plugins\<plugin-id>\data.json`(Obsidian `loadData`/`saveData`가 읽고 쓰는 파일)은 vault 폴더를 복사·이동·동기화하면 함께 따라간다. 따라서 다른 PC, 다른 사용자, 백업 복원 환경에 그대로 전달될 수 있다.
- **같은 PC에 vault가 여러 개일 수 있다.** 런타임과 모델은 크기가 크므로 vault마다 설치하지 않고 PC에 한 벌만 둔다.
- **로컬 경로와 장치는 PC에 속한다.** 사용자가 지정한 런타임·모델 경로, 사용 가능한 GPU, 시험 추론 결과는 PC마다 다르다. 다른 환경에서 만든 값을 그대로 쓰면 맞지 않을 수 있다. 플러그인은 해당 파일을 설치·업데이트·삭제하지 않는다.
- **vault가 동기화되는 환경이라면** 위 값이 다른 PC에 전달되어 문제가 될 수 있다. 이 경우를 시험할 때는 개발자의 OneDrive 환경을 하나의 사례로 쓴다.

## 저장 위치

| 구분 | 위치 | 동기화에 대한 가정 | 접근 방법 |
|---|---|---|---|
| vault 설정 | `<vault>\.obsidian\plugins\<plugin-id>\data.json` | vault와 같이 이동·동기화될 수 있다 | `loadData()` / `saveData()` |
| PC별 설정 | `%LOCALAPPDATA%\<plugin-id>\local-settings.json` | vault 밖의 PC 로컬 폴더이므로 vault 동기화에 포함되지 않는다. 사용자가 이 폴더를 별도로 동기화하는 경우는 지원 범위 밖이다 | Node `fs`(Desktop Only이므로 사용 가능) |
| 사용자가 관리하는 런타임·모델·캐시 | `%LOCALAPPDATA%\<plugin-id>\runtimes\`, `models\`, `cache\` | 위와 같음 | 사용자가 별도 취득·설치·갱신·삭제하고 플러그인은 지정 경로를 검증·사용 |

`1-PIPE-01` 구현 범위: vault 설정은 `Plugin.loadData`/`saveData`로 저장하고, PC별 런타임 실행 파일·모델 파일 경로는 `%LOCALAPPDATA%\<plugin-id>\local-settings.json`에 저장한다. 설정 탭에서 녹음 감지, 자동 전사 기본값, 안정화 대기 시간, 언어, 모델 크기, 장치 선호 및 PC별 경로를 편집한다. PC별 경로 변경은 잠금 파일로 직렬화하고 atomic rename으로 저장해 여러 Obsidian 창의 동시 갱신에서 서로 다른 필드를 보존한다. 5초 안에 잠금을 얻지 못하면 저장 실패를 알린다. 런타임 경로를 저장할 뿐 파일 선택·검증·실행은 제공하지 않는다. 자동 전사 설정은 `1-PIPE-02`의 메모리 대기열에 연결하며 실제 전사 실행은 후속 provider·전사 단계에서 연결한다.

- 런타임·모델·캐시는 PC별 설정 파일과 같은 `%LOCALAPPDATA%\<plugin-id>\` 아래에 둔다. 개발계획서의 "vault 밖 사용자별 데이터 위치"에 해당한다.
- `%LOCALAPPDATA%`는 Windows 계정마다 다르므로 계정이 다른 PC에서도 같은 코드로 동작한다. 경로는 코드에서 환경 변수로 계산하고 설정 파일에는 절대 경로를 저장하지 않는다.
- 같은 PC에서 여러 vault가 같은 `%LOCALAPPDATA%\<plugin-id>\`를 공유한다. 동일 플러그인의 여러 Obsidian 창에서 설정을 갱신할 수 있으므로 잠금 파일로 쓰기를 직렬화하고 atomic rename으로 저장한다. 잠금은 설정 저장소 단위로 적용되며 5초 안에 획득하지 못하면 오류를 알린다(`1-PIPE-01`).

### Obsidian `localStorage` API를 쓰지 않는 이유

`App.saveLocalStorage`/`loadLocalStorage`(Obsidian 1.8.7 이후, vault 단위 PC 로컬 저장)가 있으나 PC별 설정의 기본 저장소로 쓰지 않는다. 브라우저 저장소 성격이라 Obsidian 캐시 삭제 시 함께 사라질 수 있고, 설치 검증 결과처럼 보존해야 하는 상태에 맞지 않는다. 확인한 근거: AssistantEmily가 사용하는 `obsidian` 패키지 1.13.1의 `obsidian.d.ts`.

## 분류 기준

한 설정이 아래 중 하나라도 해당하면 PC별 설정이다. 모두 해당하지 않으면 vault 설정이다.

1. 하드웨어·드라이버·설치 상태에 따라 값이 달라진다.
2. 값에 PC 로컬 절대 경로나 계정명이 들어간다.
3. 그 PC에서 실행해 얻은 검증·측정 결과이다.
4. vault가 다른 PC나 환경으로 옮겨졌을 때 그대로 쓰면 오류가 나거나 잘못된 장치를 쓴다.

## 설정 항목 분류(초안)

### vault 설정 (`data.json`)

| 항목 | 설명 |
|---|---|
| `schemaVersion` | 설정 스키마 버전 |
| `language` | 기본 전사 언어 |
| `defaultModelSize` | 기본 모델 크기. 모델 파일이 이 PC에 있다는 뜻은 아님 |
| `devicePreference` | `auto` / `cpu` / `accelerator`. 장치 종류에 대한 선호만 저장하고 구체 장치는 저장하지 않음 |
| `autoDetectRecording`, `autoTranscribe` | 녹음 감지·자동 전사 사용 여부 |
| `stabilizationSeconds` | 파일 안정화 대기 조건 |
| `watchScope` | 감지할 노트·폴더 범위(vault 상대 경로) |
| `duplicatePolicy` | 중복·동시 작업 정책 |
| `searchTerms`, `profiles` | 검색어, 전사 프로필 |
| `insert.*` | 결과 삽입 위치·헤딩·템플릿, 타임스탬프 포함 여부 |
| `requireReview` | 결과 검토 요구 정책 |

### PC별 설정 (`local-settings.json`)

| 항목 | 설명 |
|---|---|
| `schemaVersion` | 설정 스키마 버전 |
| `localDeviceId` | 이 PC를 구별하는 식별자. 처음 실행할 때 무작위로 생성. 컴퓨터 이름·사용자 이름을 쓰지 않음. `benchmarks\hardware\`의 `deviceId`와 연결하려면 사용자가 직접 지정 |
| `selectedProvider` | 이 PC에서 선택한 provider(예: `whisper.cpp` CPU) |
| `installedRuntimes[]` | 설치된 런타임의 id, 버전, 해시, 설치 시각, 시험 추론 결과 |
| `installedModels[]` | 설치된 모델의 id, 양자화, 해시, 크기 |
| `providerVerification[]` | provider별 마지막 시험 추론 결과와 시각, 실패 사유 |
| `limits` | 이 PC의 메모리 기준 동시 작업·모델 크기 상한 |
| `externalPaths` | 외부 경로 입력을 허용하는 경우의 PC 로컬 경로(미정) |

현재 구현은 PC별 파일에 `schemaVersion`, `runtimePath`, `modelPath`를 저장한다. 나머지 PC별 항목은 후속 provider·런타임 검증 작업에서 추가한다.

## 충돌·불일치 처리 규칙

1. **선택한 장치가 이 PC에서 사용 불가:** vault 설정은 `devicePreference`만 담으므로 구체 장치 충돌이 없다. PC별 `selectedProvider`가 없거나 검증 실패면 CPU provider로 전사하고 사용자에게 알린다. 조용히 바꾸지 않는다.
2. **vault의 `defaultModelSize`가 이 PC에 설치되어 있지 않음:** 자동으로 내려받지 않는다. 설치 안내를 표시하고, 설치된 모델이 있으면 사용자 동의 후 그 모델로 진행한다.
3. **PC별 설정 파일이 없음(새 PC, 초기화, vault를 다른 PC로 옮김):** 기본값으로 새로 만들고 런타임 설치 안내를 표시한다. vault 설정은 변경하지 않는다.
4. **스키마 버전이 더 높은 파일을 읽음(다른 환경에서 더 새 버전이 저장됨):** 알 수 없는 필드를 지우지 않고 보존하며, 필드를 이해하지 못하면 해당 기능을 끄고 알린다. 설정을 낮은 버전으로 덮어쓰지 않는다.
5. **PC별 값이 `data.json`에 섞여 있음(개발 중 실수, 사용자가 파일을 직접 편집한 경우 포함):** 로드할 때 PC별 키 목록에 해당하는 키가 `data.json`에서 발견되면 무시하고 경고를 기록한다.
6. **Obsidian 실행 중 `data.json`이 외부에서 바뀜(동기화 도구, 사용자 편집 등 원인과 무관):** Obsidian은 시작할 때만 설정을 읽으므로 이후 저장할 때 외부 변경을 덮어쓸 수 있다. 원인은 구별하지 않고 저장 직전에 파일 수정 시각을 확인해 달라졌으면 덮어쓰지 않고 알리는 방식을 1단계 구현 때 검토한다. 개발자 개인의 PC 전환 절차(개발계획서 §5)는 개발 환경의 운영 규칙이며 사용자에게 요구하는 사항이 아니다.
7. **로그에는 설정 값 중 경로·계정명을 기록하지 않는다.**

## 기록해야 할 개인정보 제한

- `localDeviceId`는 무작위 값이다. 컴퓨터 이름, Windows 사용자 이름, 일련번호를 쓰지 않는다(`HARDWARE_PROFILE.md`의 규칙과 같음).
- 두 설정 파일 모두 사용자 노트 내용, 오디오 파일명, 전사 원문을 저장하지 않는다.

## 미결정 사항

- `<plugin-id>`: `on-the-record`로 확정(`0-ENV-05`). 경로의 폴더명은 id와 같은 `on-the-record`를 쓴다.
- `externalPaths`: 외부 경로 입력 허용 여부(개발계획서 §8)가 정해지면 확정한다.
- 저장 직전 `data.json` 수정 시각 확인(규칙 6): 1단계 구현 시 검토한다. 동기화 방식과 무관한 방어이므로 구현 쪽에 무게를 둔다.
- 여러 vault/Obsidian 창이 `%LOCALAPPDATA%\<plugin-id>\`를 공유할 때 PC별 설정의 갱신은 잠금 파일과 원자적 교체로 직렬화한다. 잠금이 5초 안에 해제되지 않으면 오류를 표시하며, stale lock의 수동 복구 절차는 필요 시 후속 보완한다.
- 설정 항목 목록은 1단계 설정 화면 설계 때 추가·삭제한다. 분류 기준은 유지한다.
