# 정책 DB 설계

## 결정

정책을 DB에 저장한다. MVP는 PostgreSQL을 사용하고 다음을 조합한다.

- 관계형 컬럼: 검색, 운영 상태, 담당 기관, 유효기간, 출처
- JSONB: 조건 트리, 조건부 혜택, 신청 안내처럼 정책마다 모양이 다른 데이터
- 버전 테이블: 과거 조건 보존과 변경 이력

정책 조건을 애플리케이션 코드에 직접 하드코딩하지 않는다.

## 핵심 모델

```text
policies
  1 ── N policy_versions
  1 ── N policy_sources
  1 ── N policy_categories

policy_versions
  ├─ eligibility_rule JSONB
  ├─ benefits JSONB
  ├─ application JSONB
  └─ required_documents JSONB

input_field_definitions
  └─ 룰에서 참조하는 사용자 필드 사전
```

## 테이블 초안

### `policies`

정책의 변하지 않는 정체성이다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | 내부 ID |
| `slug` | text unique | 예: `first-meeting-voucher` |
| `official_name` | text | 공식 정책명 |
| `summary` | text | 짧은 설명 |
| `policy_type` | enum | grant, voucher, loan, service |
| `scope` | enum | national, regional |
| `provider_name` | text | 담당 부처·기관 |
| `status` | enum | draft, review, active, expired, suspended |
| `catalog_level` | enum | search_only, partially_structured, rule_ready |
| `canonical_policy_id` | uuid nullable | 유사·지역 서비스의 대표 정책 그룹 |
| `created_at` | timestamptz | 생성 시각 |
| `updated_at` | timestamptz | 수정 시각 |

### `policy_versions`

특정 기간에 유효한 정책 내용이다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | 버전 ID |
| `policy_id` | uuid FK | 정책 |
| `version_no` | integer | 증가하는 버전 |
| `effective_from` | date | 적용 시작일 |
| `effective_to` | date nullable | 적용 종료일 |
| `eligibility_rule` | jsonb | 기계 평가 조건 |
| `benefits` | jsonb | 금액·형태·조건부 변형 |
| `application` | jsonb | 신청 채널, 기간, 링크 |
| `required_documents` | jsonb | 서류와 조건 |
| `notes` | text | 운영자 참고 |
| `review_status` | enum | draft, reviewed, published |
| `reviewed_by` | uuid nullable | 검수자 |
| `reviewed_at` | timestamptz nullable | 검수 시각 |
| `published_at` | timestamptz nullable | 공개 시각 |
| `content_hash` | text | 변경 탐지 |

`policy_id + version_no`와 정책별 유효기간 중복 방지를 제약조건으로 둔다.

### `policy_sources`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | 출처 ID |
| `policy_id` | uuid FK | 정책 |
| `source_type` | enum | agency, law, portal, notice, api |
| `url` | text | 공식 URL |
| `title` | text | 문서 제목 |
| `publisher` | text | 발행 기관 |
| `retrieved_at` | timestamptz | 수집 시각 |
| `last_verified_at` | timestamptz | 사람이 확인한 시각 |
| `raw_snapshot_path` | text nullable | 원문 스냅샷 위치 |
| `content_hash` | text | 변경 감지용 해시 |
| `is_primary` | boolean | 대표 근거 여부 |
| `source_service_id` | text nullable | 보조금24 등 원본 시스템의 서비스 ID |

### `input_field_definitions`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `code` | text PK | `household_net_assets` 등 |
| `label` | text | 사용자 질문명 |
| `data_type` | text | date, number, boolean, enum |
| `unit` | text nullable | KRW, month, m2 |
| `enum_values` | jsonb nullable | 선택지 |
| `sensitivity` | enum | normal, personal, sensitive |
| `question_template` | text | 기본 질문 |
| `validation_schema` | jsonb | 허용 범위 |

### 추가를 권장하는 운영 테이블

- `policy_change_events`: 출처 변경 탐지와 검토 상태
- `policy_reviews`: 누가 어떤 근거로 승인·반려했는지
- `region_classifications`: 시군구별 수도권·인구감소 우대·특별 구분과 유효기간
- `category_definitions`: 출산, 아동, 청년, 주거 등
- `policy_category_links`: 정책과 카테고리 다대다 관계
- `source_services`: 보조금24 등에서 동기화한 원본 서비스 레코드
- `canonical_policy_links`: 원본 서비스와 대표 정책의 연결

## 조건 JSON 예시

신생아 특례 디딤돌의 일부를 단순화한 예다.

```json
{
  "all": [
    {
      "field": "is_household_head",
      "op": "eq",
      "value": true,
      "reason": "민법상 성년 세대주여야 합니다."
    },
    {
      "field": "youngest_child_age_months",
      "op": "lte",
      "value": 24,
      "reason": "대출접수일 기준 2년 내 출산·입양 가구여야 합니다."
    },
    {
      "field": "household_home_count",
      "op": "eq",
      "value": 0,
      "reason": "심사 대상 세대원 전원이 무주택이어야 합니다."
    },
    {
      "any": [
        {
          "field": "household_income_annual",
          "op": "lte",
          "value": 130000000
        },
        {
          "all": [
            {
              "field": "is_dual_income",
              "op": "eq",
              "value": true
            },
            {
              "field": "household_income_annual",
              "op": "lte",
              "value": 200000000
            },
            {
              "field": "applicant_income_annual",
              "op": "lte",
              "value": 130000000
            },
            {
              "field": "spouse_income_annual",
              "op": "lte",
              "value": 130000000
            }
          ]
        }
      ]
    }
  ]
}
```

실제 룰에는 각 노드의 `source_id`, `source_quote_location`, `severity`, `question_code`도 넣어 근거와 질문을 연결한다.

## 조건부 혜택 JSON 예시

첫만남이용권은 단일 금액 컬럼으로 표현할 수 없다.

```json
{
  "type": "voucher",
  "frequency": "once",
  "variants": [
    {
      "when": {
        "field": "child_birth_order",
        "op": "eq",
        "value": 1
      },
      "amount": 2000000,
      "currency": "KRW"
    },
    {
      "when": {
        "field": "child_birth_order",
        "op": "gte",
        "value": 2
      },
      "amount": 3000000,
      "currency": "KRW"
    }
  ]
}
```

아동수당도 지역 분류에 따른 여러 `variants`로 저장한다.

## 신청 정보 JSON 예시

```json
{
  "channels": [
    {
      "type": "online",
      "name": "복지로",
      "url": "https://www.bokjiro.go.kr/"
    },
    {
      "type": "visit",
      "name": "읍면동 행정복지센터"
    }
  ],
  "deadline_rule": null,
  "official_confirmation_required": true
}
```

## 사용자 데이터

정책 카탈로그와 별도 스키마에 둔다.

- `users`: 계정 최소 정보
- `profiles`: 암호화된 기본 프로필
- `profile_answers`: 필드 코드, 값, 값 상태, 기준일
- `match_runs`: 어떤 정책 버전과 어떤 답변으로 평가했는지
- `match_results`: 결과, 충족·미충족·미확인 조건

평가 당시의 `policy_version_id`를 반드시 저장해야 나중에 결과가 달라진 이유를 설명할 수 있다.

## 정책 적재 여부에 대한 결론

정책 10개를 초기 seed로 DB에 넣는 것이 맞다. 단, 조사 문장을 통째로 한 컬럼에 넣는 방식은 피한다.

1. `policies`에 정체성을 만든다.
2. 조사 기준일의 조건을 `policy_versions`에 넣는다.
3. 공식 링크와 확인일을 `policy_sources`에 넣는다.
4. JSON Schema와 시나리오 테스트를 통과시킨다.
5. 사람이 검수한 버전만 `published`로 전환한다.
