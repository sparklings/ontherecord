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
- 파일 위치: `benchmarks\hardware\<deviceId>.json`, `benchmarks\records\<날짜>_<deviceId>_<번호>.json` (폴더 설명은 `benchmarks\README.md`)

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
| `result.transcriptFile` | 전사 결과 파일 경로(저장소 기준 상대 경로) |
| `quality` | 전사 오류 지표(`metric`, `value`, 기준 정답 파일). 정답이 없으면 `null` |
| `repeat` | 같은 조건 반복 횟수와 몇 번째 측정인지 |
| `warnings[]` | 실행 중 경고, 오류 요약(원문 내용은 기록하지 않음) |
| `notes` | 측정 환경 메모(전원 연결 여부, 다른 작업 실행 여부 등) |

## 예시 (장치 프로필)

실제 파일: [benchmarks\hardware\lenovo-ideapad-gaming3-15imh05.json](../benchmarks/hardware/lenovo-ideapad-gaming3-15imh05.json). 아래는 수집 전 초안 예시이며 메모리 값이 비어 있다.

값은 `systeminfo_Lenovo_IdeaPad_Gaming3.md`와 2026-11-01 조회 결과에 있는 것만 적었다.

```json
{
  "deviceId": "lenovo-ideapad-gaming3-15imh05",
  "profileRevision": 1,
  "recordedAt": "2026-11-01T10:00:00+09:00",
  "os": { "name": "Windows 11 Pro", "version": "10.0.26200", "build": "26200", "arch": "x64" },
  "cpu": { "model": "Intel Core i7-10750H", "cores": 6, "threads": 12 },
  "memoryBytes": null,
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
      "dedicatedMemoryBytes": null,
      "pnpDeviceId": "VEN_10DE&DEV_1F95"
    }
  ],
  "notes": "memoryBytes, dedicatedMemoryBytes는 수집 명령으로 다시 확인해 기입. NVIDIA 드라이버 버전은 Windows 표기(32.0.15.8088)이고 systeminfo 문서의 580.88과 같은 드라이버의 다른 표기로 보이나 미확인"
}
```

## 미결정 사항

- 파일 위치(`benchmarks\`)는 확정했다. 저장소 구성이 정해질 때 저장소 내 경로가 달라지면 갱신한다.
- `quality`의 오류 지표(예: 한국어 CER)는 `0-BASE-02`에서 정답 전사본을 준비할 때 정한다.
- 측정 기록을 사람이 읽는 요약표로 만드는 방법은 `0-BASE-04`에서 정한다.
