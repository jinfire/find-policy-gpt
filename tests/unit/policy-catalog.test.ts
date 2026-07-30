import { describe, expect, it } from "vitest";
import {
  policyCatalog,
  validatePolicyCatalog,
} from "../../packages/policy-data/src";

describe("policy catalog", () => {
  it("공식 출처가 있는 대표 정책 10개를 스키마에 맞게 제공한다", () => {
    const validation = validatePolicyCatalog(policyCatalog);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(policyCatalog).toHaveLength(10);
    expect(new Set(policyCatalog.map((policy) => policy.id)).size).toBe(10);
  });

  it("모든 정책에 추천 이유를 만들 수 있는 조건 문구가 있다", () => {
    const leaves = (node: unknown): Array<Record<string, unknown>> => {
      if (!node || typeof node !== "object") return [];
      const value = node as Record<string, unknown>;
      if ("field" in value) return [value];
      if (Array.isArray(value.all)) return value.all.flatMap(leaves);
      if (Array.isArray(value.any)) return value.any.flatMap(leaves);
      return "not" in value ? leaves(value.not) : [];
    };

    for (const policy of policyCatalog) {
      const conditions = leaves(policy.eligibilityRule);
      expect(conditions.length).toBeGreaterThan(0);
      expect(
        conditions.every(
          (condition) =>
            typeof condition.reason === "string" &&
            typeof condition.question === "string",
        ),
      ).toBe(true);
    }
  });

  it("각 정책은 HTTPS 공식 신청 링크와 확인일을 가진다", () => {
    for (const policy of policyCatalog) {
      expect(policy.application.officialUrl).toMatch(/^https:\/\//);
      expect(policy.sources.length).toBeGreaterThan(0);
      expect(policy.sources.every((source) => source.verifiedAt)).toBe(true);
    }
  });
});
