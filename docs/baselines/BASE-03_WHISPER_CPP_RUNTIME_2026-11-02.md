# 0-BASE-03: whisper.cpp Windows x64 CPU 배포본 선정 및 라이선스 확인

작성일: 2026-11-02

## 1. 선정 결과

| 항목 | 값 |
|---|---|
| 프로젝트 | `ggml-org/whisper.cpp` |
| 버전 | v1.9.5 (2026-10-06), 커밋 `d1be6fde11ac6e0407606b4e42fe72d34add8037` |
| 배포본 | pre-release 태그 `b5454`의 `whisper-bin-x64.zip` (CPU 전용, 공식 빌드) |
| zip SHA-256 | `6ba69e3482d7826214f90a6a9c84ca07782aec1e1d0c6a7c30c994fd5d816ccb` |
| `whisper-cli.exe` SHA-256 | `331dba46d6427105d2b802cdbc7eae916ea1c5abf9b0d3b5cfe460d8db8e4366` |
| 라이선스 | MIT (`ggml`도 MIT) |
| 설치 위치(저장소 밖) | `%LOCALAPPDATA%\on-the-record-dev\runtimes\whisper.cpp-b5454-x64-cpu\Release\` |

- v1.9.x 정식 태그에는 바이너리가 없고, `b5454` 태그가 같은 커밋이면서 바이너리를 제공한다.
- zip에는 CPU 변형 `ggml-cpu-*.dll`이 여러 개 들어 있어 실행 시 CPU에 맞는 것이 선택된다.
- 이 빌드에는 GPU 백엔드가 없다(`no GPU found`). 다른 asset은 BLAS, CUDA 11.8/12.4, ARM, Win32이고 **Intel iGPU/OpenVINO 빌드는 없다**. iGPU 평가는 별도 작업이다.
- 런타임과 모델은 저장소에 포함하지 않는다(`.gitignore`의 `runtimes/`, `models/`, `ggml-*.bin`).

## 2. 모델 (측정에 사용)

Hugging Face `ggerganov/whisper.cpp`, 커밋 `5359861c739e955e79d9a303bcbc70fb988958b1`로 고정. 저장소 라이선스 MIT.

| 파일 | 크기(byte) | SHA-256(앞/뒤) |
|---|---:|---|
| `ggml-base-q5_1.bin` | 59,707,625 | `422f1ae4…a8898` |
| `ggml-small-q5_1.bin` | 190,085,487 | `ae85e4a9…411bb` |

모델 가중치의 원 출처(OpenAI Whisper, MIT)와 배포 파일 기준 고정이 필요하다는 0-ENV-10의 조건은 그대로 유지한다. 전체 해시는 각 측정 기록 JSON에 있다.

## 3. 제약 사항

- `whisper-cli`는 **flac, mp3, ogg, wav**만 읽는다. m4a/aac는 읽지 못하므로 변환기가 필요하다(0-BASE-05로 이어짐).
- 정식 릴리스 태그와 바이너리 태그가 다르므로, 플러그인 배포 시 SBOM에 두 태그와 커밋을 함께 기록한다.

## 4. 라이선스 결론

`whisper.cpp`·`ggml` MIT, 모델 저장소 MIT로 MIT 공개와 충돌하지 않는다. 번들 DLL의 추가 라이선스 파일과 배포 시 고지문은 배포 단계(SBOM)에서 재확인한다.
