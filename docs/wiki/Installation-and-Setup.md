# 1. 설치 및 외부 도구 준비 (Installation & Setup)

On the Record는 Obsidian 커뮤니티 플러그인 정책을 준수하기 위해 실행 파일이나 AI 모델을 플러그인 내부에 포함하거나 자동 다운로드·설치하지 않습니다.  
로컬 음성 전사를 사용하려면 PC에 아래 세 가지 도구를 직접 준비한 뒤 플러그인 설정에서 경로를 연결해야 합니다.

1. **FFmpeg**: 오디오 파일(`.m4a`, `.mp3`, `.wav`, `.aac`, `.ogg`)을 `whisper.cpp` 규격(16 kHz 모노 PCM WAV)으로 변환합니다.
2. **whisper.cpp (`whisper-cli.exe`)**: 로컬 CPU/GPU 음성 인식 실행 파일입니다.
3. **GGML 음성 모델 (`ggml-*.bin`)**: 전사에 사용되는 양자화 Whisper 모델 파일입니다.

---

## 표준 설치 절차 (Windows x64)

### 1단계: FFmpeg 설치
Windows PowerShell 또는 터미널에서 `winget`으로 설치하거나 공식 배포본을 내려받습니다:
```powershell
winget install Gyan.FFmpeg
```

### 2단계: `whisper.cpp` 런타임 준비
1. [ggerganov/whisper.cpp Releases](https://github.com/ggerganov/whisper.cpp/releases)에서 Windows x64용 바이너리 압축 파일(`whisper-bin-x64.zip`, 기준 버전 `b5454` / `v1.9.5`)을 다운로드합니다.
2. 권장 폴더(`%LOCALAPPDATA%\on-the-record\tools\`) 또는 원하는 로컬 폴더에 압축을 해제합니다. (`whisper-cli.exe` 확인)

### 3단계: GGML 모델 다운로드
1. [Hugging Face ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp/tree/main)에서 모델 파일을 다운로드합니다.
   - **기본 권장 모델**: `ggml-medium-q5_0.bin` (514 MB)
   - 경량 모델: `ggml-small-q5_1.bin` (466 MB) / `ggml-base-q5_1.bin` (148 MB)
2. 권장 폴더(`%LOCALAPPDATA%\on-the-record\models\`)에 저장합니다.

### 4단계: 플러그인 설정에서 경로 연결
1. Obsidian **설정 → On the Record → 전사 & 모델** 탭으로 이동합니다.
2. **`[도구 검색]`** 버튼을 눌러 알려진 로컬 폴더에서 도구를 자동 탐지·적용하거나, 각 항목 옆의 **`[찾아보기]`** 버튼으로 파일 경로를 직접 지정합니다.
3. 상단 **도구 준비 상태** 배너에서 `FFmpeg`, `whisper-cli`, `Model` 3개 항목이 모두 녹색으로 표시되면 **`[시험 시작]`** 버튼으로 동작을 확인합니다.

---

## 참고: 저장소 내 로컬 셋업 스크립트
소스를 직접 클론한 개발 환경에서는 저장소에 포함된 [`scripts/setup-tools.ps1`](../../scripts/setup-tools.ps1) 스크립트를 로컬에서 직접 실행하여 기준 도구를 구성할 수 있습니다.
