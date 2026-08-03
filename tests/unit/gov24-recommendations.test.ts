import { describe, expect, it } from "vitest";
import {
  parseGov24RecommendationInput,
  recommendGov24Services,
  type Gov24RecommendationService,
} from "../../packages/policy-catalog/src/recommendations";
import { parseGov24Eligibility } from "../../packages/policy-catalog/src/eligibility";

function service(
  overrides: Partial<Gov24RecommendationService> = {},
): Gov24RecommendationService {
  return {
    id: "gov24:1",
    name: "청년 구직 지원",
    summary: "청년의 구직 활동을 지원합니다.",
    providerName: "고용노동부",
    audienceType: "개인",
    serviceField: "고용·창업",
    supportType: "현금",
    benefitText: "구직 활동비 지원",
    targetText: "만 19세부터 34세까지의 구직자",
    criteriaText: "세부 심사를 거쳐 선정",
    scope: "national",
    detailUrl: "https://www.gov.kr/example/1",
    onlineApplicationUrl: null,
    viewCount: 10,
    eligibilityProfile: parseGov24Eligibility({
      JA0101: "Y",
      JA0102: "Y",
      JA0110: 19,
      JA0111: 34,
      JA0203: "Y",
      JA0327: "Y",
    }),
    ...overrides,
  };
}

describe("정부24 전체 정책 추천", () => {
  it("개인정보 원문 대신 매칭에 필요한 파생값만 검증해 받는다", () => {
    expect(
      parseGov24RecommendationInput({
        age: 30,
        gender: "female",
        householdMedianIncomeRatio: 84.7,
        householdSize: 3,
        childCount: 2,
        hasChildren: true,
        jobSeeking: true,
        householdHomeCount: 0,
        residenceSidoName: "서울",
        birthDate: "1996-01-01",
      }),
    ).toEqual({
      age: 30,
      gender: "female",
      householdMedianIncomeRatio: 84.7,
      householdSize: 3,
      childCount: 2,
      hasChildren: true,
      jobSeeking: true,
      householdHomeCount: 0,
      residenceSidoName: "서울",
    });
  });

  it("연령·소득 불일치와 사업자 정책, 다른 지역 정책은 추천에서 제외한다", () => {
    const recommendations = recommendGov24Services(
      [
        service(),
        service({
          id: "gov24:age-mismatch",
          eligibilityProfile: parseGov24Eligibility({ JA0110: 40, JA0111: 60 }),
        }),
        service({ id: "gov24:business", audienceType: "기업" }),
        service({
          id: "gov24:other-region",
          providerName: "부산광역시",
          scope: "regional",
        }),
      ],
      {
        age: 30,
        householdMedianIncomeRatio: 85,
        jobSeeking: true,
        residenceSidoName: "서울",
      },
    );

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].id).toBe("gov24:1");
  });

  it("구조화 조건이 일치한 이유와 공식 원문 확인사항을 함께 반환한다", () => {
    const [recommendation] = recommendGov24Services(
      [service()],
      {
        age: 30,
        householdMedianIncomeRatio: 85,
        jobSeeking: true,
        residenceSidoName: "서울",
      },
    );

    expect(recommendation.reasons).toEqual(
      expect.arrayContaining([
        "대상 연령인 만 19~34세 범위에 해당합니다.",
        "예상 기준 중위소득이 정책의 76~100% 구간에 해당합니다.",
        "현재 구직 중이라는 조건과 일치합니다.",
      ]),
    );
    expect(recommendation.additionalChecks).toContain(
      "정확한 세부 선정기준은 공식 원문에서 확인해주세요.",
    );
  });

  it("잘못된 나이와 지역명은 요청 단계에서 거부한다", () => {
    expect(() => parseGov24RecommendationInput({ age: 121 })).toThrow("나이");
    expect(() =>
      parseGov24RecommendationInput({ age: 30, residenceSidoName: "임의지역" }),
    ).toThrow("거주 지역");
  });

  it("긴 정부 원문은 결과 카드용 길이로 줄여 반환한다", () => {
    const [recommendation] = recommendGov24Services(
      [service({ summary: "요".repeat(500), benefitText: "혜".repeat(1_000) })],
      {
        age: 30,
        householdMedianIncomeRatio: 85,
        jobSeeking: true,
        residenceSidoName: "서울",
      },
    );

    expect(recommendation.summary.length).toBeLessThanOrEqual(301);
    expect(recommendation.benefitText?.length).toBeLessThanOrEqual(501);
    expect(recommendation.benefitText).toMatch(/…$/);
  });
});
