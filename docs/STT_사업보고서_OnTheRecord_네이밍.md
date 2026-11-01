---
created: 2026-11-01
last_updated: 2026-11-01
status: final
topic:
  - 브랜드 네이밍
  - Obsidian 커뮤니티 플러그인
  - STT
source:
  - "https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json"
  - "https://docs.obsidian.md/Reference/Manifest"
  - "https://a16z.com/everything-is-recorded-now/"
author:
  - 박성원
tags:
  - 사업보고서
  - 네이밍
  - OnTheRecord
aliases:
  - On the Record 네이밍 보고서
---

# On the Record — STT 플러그인 네이밍 사업보고서

> **결정:** 제품명 `On the Record` · 플러그인 id `on-the-record` · 부제 "Local minutes for Obsidian"

## 1. 결정 요약

| 항목 | 결정 | 비고 |
|---|---|---|
| 제품명 | **On the Record** | 디렉터리 내 중복 없음(2026-11-01) |
| 플러그인 id | `on-the-record` | 소문자·하이픈만, `obsidian` 미포함, `plugin` 미종료 |
| 부제 | Local minutes for Obsidian | 화면 노출용 고정 문구 |
| 저자 표기 | SUNGWON PARK | Assistant Emily와 동일 표기(2026-11-01 변경, 기존 `Sungwon Park (SG)`) |
| 저장소 | `ontherecord` (`github.com/sparklings/ontherecord`) | 사용자가 입력하기 쉬운 주소 우선(2026-11-01 변경, 기존 `obsidian-on-the-record`) |
| 대상 | 정부기관·비영리·학교·개인 | 공공·교육 우선 |

**한 줄 근거:** 기능 설명형 이름이 포화된 시장에서, "기록"이라는 제품 본질과 '시스템 오브 레코드(System of Record)' 서사를 동시에 갖는 유일한 후보였다.

## 2. 이름을 이렇게 정한 의도

1. **시장 포지션 회피.** 경쟁 7종(Transcription, Audio Notes, Speech Kit, Advanced Audio Recorder, Dictation, Voice Scribe, Recording Minutes)은 전부 기능 설명형이다. 이름에 "전사"를 넣으면 같은 검색어에서 묻힌다. 반대로 다운로드 상위 플러그인은 Dataview·Templater·Kanban처럼 고유 브랜드어다. 이름은 브랜드, 기능은 부제, 검색어는 설명 필드로 역할을 분리했다.
2. **제품 본질과 일치.** 이 플러그인의 차별점은 전사 자체가 아니라 "녹음 → 자동 전사 → 검토 → 기록"의 완결이다. `record`는 녹음·회의록·기록물이라는 세 뜻을 동시에 덮어, 이름 하나가 제품 흐름 전체를 가리킨다.
3. **공공·교육 세그먼트 적합.** 정부기관·비영리·학교는 "기록"을 규정·감사·투명성의 언어로 쓴다. `ambient`, `agentic` 같은 유행어를 배제해 5년 뒤에도 낡지 않는 어휘를 택했다.
4. **확장 중립성.** 향후 번역·요약·화자 분리를 붙여도 이름이 범위를 제한하지 않는다. 기능 확장은 부제만 바꾸면 된다.

## 3. 활용법

| 층위 | 역할 | 실제 문구 |
|---|---|---|
| 이름 | 브랜드·기억 | On the Record |
| 부제 | 기능 즉시 전달 | Local minutes for Obsidian |
| 설명 | 검색 키워드 | 로컬 전사·회의록·STT·받아쓰기·오프라인 |

**세그먼트별 한 줄 카피**

| 대상 | 카피 |
|---|---|
| 개인 | 녹음이 끝나면 회의록이 됩니다. 외부로 나가지 않습니다. |
| 학교 | 강의를 녹음하면 검토 가능한 필기록이 남습니다. |
| 비영리 | 회의 기록을 남기되, 데이터는 기관 안에 둡니다. |
| 정부기관 | 로컬 처리·승인 후 기록·원본 보존. 감사 가능한 회의록. |
| 기업 | 코어 녹음 그대로, 추가 계정과 API 키 없이. |

**금지 표기:** `On the Record SG`(Singapore 오해), `Obsidian On the Record`(코어 기능명 혼동), `OTR`(약어 단독 사용).

## 4. 시장분석 근거 요약

| 이름 유형 | 사례(다운로드) | 시사점 |
|---|---|---|
| 기능 설명형 | Transcription(33k), Speech Kit(6.5k), Advanced Audio Recorder(5.4k), Offline Whisper(3.9k) | 검색어 경쟁 과밀. 이름만으로 차별화 불가 |
| 페르소나형 | Assistant Emily, Scribe | 저자 브랜드 자산화 가능 |
| 고유 브랜드어 | Dataview(5.2M), Templater(6.0M), Kanban(2.8M) | 상위권은 브랜드어. 설명형은 중위권에 머묾 |

**핵심 공백:** 7종 모두 "코어 Audio recorder 산출물 자동 감지 + 관리형 로컬 런타임 + 승인 후 기록"의 조합을 갖추지 못했다. 이름은 이 공백을 가리키도록 `record`를 축으로 삼았다.

## 5. 네이밍 리스크

| 리스크 | 내용 | 영향 | 완화 |
|---|---|---|---|
| 의미 오해 | "녹음 동의를 받는 도구"로 읽힘 | 중 | 부제 `Local minutes` 고정, 첫 문단에서 자동 전사 명시 |
| 다의성 | record = 녹음/기록/음반 | 중 | 설명 필드에 전사·회의록 키워드 병기 |
| 상표 | 동명 미디어·팟캐스트 프로그램 다수 | 중 | 소프트웨어 류(9·42류) 상표 검색 후 로고·디자인 차별화. 미확인 상태 |
| 한국어 검색 | "온더레코드" 검색 수요 없음 | 중 | 설명에 `회의록·전사·STT·받아쓰기` 포함, README 한글 병기 |
| SG 부재 | 저자 이니셜이 제품명에 없음 | 저 | `author`, 저장소, README 제품군 표기로 커버 |
| 선점 | 유사 이름 후발 등장 | 저 | 공개 즉시 이름 고정, 디렉터리 등록 |
| 확장 | 번역·요약 추가 시 범위 축소 | 저 | 부제만 교체, 이름 유지 |

## 6. 검증 체크리스트

- [x] 디렉터리 이름·id 중복 없음 (2026-11-01 커뮤니티 목록 9,755개 기준)
- [x] id 규칙 충족 (소문자·하이픈, `obsidian` 미포함, `plugin` 미종료)
- [ ] 국내·USPTO 상표 검색 (9·42류)
- [ ] GitHub 저장소·도메인 확보
- [ ] 한국어 발음·검색 테스트 (온더레코드 / 회의록 / 전사)
- [ ] 정부·학교 조달 문의 시 "무료·로컬·오프라인" 3개 문장 준비

## 7. 다음 단계

1. `manifest.json` 고정: `id on-the-record`, `name On the Record`, `author SUNGWON PARK`, `isDesktopOnly true`.
2. README 첫 줄 확정: "Local minutes for Obsidian — 녹음이 끝나면 전사가 시작되고, 검토 후에만 기록됩니다."
3. 상표·저장소 검증 후 커뮤니티 디렉터리 제출.
4. 릴리스 후 이름 인지도보다 **부제·설명 문구의 검색 성과**를 먼저 측정한다.

---

관련 문서: [STT_회의록_커뮤니티플러그인_개발계획서.md](./STT_회의록_커뮤니티플러그인_개발계획서.md)
