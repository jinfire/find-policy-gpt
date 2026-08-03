# 정책 DB 설계

## 결론

실행 DB는 Cloudflare D1(SQLite 호환)이며 Drizzle로 스키마와 마이그레이션을 관리한다. 데이터는 `공식 원본 카탈로그`, `서비스가 검수한 정책`, `사용자 매칭 이력`의 세 층으로 분리한다.

```text
catalog_sources ──< catalog_sync_runs
       │
       └──< source_catalog_services >── policy_catalog_mappings ──> policies
                                                                      │
                                         policy_sources ──<───────────┤
                                         policy_versions ──<──────────┘
                                                  │
                                                  └──< match_results <── match_runs
```

정부24의 1만여 개 레코드는 모두 `source_catalog_services`에 보존한다. 그중 조건을 사람이 검수하고 테스트한 정책만 `policies + policy_versions`로 승격한다. 따라서 잘 알려지지 않은 정책도 검색에서 사라지지 않으면서, 검수하지 않은 원문을 확정 추천으로 오해시키지 않는다.

## 1. 공식 원본 카탈로그

### `catalog_sources`

수집처 자체를 관리한다. 현재 `gov24` 한 건을 seed하며 API 기본 URL, 이용허락 URL, 검토 월 `[6, 12]`, 마지막 성공 시각을 저장한다.

### `catalog_sync_runs`

수집 실행마다 다음을 남긴다.

- 실행 상태: running / completed / failed
- 시작·완료 시각
- 원본 건수, upsert 건수, 사라져 비활성화된 건수
- 실패 메시지

### `source_catalog_services`

정부24의 `서비스ID`를 잃지 않고 목록·상세·지원조건을 합친 검색용 원본이다.

| 컬럼군 | 주요 내용 |
|---|---|
| 식별 | `source_id`, `source_service_id`, 내부 `id` |
| 검색 | 정책명, 요약, 지원유형, 지원대상, 선정기준, 지원내용 |
| 신청 | 신청방법, 기한, 상세 URL, 온라인 신청 URL, 구비서류 |
| 기관 | 기관 코드·명·유형, 부서, 접수기관, 문의처 |
| 분류 | 전국/지역, 사용자구분, 서비스분야, 지원조건 코드, `eligibility_profile` |
| 감사 | 원문 JSON, 내용 해시, 등록·수정·최초발견·마지막발견 시각 |
| 상태 | `partially_structured`, 활성 여부 |

`source_id + source_service_id`가 유일 키다. 매 동기화 시작 시 기존 레코드를 비활성화하고 이번 응답에 나온 레코드를 다시 활성화하므로, 공식 목록에서 사라진 서비스도 삭제하지 않고 이력으로 남긴다.

### `policy_catalog_mappings`

원본 서비스와 검수 정책의 다대다 연결이다. 같은 중앙 정책이 여러 지역 변형으로 등록되거나 한 원본이 여러 정밀 룰과 연결되는 경우를 `primary / variant / related`로 표현한다. 이름이 비슷하다는 이유만으로 자동 병합하지 않는다.

## 2. 검수된 정밀 정책

### `policies`

정책의 변하지 않는 정체성이다.

- 이름, 요약, 담당기관, 전국/지역 범위
- 지원금·바우처·대출·서비스 유형
- draft / review / active / expired / suspended
- search_only / partially_structured / rule_ready
- 유사 정책을 묶는 `canonical_policy_id`

### `policy_versions`

특정 기간에 유효한 조건과 혜택을 버전으로 보존한다.

- `eligibility_rule`: 3값 조건 트리 JSON
- `benefit`, `application`, `required_documents`: 구조화 JSON
- 적용 시작·종료일, 검수·공개 상태와 담당자
- 원문 변경을 비교하는 `content_hash`

같은 정책의 `version_no`는 중복될 수 없다. 과거 버전을 덮어쓰지 않기 때문에 “예전에는 추천됐는데 지금은 왜 아닌지”를 설명할 수 있다.

### `policy_sources`

공식 기관 페이지, 법령, 공고, 포털, API 출처를 정책과 연결한다. URL, 발행기관, 수집·최종확인 시각, 해시, 원본 서비스 ID를 저장한다.

## 3. 룰·운영 테이블

- `input_field_definitions`: 질문 코드, 타입, 단위, 민감도, 파생관계
- `region_classifications`: 수도권·인구감소지역 등 지역 분류와 유효기간
- `policy_change_events`: 원문 해시 변경과 검수 결과
- `policy_error_reports`: 사용자 오류 제보와 처리 상태

## 4. 사용자와 매칭

- `users`: 최소 계정 식별자
- `profiles`: 명시적 동의를 받은 경우에만 암호화 저장
- `match_runs`: 사용한 프로필 지문과 정책 버전 목록
- `match_results`: 정책별 상태, 추천 이유, 추가 확인 필드

현재 비회원 화면은 생년월일·소득액 원본을 브라우저 메모리에서 파생값으로 바꾸고, 전체 후보 API에는 나이·중위소득 비율·가구원 수 같은 파생값만 전송한다. 원본과 파생값 모두 사용자 테이블에 저장하지 않는다.

## 조건 JSON 예시

```json
{
  "all": [
    {
      "field": "household_home_count",
      "op": "eq",
      "value": 0,
      "reason": "심사 대상 세대원 전원이 무주택입니다.",
      "question": "가구 전체가 무주택인가요?",
      "sourceId": "official-source-id"
    },
    {
      "field": "household_income_annual",
      "op": "lte",
      "value": 130000000,
      "reason": "부부합산 소득 기준 이내입니다."
    }
  ]
}
```

## 중요한 설계 판단

1. 전체 원본 1만여 건과 정밀 룰을 같은 완성도로 취급하지 않는다.
2. 원본 ID와 원문 JSON을 보존하고 정규화 결과를 언제든 다시 만들 수 있게 한다.
3. 정책 조건은 애플리케이션 코드가 아니라 버전 있는 JSON으로 저장한다.
4. `rule_ready`는 정밀 결과, `partially_structured`는 공식 코드 기반 1차 후보로 신뢰 수준을 구분한다.
5. 명확한 구조화 조건 불일치만 제외하고, 원문 조건은 추가 확인으로 표시한다.
