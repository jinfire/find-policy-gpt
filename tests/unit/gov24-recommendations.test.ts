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
    providerType: "중앙행정기관",
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
        residenceSigunguName: "마포구",
        residenceMonths: 48,
        occupation: "job_seeker",
        pregnant: false,
        hasAdoptedChild: false,
        privateSchoolPensionMember: false,
        hasDisability: false,
        singleParentFamily: false,
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
      residenceSigunguName: "마포구",
      residenceMonths: 48,
      occupation: "job_seeker",
      pregnant: false,
      hasAdoptedChild: false,
      privateSchoolPensionMember: false,
      hasDisability: false,
      singleParentFamily: false,
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

  it("시군구 정책은 입력한 시군구가 정확히 일치할 때만 추천한다", () => {
    const regional = service({
      id: "gov24:gwacheon",
      name: "과천시 청년 지원",
      providerName: "경기도 과천시",
      providerType: "시군구",
      scope: "regional",
    });

    expect(
      recommendGov24Services([regional], {
        age: 30,
        householdMedianIncomeRatio: 85,
        jobSeeking: true,
        residenceSidoName: "경기",
        residenceSigunguName: "여주시",
      }),
    ).toHaveLength(0);
    expect(
      recommendGov24Services([regional], {
        age: 30,
        householdMedianIncomeRatio: 85,
        jobSeeking: true,
        residenceSidoName: "경기",
        residenceSigunguName: "과천시",
      }),
    ).toHaveLength(1);
  });

  it("정책 원문이 3자녀 이상을 요구하면 자녀 2명 가구를 제외한다", () => {
    const threeChildren = service({
      id: "gov24:three-children",
      name: "3자녀 이상 가정 지원",
      targetText: "신청일 기준 자녀가 3명 이상인 가구",
      eligibilityProfile: parseGov24Eligibility({ JA0411: "Y" }),
    });

    expect(
      recommendGov24Services([threeChildren], {
        age: 35,
        childCount: 2,
        residenceSidoName: "서울",
      }),
    ).toHaveLength(0);
    expect(
      recommendGov24Services([threeChildren], {
        age: 35,
        childCount: 3,
        residenceSidoName: "서울",
      })[0].reasons,
    ).toContain("자녀가 3명 이상이어서 정책의 다자녀 조건과 일치합니다.");
  });

  it("입양 전용 정책은 입양 자녀가 없으면 제외한다", () => {
    const adoption = service({
      id: "gov24:adoption",
      name: "입양축하금",
      targetText: "입양 신고를 완료한 입양가정",
      eligibilityProfile: parseGov24Eligibility({ JA0303: "Y" }),
    });

    expect(
      recommendGov24Services([adoption], {
        age: 35,
        childCount: 2,
        hasChildren: true,
        hasAdoptedChild: false,
        residenceSidoName: "서울",
      }),
    ).toHaveLength(0);
    expect(
      recommendGov24Services([adoption], {
        age: 35,
        childCount: 2,
        hasChildren: true,
        hasAdoptedChild: true,
        residenceSidoName: "서울",
      })[0].reasons,
    ).toContain("입양한 자녀가 있어 입양가정 대상 조건과 일치합니다.");
  });

  it("사립학교 교직원·사학연금 전용 정책은 비가입자를 제외한다", () => {
    const privateSchool = service({
      id: "gov24:private-school-pension",
      name: "사립학교 교직원 생활자금 대여",
      providerName: "사립학교교직원연금공단",
      providerType: "공공기관",
      targetText: "사립학교 교직원 중 사학연금 가입자",
      eligibilityProfile: parseGov24Eligibility({ JA0326: "Y" }),
    });

    expect(
      recommendGov24Services([privateSchool], {
        age: 40,
        occupation: "employee",
        privateSchoolPensionMember: false,
        residenceSidoName: "서울",
      }),
    ).toHaveLength(0);
    expect(
      recommendGov24Services([privateSchool], {
        age: 40,
        occupation: "private_school_employee",
        privateSchoolPensionMember: true,
        residenceSidoName: "서울",
      })[0].reasons,
    ).toEqual(
      expect.arrayContaining([
        "사립학교 교직원 대상 조건과 일치합니다.",
        "사학연금 가입자 대상 조건과 일치합니다.",
      ]),
    );
  });

  it("사용자 답변과 일치하는 추천 근거가 하나도 없는 정책은 노출하지 않는다", () => {
    const generic = service({
      id: "gov24:generic",
      name: "일반 생활 정보",
      targetText: "대한민국 국민",
      criteriaText: null,
      eligibilityProfile: parseGov24Eligibility({}),
    });

    expect(
      recommendGov24Services([generic], {
        age: 35,
        residenceSidoName: "서울",
        residenceSigunguName: "마포구",
      }),
    ).toHaveLength(0);
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
