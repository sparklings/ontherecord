# On the Record (온더레코드) 공식 위키

> **"완전한 프라이빗 환경에서 회의에만 온전히 집중하세요."**  
> **On the Record**는 클라우드 전송 없이 100% 로컬 PC에서 구동되는 **Obsidian 전용 음성 회의록 & 전사 플러그인**입니다.

---

## 🚀 빠른 시작 (Quick Start)

1. **외부 도구 준비 (FFmpeg, whisper.cpp, GGML 모델)**:
   - [설치 및 외부 도구 셋업 가이드](Installation-and-Setup)를 참고하여 3가지 도구를 준비합니다:
     - `winget install Gyan.FFmpeg`
     - [whisper.cpp 바이너리](https://github.com/ggerganov/whisper.cpp/releases) 다운로드 및 `%LOCALAPPDATA%\on-the-record\tools\` 압축 해제
     - [GGML 모델 파일](https://huggingface.co/ggerganov/whisper.cpp/tree/main) 다운로드 (`ggml-medium-q5_0.bin`)
2. **회의록 작성 및 녹음 시작**:
   - 우측 사이드바에서 `+ 새 회의록`을 클릭하거나, 단축키(`Ctrl + P` → `새 회의록 작성 및 음성 녹음 시작`)로 즉시 회의록 템플릿 생성과 녹음을 시작합니다.
3. **회의 종료 및 음성 전사**:
   - 회의가 끝나면 사이드바 또는 플로팅 인디케이터에서 **`녹음 중지`**를 클릭합니다.
   - 녹음 파일이 회의록 본문에 즉시 연결되며, 사이드바 목록의 **`대기`** 버튼을 눌러 원하는 파일만 1건씩 안전하게 음성 전사를 진행합니다.

---

## 📚 위키 목차 (Table of Contents)

- [1. 설치 및 외부 도구 셋업](Installation-and-Setup)
- [2. 회의록 녹음 및 전사 워크플로 가이드](Workflow-Guide)
- [3. 환경 설정 종합 레퍼런스](Settings-Reference)
- [4. 하드웨어 가속 및 GPU 튜닝 (CUDA / Vulkan)](Hardware-and-GPU)
- [5. 프라이버시 원칙 및 아키텍처](Architecture-and-Privacy)

---

## 🔒 핵심 가치 및 보안 철학

- **네트워크 전송 0%**: 음성 녹음 데이터와 텍스트 전사문이 외부 클라우드 서버(OpenAI, Google 등)로 단 1바이트도 유출되지 않습니다.
- **Obsidian 정책 준수**: 플러그인이 임의로 대용량 실행 파일이나 모델을 자동 다운로드하지 않으며, 사용자가 주도적으로 로컬 도구를 관리합니다.
- **비차단 백그라운드 전사**: 1시간 이상의 장시간 회의 전사 중에도 Obsidian이 멈추지 않고 다른 문서를 자유롭게 작성할 수 있습니다.
