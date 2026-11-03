# 시스템 정보

STT(Speech-to-Text) 파이프라인 구성 전 현재 노트북의 하드웨어와 관련 소프트웨어 환경을 기록합니다.

- **수집일:** 2026-10-30
- **수집 방법:** Windows 시스템 정보와 현재 셸에서 확인 가능한 런타임·도구. GPU는 2026-11-02에 `Get-CimInstance Win32_VideoController | Select Name,DriverVersion,AdapterRAM,PNPDeviceID`로 재확인했습니다.
- **개인정보:** 사용자 이름, 일련번호 등 식별 정보는 기록하지 않았습니다.

## 하드웨어

| 항목 | 정보 |
|---|---|
| 제조사 / 모델 | Samsung 960XFG |
| CPU | 13th Gen Intel Core i5-1340P |
| CPU 코어 / 논리 프로세서 | 12코어 / 16개 |
| CPU 속도 (시스템 보고값) | 1,900 MHz |
| 메모리 | 16 GB LPDDR5, 구성 속도 6,000 MHz (시스템 보고값) |
| GPU | Intel Iris Xe Graphics (내장 그래픽) |
| 그래픽 드라이버 | 32.0.101.7088 |
| 그래픽 메모리 | CIM `AdapterRAM`: 2,147,479,552 bytes (약 2 GiB로 보고됨). 내장 그래픽의 공유 메모리이므로 전용 VRAM 용량으로 간주하지 않습니다. |
| GPU PNP 식별자 | `VEN_8086&DEV_A7A0` (일련 부분 제외) |

## 운영체제 및 개발 환경

| 항목 | 정보 |
|---|---|
| 운영체제 | Windows 11 Pro, 64비트 |
| OS 버전 / 빌드 | 10.0.26300 / 26300 |
| PowerShell | 5.1.26100.9711 |
| Python | 3.14.7, 64비트 |
| ONNX Runtime | 1.30.0 |
| ONNX Runtime 실행 공급자 | AzureExecutionProvider, CPUExecutionProvider |
| FFmpeg | 9.0.1 |

현재 Python 환경에서는 `torch`, `faster-whisper`, `whisper` 패키지를 찾지 못했습니다. `nvidia-smi`와 `nvcc`도 PATH에서 확인되지 않았으며, ONNX Runtime에서 CUDA나 DirectML 실행 공급자는 확인되지 않았습니다.

## 오디오 장치

Windows에서 인식된 사운드 장치:

- Intel Smart Sound Technology for Digital Microphones
- USB 오디오 장치
- Realtek High Definition Audio
- Intel Smart Sound Technology for Bluetooth Audio

장치 목록만 확인했으며, 실제 마이크 입력이나 녹음 품질은 테스트하지 않았습니다.

## 저장 공간

| 드라이브 | 파일 시스템 | 전체 용량 | 여유 공간 | 비고 |
|---|---|---:|---:|---|
| C: | NTFS | 약 475.8 GiB | 약 301.0 GiB | Windows 로컬 드라이브 |
| G: | FAT32 | 약 475.8 GiB | 약 285.9 GiB | Google Drive로 표시됨; 로컬 디스크 용량으로 계산하지 않음 |

## STT 구성 시 참고

- 확인된 실행 환경은 CPU 중심입니다. 로컬 추론 속도가 중요하다면, 먼저 작은 모델로 실제 오디오를 처리해 속도와 메모리 사용량을 측정하는 편이 좋습니다.
- 16 GB 메모리와 내장 그래픽을 고려해 모델 크기와 동시 처리량을 정하고, 필요하면 클라우드 추론도 비교합니다.
- Python 3.14에서 원하는 STT 라이브러리와 가속 백엔드가 지원되는지 구성 시점에 확인하고, 필요하면 해당 프로젝트가 지원하는 Python 버전을 별도 가상 환경에 사용합니다.
- 마이크 장치가 인식되는 것과 STT 프로그램에서 캡처할 수 있는 것은 별개이므로, 파이프라인을 만들 때 녹음 입력 테스트가 필요합니다.
