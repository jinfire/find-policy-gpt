# 정부 지원금 SaaS 문서

이 폴더는 제품 방향, 정책 조사, 사용자 입력, DB와 룰 엔진 설계를 한곳에서 관리한다.

## 문서 목록

- [product-brief.md](./product-brief.md): 서비스 목표, MVP, 범위와 원칙
- [folder-structure.md](./folder-structure.md): 저장소 폴더 구조와 각 영역의 책임
- [policy-research.md](./policy-research.md): 2026-07-30 기준 대표 정책 10개 조사
- [policy-scope.md](./policy-scope.md): 보조금24 전체 규모와 단계별 정책 수집 전략
- [user-input-schema.md](./user-input-schema.md): 정책 조건에서 추출한 사용자 입력 항목
- [database-design.md](./database-design.md): 정책 저장 방식과 PostgreSQL 스키마 초안
- [rule-engine.md](./rule-engine.md): AI 없는 조건 매칭 방식
- [decisions/0001-ask-once-derive-reuse.md](./decisions/0001-ask-once-derive-reuse.md): 중복 질문을 제거하는 입력 원칙
- [../progress.md](../progress.md): 현재까지 완료한 작업
- [../todo.md](../todo.md): 우선순위별 남은 작업

## 문서 상태 표기

- `결정`: MVP에서 그대로 구현해도 되는 합의
- `제안`: 구현 전에 한 번 더 선택해야 하는 내용
- `확인 필요`: 공식 기관 심사 또는 최신 공고 확인이 필요한 내용

정책 정보는 법적·금융적 자격 판정이 아니라 사전 탐색용이다. 사용자 화면에는 항상 기준 확인일과 공식 신청 링크를 함께 제공한다.
