# Find Policy GPT

사용자가 자신의 상황을 한 번 입력하면 받을 가능성이 있는 정부 지원금과 정책을 찾아주는 SaaS 프로젝트입니다.

> 몰라서 놓치는 혜택을 없애는 것.

MVP는 생성형 AI가 아닌 검수된 정책 데이터와 규칙 기반 매칭으로 시작합니다.

## 현재 상태

- localhost에서 실행되는 React/vinext 정책 추천 화면
- 공식 출처를 검수한 10개 `rule_ready` 정책과 3값 룰 엔진
- 추천 이유·추가 확인 조건·공식 신청 링크 제공
- 2026년 가구원 수별 예상 기준 중위소득 비율 계산
- 정부24 전체 혜택 1만여 건 수집·정규화·D1 upsert 파이프라인
- 실제 10,964건의 공식 조건 코드 기반 1차 후보 추천과 이유 표시
- 사용자 결과에서는 가능성 낮은 정책을 제외

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3002`를 연다.

정부24 전체 카탈로그 적재는 [동기화 안내](./docs/catalog-sync.md)를 따른다.

자세한 진행 상황은 [progress.md](./progress.md), 남은 작업은 [todo.md](./todo.md)에서 확인할 수 있습니다.

## 문서

- [제품 기획](./docs/product-brief.md)
- [저장소 구조](./docs/folder-structure.md)
- [정책 10개 조사](./docs/policy-research.md)
- [전체 정책 규모와 수집 전략](./docs/policy-scope.md)
- [사용자 입력 설계](./docs/user-input-schema.md)
- [정책 DB 설계](./docs/database-design.md)
- [정부24 전체 혜택 동기화](./docs/catalog-sync.md)
- [룰 엔진 설계](./docs/rule-engine.md)
- [전체 정책 부분 조건 매칭 결정](./docs/decisions/0004-gov24-partial-eligibility-matching.md)
- [전체 문서 인덱스](./docs/README.md)
