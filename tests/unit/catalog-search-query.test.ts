import { describe, expect, it } from "vitest";
import { parseCatalogSearchParams } from "../../packages/policy-catalog/src/search";

describe("전체 혜택 검색 파라미터", () => {
  it("검색어를 정리하고 허용된 범위와 제한만 받는다", () => {
    expect(
      parseCatalogSearchParams(
        new URL("https://local.test/api/catalog?q=%20%EC%B6%9C%EC%82%B0%20&scope=regional&limit=500"),
      ),
    ).toEqual({ query: "출산", scope: "regional", limit: 50 });
  });

  it("두 글자 미만 검색어는 거부한다", () => {
    expect(() =>
      parseCatalogSearchParams(new URL("https://local.test/api/catalog?q=%EC%B6%9C")),
    ).toThrow("두 글자 이상");
  });
});
