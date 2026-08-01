# 정부24 전체 혜택 동기화

## 필요한 키

[공공데이터포털의 행정안전부 대한민국 공공서비스(혜택) 정보](https://www.data.go.kr/data/15113968/openapi.do)에서 활용신청 후 발급되는 일반 인증키가 필요하다. `.env.local`에는 화면에 표시되는 **Decoding 키**를 넣는다.

```dotenv
GOV24_SERVICE_KEY=발급받은_일반인증키
```

`.env.local`과 생성 결과가 있는 `.local/`은 Git에서 제외된다.

## 한 번에 로컬 DB까지 반영

```bash
npm run catalog:sync:local
```

적재 후 `npm run dev`로 앱을 열면 홈 하단의 `전국 1만여 개 혜택` 검색에서 원본 정책을 찾을 수 있다. 정밀 추천 결과와 전체 원문 검색 결과는 화면에서 구분한다.

이 명령은 다음을 순서대로 수행한다.

1. D1 로컬 마이그레이션 적용
2. `/serviceList`, `/serviceDetail`, `/supportConditions` 전체 페이지 조회
3. 서비스 ID로 세 응답 병합 및 내용 해시 계산
4. `.local/gov24-catalog.json` 원본 정규화 스냅샷 생성
5. `.local/gov24-catalog.sql` 멱등 upsert SQL 생성
6. 로컬 D1에 적재하고 동기화 이력 완료 처리

수집과 적용을 나누려면 아래 명령을 사용한다.

```bash
npm run catalog:sync
npm run catalog:apply:local
```

## 데이터 안전 규칙

- 공식 `서비스ID`로 upsert하며 이름만으로 합치지 않는다.
- 이번 동기화에서 사라진 레코드는 삭제하지 않고 `is_active = false`로 바꾼다.
- 인증키는 URL을 포함한 로그·오류 메시지·스냅샷에 저장하지 않는다.
- API 원문은 `raw_payload`에 남기고 검색용 필드는 별도 컬럼으로 정규화한다.
- 새로 수집된 정책은 기본적으로 `search_only`이며, 사람 검수와 룰 테스트를 통과해야 `rule_ready`가 된다.

## 정기 검토

- 정기 검토 월: 매년 6월, 12월
- `npm run policy:freshness`: 직전 완료 검토월 이후 공식 출처 확인 여부 검사
- GitHub Actions: 6월 1일과 12월 1일에도 품질 검사를 예약 실행
- API 전체 재수집: 초기에는 `npm run catalog:sync:local`로 수동 실행

갱신월이 끝나기 전에는 그달 검토를 강제하지 않는다. 예를 들어 6월 중에는 직전 12월 기록이 유효하고, 7월 1일부터는 6월 1일 이후 확인 기록이 필요하다.
