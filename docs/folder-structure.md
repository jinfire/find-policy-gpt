# 저장소 폴더 구조

## 결정

초기 구조는 웹, API, 정책 룰, DB, 수집 데이터의 책임을 분리한 모노레포로 잡는다. 아직 프레임워크를 정하지 않았으므로 특정 언어에 종속된 설정 파일은 만들지 않았다.

```text
policy-gpt/
├─ apps/
│  ├─ web/
│  │  └─ src/
│  │     ├─ app/             # 페이지, 라우팅, 화면 조합
│  │     ├─ components/      # 공통 UI
│  │     ├─ features/        # 프로필 입력, 정책 결과 등 기능 단위
│  │     └─ lib/             # API 클라이언트, 포맷터
│  └─ api/
│     └─ src/
│        ├─ routes/           # HTTP 엔드포인트
│        ├─ services/         # 정책 검색과 매칭 유스케이스
│        └─ repositories/     # DB 접근
├─ packages/
│  ├─ policy-engine/
│  │  └─ src/                # 3값 룰 평가기와 설명 생성
│  ├─ shared/
│  │  └─ src/                # 공용 타입, 입력 필드 코드
│  └─ db/
│     └─ migrations/         # PostgreSQL 마이그레이션
├─ data/
│  ├─ raw/                   # 수집한 원문 스냅샷
│  ├─ normalized/            # 검토 전 정규화 데이터
│  └─ seeds/                 # 승인된 개발·초기 적재 데이터
├─ scripts/
│  ├─ collect/               # 공식 출처 수집
│  ├─ normalize/             # 원문을 공통 구조로 변환
│  └─ validate/              # 링크, 필수 필드, 룰 검증
├─ tests/
│  ├─ unit/                  # 룰 연산자 단위 테스트
│  ├─ integration/           # API와 DB 통합 테스트
│  └─ fixtures/              # 사용자·정책 시나리오
├─ docs/
│  ├─ decisions/             # 기술·제품 의사결정 기록
│  ├─ product-brief.md
│  ├─ policy-research.md
│  ├─ user-input-schema.md
│  ├─ database-design.md
│  └─ rule-engine.md
├─ progress.md
└─ todo.md
```

## 데이터 흐름

```text
공식 사이트
  → data/raw
  → scripts/normalize
  → data/normalized
  → 사람 검수
  → data/seeds 또는 관리자 승인 API
  → PostgreSQL의 새 policy_version
  → 룰 검증
  → 공개
```

## 영역별 경계

### `apps/web`

사용자 정보 입력과 결과 설명을 담당한다. 정책 조건을 프론트엔드에 하드코딩하지 않는다.

### `apps/api`

프로필 저장, 후보 정책 조회, 룰 엔진 호출, 정책 상세 제공을 담당한다. 웹 이외의 앱이 생겨도 같은 API를 재사용할 수 있게 한다.

### `packages/policy-engine`

순수 함수 형태의 평가기다. DB나 HTTP에 직접 의존하지 않고 `사용자 답변 + 정책 룰`을 받아 결과와 근거를 반환한다.

### `packages/shared`

`birth_date`, `household_income_annual` 같은 표준 필드 코드와 API 계약을 둔다. 웹, API, 수집 스크립트에서 같은 명칭을 사용하게 한다.

### `packages/db`

스키마와 마이그레이션만 관리한다. 운영 DB 데이터를 파일에 직접 복사하지 않는다.

### `data`

- `raw`: 출처 URL, 수집 시각, 원문 해시가 있는 변경 불가 스냅샷
- `normalized`: 자동 변환됐지만 아직 승인되지 않은 데이터
- `seeds`: 검수된 개발용 표본 데이터

개인 사용자 정보는 `data` 폴더에 저장하지 않는다.

## 제안하는 초기 기술 조합

구현을 시작할 때 한 번 결정한다.

- 웹: Next.js + TypeScript
- API: Next.js Route Handler 또는 별도 TypeScript API
- DB: PostgreSQL
- ORM: Drizzle 또는 Prisma
- 룰 검증: JSON Schema + TypeScript
- 배치: GitHub Actions 또는 관리형 스케줄러

MVP 속도를 우선하면 웹과 API를 하나의 Next.js 앱으로 먼저 구현해도 된다. 다만 정책 엔진과 DB 패키지 경계는 유지하는 편이 좋다.
