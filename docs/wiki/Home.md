# On the Record (온더레코드) 공식 위키

> **"완전한 프라이빗 환경에서 회의에만 온전히 집중하세요."**  
> **On the Record**는 클라우드 전송 없이 100% 로컬 PC에서 구동되는 **Obsidian 전용 음성 회의록 & 전사 플러그인**입니다.

---

## 🚀 빠른 시작 (Quick Start)

1. **외부 도구 원클릭 셋업**:
   - 플러그인 설정 화면 하단의 **[명령어 복사]** 버튼을 누르거나,
   - Windows PowerShell 터미널에서 다음 명령어를 실행합니다:
     ```powershell
     powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/sparklings/ontherecord/main/scripts/setup-tools.ps1 | iex"
     ```
2. **회의록 작성 및 녹음 시작**:
   - 회의록 마크다운 노트를 생성하거나 열면 녹음이 준비됩니다.
   - 단축키 또는 명령 팔레트(`Ctrl + P`)에서 **`현재 활성 노트에서 음성 녹음 시작`**을 실행합니다.
3. **회의 종료 및 자동 전사**:
   - 회의가 끝나면 **`음성 녹음 중지`**를 실행하거나, 실수로 노트 탭을 닫아도 자동으로 안전하게 오디오가 연결됩니다.
   - 백그라운드 큐가 작동하여 Obsidian 작업을 방해하지 않고 조용히 전사를 완료하고 본문에 반영합니다.

---

## 📚 위키 목차 (Table of Contents)

- [[Installation-and-Setup|1. 설치 및 외부 도구 셋업]]
- [[Workflow-Guide|2. 회의록 녹음 및 전사 워크플로 가이드]]
- [[Settings-Reference|3. 환경 설정 종합 레퍼런스]]
- [[Hardware-and-GPU|4. 하드웨어 가속 및 GPU 튜닝 (CUDA / Vulkan)]]
- [[Architecture-and-Privacy|5. 프라이버시 원칙 및 아키텍처]]

---

## 🔒 핵심 가치 및 보안 철학

- **네트워크 전송 0%**: 음성 녹음 데이터와 텍스트 전사문이 외부 클라우드 서버(OpenAI, Google 등)로 단 1바이트도 유출되지 않습니다.
- **Obsidian 정책 준수**: 플러그인이 임의로 대용량 실행 파일이나 모델을 자동 다운로드하지 않으며, 사용자가 주도적으로 로컬 도구를 관리합니다.
- **비차단 백그라운드 전사**: 1시간 이상의 장시간 회의 전사 중에도 Obsidian이 멈추지 않고 다른 문서를 자유롭게 작성할 수 있습니다.
