# Find Policy GPT

사용자가 자신의 상황을 한 번 입력하면 받을 가능성이 있는 정부 지원금과 정책을 찾아주는 SaaS 프로젝트입니다.

> 몰라서 놓치는 혜택을 없애는 것.

MVP는 생성형 AI가 아닌 검수된 정책 데이터와 규칙 기반 매칭으로 시작합니다.

## 현재 상태

- 제품·데이터 모델 0차 설계 완료
- 대표 정책 10개 공식 출처 조사 완료
- 중복 질문을 제거한 점진형 사용자 입력 설계 완료
- PostgreSQL + 정책 버전 + JSONB 룰 구조 설계 완료
- 실행 가능한 애플리케이션과 DB 마이그레이션은 아직 미구현

자세한 진행 상황은 [progress.md](./progress.md), 남은 작업은 [todo.md](./todo.md)에서 확인할 수 있습니다.

## 문서

- [제품 기획](./docs/product-brief.md)
- [저장소 구조](./docs/folder-structure.md)
- [정책 10개 조사](./docs/policy-research.md)
- [전체 정책 규모와 수집 전략](./docs/policy-scope.md)
- [사용자 입력 설계](./docs/user-input-schema.md)
- [정책 DB 설계](./docs/database-design.md)
- [룰 엔진 설계](./docs/rule-engine.md)
- [전체 문서 인덱스](./docs/README.md)
