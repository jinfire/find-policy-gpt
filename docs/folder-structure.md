# 저장소 폴더 구조

## 현재 구조

```text
policy-gpt/
├─ app/
│  ├─ api/catalog/route.ts        # 전체 카탈로그 D1 검색 API
│  ├─ components/
│  │  ├─ PolicyFinder.tsx         # 프로필 입력과 정밀 추천
│  │  └─ CatalogSearch.tsx        # 1만여 개 원문 검색
│  ├─ globals.css
│  └─ page.tsx
├─ packages/
│  ├─ policy-catalog/src/         # 정부24 수집·정규화·검색·upsert SQL
│  ├─ policy-data/src/            # 검수된 10개 정책 JSON 로더·검증
│  ├─ policy-engine/src/          # 파생값·중위소득·룰·추천
│  ├─ policy-ops/src/             # 6월·12월 검토 주기
│  └─ shared/src/                 # 공용 프로필·조건·결과 타입
├─ data/
│  ├─ policies/                   # 검수된 정책 JSON 10개
│  └─ schema/                     # 정책 JSON Schema
├─ db/
│  ├─ schema.ts                   # D1/SQLite Drizzle 테이블
│  └─ index.ts                    # Cloudflare D1 바인딩
├─ drizzle/                       # 버전 있는 D1 마이그레이션
├─ scripts/
│  ├─ sync-gov24-catalog.ts       # 전체 정책 수집·SQL 생성
│  ├─ check-policy-freshness.ts   # 반기 검토 최신성 검사
│  ├─ check-policy-links.mjs      # 공식 링크 검사
│  └─ generate-policy-seed.mjs    # 10개 정밀 정책 seed 생성
├─ tests/unit/                    # 룰·UI·API 계약·DB·운영 테스트
├─ docs/
│  ├─ decisions/                  # ADR 의사결정 기록
│  ├─ catalog-sync.md
│  ├─ database-design.md
│  └─ ...
├─ worker/index.ts                # Cloudflare/vinext 실행 진입점
├─ wrangler.catalog.jsonc         # 로컬 D1 관리 전용 설정
├─ progress.md
└─ todo.md
```

## 책임 경계

- `PolicyFinder`: 브라우저 메모리의 사용자 프로필로 검수된 정책만 정밀 추천한다.
- `CatalogSearch`: D1에 동기화된 전체 공식 원문을 검색한다. 자격 확정 결과로 표현하지 않는다.
- `policy-catalog`: API 인증키를 UI나 DB에 전달하지 않고 서버 측 수집에만 사용한다.
- `policy-engine`: DB와 HTTP에 의존하지 않는 순수 규칙 평가기다.
- `policy-data`: 사람이 확인한 `rule_ready` JSON의 계약과 출처를 검증한다.
- `db`: 원본, 검수 정책, 사용자 매칭의 세 데이터 층을 분리한다.
- `.local`: 전체 API 스냅샷과 생성 SQL을 두며 Git에 올리지 않는다.

## 데이터 흐름

```text
정부24 API
  → 목록·상세·지원조건 전체 수집
  → 서비스ID 기준 병합
  → source_catalog_services (search_only)
  → 전체 원문 검색
  → 사람 검수 + 조건 트리 + 테스트
  → policies / policy_versions (rule_ready)
  → 사용자 프로필 룰 매칭
  → 추천 이유가 있는 정밀 결과
```
