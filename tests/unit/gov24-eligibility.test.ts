import { describe, expect, it } from "vitest";
import {
  matchGov24Eligibility,
  parseGov24Eligibility,
} from "../../packages/policy-catalog/src/eligibility";

describe("정부24 구조화 지원조건", () => {
  it("공식 조건 코드를 성별·연령·소득·생애상황·가구특성으로 분리한다", () => {
    const profile = parseGov24Eligibility({
      JA0101: "N",
      JA0102: "Y",
      JA0110: 19,
      JA0111: 34,
      JA0201: "N",
      JA0202: "N",
      JA0203: "Y",
      JA0204: "N",
      JA0205: "N",
      JA0327: "Y",
      JA0404: "Y",
      JA1102: "Y",
    });

    expect(profile).toEqual(
      expect.objectContaining({
        genders: ["female"],
        minAge: 19,
        maxAge: 34,
        medianIncomeBands: ["76_100"],
        personalConditionCodes: ["JA0327"],
        householdConditionCodes: ["JA0404"],
        businessStatusCodes: ["JA1102"],
      }),
    );
  });

  it("확인된 연령이나 소득이 정책 범위 밖이면 후보에서 제외한다", () => {
    const eligibility = parseGov24Eligibility({
      JA0101: "Y",
      JA0102: "Y",
      JA0110: 19,
      JA0111: 34,
      JA0201: "Y",
      JA0202: "Y",
    });

    expect(
      matchGov24Eligibility(eligibility, {
        age: 40,
        householdMedianIncomeRatio: 60,
      }).status,
    ).toBe("unlikely");
    expect(
      matchGov24Eligibility(eligibility, {
        age: 30,
        householdMedianIncomeRatio: 90,
      }).status,
    ).toBe("unlikely");
  });

  it("입력값과 맞는 구조화 조건을 추천 이유로 반환한다", () => {
    const eligibility = parseGov24Eligibility({
      JA0102: "Y",
      JA0110: 19,
      JA0111: 39,
      JA0203: "Y",
      JA0327: "Y",
      JA0412: "Y",
    });
    const match = matchGov24Eligibility(eligibility, {
      age: 30,
      gender: "female",
      householdMedianIncomeRatio: 85,
      jobSeeking: true,
      householdHomeCount: 0,
    });

    expect(match.status).toBe("candidate");
    expect(match.reasons).toEqual(
      expect.arrayContaining([
        "대상 연령인 만 19~39세 범위에 해당합니다.",
        "예상 기준 중위소득이 정책의 76~100% 구간에 해당합니다.",
        "현재 구직 중이라는 조건과 일치합니다.",
        "입력한 가구 주택 수 기준으로 무주택세대 조건과 일치합니다.",
      ]),
    );
  });

  it("입력으로 확인할 수 없는 특수조건은 탈락시키지 않고 추가 확인으로 남긴다", () => {
    const eligibility = parseGov24Eligibility({
      JA0101: "Y",
      JA0102: "Y",
      JA0110: 0,
      JA0111: 120,
      JA0201: "Y",
      JA0202: "Y",
      JA0203: "Y",
      JA0204: "Y",
      JA0205: "Y",
      JA0328: "Y",
      JA0403: "Y",
    });
    const match = matchGov24Eligibility(eligibility, {
      age: 30,
      householdMedianIncomeRatio: 85,
      householdSize: 3,
    });

    expect(match.status).toBe("candidate");
    expect(match.additionalChecks).toEqual(
      expect.arrayContaining(["장애인 대상 조건을 확인해주세요.", "한부모가정/조손가정 대상 조건을 확인해주세요."]),
    );
  });

  it("모든 값이 선택된 범주는 제한 없는 조건으로 처리한다", () => {
    const eligibility = parseGov24Eligibility({
      JA0101: "Y",
      JA0102: "Y",
      JA0110: 0,
      JA0111: 120,
      JA0201: "Y",
      JA0202: "Y",
      JA0203: "Y",
      JA0204: "Y",
      JA0205: "Y",
      JA0322: "Y",
      JA0410: "Y",
    });
    const match = matchGov24Eligibility(eligibility, { age: 30 });

    expect(match.status).toBe("candidate");
    expect(match.additionalChecks).toEqual([]);
  });

  it("명시적으로 답한 임신·장애·한부모·직업 조건으로 후보를 거른다", () => {
    expect(
      matchGov24Eligibility(parseGov24Eligibility({ JA0302: "Y" }), {
        age: 30,
        pregnant: false,
      }).status,
    ).toBe("unlikely");

    const match = matchGov24Eligibility(
      parseGov24Eligibility({ JA0328: "Y", JA0403: "Y" }),
      {
        age: 30,
        hasDisability: true,
        singleParentFamily: true,
      },
    );
    expect(match.status).toBe("candidate");
    expect(match.reasons).toEqual(
      expect.arrayContaining([
        "장애인 대상 조건과 일치합니다.",
        "한부모가정/조손가정 대상 조건과 일치합니다.",
      ]),
    );
  });
});
