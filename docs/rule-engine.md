# 룰 엔진 설계

## 목표

AI 없이 사용자 답변과 정책 조건을 비교해 다음 중 하나를 반환한다.

- `eligible`: 입력된 정보 기준으로 핵심 조건 충족
- `needs_review`: 필요한 값이 없거나 기관 심사가 필요한 조건 존재
- `unlikely`: 하나 이상의 필수 조건 불충족

이 결과는 정부기관의 최종 판정이 아니다.

## 3값 논리

각 조건 노드는 `true`, `false`, `unknown`을 반환한다.

| 연산 | 결과 |
|---|---|
| `all`에 `false`가 하나라도 있음 | false |
| `all`이 모두 true | true |
| `all`에 false는 없고 unknown이 있음 | unknown |
| `any`에 true가 하나라도 있음 | true |
| `any`가 모두 false | false |
| `any`에 true는 없고 unknown이 있음 | unknown |

`unknown`을 `false`로 취급하지 않는 것이 핵심이다.

## 필요한 연산자

- 비교: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`
- 포함: `in`, `not_in`, `contains`
- 범위: `between`
- 날짜: `date_before`, `date_after`, `months_since_lte`
- 존재: `exists`, `not_exists`
- 집합: `all`, `any`, `not`
- 계산 필드: 자녀 나이, 혼인 개월 수, 가구 중위소득 비율

## 평가 결과 구조

```json
{
  "policyId": "newborn-special-didimdol",
  "policyVersionId": "version-2026-07",
  "status": "needs_review",
  "matched": [
    {
      "field": "youngest_child_age_months",
      "message": "최근 2년 내 출산 조건을 충족합니다."
    },
    {
      "field": "household_home_count",
      "message": "입력 기준으로 무주택 조건을 충족합니다."
    }
  ],
  "unmatched": [],
  "unknown": [
    {
      "field": "target_house.appraised_price",
      "question": "구입하려는 주택의 평가액은 얼마인가요?",
      "message": "대상 주택 가격 확인이 필요합니다."
    },
    {
      "field": "credit_check_status",
      "message": "신용 요건은 취급기관의 확인이 필요합니다."
    }
  ],
  "disclaimer": "사전 탐색 결과이며 실제 승인은 공식 기관 심사를 따릅니다."
}
```

## 평가 순서

1. 평가일에 유효한 `policy_version`을 고른다.
2. 사용자 답변에서 계산 필드를 만든다.
3. 명백한 제외 조건을 먼저 평가한다.
4. 전체 조건 트리를 3값 논리로 평가한다.
5. 충족, 미충족, 미확인 조건을 분리한다.
6. 다음에 물어볼 질문을 영향도가 큰 순서로 고른다.
7. 공식 확인이 필수인 신용·담보 심사는 항상 안내한다.

## 질문 우선순위

다음 질문은 정책 결과를 가장 많이 바꾸는 순서로 고른다.

1. 여러 정책에 공통으로 쓰이는 값
2. 답이 `false`이면 정책을 즉시 제외할 수 있는 필수 조건
3. 사용자가 쉽게 답할 수 있는 값
4. 민감도가 낮은 값
5. 마지막에 소득·자산·신용처럼 민감하거나 어려운 값

## 설명 생성

문구를 AI로 즉석 생성하지 않는다. 각 룰 노드에 검수된 문구를 저장한다.

- true: `{조건명} 조건을 충족합니다.`
- false: `{기준}을 충족하지 않아 현재 입력 기준으로 가능성이 낮습니다.`
- unknown: `{필드 질문}`에 답하면 더 정확히 확인할 수 있습니다.
- external: `이 조건은 {기관}의 별도 심사가 필요합니다.`

## 테스트 전략

각 정책 버전에는 최소 다음 fixture를 둔다.

- 모든 조건 충족
- 경계값 바로 아래·같음·바로 위
- 필수값 하나 누락
- 필수 조건 하나 불충족
- 예외 조건으로 통과
- 정책 유효기간 전·중·후

특히 금액의 원 단위, 나이의 만 나이, 날짜 포함 여부, `이하/미만`을 경계값 테스트로 고정한다.
