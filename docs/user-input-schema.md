# 사용자 입력 설계

## 결론

모든 정책 조건을 한 화면에서 묻지 않는다. 공통 프로필을 먼저 받고 후보 정책에 필요한 질문만 추가한다.

## 입력 질문 원칙

### 같은 정보를 두 번 묻지 않는다

사용자에게 받은 원본 정보로 계산할 수 있는 값은 다시 질문하지 않는다.

- 생년월일을 받으면 현재 나이, 성년 여부, 청년 여부를 계산한다.
- 혼인신고일을 받으면 혼인기간과 신혼부부 여부를 계산한다.
- 자녀별 생년월일을 받으면 자녀 수, 미성년 자녀 수, 자녀 월령, 최근 2년 내 출산 여부를 계산한다.
- 막내 자녀의 출생 순위를 받으면 전체 자녀 수와 가구원 수를 추정한다. 예를 들어 기혼 사용자가 `둘째`를 입력하면 4인 가구로 계산한다.
- 시도·시군구를 받으면 수도권, 비수도권, 인구감소지역 분류를 계산한다.
- 가구원별 소득을 받으면 부부합산소득, 가구합산소득, 월소득, 기준중위소득 비율을 계산한다.
- 세대원의 주택 보유 정보를 받으면 무주택 여부와 주택 수를 계산한다.

정책마다 같은 의미를 다른 이름으로 사용하더라도 사용자에게 다시 묻지 않고 표준 필드 하나에 연결한다.

### 원본 입력과 파생값을 분리한다

사용자가 직접 답하는 값은 `source field`, 시스템이 계산하는 값은 `derived field`로 구분한다.

| 원본 입력 | 자동 계산하는 파생값 |
|---|---|
| `birth_date` | 현재 나이, 성년 여부, 청년 여부 |
| `marriage_date` | 혼인 개월 수, 신혼가구 여부 |
| `children[].birth_date` | 자녀 수, 미성년 자녀 수, 막내 월령, 최근 출산 여부 |
| 막내 자녀의 `birth_order` | 전체 자녀 수, 추정 가구원 수 |
| `residence.sigungu_code` | 수도권 여부, 인구감소지역 등급 |
| 가구원별 소득 | 부부합산소득, 가구소득, 월소득, 중위소득 비율 |
| 세대원별 주택 보유 | 무주택 여부, 가구 주택 수 |

파생값은 평가 기준일과 정책 버전에 따라 다시 계산한다. 예를 들어 청년 나이 기준이 정책마다 다르므로 `is_youth` 하나를 영구 저장하지 않고 정책 평가 시 계산한다.

### 예외가 있을 때만 확인 질문을 한다

자동 계산 결과가 정책의 법적 정의와 다를 수 있는 경우에만 추가로 확인한다.

- 재혼·별거 등의 사유로 단순 자녀 목록만으로 출생순위를 확정할 수 없는 경우
- 분양권·조합원 입주권처럼 주택 수에 포함될 수 있는 자산
- 정책별 가구원 범위가 주민등록상 가구와 다른 경우
- 미혼 출산처럼 소득·자산을 합산할 부모의 범위가 달라지는 경우

추가 질문에는 왜 필요한지와 어떤 정책 판정에 쓰이는지를 함께 보여준다.

## 1단계: 기본 프로필

| 필드 코드 | 질문 | 타입 | 이유 |
|---|---|---|---|
| `birth_date` | 생년월일 | date | 청년·성년 조건 |
| `nationality_status` | 국적/체류 상태 | enum | 복지·정책금융 조건 |
| `residence.sido_code` | 거주 시도 | code | 수도권·비수도권 판정 |
| `residence.sigungu_code` | 거주 시군구 | code | 인구감소지역·지자체 정책 |
| `marital_status` | 혼인 상태 | enum | 신혼·배우자 합산 판정 |
| `marriage_date` | 혼인신고일 | date, nullable | 혼인 7년 이내 |
| `planned_marriage_date` | 결혼 예정일 | date, nullable | 3개월 이내 예비신혼 |
| `household_size` | 가구원 수 | integer | 중위소득과 가구 판정 |
| `children[]` | 자녀 정보 | object[] | 출산·아동 정책 |
| `employment_status` | 현재 취업 상태 | enum | 취업지원 후보 생성 |
| `household_income_band` | 가구소득 구간 | enum | 정밀 금액 전 후보 필터 |
| `housing_tenure` | 자가/전세/월세/기타 | enum | 주거 정책 후보 생성 |

### 자녀 기본 정보

| 필드 코드 | 타입 |
|---|---|
| `children[].birth_date` | date |
| `children[].relationship_type` | birth / adoption / guardianship |
| `children[].birth_order` | integer |
| `children[].nationality_status` | enum |
| `children[].resident_registration_status` | enum |
| `children[].care_type` | home / daycare / full_day_childcare / other |

## 2단계: 조건부 추가 질문

### 소득·자산

- `applicant_income_annual`
- `spouse_income_annual`
- `household_income_annual`
- `household_income_monthly`
- `household_net_assets`
- `middle_income_ratio`

소득은 금액과 기준연도를 함께 저장한다. 중위소득 비율은 사용자에게 직접 묻기보다 가구원 수와 소득으로 계산한다.

현재 화면의 예상 비율은 2026년 보건복지부 기준 중위소득 월액을 사용한다. 입력한 가구 연소득을 12로 나눈 뒤 같은 가구원 수의 기준액으로 나누며 소수 첫째 자리까지 표시한다. 이는 편의를 위한 추정치이고, 개별 사업이 사용하는 `소득인정액`은 재산 환산·공제·가구 범위가 달라질 수 있으므로 최종 판정에는 각 정책의 공식 심사가 필요하다.

- 공식 기준: https://www.mohw.go.kr/menu.es?mid=a10708010900
- 2026년 월 기준액(1~7인): 2,564,238 / 4,199,292 / 5,359,036 / 6,494,738 / 7,556,719 / 8,555,952 / 9,515,150원

### 세대·주택 보유

- `is_household_head`
- `is_expected_household_head`
- `is_single_person_household`
- `household_home_count`
- `household_home_count_excluding_target`
- `has_presale_right`
- `has_cooperative_occupancy_right`
- `dependent_cohabitation_months`
- `public_rental_resident`

### 계약과 대상 주택

- `purchase_contract.signed`
- `lease_contract.signed`
- `lease_contract.deposit_paid_ratio`
- `lease_contract.deposit`
- `lease_contract.balance_date`
- `lease_contract.move_in_date`
- `lease_contract.renewal_date`
- `target_house.official_type`
- `target_house.floor_area_m2`
- `target_house.appraised_price`
- `target_house.location`
- `target_house.region_type`

### 기존 대출과 신용

- `existing_loan_codes[]`
- `credit_score`
- `credit_restriction_codes[]`
- `credit_check_status`

신용정보는 민감하고 사용자가 정확히 알기 어렵다. MVP에서는 선택 입력으로 두고 `공식 기관 확인 필요`를 반환하는 것이 안전하다.

### 취업지원

- `job_seeking_status`
- `employment_days_last_2y`
- `employment_hours_last_2y`
- `military_service_months`
- `vulnerable_group_codes[]`

## 입력값 상태

각 값은 값 자체 외에 다음 상태를 가진다.

- `known`: 사용자가 답함
- `unknown`: 모름
- `not_asked`: 아직 질문하지 않음
- `not_applicable`: 해당 없음
- `verified`: 행정정보 또는 서류로 확인됨

`unknown`과 `false`를 절대 같은 값으로 처리하지 않는다.

## 개인정보 최소화

- 주민등록번호 원문은 저장하지 않는다.
- 생년월일이 꼭 필요하지 않은 분석에는 계산된 나이만 사용한다.
- 소득·자산·신용 정보는 암호화하고 접근 로그를 남긴다.
- 비회원 조회를 제공한다면 입력값을 세션 종료 후 삭제하는 옵션을 둔다.
- 정책 원문 데이터와 사용자 개인 데이터는 물리적·논리적으로 분리한다.
- 분석 이벤트에는 구체적 소득이나 자산 금액을 넣지 않는다.

## 추천 입력 UX

1. 기본 프로필을 1~2분 안에 완료한다.
2. 후보 정책 개수와 추가 질문 개수를 보여준다.
3. 사용자가 정책 하나를 펼치면 그 정책에 필요한 질문만 묻는다.
4. “모름”을 항상 허용한다.
5. 답변을 추가할 때 결과가 왜 바뀌었는지 설명한다.
6. 이미 받은 정보 또는 그 정보로 계산 가능한 값은 다시 묻지 않는다.
