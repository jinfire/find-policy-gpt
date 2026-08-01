import { describe, expect, it } from "vitest";
import { deriveProfile } from "../../packages/policy-engine/src/derive-profile";

describe("deriveProfile", () => {
  const asOf = new Date("2026-07-30T00:00:00+09:00");

  it("생년월일 하나로 만 나이와 성년 여부를 계산한다", () => {
    const result = deriveProfile(
      {
        birthDate: "1998-08-02",
        residence: { sidoCode: "11", sigunguCode: "11680" },
        householdMembers: [],
        children: [],
      },
      asOf,
    );

    expect(result.age).toBe(27);
    expect(result.isAdult).toBe(true);
  });

  it("혼인신고일 하나로 혼인 개월 수와 신혼 여부를 계산한다", () => {
    const result = deriveProfile(
      {
        birthDate: "1990-01-01",
        maritalStatus: "married",
        marriageDate: "2021-07-15",
        residence: { sidoCode: "26", sigunguCode: "26440" },
        householdMembers: [],
        children: [],
      },
      asOf,
    );

    expect(result.marriageMonths).toBe(60);
    expect(result.isNewlywedWithin7Years).toBe(true);
  });

  it("자녀 생년월일로 자녀 수, 막내 월령, 최근 2년 내 출산 여부를 계산한다", () => {
    const result = deriveProfile(
      {
        birthDate: "1990-01-01",
        residence: { sidoCode: "11", sigunguCode: "11680" },
        householdMembers: [],
        children: [
          { birthDate: "2020-03-01", relationshipType: "birth" },
          { birthDate: "2025-12-15", relationshipType: "birth" },
        ],
      },
      asOf,
    );

    expect(result.childCount).toBe(2);
    expect(result.minorChildCount).toBe(2);
    expect(result.youngestChildAgeMonths).toBe(7);
    expect(result.hasChildBornWithin2Years).toBe(true);
  });

  it("거주지 코드로 수도권 여부를 계산한다", () => {
    const seoul = deriveProfile(
      {
        birthDate: "1990-01-01",
        residence: { sidoCode: "11", sigunguCode: "11680" },
        householdMembers: [],
        children: [],
      },
      asOf,
    );
    const busan = deriveProfile(
      {
        birthDate: "1990-01-01",
        residence: { sidoCode: "26", sigunguCode: "26440" },
        householdMembers: [],
        children: [],
      },
      asOf,
    );

    expect(seoul.isCapitalRegion).toBe(true);
    expect(busan.isCapitalRegion).toBe(false);
  });

  it("가구원별 소득을 합산해 부부합산·가구합산 소득을 만든다", () => {
    const result = deriveProfile(
      {
        birthDate: "1990-01-01",
        residence: { sidoCode: "11", sigunguCode: "11680" },
        applicantIncomeAnnual: 40_000_000,
        spouseIncomeAnnual: 30_000_000,
        householdMembers: [{ relationship: "parent", incomeAnnual: 10_000_000 }],
        children: [],
      },
      asOf,
    );

    expect(result.coupleIncomeAnnual).toBe(70_000_000);
    expect(result.householdIncomeAnnual).toBe(80_000_000);
    expect(result.householdSize).toBe(3);
    expect(result.householdMedianIncomeRatio).toBe(124.4);
  });

  it("기혼자의 배우자 소득이 비어 있으면 합산소득을 추측하지 않는다", () => {
    const result = deriveProfile(
      {
        birthDate: "1990-01-01",
        maritalStatus: "married",
        residence: { sidoCode: "11", sigunguCode: "11680" },
        applicantIncomeAnnual: 40_000_000,
        householdMembers: [],
        children: [],
      },
      asOf,
    );

    expect(result.coupleIncomeAnnual).toBeUndefined();
    expect(result.householdIncomeAnnual).toBeUndefined();
  });

  it("막내 자녀의 자격정보와 3개월 이내 결혼예정 여부를 파생한다", () => {
    const result = deriveProfile(
      {
        birthDate: "1990-01-01",
        maritalStatus: "planned",
        plannedMarriageDate: "2026-09-30",
        residence: { sidoCode: "11", sigunguCode: "11680" },
        householdMembers: [],
        children: [
          {
            birthDate: "2025-12-15",
            relationshipType: "birth",
            birthOrder: 2,
            nationalityStatus: "korean",
            residentRegistrationStatus: "registered",
          },
        ],
      },
      asOf,
    );

    expect(result.plannedMarriageWithin3Months).toBe(true);
    expect(result.youngestChildBirthOrder).toBe(2);
    expect(result.youngestChildNationalityStatus).toBe("korean");
    expect(result.youngestChildResidentRegistered).toBe(true);
  });
});
