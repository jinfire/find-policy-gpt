import { describe, expect, it } from "vitest";
import {
  calculateMedianIncomeRatio,
  getMonthlyMedianIncome,
} from "../../packages/policy-engine/src/median-income";

describe("2026 기준 중위소득", () => {
  it("보건복지부가 고시한 가구원 수별 월 기준액을 반환한다", () => {
    expect(getMonthlyMedianIncome(1, 2026)).toBe(2_564_238);
    expect(getMonthlyMedianIncome(4, 2026)).toBe(6_494_738);
    expect(getMonthlyMedianIncome(7, 2026)).toBe(9_515_150);
  });

  it("8인 이상은 6인과 7인의 차액을 인원마다 더한다", () => {
    expect(getMonthlyMedianIncome(8, 2026)).toBe(10_474_348);
  });

  it("연 가구소득을 월소득으로 바꿔 중위소득 비율을 소수 첫째 자리로 계산한다", () => {
    expect(
      calculateMedianIncomeRatio({
        householdIncomeAnnual: 48_000_000,
        householdSize: 2,
        year: 2026,
      }),
    ).toBe(95.3);
  });

  it("소득이나 가구원 수가 없으면 비율을 추정하지 않는다", () => {
    expect(
      calculateMedianIncomeRatio({
        householdIncomeAnnual: undefined,
        householdSize: 2,
        year: 2026,
      }),
    ).toBeUndefined();
    expect(
      calculateMedianIncomeRatio({
        householdIncomeAnnual: 48_000_000,
        householdSize: 0,
        year: 2026,
      }),
    ).toBeUndefined();
  });
});
