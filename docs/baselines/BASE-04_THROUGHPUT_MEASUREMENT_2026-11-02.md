# 0-BASE-04: base/small 양자화 모델 처리율·메모리·전사 측정

작성일: 2026-11-02 / 상태: **Samsung 960XFG 및 Lenovo IdeaPad Gaming 3 완료**

## 1. 조건

- 장치: `samsung-960xfg` ([프로필](../../benchmarks/hardware/samsung-960xfg.json)), i5-1340P 12코어/16스레드, RAM 15.6 GiB.
- 장치: `lenovo-ideapad-gaming3-15imh05` ([프로필](../../benchmarks/hardware/lenovo-ideapad-gaming3-15imh05.json)), i7-10750H 6코어/12스레드, RAM 15.9 GiB, Windows 11 build 26300.
- 런타임: whisper.cpp b5454 (v1.9.5) CPU 전용 ([BASE-03](./BASE-03_WHISPER_CPP_RUNTIME_2026-11-02.md)).
- 모델: `base-q5_1`, `small-q5_1`.
- 샘플: [real-sample-01 / 02](./BASE-02_KOREAN_MEETING_SAMPLES_2026-11-02.md)의 wav(16 kHz mono). `real-sample-03`(44분)은 측정 제외.
- 옵션: 양쪽 모두 CPU 전용, `-l ko -t 8 -otxt`, 케이스당 2회. Lenovo 측정은 AC 전원, Windows 균형 조정 전원 구성에서 수행했다. Samsung 전원 조건은 기록하지 않았다. Lenovo의 8스레드는 전체 12 논리 프로세서 중 사용한 값이며 스레드 수 비교는 하지 않았다.
- 도구: [measure-whisper.ps1](../../scripts/measure-whisper.ps1). 기록: [benchmarks/records/](../../benchmarks/records/)의 `<deviceId>\` 폴더(장치별 001~008, 2026-11-03에 장치별 하위 폴더로 이동)
- `elapsedSeconds`는 모델 로딩을 제외한 값이다(로딩 0.2~0.9초). 최대 RAM은 `PeakWorkingSet64`.

## 2. 결과

| 장치 | 모델 | 샘플(길이) | 소요(초) 1회/2회 | 오디오 1분당(초) 1회/2회 | 최대 RAM | 세그먼트 |
|---|---|---|---:|---:|---:|---:|
| Samsung 960XFG | base-q5_1 | 01 (130.6 s) | 19.8 / 18.2 | 9.1 / 8.4 | 약 336 MB | 29 |
| Samsung 960XFG | base-q5_1 | 02 (1292 s) | 151.0 / 166.5 | 7.0 / 7.7 | 약 450 MB | 323 |
| Samsung 960XFG | small-q5_1 | 01 (130.6 s) | 33.0 / 31.7 | 15.2 / 14.6 | 약 592 MB | 24 |
| Samsung 960XFG | small-q5_1 | 02 (1292 s) | 419.1 / 414.1 | 19.5 / 19.2 | 약 716 MB | 414 |
| Lenovo IdeaPad Gaming 3 | base-q5_1 | 01 (130.6 s) | 67.9 / 37.8 | 31.210 / 17.386 | 342 / 344 MB | 29 |
| Lenovo IdeaPad Gaming 3 | base-q5_1 | 02 (1292 s) | 313.2 / 317.3 | 14.543 / 14.735 | 459 / 461 MB | 323 |
| Lenovo IdeaPad Gaming 3 | small-q5_1 | 01 (130.6 s) | 53.2 / 49.6 | 24.438 / 22.778 | 597 MB / 597 MB | 24 |
| Lenovo IdeaPad Gaming 3 | small-q5_1 | 02 (1292 s) | 568.8 / 549.3 | 26.415 / 25.508 | 718 / 720 MB | 414 |

## 3. 해석

- 두 PC 모두 측정한 실행에서 오디오 길이보다 빠르게 처리했다. Lenovo의 긴 샘플 기준으로 1시간 오디오는 base 약 14.5분, small 약 25.5~26.4분에 해당한다.
- 양쪽 모두 최대 RAM은 1 GB 미만이었다. Lenovo 최대치는 small 모델의 긴 샘플에서 약 720 MB였다.
- Lenovo의 base 짧은 샘플은 첫 실행 67.9초, 두 번째 37.8초로 편차가 컸다. 원인은 측정하지 않았으므로 해석하지 않는다. 다른 Lenovo 케이스는 반복 결과가 비교적 가까웠다.
- Lenovo에서는 small의 긴 샘플 처리율이 base보다 낮았지만, 모델 간 차이는 샘플 길이에 따라 달랐다.
- 세그먼트 수는 모델마다 다르며(02: 323 vs 414), 이 값 자체로 품질을 판단할 수 없다.
- **전사 품질은 평가하지 않았다.** 실제 회의 내용이라 전사문을 열람·기록하지 않았고 기준 전사본(CER)도 없다. Samsung 측정 당시 전사문은 `samples\transcripts\`에 저장했으나, 2026-11-03에 동기화 폴더 밖 `%LOCALAPPDATA%\on-the-record-dev\transcripts\legacy-samsung-960xfg-2026-11-02\`로 옮겼다(해당 기록의 `transcriptFile` 경로는 이동 전 값 그대로). 이후 측정 결과는 `%LOCALAPPDATA%\on-the-record-dev\transcripts\`에 저장한다.
- 측정 기록의 `quality`는 `null`이다.

## 4. Lenovo에서 측정을 다시 실행하는 방법

1. `benchmarks\hardware\lenovo-ideapad-gaming3-15imh05.json` 확인. 샘플과 런타임·모델은 이 PC와 같은 해시로 준비한다(`samples\real-audio\`는 OneDrive로 동기화되므로 SHA-256만 대조).
2. 런타임을 `%LOCALAPPDATA%\on-the-record-dev\runtimes\whisper.cpp-b5454-x64-cpu\Release\`에, 모델 두 개를 `...\models\`에 놓는다(해시는 BASE-03).
3. 매트릭스 실행(현재 프로필은 i7-10750H 12논리 프로세서이며, 기준선에서는 8스레드를 사용):
   `powershell -File scripts\measure-whisper.ps1 -DeviceId lenovo-ideapad-gaming3-15imh05 -ModelId base -Quantization q5_1 -SampleId real-sample-01 -Threads 8 -Repeat 2` (모델·샘플별 반복)
4. 스크립트는 `ffprobe`(FFmpeg)가 PATH에 있어야 한다. 실제 회의 전사문은 OneDrive 동기화 폴더 밖의 `%LOCALAPPDATA%\on-the-record-dev\transcripts\`에 저장한다.

## 5. 남은 사항

- 스레드 수 영향, q8_0/fp16 비교, `real-sample-03`과 품질(CER) 평가는 미실시. CER 평가는 참석자 동의 및 조직 정책 확인 후 진행한다.
- 이 측정은 CPU 전용이다. Intel Iris Xe iGPU와 Lenovo GTX 1650 Ti는 별도 빌드가 필요해 이번 범위 밖이다.
