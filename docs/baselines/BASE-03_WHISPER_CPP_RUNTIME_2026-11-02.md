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
| upstream 코드 라이선스 | MIT (`ggml`도 MIT); 배포 zip의 포함 구성요소·고지는 별도 확인 필요 |
| 설치 위치(저장소 밖) | `%LOCALAPPDATA%\on-the-record\runtimes\whisper.cpp-b5454-x64-cpu\Release\` |

- v1.9.x 정식 태그에는 바이너리가 없고, `b5454` 태그가 같은 커밋이면서 바이너리를 제공한다.
- zip에는 CPU 변형 `ggml-cpu-*.dll`이 여러 개 들어 있어 실행 시 CPU에 맞는 것이 선택된다.
- 이 빌드에는 GPU 백엔드가 없다(`no GPU found`). 다른 asset은 BLAS, CUDA 11.8/12.4, ARM, Win32이고 **Intel iGPU/OpenVINO 빌드는 없다**. iGPU 평가는 별도 작업이다.
- 런타임과 모델은 저장소에 포함하지 않는다(`.gitignore`의 `runtimes/`, `models/`, `ggml-*.bin`).

## 2. 모델 (측정에 사용)

Hugging Face `ggerganov/whisper.cpp`, 커밋 `5359861c739e955e79d9a303bcbc70fb988958b1`로 고정. 저장소 메타데이터는 MIT로 표시되어 있었으나, 이는 아래 개별 가중치 파일의 권리·재배포 조건을 확정하지 않는다.

| 파일 | 크기(byte) | SHA-256(앞/뒤) |
|---|---:|---|
| `ggml-base-q5_1.bin` | 59,707,625 | `422f1ae4…a8898` |
| `ggml-small-q5_1.bin` | 190,085,487 | `ae85e4a9…411bb` |

이 시험에서 사용한 가중치 파일의 정확한 출처·revision·적용 조건은 별도로 확정해야 한다. upstream 코드 또는 원 모델 계열의 라이선스만으로 변환된 모델 파일의 권리와 재배포 조건을 추정하지 않는다. 전체 해시는 각 측정 기록 JSON에 있다.

## 3. 제약 사항

- `whisper-cli`는 **flac, mp3, ogg, wav**만 읽는다. m4a/aac는 읽지 못하므로 변환기가 필요하다(0-BASE-05로 이어짐).
- 정식 릴리스 태그와 바이너리 태그가 다르므로, 플러그인 배포 시 SBOM에 두 태그와 커밋을 함께 기록한다.

## 4. 라이선스 결론

`whisper.cpp`·`ggml` upstream의 MIT 라이선스는 해당 코드에 관한 확인이며, 이 시험 바이너리의 모든 포함물이나 모델 파일의 라이선스·재배포 허가를 확정하지 않는다. 제품 배포 전 정확한 바이너리와 모델의 출처·revision·해시·구성요소·고지·재배포 조건을 확인해 SBOM에 반영해야 한다. 추가 확인 전에는 제품 배포 승인을 하지 않는다.
