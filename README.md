# On the Record (STT 회의록 Obsidian 플러그인)

Local minutes for Obsidian. Obsidian 데스크톱용 커뮤니티 플러그인 프로젝트이다. 플러그인 id는 `on-the-record`이다. 녹음 오디오를 로컬에서 전사하고, 전사 결과를 검토한 뒤 노트에 반영한다.

## 현재 상태

개발계획 단계이다. 구현된 코드는 없다. 기능은 아래 단계별로 개발하며, 각 단계의 결과는 [CHANGELOG.md](./CHANGELOG.md)에 기록한다.

## 개요

- Obsidian 코어 Audio recorder가 만든 녹음 파일, 또는 사용자가 선택한 오디오 파일을 전사한다.
- 전사는 사용자 PC에서 `whisper.cpp`로 실행한다. 오디오와 노트 내용을 외부로 전송하지 않는다.
- 전사 결과는 사용자가 검토하고 승인한 뒤 노트에 삽입한다.
- 지원 대상은 Obsidian Desktop(Windows x64)이다. 모바일, macOS, Linux는 지원하지 않는다.
- 전사 엔진 실행 파일과 모델은 vault 밖의 사용자별 데이터 디렉터리에 설치한다.

## 단계별 개발 기능

각 단계의 상세 내용은 [개발계획서](./docs/STT_회의록_커뮤니티플러그인_개발계획서.md)를 따른다. 단계별 작업 항목은 [TODO.md](./TODO.md)에 기록한다.

| 단계 | 개발 기능 |
|---|---|
| 0. 기준선 | 오디오 입력 형식 표본 수집, `whisper.cpp` CPU 전사의 처리 속도·메모리 측정, Obsidian 공개 API로 녹음 산출물을 감지할 수 있는지 검증 |
| 1. 공통 파이프라인 | 플러그인 설정 화면, 녹음 파일 감지, 파일 찾기 버튼, provider 계약, 결과 미리보기 |
| 2. CPU 전사 | `whisper.cpp` CPU 런타임·모델 설치, 오디오 변환, 자동 전사 시작, segment timestamp 출력, 전사문 검색 |
| 3. GPU 검증 | NVIDIA CUDA, Intel GPU provider의 속도·메모리 측정. 측정 결과로 배포 여부 결정 |
| 4. 분석 기능 검증 | 단어 정렬, 고유명사 후보 추출, 화자 분리, 환경음 분석을 각각 별도로 평가 |
| 5. 분석 기능 통합 | 4단계에서 검증된 기능만 통합 |
| 6. 프로필 확장 | 회의 유형별 프로필, 용어집, 노트 템플릿 |

## 지원 입력 형식

`.m4a`, `.mp3`, `.wav`, `.aac`, `.ogg`. 파일 시그니처와 코덱을 검사하고, 지원하지 않는 파일은 사유를 표시한다.

## 범위 밖

- 오디오 녹음 기능 구현
- 클라우드 전사, 외부 API 업로드
- 전사 직후 노트 자동 덮어쓰기
- 화자 실명 확정, 음향 기반 장소·상황 판정

## 개발 환경

- 작업 폴더(개발자 개인 환경): OneDrive `STT` 폴더. 개발자의 여러 PC에서 동기화하며 한 번에 한 PC에서만 작업한다. 사용자에게 요구하는 환경이 아니다.
- 시험 환경: 개발 PC 2대(Windows 11 x64). CPU, 내장 GPU, NVIDIA GPU 구성이 서로 다르다. 사양은 [Samsung](./benchmarks/hardware/systeminfo_Samsung_960XFG.md), [Lenovo](./benchmarks/hardware/systeminfo_Lenovo_IdeaPad_Gaming3.md) 문서에 있다.
- 시험 볼트(개발자 개인 환경): 업무용 볼트와 분리한 `PlugVaults` 볼트에 배포해 시험한다.
- 이 플러그인은 사용자가 vault를 어떤 방식으로 동기화하는지(동기화 서비스 종류, 동기화 여부)를 가정하지 않는다.

## 문서

- [개발계획서](./docs/STT_회의록_커뮤니티플러그인_개발계획서.md)
- [CHANGELOG.md](./CHANGELOG.md): 작업 기록
- [TODO.md](./TODO.md): 할 일 목록
- [GLOSSARY.md](./GLOSSARY.md): 용어 정의
- [SETTINGS_DESIGN.md](./SETTINGS_DESIGN.md): 설정 저장 구조
- [HARDWARE_PROFILE.md](./HARDWARE_PROFILE.md): 하드웨어 프로필·측정 기록 형식

## 라이선스

미정. 제공 대상을 소속 회사 구성원으로 한정하고 무료로 제공하는 방식을 계획한다. 대상 그룹사·계열사·관계사는 회사명을 명시해 기록한다. 라이선스 전문과 대상 회사 목록은 확정 후 이 문서와 저장소의 `LICENSE` 파일에 기재한다.
