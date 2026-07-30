import { describe, expect, it } from "vitest";
import {
  evaluateCondition,
  matchPolicy,
} from "../../packages/policy-engine/src/rule-engine";
import type { ConditionNode } from "../../packages/shared/src";

describe("policy rule engine", () => {
  const newbornRule: ConditionNode = {
    all: [
      {
        field: "hasChildBornWithin2Years",
        label: "최근 2년 내 출산",
        op: "eq",
        value: true,
        reason: "최근 2년 내 출산한 가구입니다.",
        question: "최근 2년 내 출산한 자녀가 있나요?",
      },
      {
        field: "householdHomeCount",
        label: "무주택",
        op: "eq",
        value: 0,
        reason: "가구원이 모두 무주택입니다.",
        question: "본인과 가구원이 소유한 주택은 몇 채인가요?",
      },
    ],
  };

  it("충족한 조건을 정책 추천 이유로 함께 반환한다", () => {
    const result = matchPolicy({
      policyId: "newborn-special-didimdol",
      policyVersionId: "newborn-special-didimdol-v1",
      rule: newbornRule,
      profile: {
        hasChildBornWithin2Years: true,
        householdHomeCount: 0,
      },
    });

    expect(result.status).toBe("eligible");
    expect(result.recommendationReasons).toEqual([
      "최근 2년 내 출산한 가구입니다.",
      "가구원이 모두 무주택입니다.",
    ]);
    expect(result.matched).toHaveLength(2);
    expect(result.unknown).toEqual([]);
  });

  it("입력하지 않은 필수 정보는 탈락 대신 추가 질문으로 돌려준다", () => {
    const result = matchPolicy({
      policyId: "newborn-special-didimdol",
      policyVersionId: "newborn-special-didimdol-v1",
      rule: newbornRule,
      profile: { hasChildBornWithin2Years: true },
    });

    expect(result.status).toBe("needs_review");
    expect(result.recommendationReasons).toEqual([
      "최근 2년 내 출산한 가구입니다.",
    ]);
    expect(result.unknown).toEqual([
      expect.objectContaining({
        field: "householdHomeCount",
        question: "본인과 가구원이 소유한 주택은 몇 채인가요?",
      }),
    ]);
  });

  it("필수조건이 하나라도 맞지 않으면 가능성 낮음으로 분류한다", () => {
    const result = matchPolicy({
      policyId: "newborn-special-didimdol",
      policyVersionId: "newborn-special-didimdol-v1",
      rule: newbornRule,
      profile: {
        hasChildBornWithin2Years: true,
        householdHomeCount: 1,
      },
    });

    expect(result.status).toBe("unlikely");
    expect(result.unmatched).toEqual([
      expect.objectContaining({
        field: "householdHomeCount",
        message: "무주택 조건을 충족하지 않습니다.",
      }),
    ]);
  });

  it("all, any, not 조합에서 unknown을 false로 취급하지 않는다", () => {
    const rule: ConditionNode = {
      all: [
        {
          any: [
            { field: "age", label: "청년 연령", op: "lte", value: 34 },
            {
              field: "isProtectedYouth",
              label: "보호종료청년",
              op: "eq",
              value: true,
            },
          ],
        },
        {
          not: {
            field: "isHomeowner",
            label: "주택 소유",
            op: "eq",
            value: true,
          },
        },
      ],
    };

    const eligible = evaluateCondition(rule, {
      age: 30,
      isHomeowner: false,
    });
    expect(eligible.value).toBe(true);
    expect(eligible.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "isHomeowner",
          message: "주택 소유 조건을 충족하지 않습니다.",
        }),
      ]),
    );
    expect(evaluateCondition(rule, { isHomeowner: false }).value).toBe(
      "unknown",
    );
    expect(evaluateCondition(rule, { age: 40, isProtectedYouth: false }).value)
      .toBe(false);
  });

  it("중첩 경로, 범위, 포함 연산을 평가한다", () => {
    expect(
      evaluateCondition(
        {
          field: "residence.sidoCode",
          label: "거주 지역",
          op: "in",
          value: ["11", "28", "41"],
        },
        { residence: { sidoCode: "11" } },
      ).value,
    ).toBe(true);

    expect(
      evaluateCondition(
        {
          field: "householdIncomeAnnual",
          label: "가구소득",
          op: "between",
          value: [30_000_000, 80_000_000],
        },
        { householdIncomeAnnual: 80_000_000 },
      ).value,
    ).toBe(true);
  });
});
