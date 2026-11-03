# 시스템 정보

STT(Speech-to-Text) 파이프라인 구성을 위해 현재 노트북의 하드웨어와 소프트웨어 개발 환경을 기록합니다.

- **수집일:** 2026-11-02 (하드웨어·OS·현재 개발 도구 재확인)
- **수집 방법:** Windows WMI, `nvidia-smi`, 현재 PATH에서 확인 가능한 도구
- **개인정보:** 사용자 이름과 장치 일련번호는 기록하지 않았습니다.

## 하드웨어

| 항목 | 정보 |
|---|---|
| 제조사 / 모델 | Lenovo IdeaPad Gaming 3 15IMH05 (모델 코드 81Y4) |
| CPU | Intel Core i7-10750H @ 2.60 GHz |
| CPU 코어 / 논리 프로세서 | 6코어 / 12개 |
| 메모리 | 16 GB, 시스템 보고 속도 2,933 MHz |
| GPU 1 | Intel UHD Graphics, 드라이버 27.20.100.9664 |
| GPU 2 | NVIDIA GeForce GTX 1650 Ti, 전용 메모리 4 GB (`nvidia-smi` 4096 MiB), Windows 드라이버 32.0.15.8088 (`nvidia-smi` 580.88) |
| BIOS | Lenovo EGCN39WW (2022-09-05) |

## 운영체제 및 개발 환경

| 항목 | 정보 |
|---|---|
| 운영체제 | Windows 11 Pro, 64비트 |
| OS 버전 / 빌드 | 10.0.26300 / 26300 |
| PowerShell | 5.1.26100.6899 |
| Python (기본 실행 환경) | 3.12.0, 64비트 |
| Python (uv 설치) | 3.14.4, 64비트 |
| FFmpeg | 9.0.1 (essentials build) |
| Git | 2.40.1.windows.1 |
| Node.js / npm | 22.16.0 / 11.4.2 |
| Visual Studio Code | 1.144.0, x64 |
| .NET | 런타임 8.0.33 설치됨; SDK는 확인되지 않음 |

Java, Go, Rust 컴파일러와 CUDA Toolkit의 `nvcc`는 현재 PATH에서 확인되지 않았습니다. `nvidia-smi`로 GTX 1650 Ti 및 NVIDIA 드라이버(580.88)는 확인됩니다.

두 Python 환경(3.12.0 및 3.14.4)에서 `onnxruntime`, `torch`, `faster-whisper`, `whisper`, `sounddevice`, `pyaudio` 모듈은 확인되지 않았습니다. 따라서 현재 확인한 Python 환경에는 STT 추론 패키지와 Python 오디오 입력 패키지가 설치되어 있지 않습니다.

## 오디오 장치

Windows에서 사용 가능한 상태로 표시된 오디오 장치:

- 스피커, 마이크, 헤드폰, 외부 마이크 (Realtek Audio)
- LG QHD 모니터 오디오 (NVIDIA High Definition Audio)
- Intel 디스플레이 오디오

장치 인식 상태만 확인했으며, 실제 마이크 녹음이나 입력 품질은 테스트하지 않았습니다.

## 저장 공간

| 드라이브 | 파일 시스템 | 전체 용량 | 여유 공간 | 비고 |
|---|---|---:|---:|---|
| C: | NTFS | 약 475.3 GiB | 약 46.4 GiB | NVMe SSD (시스템 보고 모델: MTros SSD; 2026-11-02 확인) |

현재 Windows에서 논리 드라이브로 확인된 항목은 C:뿐입니다.

## STT 구성 시 참고

- GTX 1650 Ti와 NVIDIA 드라이버는 확인되지만, CUDA Toolkit의 `nvcc`는 확인되지 않았습니다. 실제 CUDA 추론 지원 여부는 선택한 라이브러리·드라이버 조합으로 별도 검증해야 합니다.
- 16 GB 메모리를 고려해 모델 크기와 동시 처리량을 정하고, CPU와 GPU에서 작은 모델을 각각 시험해 실제 속도와 메모리 사용량을 비교하는 것이 좋습니다.
- 기본 Python은 3.12.0이며 별도로 3.14.4도 설치되어 있습니다. STT 라이브러리와 GPU 백엔드의 Python 버전 지원 여부를 확인한 뒤 프로젝트별 가상 환경을 사용하는 것이 좋습니다.
- 마이크 장치가 인식되는 것과 STT 프로그램에서 오디오를 캡처할 수 있는 것은 별개이므로, 파이프라인 구성 시 녹음 입력 테스트가 필요합니다.
