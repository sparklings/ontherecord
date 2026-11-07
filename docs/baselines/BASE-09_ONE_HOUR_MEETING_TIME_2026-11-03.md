# 1시간 회의 음성 전사 소요 시간 집계표

작성일: 2026-11-03 / 관련: `0-BASE-04`, `0-BASE-06`, `0-BASE-09`

한 시간 분량의 회의를 `whisper.cpp`로 전사하는 데 걸리는 시간을 장치·모델별로 모은 표이다. 새 측정이 쌓이면 `scripts\summarize-records.ps1`을 실행해 `benchmarks\summary\summary.md`의 "1-hour meeting estimate" 표를 다시 만들고 이 문서의 표를 갱신한다.

## 1. 산출 방법

- 원자료: `benchmarks\records\<deviceId>\*.json`.
- 환산: 1시간 오디오 처리 시간(분) = 오디오 1분당 처리 시간(초)의 중앙값. (60분 × 초/분 ÷ 60)
- 기준 샘플: 장치·모델별로 **가장 긴 샘플**을 쓴다. 짧은 샘플은 고정 비용 영향이 커서 편차가 크다(예: Samsung large-v3 샘플 01 130초/분, 샘플 03 110초/분).
- 같은 런타임·모델·샘플·스레드 조건의 반복은 중앙값으로 합친다. 모델 로딩 시간은 제외한 값이다.
- 공통 조건: whisper.cpp b5454 CPU 전용, `-l ko -t 8`, AC 전원, Windows 균형 조정. 샘플은 한국어 회의 3종([BASE-02](./BASE-02_KOREAN_MEETING_SAMPLES_2026-11-02.md)).
- 전사 품질은 반영되지 않았다. 육안 검증 결과는 `0-BASE-08`에서 정한다.

## 2. 집계표 (2026-11-07 갱신)

| 장치 | 모델 | 기준 샘플(길이) | 반복 | 1시간 회의 소요(분) | 실시간 대비 배속 | 최대 RAM | 한 줄 최대 반복 | 판정 |
|---|---|---|---:|---:|---:|---:|---:|---|
| Samsung 960XFG (i5-1340P) | base-q5_1 | 03 (44.2분) | 1 | 8.3 | 7.2× | 590 MB | 904 | 실시간보다 빠름 |
| Samsung 960XFG | small-q5_1 | 03 (44.2분) | 1 | 12.0 | 5.0× | 838 MB | 107 | 실시간보다 빠름 |
| Samsung 960XFG | medium-q5_0 | 03 (44.2분) | 1 | 43.9 | 1.4× | 1.49 GB | 12 | 실시간보다 빠름 |
| Samsung 960XFG | large-v3-turbo-q5_0 | 03 (44.2분) | 1 | 61.4 | 0.98× | 1.22 GB | 918 | 실시간과 비슷하거나 느림 |
| Samsung 960XFG | large-v3-q5_0 | 03 (44.2분) | 1 | 109.9 | 0.55× | 2.40 GB | 36 | 실시간보다 느림 |
| Lenovo IdeaPad Gaming 3 (i7-10750H) | base-q5_1 | 02 (21.5분) | 2 | 14.6 | 4.1× | 461 MB | 미기록 | 실시간보다 빠름 |
| Lenovo IdeaPad Gaming 3 | small-q5_1 | 02 (21.5분) | 2 | 26.0 | 2.3× | 720 MB | 미기록 | 실시간보다 빠름 |
| Lenovo IdeaPad Gaming 3 | medium-q5_0 | 02 (21.5분) | 1 | 68.2 | 0.88× | 1.37 GB | 1 | 실시간과 비슷하거나 느림 |
| Lenovo IdeaPad Gaming 3 | large-v3-turbo-q5_0 | 01 (2.2분) | 2 | 82.5 | 0.73× | 928 MB | 1 | 실시간보다 느림 |
| Lenovo IdeaPad Gaming 3 | large-v3-q5_0 | 01 (2.2분) | 2 | 171.3 | 0.35× | 2.13 GB | 1 | 실시간보다 느림 |

## 3. 읽는 방법과 주의

- **환각 반복이 큰 모델은 속도가 짧게 나왔을 수 있다.** base(904)와 turbo(918)는 한 줄이 크게 반복되어 출력이 부풀려지고 디코딩 패턴이 달라졌다. 이 모델들의 소요 시간으로 모델을 선택하면 안 된다. 반복이 적은 모델은 medium(12), large-v3(36)이다.
- 샘플에 따라 값이 다르다(예: Samsung base 샘플 02 7.4분, 샘플 03 8.3분). 실제 회의의 소요 시간은 ±20% 정도의 편차를 둔다.
- Samsung 기준 샘플은 03, Lenovo는 02이다. Lenovo 장치의 샘플 03과 medium 이상이 측정되면 같은 기준으로 맞춘다. 그 전까지 두 장치의 직접 비교는 참고용이다.
- 샘플 03은 장치당 모델별 1회 측정이라 반복 편차를 보지 못했다.
- Lenovo의 기록은 반복 통계 필드가 추가되기 전에 만들어져 반복 횟수를 알 수 없다.
- CPU 전용 결과이다. Iris Xe iGPU, GTX 1650 Ti 사용 시의 시간은 포함하지 않는다.

## 4. 관련

- 측정 도구: [measure-whisper.ps1](../../scripts/measure-whisper.ps1), 요약 도구: [summarize-records.ps1](../../scripts/summarize-records.ps1)
- 세부 결과: [BASE-04](./BASE-04_THROUGHPUT_MEASUREMENT_2026-11-02.md), [BASE-06](./BASE-06_LARGER_MODELS_2026-11-03.md)
