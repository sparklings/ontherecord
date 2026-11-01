# CHANGELOG

작업 내용을 일자별로 기록한다. 최신 일자를 위에 둔다. 항목은 변경 사실만 적는다.

분류: 추가 / 변경 / 삭제 / 결정 / 이슈

## 2026-11-01

### 결정
- `0-ENV-05`: 이름 `On the Record`, 플러그인 id `on-the-record`, 부제 `Local minutes for Obsidian`, 저장소명 `ontherecord`(주소 `https://github.com/sparklings/ontherecord`, 접근성 우선. 네이밍 보고서의 기존 `obsidian-on-the-record`에서 변경). 근거는 `docs\STT_사업보고서_OnTheRecord_네이밍.md`. 상표 검색과 도메인 확보는 미확인

### 추가
- `0-ENV-12` 완료: `scripts/deploy.mjs`, `npm run deploy` 추가. PlugVaults 시험 vault의 `.obsidian\plugins\on-the-record\`에 복사 확인. `ObsidianVaults` 경로 거부와 비 vault 폴더 거부 동작 확인
- `0-ENV-11` 완료: 플러그인 프로젝트 골격 생성(`manifest.json`, `versions.json`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `eslint.config.mjs`, `src/main.ts`). `check`·`lint`·`build` 통과. `minAppVersion` 1.7.2는 잠정값
- `TODO.md`에 `0-ENV-15`(사내 GitLab 인증서 신뢰 등록 검토) 보류 항목 추가
- `0-ENV-02` 완료: private 저장소 `sparklings/ontherecord` 생성, 첫 커밋(`12881ff`) push. 공개 범위는 라이선스·회사 규정 확인 후 재결정

### 변경
- Git 전역 설정 `http.sslVerify=false`를 제거하고 사내 GitLab 호스트(`211.239.11.79:8443`, `10.20.2.79:8443`)에만 URL 단위로 적용. GitHub는 기본값(검증 사용)으로 복귀. 개발 PC 환경 설정이며 프로젝트 파일 변경 없음(이 PC만 적용, 다른 PC는 별도 설정 필요)
- `SETTINGS_DESIGN.md`의 `<plugin-id>`를 `on-the-record`로 확정
- README 제목에 제품명 반영

### 추가
- 프로젝트 관리 문서 `README.md`, `CHANGELOG.md`, `TODO.md` 초안 작성
- 용어집 `GLOSSARY.md` 작성(provider, provider 계약, provider manifest, segment, 가속기). 항목별 작성일·변경 이력 표기 추가
- `TODO.md` 0단계 항목에 식별코드 부여(`0-ENV-01`~`14`, `0-BASE-01`~`05`, `0-OBS-01`~`03`)와 코드 관리 규칙 추가
- `SETTINGS_DESIGN.md` 작성(`0-ENV-13`): 공유 설정(`data.json`)과 PC별 설정(`%LOCALAPPDATA%\<plugin-id>\local-settings.json`) 분리 기준, 항목 분류 초안, 충돌·불일치 처리 규칙
- `.gitignore` 작성(`0-ENV-03`)
- `benchmarks\` 폴더 생성(`hardware\`, `records\`, `README.md`). Lenovo 장치 프로필 `lenovo-ideapad-gaming3-15imh05.json` 작성(메모리 17,041,244,160 B, NVIDIA 전용 메모리 4 GiB 확인)
- `HARDWARE_PROFILE.md` 작성(`0-ENV-14`): 장치 프로필과 측정 기록의 JSON 형식, 공통 규칙, Lenovo 예시
- `TODO.md` 0단계 환경 항목을 진행 순서로 재배열. 플러그인 이름, GitHub 저장소, 라이선스 정책 관련 항목(`0-ENV-02`, `05`~`12`)은 보류로 분리
- `TODO.md` `0-ENV-01`을 보류로 이동(Samsung 노트북이 다른 장소에 있음, 2026-11-02 수행 예정)

### 변경
- 개발계획서 §4~§5, §10, §12~§15: 다중 PC 개발 방식 반영
  - PC 2대 이상, 순차 작업(동시 편집 없음)
  - OneDrive `STT` 작업 폴더 유지, Git 연결 후에도 동일
  - PC 전환 절차, 저장소·동기화 대상 구분, 공유 설정과 PC별 설정 분리
  - AssistantEmily와 같은 PlugVaults 테스트 볼트 배포 방식
- 개발계획서 §5 PC 전환 절차: OneDrive 안의 `.git` 위험 평가를 수정. 병합 충돌은 발생 조건이 없고, 동기화 지연에 의한 불완전 상태만 남는다고 정리
- 개발계획서 경로 표기를 `%USERPROFILE%`로 통일(PC별 사용자 계정이 다름)

- OneDrive 전제 검토: OneDrive 동기화는 개발자 개인 환경이며 사용자 vault 동기화 방식은 다양하므로 제품 설계에서 가정하지 않도록 수정. `SETTINGS_DESIGN.md`(배경·저장 위치·규칙 6, "공유 설정"→"vault 설정"), 개발계획서(§5 개발자 개인 방식 표기, §12, §13, §14, §15-2), README 개발 환경 절을 변경
- README 링크를 `docs\` 이동 후 경로로 수정
- `systeminfo_*.md` 2개를 `docs\`에서 `benchmarks\hardware\`로 이동하고 README·개발계획서 링크를 수정

### 결정
- `0-ENV-04`: `node_modules`·빌드 산출물은 AssistantEmily와 같이 OneDrive 동기화를 허용하고 `.gitignore`로 Git에서만 제외한다. `package-lock.json`을 버전 관리하고 PC 전환 후 `npm ci`로 재생성한다. 네이티브 모듈 추가 또는 PC 간 불일치가 생기면 재검토한다.
- 라이선스: 미정 유지. 소속 회사 구성원(그룹사·계열사·관계사, 회사명 명시)에게 무료 제공하는 방식을 계획

### 이슈
- Samsung 960XFG의 GPU 구성 불일치. `systeminfo_Samsung_960XFG.md`에는 Intel Iris Xe만 기록되어 있으나 UHD Graphics도 있다는 사용자 의견이 있음. Samsung PC에서 `Win32_VideoController` 조회 후 확인 필요. 개발계획서 표는 원본 문서와 일치함

## 2026-10-31

### 추가
- 개발계획서 `STT_회의록_커뮤니티플러그인_개발계획서.md` 작성

## 2026-10-30

### 추가
- 시스템 정보 문서 작성: `systeminfo_Samsung_960XFG.md`, `systeminfo_Lenovo_IdeaPad_Gaming3.md`
