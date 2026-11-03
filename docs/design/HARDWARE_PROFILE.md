# 하드웨어 프로필 및 측정 기록 형식

작성일: 2026-11-01 / 관련 항목: `0-ENV-14` / 사용처: `0-BASE-04`, 3단계 GPU 검증

PC마다 같은 형식으로 장치 정보와 측정 결과를 남겨 PC 간 결과를 비교하기 위한 형식이다. PC가 늘어나도 파일만 추가하면 되고 코드 변경은 필요 없다. 형식은 `0-BASE-04` 측정을 해 보며 부족한 항목이 나오면 수정한다.

## 구성

기록은 두 종류로 나눈다.

| 기록 | 내용 | 갱신 시점 |
|---|---|---|
| 장치 프로필 (device profile) | PC 한 대의 하드웨어·드라이버·OS | 장치, 드라이버, OS가 바뀔 때 |
| 측정 기록 (benchmark record) | 한 번의 전사 측정 결과 | 측정할 때마다 새 파일 추가. 기존 기록은 수정하지 않음 |

측정 기록은 장치 프로필의 `deviceId`와 `profileRevision`으로 어느 상태의 장치에서 측정했는지 연결한다.

## 공통 규칙

- 저장 형식은 JSON, 인코딩은 UTF-8이다.
- 측정하지 않았거나 확인하지 못한 값은 `null`로 둔다. 추정값을 넣지 않는다.
- 컴퓨터 이름, 사용자 이름, 일련번호, 경로의 사용자 계정 부분은 기록하지 않는다.
- 시각은 ISO 8601(`2026-11-01T10:00:00+09:00`), 크기는 바이트, 시간은 초 단위이다.
- 파일 위치: `benchmarks\hardware\<deviceId>.json`, `benchmarks\records\<deviceId>\<날짜>_<deviceId>_<번호>.json` (폴더 설명은 `benchmarks\README.md`). 장치별 하위 폴더를 두어 장치가 수십 종으로 늘어도 폴더 하나에 파일이 쌓이지 않고, 장치 간 파일명 충돌과 Git 병합 충돌이 생기지 않는다.

## 장치 프로필

| 필드 | 설명 | 예 |
|---|---|---|
| `deviceId` | 장치 식별자. 제조사·모델 기반 영문 소문자. 컴퓨터 이름을 쓰지 않음 | `lenovo-ideapad-gaming3-15imh05` |
| `profileRevision` | 프로필 개정 번호. 내용이 바뀌면 1씩 증가 | `1` |
| `recordedAt` | 이 프로필을 확인한 시각 | |
| `os` | `name`, `version`, `build`, `arch` | `Windows 11 Pro`, `10.0.26200`, `x64` |
| `cpu` | `model`, `cores`, `threads` | `Intel Core i7-10750H`, 6, 12 |
| `memoryBytes` | 시스템 메모리 | |
| `gpus[]` | 장치별 항목. 아래 표 참조. 장치가 여러 개면 모두 기록 | |
| `notes` | 확인 방법, 불확실한 점 | |

`gpus[]` 항목:

| 필드 | 설명 | 예 |
|---|---|---|
| `name` | Windows가 보고한 이름 | `NVIDIA GeForce GTX 1650 Ti` |
| `kind` | `integrated` 또는 `discrete` | `discrete` |
| `vendor` | 제조사 | `NVIDIA` |
| `driverVersion` | 드라이버 버전 | |
| `dedicatedMemoryBytes` | 전용 메모리. 내장 GPU는 공유 메모리라 `null` | |
| `pnpDeviceId` | 장치 식별 문자열 중 `VEN_`·`DEV_` 부분만 기록(일련 부분 제외) | `VEN_10DE&DEV_1F95` |

수집 명령(PowerShell): `Get-CimInstance Win32_VideoController`, `Get-CimInstance Win32_Processor`, `Get-CimInstance Win32_ComputerSystem`

## 측정 기록

| 필드 | 설명 |
|---|---|
| `recordId` | 기록 식별자. 파일명과 동일 |
| `measuredAt` | 측정 시작 시각 |
| `deviceId`, `profileRevision` | 측정한 장치와 프로필 개정 |
| `provider` | `id`, `version`(예: `whisper.cpp` CPU), `executionDevice`(`cpu` 또는 사용한 GPU의 `name`) |
| `runtime` | 실행 파일의 버전, 출처, SHA-256 |
| `model` | `id`(예: `base`, `small`), `quantization`, 파일 SHA-256, 파일 크기 |
| `sample` | `id`, 길이(초), 언어, 파일 SHA-256. 샘플은 `0-BASE-02`에서 정한 것을 쓴다 |
| `options` | 스레드 수, 언어 지정 등 실행 옵션 전체 |
| `result.status` | `ok`, `failed`, `cancelled` |
| `result.elapsedSeconds` | 전사 처리 시간(모델 로드 시간은 `modelLoadSeconds`로 분리) |
| `result.secondsPerAudioMinute` | 오디오 1분당 처리 초 = `elapsedSeconds` ÷ (`sample` 길이 ÷ 60) |
| `result.peakRamBytes` | 최대 메모리(프로세스 기준) |
| `result.peakVramBytes` | GPU 사용 시 최대 전용 메모리. CPU 측정이면 `null` |
| `result.segmentCount` | 출력된 segment 수 |
| `result.uniqueSegmentCount`, `result.maxRepeatedSegmentCount` | 서로 다른 segment 수, 가장 많이 반복된 segment의 반복 횟수. 내용 없이 계산하는 반복·환각 점검 지표(2026-11-03 추가, 이전 기록에는 없음) |
| `result.transcriptFile` | 전사 결과 파일 경로. 실제 회의 음성의 결과물은 동기화 폴더 밖에 보관하고 `%LOCALAPPDATA%` 같은 환경 변수 토큰 경로로 기록한다 |
| `environment` | `powerSource`(`ac`, `battery`, `ac-no-battery`), `powerPlan`(Windows 전원 구성표 이름). 측정 스크립트가 자동 기록(2026-11-03 추가, 이전 기록에는 없음) |
| `quality` | 전사 오류 지표(`metric`, `value`, 기준 정답 파일). 정답이 없으면 `null` |
| `repeat` | 같은 조건 반복 횟수와 몇 번째 측정인지 |
| `warnings[]` | 실행 중 경고, 오류 요약(원문 내용은 기록하지 않음) |
| `notes` | 측정 환경 메모(전원 연결 여부, 다른 작업 실행 여부 등) |

## 예시 (장치 프로필)

실제 Lenovo 프로필: [lenovo-ideapad-gaming3-15imh05.json](../../benchmarks/hardware/lenovo-ideapad-gaming3-15imh05.json). 아래는 2026-11-02에 확인한 revision 2의 예시이다.

확인값은 `systeminfo_Lenovo_IdeaPad_Gaming3.md` 및 WMI·`nvidia-smi` 조회를 따른다.

```json
{
  "deviceId": "lenovo-ideapad-gaming3-15imh05",
  "profileRevision": 2,
  "recordedAt": "2026-11-02T21:37:15+09:00",
  "os": { "name": "Windows 11 Pro", "version": "10.0.26300", "build": "26300", "arch": "x64" },
  "cpu": { "model": "Intel Core i7-10750H", "cores": 6, "threads": 12 },
  "memoryBytes": 17041244160,
  "gpus": [
    {
      "name": "Intel UHD Graphics",
      "kind": "integrated",
      "vendor": "Intel",
      "driverVersion": "27.20.100.9664",
      "dedicatedMemoryBytes": null,
      "pnpDeviceId": "VEN_8086&DEV_9BC4"
    },
    {
      "name": "NVIDIA GeForce GTX 1650 Ti",
      "kind": "discrete",
      "vendor": "NVIDIA",
      "driverVersion": "32.0.15.8088",
      "dedicatedMemoryBytes": 4294967296,
      "pnpDeviceId": "VEN_10DE&DEV_1F95"
    }
  ],
  "notes": "2026-11-02 WMI로 재확인. NVIDIA 전용 메모리 4096 MiB는 nvidia-smi 기준이며, Windows AdapterRAM은 4,293,918,720 bytes로 보고됨. NVIDIA 드라이버는 Windows 표기(32.0.15.8088); nvidia-smi 표기는 580.88. Intel UHD는 공유 메모리 GPU라 dedicatedMemoryBytes는 null."
}
```

## 대량 누적 운영 (장치 수십 종 대비)

2026-11-03 결정. 기록은 파일 단위로 추가만 하고(수정 금지), 비교와 요약은 스크립트가 만든다.

- **원본**: `benchmarks\records\<deviceId>\*.json`만 Git에 둔다. 기록 한 건은 약 2 KB이며, 장치 50대 × 모델 5종 × 샘플 3종 × 반복 2회는 약 1,500건(약 3 MB)이다.
- **요약**: `scripts\summarize-records.ps1`이 `benchmarks\summary\records.csv`(전체 목록)와 `summary.md`(조건별 중앙값)를 생성한다. 생성물은 Git에서 제외하여 장치별로 요약 파일을 두고 병합 충돌이 나는 일을 막는다. 장치·모델·샘플 필터 인자를 지원한다.
- **비교 가능 조건**: 런타임·모델·샘플의 SHA-256과 스레드 수가 모두 같은 기록만 한 그룹으로 묶는다. 같은 샘플 ID에 SHA-256이 둘 이상 나오면 경고한다. 다른 조건과 섞어 비교하지 않는다.
- **전원·환경**: `environment`를 자동 기록한다. 배터리 측정과 AC 측정은 분리해 비교한다.
- **실제 회의 음성의 결과물**: 전사문은 `%LOCALAPPDATA%\on-the-record-dev\transcripts\`에만 둔다(OneDrive 동기화 밖). 저장소에는 해시·길이·통계만 남긴다.
- **한계**: 기록이 수천 건을 넘거나 시계열 비교가 필요해지면 CSV를 SQLite 등으로 옮기는 방안을 검토한다. 현재 규모에서는 불필요하다.

## 미결정 사항

- 파일 위치(`benchmarks\`)는 확정했다. 저장소 구성이 정해질 때 저장소 내 경로가 달라지면 갱신한다.
- `quality`의 오류 지표(예: 한국어 CER)는 `0-BASE-02`에서 정답 전사본을 준비할 때 정한다.
- 측정 기록을 사람이 읽는 요약표로 만드는 방법은 `scripts\summarize-records.ps1`로 정했다(2026-11-03).
