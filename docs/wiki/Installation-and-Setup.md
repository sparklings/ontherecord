# 1. 설치 및 외부 도구 셋업 (Installation & Setup)

On the Record는 Obsidian의 보안 및 커뮤니티 정책을 100% 준수합니다.  
플러그인 자체에는 무거운 바이너리를 포함하지 않으므로, 음성 전사를 위해 로컬 PC에 세 가지 도구가 필요합니다:

1. **FFmpeg**: 회의 녹음 오디오(.m4a, .mp3, .wav 등)를 whisper.cpp 규격(16kHz 모노 PCM WAV)으로 손실 없이 정규화합니다.
2. **whisper.cpp (`whisper-cli.exe`)**: 고성능 오픈소스 C++ 음성 인식 엔진입니다.
3. **GGML 음성 모델 (`ggml-*.bin`)**: 한국어 음성을 텍스트로 변환하는 AI 모델 가중치 파일입니다.

---

## 🛠️ 방법 1: 원클릭 자동 셋업 스크립트 (가장 추천 ⭐)

초보 사용자도 명령어 한 줄로 모든 도구를 안전하게 자동 구성할 수 있습니다.

1. 플러그인 설정 화면 하단의 **[명령어 복사]** 버튼을 누릅니다.
2. **Windows PowerShell** 터미널을 실행하고 붙여넣어 실행합니다:
   ```powershell
   powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/sparklings/ontherecord/main/scripts/setup-tools.ps1 | iex"
   ```
3. 스크립트가 공식 배포본에서 안전하게 다운로드하여 다음 위치에 배치합니다:
   - 런타임: `%LOCALAPPDATA%\on-the-record-dev\runtimes\whisper.cpp-b5454-x64-cpu\Release\whisper-cli.exe`
   - 모델: `%LOCALAPPDATA%\on-the-record-dev\models\ggml-base-q5_1.bin`
   - 설정: `%LOCALAPPDATA%\on-the-record\local-settings.json`

---

## 📦 방법 2: 수동 셋업 가이드

기존에 설치된 FFmpeg나 whisper.cpp를 직접 사용하고 싶은 경우:

1. **FFmpeg 설치**:
   - `winget install Gyan.FFmpeg` 또는 공식 홈페이지에서 다운로드
2. **whisper.cpp 다운로드**:
   - [ggerganov/whisper.cpp 릴리즈](https://github.com/ggerganov/whisper.cpp/releases)에서 Windows용 바이너리 zip 다운로드
3. **모델 다운로드**:
   - [Hugging Face ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp/tree/main)에서 원하는 양자화 모델(`ggml-medium-q5_0.bin` 권장) 다운로드
4. **플러그인 설정에서 경로 지정**:
   - Obsidian `설정` → `On the Record` → `이 기기의 전사 도구 경로 및 상태`에서 각 파일의 경로를 입력합니다.
   - 올바르게 지정되면 녹색 알약 뱃지(`● 준비됨`)가 표시됩니다.
