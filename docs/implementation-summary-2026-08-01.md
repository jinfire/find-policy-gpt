# 2026-08-01 구현·결정 요약

## 제품 결정

1. 유명한 정책만 다루지 않고 정부24의 전체 1만여 개 원본을 수집·검색한다.
2. 전체 원본과 정밀 추천을 분리한다. 원본은 `search_only`, 검수된 10개는 `rule_ready`다.
3. 사용자에게 불필요한 `가능성 낮은 정책`은 결과에서 제외한다.
4. 추천 카드에는 충족한 조건을 근거로 한 추천 이유를 반드시 표시한다.
5. 중복되거나 다른 답에서 계산할 수 있는 질문은 다시 묻지 않는다.
6. 혜택 결과 화면에서 2026년 예상 기준 중위소득 비율을 보여준다.
7. 정기 검토는 매년 6월과 12월에 한다.
8. 개발 확인은 외부 비공개 배포가 아니라 localhost 3002를 사용한다.
9. 개발 저장소로 연결되는 정책 오류 제보 링크는 사용자 화면에 노출하지 않는다.
10. 막내 자녀의 출생 순위로 전체 자녀 수를 추정해 가구원 수에 반영한다.

## 전체 정책 전략

정부24 API의 목록·상세·지원조건을 전부 받아 서비스 ID로 합친다. 전체 레코드는 검색할 수 있지만 자동 자격 확정은 하지 않는다. 지원조건 코드와 사람 검수를 거쳐 `partially_structured`, `rule_ready`로 승격한다.

## DB 설계 요약

| 층 | 테이블 | 역할 |
|---|---|---|
| 원본 | `catalog_sources` | 정부24 등 수집처와 검토 월 |
| 원본 | `catalog_sync_runs` | 수집 성공·실패·건수 이력 |
| 원본 | `source_catalog_services` | 전체 1만여 개 목록·상세·조건·원문 |
| 연결 | `policy_catalog_mappings` | 원본과 검수 정책의 primary/variant/related 관계 |
| 정책 | `policies` | 정책 정체성·상태·카탈로그 수준 |
| 정책 | `policy_versions` | 유효기간·조건 트리·혜택·신청 정보 버전 |
| 정책 | `policy_sources` | 공식 URL·확인일·해시 |
| 운영 | `policy_change_events`, `policy_error_reports` | 변경 검수와 오류 제보 |
| 기준 | `input_field_definitions`, `region_classifications` | 질문 사전과 지역 분류 |
| 사용자 | `users`, `profiles`, `match_runs`, `match_results` | 동의 기반 프로필과 평가 이력 |

원본 API 레코드는 `source_id + source_service_id`로 멱등 upsert한다. 사라진 정책은 삭제하지 않고 비활성화한다. 정밀 정책 조건은 덮어쓰지 않고 새 `policy_version`으로 남긴다.

## 중위소득 계산

가구 연소득을 12로 나눈 뒤 2026년 보건복지부 가구원 수별 월 기준액으로 나누고 소수 첫째 자리까지 표시한다. 자산 환산과 공제가 반영된 공식 `소득인정액`은 아니므로 화면에 추정치 고지를 함께 표시한다.

## 실행 명령

```bash
npm run dev
npm run db:migrate:local
npm run catalog:sync:local
npm test
npm run lint
npx tsc --noEmit
npm run build
```

전체 적재에는 `.env.local`의 `GOV24_SERVICE_KEY`가 필요하다.
