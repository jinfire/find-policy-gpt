import { describe, expect, it } from "vitest";
import { recommendPolicies } from "../../packages/policy-engine/src/recommend";

describe("recommendPolicies", () => {
  it("사용자 입력을 한 번 파생한 뒤 볼 가치가 있는 정책과 추천 이유만 반환한다", () => {
    const results = recommendPolicies(
      {
        birthDate: "1992-05-10",
        residence: { sidoCode: "11", sigunguCode: "11680" },
        maritalStatus: "married",
        marriageDate: "2024-04-20",
        applicantIncomeAnnual: 40_000_000,
        spouseIncomeAnnual: 30_000_000,
        householdNetAssets: 200_000_000,
        householdMembers: [],
        householdHomeCount: 0,
        isHouseholdHead: true,
        jobSeeking: false,
        children: [
          {
            birthDate: "2025-12-15",
            relationshipType: "birth",
            birthOrder: 1,
            nationalityStatus: "korean",
            residentRegistrationStatus: "registered",
          },
        ],
      },
      new Date("2026-07-30T00:00:00+09:00"),
    );

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((result) => result.match.status !== "unlikely"),
    ).toBe(true);
    const firstMeeting = results.find(
      (result) => result.policy.id === "first-meeting-voucher",
    );
    expect(firstMeeting?.match.status).toBe("eligible");
    expect(firstMeeting?.match.recommendationReasons).toContain(
      "출생 후 2년이 지나지 않은 자녀가 있습니다.",
    );
    expect(firstMeeting?.policy.application.officialUrl).toMatch(
      /^https:\/\//,
    );

    const didimdol = results.find((result) => result.policy.id === "didimdol");
    const missingQuestions = didimdol?.match.unknown.map(
      (condition) => condition.question,
    );
    expect(new Set(missingQuestions).size).toBe(missingQuestions?.length);
  });
});
