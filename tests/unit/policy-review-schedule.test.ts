import { describe, expect, it } from "vitest";
import {
  getLatestRequiredReviewWindow,
  getNextReviewWindow,
  isPolicySourceCurrent,
} from "../../packages/policy-ops/src/review-schedule";

describe("정책 6월·12월 정기 검토", () => {
  it("8월에는 같은 해 6월 검토가 최신 필수 주기다", () => {
    expect(
      getLatestRequiredReviewWindow(new Date("2026-08-01T12:00:00+09:00")),
    ).toEqual({
      year: 2026,
      month: 6,
      startsOn: "2026-06-01",
      endsOn: "2026-06-30",
    });
    expect(getNextReviewWindow(new Date("2026-08-01T12:00:00+09:00"))).toEqual({
      year: 2026,
      month: 12,
      startsOn: "2026-12-01",
      endsOn: "2026-12-31",
    });
  });

  it("6월 검토 기간 중에는 직전 12월 검토까지만 요구한다", () => {
    expect(
      getLatestRequiredReviewWindow(new Date("2026-06-15T12:00:00+09:00")),
    ).toMatchObject({ year: 2025, month: 12, startsOn: "2025-12-01" });
    expect(getNextReviewWindow(new Date("2026-06-15T12:00:00+09:00"))).toMatchObject({
      year: 2026,
      month: 6,
      endsOn: "2026-06-30",
    });
  });

  it("필수 검토월 안에 확인한 출처만 최신으로 인정한다", () => {
    const asOf = new Date("2026-08-01T12:00:00+09:00");
    expect(isPolicySourceCurrent("2026-05-31", asOf)).toBe(false);
    expect(isPolicySourceCurrent("2026-06-01", asOf)).toBe(true);
    expect(isPolicySourceCurrent("2026-07-30", asOf)).toBe(true);
  });

  it("새해에는 직전 12월 검토를 요구한다", () => {
    expect(
      getLatestRequiredReviewWindow(new Date("2027-01-01T00:00:00+09:00")),
    ).toMatchObject({ year: 2026, month: 12, startsOn: "2026-12-01" });
  });
});
