# Obsidian 커뮤니티 디렉터리 정책과 프로젝트 결정의 상충 검토

작성일: 2026-11-01 · 관련 항목: `0-ENV-08`

## 1. 조사 범위

공식 문서 원문을 2026-11-01에 내려받아 대조했다. 문서는 JS로 렌더링되는 페이지라, 페이지가 불러오는 원본 마크다운 파일을 읽었다.

| 문서 | 주소 |
|---|---|
| Developer policies | https://docs.obsidian.md/Community+directory/Developer+policies |
| Submission requirements for plugins | https://docs.obsidian.md/Community+directory/Submission+requirements+for+plugins |
| Frequently asked questions | https://docs.obsidian.md/Community+directory/Frequently+asked+questions |
| Submit your plugin | https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin |
| Manage your plugin or theme | https://docs.obsidian.md/Community+directory/Manage+your+plugin+or+theme |

대조 대상은 현재까지의 결정이다: MIT 공개, 구성원 모두 소유·소속 회사 담당 조직 관리, 이관 계획, 런타임·모델 설치 기능, vault 밖 저장, 사내 혜택.

적용 범위: 이 정책은 **공식 디렉터리에 등재하는 플러그인에만** 적용된다(원문: "do not apply to plugins installed outside of the Obsidian directory", 즉 Obsidian 디렉터리 밖에서 설치한 플러그인에는 적용되지 않음). 아래 상충은 디렉터리 등재를 목표로 할 때만 해당한다.

## 2. 상충 및 확인 필요 사항

심각도는 등재 가능성에 미치는 영향 기준이다.

| # | 심각도 | 우리 결정 | 공식 원문 | 판단 |
|---|---|---|---|---|
| 1 | 높음 | 개발계획서 §2·§7·§9: 플러그인이 whisper.cpp 런타임과 모델을 내려받아 설치하고, 업데이트·제거까지 관리(Runtime Manager) | 금지 항목: "Install or update themselves or their dependencies." (플러그인 스스로 또는 그 의존성을 설치·업데이트하는 행위) | **정책 문구와 충돌할 가능성이 있다.** "dependencies"가 런타임 실행 파일·모델을 포함하는지는 원문에 정의가 없고, 이 세션에서 심사 사례를 확인하지 못했다. 사용자 동의를 받아도 금지 항목이라는 점은 같다. 아래 §3 참고 |
| 2 | 높음 | 저장소를 `sparklings/ontherecord`에 두고 회사 공식 저장소 확정 시 이관 | FAQ: 등재 후 GitHub 위치 이전은 **관리자만** 할 수 있고, Discord `#community-directory`에 새·이전 위치와 원저자 허가 여부를 올려 요청. 항목 식별자(id)는 게시 후 변경 불가이며 변경 시 다운로드 수가 초기화되고 모든 사용자가 재설치해야 함 | 이관을 하려면 관리자 절차가 필요하다. 등재 **전에** 최종 저장소를 정하면 절차를 피한다. 이 판단은 `0-ENV-02`의 "공개 범위 재결정"과 연결된다 |
| 3 | 중간 | README에 현재 네트워크 사용 안내가 없음 | Disclosures: 네트워크 사용은 어떤 원격 서비스를 왜 쓰는지 README에 명시해야 허용 | 모델·런타임 다운로드를 한다면 출처와 이유를 README에 적어야 한다. 개발계획서 §11도 "설치 다운로드 외 요청 없음"을 명시하므로 내용은 일치한다. 문서화만 필요 |
| 4 | 중간 | 설정·런타임·모델을 `%LOCALAPPDATA%\on-the-record\`에 저장(`docs/design/SETTINGS_DESIGN.md`), Obsidian 코어 녹음 파일을 읽음 | 공개 항목: "Accessing files outside of Obsidian vaults. Clearly explain why this is needed." (Obsidian vault 밖 파일에 접근하는 경우 그 이유를 명확히 설명) | vault 밖 접근에 해당한다. README에 이유와 함께 적어야 한다. 문서화만 필요 |
| 5 | 중간 | `LICENSE` 파일과 MIT 표기는 반영됨. `package.json`도 `license: MIT`, `private: false`로 변경됨. 저작권자와 공개 승인은 미정 | "Include a LICENSE file and clearly indicate the license." (LICENSE 파일을 포함하고 라이선스를 명확히 표시) 제출 요건에도 `LICENSE` 포함 | 라이선스 파일과 메타데이터 요건은 `0-ENV-09`에서 반영했다. 저작권자 표기와 공개 승인은 `0-ENV-07`에서 확인해야 하며, 승인 전까지 저장소는 비공개로 유지 |
| 6 | 중간 | `LICENSE` 저작권자 표기 미정("구성원 모두" 소유) | 원문에 저작권자 형식 규정은 없음. 스캐너는 GitHub이 인식한 라이선스 유형을 확인 | 형식 제약은 없다. 다만 MIT 전문 형식(`Copyright (c) 연도 이름`)을 유지해야 GitHub이 MIT로 인식할 가능성이 높다. 이 인식은 이번에 시험하지 않았다 |
| 7 | 낮음 | `manifest.json`의 author `SUNGWON PARK`, `authorUrl` 개인 GitHub | FAQ: 항목의 Owner를 개인 또는 소속 **조직(organization)** 으로 지정 가능. attribution은 공개 표시일 뿐 소유권이 아님 | 회사 소유 방침과 Owner 설정이 조직으로 가능하다는 점은 서로 맞는다. 단, Obsidian 디렉터리의 조직 계정을 따로 만들어야 한다. 회사 규정(`0-ENV-07`) 확정 후 결정 |
| 8 | 낮음 | 소스 공개 여부가 `0-ENV-07` 확인 전이라 불확실 | FAQ: 소스를 비공개 저장소에 두고, 빌드 산출물만 공개 저장소에 둘 수 있음(Obsidian GitHub App에 읽기 권한 부여). Developer policies: 비공개 소스는 사안별 심사 | 회사가 소스 공개를 허용하지 않는 경우의 대안이 된다. 이 경우 MIT 공개와 어긋나므로 라이선스 정책을 다시 정해야 한다 |
| 9 | 낮음 | 설명(description)이 `Local minutes for Obsidian.` | 설명은 250자 이하, 마침표로 끝, 이모지 금지, 상표 대소문자 정확히 | 형식은 충족한다. 상표 사용("for Obsidian")이 혼동을 주는지는 Obsidian 상표 정책 문서를 이번에 읽지 않아 확인하지 못했다 |
| 10 | 낮음 | `minAppVersion` 1.7.2는 잠정값 | "프로젝트가 호환되는 최소 버전으로 설정. 모르면 최신 안정 빌드" | `0-OBS` 검증 후 확정(기존 계획과 동일) |
| 11 | 낮음 | 사내 혜택의 "조기 접근 빌드·사내 배포 채널" | 정책은 디렉터리 밖 설치에는 적용되지 않음 | 충돌 없음. 단 사내 배포본에 자동 업데이트를 넣으면 등재본과 같은 코드를 쓰는 원칙(보고서 §9.1-4)에 따라 등재본도 같은 금지를 받는다 |

충돌 없음으로 확인한 항목:
- 라벨 Free/Optional payment/Paid 구분은 보고서 §4.4 서술과 원문이 일치한다.
- `fundingUrl` 미사용, `isDesktopOnly: true`(Node.js `fs` 사용 시 필수), 클라이언트 텔레메트리 없음, 광고 없음.
- 빌드 스크립트: 스캐너는 `build`, `build:plugin`, `compile` 순으로 첫 명령을 쓴다. 이 프로젝트에는 `build`가 있다.
- 포크 금지: whisper.cpp를 포크해 올리는 구조가 아니므로 해당 없음. 외부 코드를 복사해 넣게 되면 원 라이선스 표기가 필요하다.
- 라이선스 보고서 §4.4의 인용은 원문과 일치한다. 다만 이 표는 위 #1, #3, #4, #2를 다루지 않았다.

## 3. #1에 대한 선택지

원문 근거만으로는 어느 쪽이 맞는지 정할 수 없다. 선택지와 영향만 적는다.

| 선택지 | 내용 | 영향 |
|---|---|---|
| A. Obsidian 팀에 질의 | Discord `#community-directory` 등에서 "런타임·모델 다운로드가 금지 항목에 해당하는지" 확인 | 결과에 따라 B·C를 확정. 질의는 사용자만 할 수 있음 |
| B. 사용자 수동 설치 | 플러그인은 내려받지 않고, 사용자가 파일을 받아 지정 위치에 두면 검증(해시)·실행만 수행. 다운로드·업데이트 UI 삭제 | 정책 위반 소지를 줄인다. 개발계획서 §2의 "검색·설치·업데이트" 요구가 줄어 사용성이 낮아진다 |
| C. 디렉터리 밖 배포 | 등재하지 않고 GitHub 릴리스·사내 채널로 배포 | 이 정책이 적용되지 않는다. 네이밍 보고서가 가정한 "커뮤니티 디렉터리 제출"과 공개 사용자 확장 목표에 영향 |

이 선택은 제품 범위에 영향을 주므로 사용자 결정이 필요하다.

## 4. 반영할 작업

| 대상 | 내용 |
|---|---|
| `0-ENV-09` | 완료: `LICENSE`(MIT), `package.json`의 `MIT`/`private: false`, README 라이선스 안내, `SUPPORT.md` 반영. 저작권자 표기와 공개 승인은 `0-ENV-07`에서 확인 |
| README(공개 전) | 네트워크 사용(출처·이유), vault 밖 파일 접근(이유) 항목 추가 |
| 개발계획서 §7·§9 | #1 결정 후 Runtime Manager 범위 조정 |
| `0-ENV-02` | 등재 전에 최종 저장소를 정해 이관 절차를 피할지 결정 |
| 상표 | Obsidian 상표 정책 원문 확인(미확인) |
