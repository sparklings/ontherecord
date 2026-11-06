# Samsung 960XFG GPU 확인 기록

- **확인일:** 2026-11-02
- **대상:** Samsung 960XFG
- **명령:** `Get-CimInstance Win32_VideoController | Select Name,DriverVersion,AdapterRAM,PNPDeviceID`

## 결과

| 항목 | 확인값 |
|---|---|
| GPU | Intel(R) Iris(R) Xe Graphics |
| 드라이버 | 32.0.101.7088 |
| `AdapterRAM` | 2,147,479,552 bytes |
| PNP 식별자 | `VEN_8086&DEV_A7A0` |

조회 결과 Intel Iris Xe 내장 그래픽이 식별되었습니다. PNP 식별자는 `VEN_`·`DEV_` 부분만 남겨 기록했습니다. CIM의 `AdapterRAM`은 Windows 보고값이며, 이 내장 GPU의 전용 VRAM 용량을 의미하지 않습니다.

## 설계 반영

- Samsung 960XFG의 GPU 정보와 식별 결과를 [시스템 정보](../../benchmarks/hardware/systeminfo_Samsung_960XFG.md)에 반영했습니다.
- [OntheRecord 개발계획서](../design/OntheRecord_회의록_커뮤니티플러그인_개발계획서.md)에 Intel Iris Xe가 확인된 하드웨어임을 반영했습니다. GPU 실행 provider와 실제 가속 성능은 별도 검증 대상으로 유지합니다.
