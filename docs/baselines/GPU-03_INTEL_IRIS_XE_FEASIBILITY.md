# 3-GPU-03: Intel Iris Xe 내장 GPU 가속 가능성 기술 조사 보고서

- **작성일자**: 2026-11-19
- **대상 기기**: Samsung Galaxy Book Pro / Pro 360 (NT930XDB / NT960XFG 시리즈)
- **대상 하드웨어**: Intel Core i7-1165G7 / i7-1360P, Intel(R) Iris(R) Xe Graphics (80 / 96 Execution Units)
- **OS 환경**: Windows 11 Home 64-bit (OS 빌드 26100), Vulkan 인스턴스 1.4.304.0
- **상태**: 기술 검토 완료 (Vulkan 백엔드 채택 권고)

---

## 1. 개요 및 조사 배경

On the Record의 기본 전사 엔진은 Windows x64 CPU 전용 빌드(`whisper.cpp b5454`)를 채택하여 높은 호환성과 무설치 편의성을 확보했습니다. 그러나 1시간 이상의 장시간 회의 전사 시 CPU 8스레드 100% 점유로 인한 **(1) CPU 고열 및 쿨링 팬 소음**, **(2) 배터리 소모 급증**, **(3) 상위 고품질 모델(`medium`, `large-v3`)의 처리 시간 지연(44분~110분)**이 관찰되었습니다.

이에 따라 외장 GPU(NVIDIA CUDA)가 탑재되지 않은 슬림 노트북(삼성 갤럭시북 등) 환경에서 시스템에 내장된 **Intel Iris Xe 내장 그래픽스(iGPU)**를 활용해 전사 속도를 가속하고 CPU 부하를 분산시킬 수 있는지 기술적 실현 가능성(Feasibility) 및 런타임 종속성을 심층 조사했습니다.

---

## 2. Intel Iris Xe 하드웨어 아키텍처 특성

Intel Iris Xe Graphics(Tiger Lake 11세대 및 Raptor Lake 13세대)는 이전 세대 UHD Graphics 대비 괄목할 만한 연산 능력 향상을 보이지만, 음성 인식 모델(Transformer) 구동 시 다음과 같은 하드웨어적 제약과 특성을 갖습니다:

1. **연산 코어 (Execution Units)**:
   - 80 ~ 96 EU (약 640 ~ 768 ALU 연산 파이프라인).
   - 단정밀도(FP32) 연산 성능: 약 1.5 ~ 2.2 TFLOPS. (NVIDIA GTX 1650 Ti의 약 3.0 TFLOPS 대비 약 50~70% 수준)
2. **통합 메모리(UMA) 구조 및 대역폭 병목**:
   - 독립된 전용 VRAM(GDDR6)이 없으며, 시스템 LPDDR4x/DDR5 메모리를 CPU와 동적으로 공유합니다.
   - 메모리 버스 대역폭: 약 68 GB/s (LPDDR4x-4266 듀얼 채널 기준).
   - Whisper의 Autoregressive 디코딩(Token-by-Token 생성) 단계는 **메모리 대역폭 의존적(Memory-Bound)**이므로, 순수 TFLOPS 연산 가속보다 메모리 전송 속도에 의해 최대 처리율이 제한됩니다.
3. **가속 기대 효과**:
   - 속도 향상: CPU 8스레드 대비 약 1.3배 ~ 1.8배 수준의 처리 시간 단축 예상.
   - 체감 효과: CPU 점유율이 100%에서 15~25% 수준으로 급감하여 시스템 쿨링 팬 소음 및 스로틀링(Throttling) 현상이 획기적으로 완화됨.

---

## 3. 가속 백엔드 후보 비교 분석

Intel Iris Xe를 구동하기 위한 whisper.cpp의 대표적인 백엔드 후보 2종(Vulkan vs OpenVINO)을 비교 검토했습니다.

| 항목 | 후보 A: Vulkan 백엔드 (`ggml-vulkan`) | 후보 B: OpenVINO 백엔드 (`-oved GPU`) |
| :--- | :--- | :--- |
| **핵심 기술** | Vulkan 1.2+ Compute Shader (SPIR-V) | Intel OpenVINO Toolkit Inference Engine |
| **OS 내장 여부** | **기본 내장** (`C:\Windows\System32\vulkan-1.dll`) | 미내장 (별도 런타임 설치 필수) |
| **필요 추가 DLL** | **0개** (단일 실행 파일로 구동 가능) | **10개 이상** (`openvino.dll`, `tbb.dll` 등 150MB+) |
| **모델 파일 호환성** | **100% 원본 호환** (기존 GGML `q5_0`, `q5_1` 즉시 사용) | **변환 필수** (OpenVINO IR XML/BIN 모델 별도 필요) |
| **오프로드 범위** | Transformer 전체 레이어 오프로드 (`-ngl 99`) | 인코더(Encoder) 위주 오프로드 (`-oved GPU`) |
| **드라이버 안정성** | 표준 그래픽 드라이버 내장 Vulkan 1.4 활용 (우수) | OpenVINO 런타임 버전과 GPU 드라이버 버전 불일치 위험 |
| **Obsidian 정책 적합성** | **완전 부합** (추가 무거운 바이너리 다운로드 불필요) | 부적합 (대용량 런타임 및 모델 변환 도구 요구) |
| **다중 플랫폼 확장성** | Intel, AMD, NVIDIA, Qualcomm 등 통합 지원 | Intel 하드웨어 전용 |

### 3.1. Vulkan 백엔드 (`ggml-vulkan`)의 이점
- **시스템 레벨 완벽 지원**: 삼성 노트북 실기 확인 결과, Windows 11 기본 환경에 Vulkan 1.4 인스턴스(`vulkaninfo.exe 1.4.304.0`) 및 런타임 드라이버가 이미 완벽하게 로드되어 있습니다.
- **Zero-Conversion (모델 변환 불필요)**: 기존에 Hugging Face에서 내려받은 `base-q5_1`, `small-q5_1`, `medium-q5_0` 등의 GGML 바이너리를 단 1바이트의 변환이나 포맷 변경 없이 그대로 GPU VRAM 영역에 오프로드(`-ngl 99`)할 수 있습니다.
- **경량 바이너리**: whisper-cli 실행 파일만 Vulkan 활성화 빌드로 교체하면 추가 DLL 번들이 전혀 필요 없습니다.

### 3.2. OpenVINO 백엔드의 치명적 한계
- whisper.cpp의 OpenVINO 지원은 주로 Whisper의 **인코더(Encoder) 가속**에 국한되며, 디코더는 여전히 CPU에서 동작합니다.
- OpenVINO 모델을 준비하려면 Python 환경에서 `openvino-dev` 패키지를 이용해 Hugging Face PyTorch 가중치를 IR(`.xml`, `.bin`) 형식으로 컴파일하는 복잡한 전처리 과정이 수반됩니다.
- 이는 일반 Obsidian 사용자를 위한 "순수 로컬·무설치·초간편" 제품 철학과 정면으로 배치됩니다.

---

## 4. 최종 결론 및 권고안 (Actionable Recommendation)

1. **내장 GPU 공식 가속 백엔드로 Vulkan(`ggml-vulkan`) 선정**:
   - Intel Iris Xe 및 AMD Radeon 내장 그래픽 환경을 위한 whisper.cpp 가속 백엔드는 **Vulkan**으로 최종 확정합니다.
2. **소프트웨어 인터페이스 추상화 완료 (3-GPU-01, 3-GPU-02 연계)**:
   - `src/provider.ts`: `ProviderDevice`에 `"vulkan"` 공식 추가 (`"cpu" | "cuda" | "openvino" | "vulkan"`).
   - `src/settings.ts`: 머신별 `LocalSettings`에 `gpuBackend`, `gpuLayers`, `gpuDeviceId` 지원 완료.
   - `src/whisperCppCpu.ts`: `buildWhisperInferenceArgs`에서 GPU 오프로드 파라미터(`-ngl 99`, `-dev 0`, `-ng`) 연동 완료.
   - `src/settingsTab.ts`: 사용자 설정 화면에서 백엔드 드롭다운 및 레이어 수 조절 UI 제공.
3. **향후 단계별 실행 계획**:
   - **1단계 (레노버 외장 GPU 검증)**: NVIDIA GTX 1650 Ti 환경에서 CUDA 가속 실측 수행 (`3-GPU-01`, `3-GPU-02`).
   - **2단계 (Iris Xe Vulkan 실측 검증)**: 공식 배포된 `whisper-bin-vulkan-x64.zip`을 삼성 노트북에 배치하고, `BASE-06` 벤치마크 샘플을 대상으로 CPU 대비 속도 배율 및 VRAM 점유율 측정.
   - **3단계 (셋업 도우미 확장)**: `setup-tools.ps1`에 사용자가 원할 경우 `-Backend vulkan` 플래그를 통해 Vulkan 런타임을 간편하게 선택 설치할 수 있는 옵션 제공.
