# 0-BASE-05 오디오 디코더 후보 및 라이선스 검토

- **검토일:** 2026-11-02
- **상태:** 후보 및 라이선스 경로 선정 완료. 제품에 포함할 최종 실행 파일의 빌드·배포 검토는 별도 필요.

## 선정 후보

| 항목 | 결정 |
|---|---|
| 디코더 | FFmpeg command-line (`ffmpeg.exe`) |
| 소스 기준 | FFmpeg `n9.0.1` |
| 입력 | 파일 내용을 검사한 뒤 지원되는 오디오 스트림을 선택 |
| 정규화 출력 | 16 kHz, 모노, signed 16-bit PCM WAV (`pcm_s16le`) |
| 제품용 빌드 후보 | GPL·version3·nonfree 옵션과 외부 라이브러리를 사용하지 않는 FFmpeg 기본 LGPL 빌드 |
| 제품 배포 상태 | 실행 파일·고지·소스 제공 등 배포 조건 확인 전에는 번들/배포하지 않음 |

FFmpeg를 후보로 고른 이유는 이미 사용하는 환경에서 형식 시험을 수행했고, 단일 디코더로 입력 변환과 정규화를 처리할 수 있기 때문이다. `whisper-cli`는 m4a/aac를 직접 받지 않으므로 지원 입력을 공통 PCM WAV로 변환한다. 변환은 원본을 변경하지 않는 임시 출력으로 수행한다.

## Lenovo에서 확인한 처리 범위

FFmpeg 9.0.1을 사용해 입력을 모노 16 kHz PCM s16le 경로로 전체 디코딩하고, 출력은 null 대상으로 버렸다. 변환 WAV와 전사문은 만들거나 열지 않았다.

| 시험 입력 | 확인한 조합 | 결과 |
|---|---|---|
| 합성 M4A | MP4/M4A + AAC | 통과 |
| 합성 MP3 | MP3 | 통과 |
| 합성 WAV | PCM s16le | 통과 |
| 합성 AAC | ADTS + AAC | 통과 |
| 합성 OGG | Ogg + Vorbis | 통과 |
| 실제 샘플 3개 | MP4/M4A + Opus | 모두 통과 |

시험은 이 기록에 열거한 코덱 조합의 스모크 테스트이며, 해당 확장자의 모든 코덱 변형·손상 파일·대용량 경계 조건까지 지원함을 뜻하지 않는다. 상세 입력 표본과 해시는 [0-BASE-01 기록](./BASE-01_AUDIO_FORMAT_FIXTURES_2026-11-02.md)에 있다.

## 버전과 라이선스

### 업스트림

FFmpeg `n9.0.1`의 [`LICENSE.md`](https://github.com/FFmpeg/FFmpeg/blob/n9.0.1/LICENSE.md)는 대부분의 코드에 **LGPL 2.1 이상**을 적용한다고 설명한다. GPL 구성 요소는 기본적으로 사용되지 않으며 `--enable-gpl`로 활성화할 때 빌드의 라이선스가 GPL 2 이상으로 바뀐다. `--enable-version3`는 LGPL/GPL 버전을 3으로 올리고, `--enable-nonfree` 빌드는 재배포할 수 없다고 명시한다. 일부 외부 라이브러리도 최종 바이너리의 라이선스에 영향을 줄 수 있다.

따라서 제품용 후보는 기능에 필요한 FFmpeg 내장 demuxer/decoder와 PCM WAV 출력만 구성하고, `--enable-gpl`, `--enable-version3`, `--enable-nonfree` 및 외부 라이브러리를 제외한 LGPL 기본 빌드로 한정한다. 실제 배포 전에는 완성 바이너리의 `-version`/build configuration, 구성 요소와 저작권 고지, 정확한 소스 revision·해시, 해당 라이선스가 요구하는 소스·재빌드 제공 조건을 다시 확인한다. MIT 플러그인 라이선스만으로 FFmpeg 바이너리의 조건이 충족되는 것은 아니다.

### 현재 개발 PC에 설치된 파일

Lenovo에서 시험한 파일은 Gyan.dev의 FFmpeg `9.0.1-essentials_build`이며 build configuration에 `--enable-gpl --enable-version3`가 포함되어 있고 `ffmpeg -L`은 GPL v3를 표시한다. 이 파일은 시험 전용이며 위의 제품용 LGPL 후보가 아니다. 해당 실행 파일의 SHA-256은 `fd4b7e6286ab60a2444932e3889a4e78c8c0cadf3bf2caa3efcede54de4b334c`이다. 이 해시는 개발 PC의 파일만 식별하며 제품 바이너리를 고정하지 않는다.

## 남은 제품화 조건

- LGPL 구성으로 만든 정확한 Windows x64 실행 파일을 정하고, build configuration과 SHA-256을 기록한다.
- 해당 바이너리와 고지·소스 제공 방식에 대한 배포 검토를 완료한다. Obsidian 디렉터리 정책상 플러그인이 자체적으로 외부 런타임/의존성을 설치·업데이트하는 방식이 허용되는지도 별도 결정한다.
- 지원 입력은 확장자 이름이 아니라 컨테이너와 실제 오디오 코덱 검사 결과를 기준으로 제한한다. 미지원/손상 입력은 구체적인 실패 사유를 표시한다.

## 참고

- [FFmpeg 9.0.1 LICENSE.md](https://github.com/FFmpeg/FFmpeg/blob/n9.0.1/LICENSE.md)
- [0-BASE-01 오디오 형식 시험 표본](./BASE-01_AUDIO_FORMAT_FIXTURES_2026-11-02.md)
- [0-BASE-03 whisper.cpp CPU 런타임](./BASE-03_WHISPER_CPP_RUNTIME_2026-11-02.md)
- [Obsidian 디렉터리 정책 검토](../research/Obsidian_디렉터리정책_상충검토.md)
