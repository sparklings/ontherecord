# 문서 안내

문서는 목적별 폴더에 둔다. 새 문서를 추가할 때 가장 가까운 분류에 넣고, 이 목록에 한 줄을 추가한다.

| 폴더 | 용도 | 주요 문서 |
|---|---|---|
| [`design/`](./design/) | 제품 계획·설계 및 공통 형식 | [개발계획서](./design/OntheRecord_회의록_커뮤니티플러그인_개발계획서.md), [설정 설계](./design/SETTINGS_DESIGN.md), [용어집](./design/GLOSSARY.md), [하드웨어 프로필 형식](./design/HARDWARE_PROFILE.md) |
| [`baselines/`](./baselines/) | 날짜가 있는 기준선·시험 결과 | [오디오 표본](./baselines/BASE-01_AUDIO_FORMAT_FIXTURES_2026-11-02.md), [한국어 회의 샘플](./baselines/BASE-02_KOREAN_MEETING_SAMPLES_2026-11-02.md), [whisper.cpp](./baselines/BASE-03_WHISPER_CPP_RUNTIME_2026-11-02.md), [처리율 측정](./baselines/BASE-04_THROUGHPUT_MEASUREMENT_2026-11-02.md), [오디오 디코더](./baselines/BASE-05_AUDIO_DECODER_2026-11-02.md), [상위 모델 측정](./baselines/BASE-06_LARGER_MODELS_2026-11-03.md), [1시간 회의 소요 집계표](./baselines/BASE-09_ONE_HOUR_MEETING_TIME_2026-11-03.md), [Samsung GPU 확인](./baselines/HARDWARE_CHECK_SAMSUNG_960XFG_2026-11-02.md), [Audio recorder 이벤트 감지](./baselines/OBS-01_AUDIO_RECORDER_EVENT_PROBE_2026-11-02.md), [파일 안정화 감지](./baselines/OBS-02_FILE_STABILITY_2026-11-03.md), [노트 링크 삽입 시점](./baselines/OBS-03_AUDIO_NOTE_LINK_TIMING_2026-11-05.md) |
| [`research/`](./research/) | 정책·라이선스·이름 조사 자료 | [Obsidian 디렉터리 정책](./research/Obsidian_디렉터리정책_상충검토.md), [초기 라이선스 정책 검토 (폐기됨)](./research/OntheRecord_라이선스정책_에스넷그룹_명세_및_체계검토.md), [제품명 조사](./research/OntheRecord_사업보고서_네이밍.md) |

프로젝트 진행 요약은 루트 [README](../README.md), 실행할 작업은 [TODO](../TODO.md), 완료한 변경은 [CHANGELOG](../CHANGELOG.md)를 본다. 측정 데이터는 [`benchmarks/`](../benchmarks/), 입력 오디오와 로컬 전사 산출물은 Git에서 제외되는 [`samples/`](../samples/)에 둔다.

## 문서 추가 규칙

- 제품 설계와 오래 유지되는 형식은 `design/`에 둔다.
- 재현 가능한 시험 결과는 `baselines/`에 두고, 파일명에 `BASE` 식별자와 날짜를 포함한다.
- 외부 정책·라이선스·이름 조사 자료는 `research/`에 둔다.
- 새 문서는 목적에 맞는 폴더에 추가하고 이 안내와 루트 `CHANGELOG.md`를 함께 갱신한다. 임시 메모나 다운로드 파일은 저장소에 두지 않는다.
