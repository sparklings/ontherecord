# 0-BASE-01 오디오 형식 시험 표본

- **작성일:** 2026-11-02
- **상태:** 합성 표본 5종과 실제 녹음 기반 표본 3종(원본 포함 총 15개 파일) 확보·변환·디코딩 확인 완료.
- **목적:** 확장자별 파일의 컨테이너·코덱 식별 및 디코더 기본 동작을 점검한다. STT 음성 인식 품질 측정용 표본은 아니다.

## 생성 및 검증

FFmpeg 9.0.1의 `lavfi` sine source로 440 Hz, 10초, 16 kHz, 모노 오디오를 각 형식으로 직접 생성했다. 사람의 발화가 아닌 합성음이며, 생성된 파일은 저장소 루트의 `samples\format-fixtures\`에 둔다. 오디오 파일은 `.gitignore`에 따라 Git에 포함하지 않는다.

각 파일을 `ffprobe`로 확인하고 FFmpeg null 출력 대상으로 전체 디코딩했다. 다섯 파일 모두 디코딩에 성공했다.

| 파일 | 컨테이너 | 코덱 | 길이 | 크기 (bytes) | SHA-256 |
|---|---|---|---:|---:|---|
| `format-fixture.m4a` | MP4/M4A | AAC | 10.000 s | 64,062 | `6e1e41170218f94c2230b30d8469c39a9abdaf99e98f632d2f57c94b50a9ae7f` |
| `format-fixture.mp3` | MP3 | MP3 | 10.000 s | 80,972 | `fdd8a831e9d58c2e6c8a719bb63ec08017a90321a23e1ef21b60e9916ed9e940` |
| `format-fixture.wav` | WAV | PCM signed 16-bit little-endian | 10.000 s | 320,078 | `237fe78a052222b714d646d4422b2727ecb78fd0287603c56c396b9b4ae9733d` |
| `format-fixture.aac` | ADTS | AAC | 10.115 s | 63,730 | `7b19a78ad28bfb13f2e7fb035a3819ede42903c45886700cdcb177cedb1d6894` |
| `format-fixture.ogg` | Ogg | Vorbis | 10.000 s | 11,783 | `4f41ff1b916c04534057a4922aa0adf67e2ad86bad13e28561bad7b892a25bcb` |

AAC ADTS 표본은 패킷 단위 인코딩 패딩으로 probe 길이가 10초보다 길게 표시된다. 컨테이너·코덱별 파서/디코더 스모크 테스트에서는 이를 실패로 판정하지 않는다.

## 실제 녹음 기반 표본

제공된 Obsidian vault 첨부 폴더의 M4A 55개(총 2,121,044,658 bytes)를 파일명이나 음성 내용을 확인하지 않고 메타데이터만 조회했다. 전체가 MP4/M4A 컨테이너, Opus, 48 kHz, 모노로 보고되었다. 길이 구간을 대표하는 3개를 선택해 원본을 익명 ID로 보존하고, MP3·WAV·AAC(ADTS)·OGG로 변환했다. 변환은 메타데이터를 제거하고 16 kHz 모노로 정규화했다.

표본 파일은 `samples\real-audio\`에 있으며 모든 원본·변환 파일은 `.gitignore` 적용 및 디코딩을 확인했다. 원본 음성은 재생하거나 전사하지 않았다. 기록에 실제 파일명이나 절대 경로는 남기지 않는다.

| 익명 ID | 변형 | 컨테이너 / 코덱 | 길이 (초) | 크기 (bytes) | SHA-256 |
|---|---|---|---:|---:|---|
| `real-sample-01` | M4A 원본 | MP4/M4A / Opus | 130.579 | 2,119,805 | `8457d1e20830cdb86aa858cfd352ba4e2610447e5bdec53b85a290b9b3c9339a` |
| `real-sample-01` | MP3 | MP3 / MP3 | 130.540 | 1,045,484 | `30412691afe8f23a5bc047455b20f6a94848160b954999c96e1c896b830f76a7` |
| `real-sample-01` | WAV | WAV / PCM s16le | 130.540 | 4,177,358 | `b7deb789b11b45c7f2634c436f3d5c3f7b2ec4c40db830fb23c5a2584897f31c` |
| `real-sample-01` | AAC | ADTS / AAC | 130.624 | 998,401 | `c91e6bfbc2bcb26b03bcb61ca521d8532aefc561d796126ebcafd024a7ba6679` |
| `real-sample-01` | OGG | Ogg / Vorbis | 130.554 | 515,587 | `415cc2d94750c422f76f3be3a062dc90d6a102016da481607f563298a735f78f` |
| `real-sample-02` | M4A 원본 | MP4/M4A / Opus | 1,292.051 | 20,827,186 | `547e7e94576a4dcbcdb9ea83711c37f76ed2d01f7e8c001408ababcc495f2861` |
| `real-sample-02` | MP3 | MP3 / MP3 | 1,292.020 | 10,337,228 | `50bbd06d0d4824e1a2c00cd99fcf62f79b6649b34361070544c0d0205479e4b4` |
| `real-sample-02` | WAV | WAV / PCM s16le | 1,292.020 | 41,344,718 | `9fd7987c6e2654ab7e4f48881b33b29293528f949959535213d12aa40d4d8d44` |
| `real-sample-02` | AAC | ADTS / AAC | 1,292.096 | 10,452,993 | `aad85328f0f7a561ca790fe33d1549cd732bf39a1c5f4006b22c9c5fb422a7f8` |
| `real-sample-02` | OGG | Ogg / Vorbis | 1,292.026 | 5,266,936 | `e3cb2ddbddc7fd14155fed67bb2672350a6c75b53cfa1128c2d535aeda720672` |
| `real-sample-03` | M4A 원본 | MP4/M4A / Opus | 2,650.776 | 34,777,322 | `c55b2717d78b75a26295c269d96edc8dd29d792249e5b1d26988c45f31c334ae` |
| `real-sample-03` | MP3 | MP3 / MP3 | 2,650.060 | 21,201,452 | `10d2224261e173de91d4c3c5e23033e45a0ca670ae2fb35a9b84304bb6ae1719` |
| `real-sample-03` | WAV | WAV / PCM s16le | 2,650.060 | 84,801,998 | `7e9c732a263525499ac315dc7eee3e0ce91f2ba00a3ee151fc9d30019a32dc35` |
| `real-sample-03` | AAC | ADTS / AAC | 2,650.176 | 16,615,810 | `3524b5329d969e5f6f6eb21206950d411f09722bbc29c6e0d5f16ace88c3da2b` |
| `real-sample-03` | OGG | Ogg / Vorbis | 2,650.749 | 7,632,731 | `56bc982b37a2a40913e51f6f21e5bfc173964d5831770684fc65476b65c6acfa` |

AAC ADTS에는 컨테이너 수준의 duration 보고값과 디코딩된 오디오 길이가 일치하지 않는 사례가 있어, 표의 AAC 길이는 16 kHz 모노 PCM으로 디코딩한 실제 샘플 수로 계산했다. AAC는 프레임 단위 padding이 있어 원본과 수십 ms 차이가 날 수 있다. 나머지 길이는 `ffprobe` 스트림 길이다.

## 범위와 후속 검증

- 실제 출처 표본은 같은 Opus/M4A 조합에서 고른 3개뿐이다. 원본 폴더의 나머지 52개는 복사하지 않았다. 다른 기기·서비스의 포맷/코덱 변형, 손상·잘못된 확장자, 한국어 발화 인식은 별도 검증 대상이다.
- 포맷과 기본 디코딩의 기준 표본은 확보했으며 `0-BASE-01`을 완료 처리한다. 실제 발화의 STT 품질 기준 샘플은 `0-BASE-02`에서 출처·권리·SHA-256을 확인해 별도로 준비한다.
