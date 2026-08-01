import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CatalogSearch } from "../../app/components/CatalogSearch";

describe("전체 혜택 검색", () => {
  it("검색어로 D1 카탈로그를 조회하고 숨은 정책의 공식 링크를 보여준다", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              id: "gov24:GOV24-001",
              name: "숨은 지역 출산 지원",
              summary: "지역 출산 가정의 생활 안정을 지원합니다.",
              providerName: "예시시",
              serviceField: "임신·출산",
              supportType: "현금",
              scope: "regional",
              detailUrl: "https://www.gov.kr/example/GOV24-001",
            },
          ],
          count: 1,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<CatalogSearch />);

    await user.type(screen.getByLabelText("전체 혜택 검색어"), "출산");
    await user.click(screen.getByRole("button", { name: "검색" }));

    expect(await screen.findByText("숨은 지역 출산 지원")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /공식 상세 보기/ })).toHaveAttribute(
      "href",
      "https://www.gov.kr/example/GOV24-001",
    );
    expect(screen.getByText(/자격을 확정한 추천 결과가 아니에요/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/catalog?q=%EC%B6%9C%EC%82%B0");
  });
});
