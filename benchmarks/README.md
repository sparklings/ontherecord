# 성능 측정 기록

하드웨어 프로필과 측정 기록을 보관하는 폴더이다. 형식은 [HARDWARE_PROFILE.md](../docs/design/HARDWARE_PROFILE.md)를 따른다.

| 폴더 | 내용 |
|---|---|
| `hardware\` | 장치 프로필. 파일명 `<deviceId>.json` |
| `records\<deviceId>\` | 측정 기록. 파일명 `<날짜>_<deviceId>_<번호>.json`. 장치별 하위 폴더에 보관하며 기존 기록은 수정하지 않고 새 파일을 추가한다 |
| `summary\` | `scripts\summarize-records.ps1`이 만드는 요약(`records.csv`, `summary.md`). 생성물이며 Git에서 제외 |

새 장치를 추가하는 순서: ① `hardware\<deviceId>.json` 작성 → ② 같은 런타임·모델·샘플 SHA-256 확인(BASE-03, BASE-02) → ③ `scripts\measure-whisper.ps1`로 측정(기록이 `records\<deviceId>\`에 생성) → ④ `scripts\summarize-records.ps1`로 요약 확인. 실제 회의 전사문은 `%LOCALAPPDATA%\on-the-record\transcripts\`에만 저장된다.

오디오 입력 형식 표본은 저장소 루트의 `samples\format-fixtures\`(합성 표본) 및 `samples\real-audio\`(익명화한 로컬 원본과 변환본)에 보관한다. 오디오 파일은 Git에서 제외하며, 생성·변환 방식·코덱·SHA-256 및 확인 결과는 [0-BASE-01 기록](../docs/baselines/BASE-01_AUDIO_FORMAT_FIXTURES_2026-11-02.md)에 남긴다.
