import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PolicyFinder } from "../../app/components/PolicyFinder";

describe("PolicyFinder", () => {
  it("중위소득은 입력 중 숨기고 결과 화면에서만 보여준다", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("scrollTo", vi.fn());
    render(<PolicyFinder />);

    await user.type(screen.getByLabelText("생년월일"), "1992-05-10");
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.type(screen.getByLabelText(/본인 연소득/), "4000");
    await user.type(screen.getByLabelText(/가구원 수/), "1");

    expect(
      screen.queryByText("예상 기준 중위소득 130.0%"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "내 혜택 결과 보기" }));

    expect(
      screen.getByText("예상 기준 중위소득 130.0%"),
    ).toBeInTheDocument();
    expect(screen.getByText(/실제 소득인정액과 다를 수 있어요/)).toBeInTheDocument();
  });

  it("추천 결과에서 가능성 낮은 정책과 노출 버튼을 보여주지 않는다", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("scrollTo", vi.fn());
    render(<PolicyFinder />);

    await user.type(screen.getByLabelText("생년월일"), "1992-05-10");
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.type(screen.getByLabelText(/본인 연소득/), "4000");
    await user.type(screen.getByLabelText(/가구원 수/), "1");
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "내 혜택 결과 보기" }));

    expect(screen.queryByText(/가능성 낮은 정책/)).not.toBeInTheDocument();
    expect(
      screen.queryByText("정보가 다르다면 알려주세요"),
    ).not.toBeInTheDocument();
  });

  it("직접 입력한 가구원 수로 중위소득을 계산한다", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("scrollTo", vi.fn());
    render(<PolicyFinder />);

    await user.type(screen.getByLabelText("생년월일"), "1992-05-10");
    await user.selectOptions(screen.getByLabelText("혼인 상태"), "married");
    await user.type(screen.getByLabelText("혼인신고일"), "2024-04-20");
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.type(screen.getByLabelText(/본인 연소득/), "4000");
    await user.type(screen.getByLabelText(/배우자 연소득/), "3000");
    await user.type(screen.getByLabelText(/가구원 수/), "3");
    await user.click(screen.getByLabelText("자녀가 있어요"));
    await user.type(
      screen.getByLabelText("가장 어린 자녀 생년월일"),
      "2025-12-15",
    );
    await user.selectOptions(screen.getByLabelText("출생 순위"), "2");
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.click(screen.getByRole("button", { name: "내 혜택 결과 보기" }));

    expect(screen.getByText("2026년 · 3인 가구 기준")).toBeInTheDocument();
    expect(
      screen.getByText("예상 기준 중위소득 108.9%"),
    ).toBeInTheDocument();
  });

  it("전체 정부24 DB에서도 기본 조건 후보와 추천 이유를 보여준다", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("scrollTo", vi.fn());
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          catalogCount: 10_964,
          candidateCount: 137,
          results: [
            {
              id: "gov24:hidden-1",
              name: "숨은 청년 구직 지원",
              summary: "지역 청년의 구직 활동을 지원합니다.",
              providerName: "서울특별시",
              audienceType: "개인",
              serviceField: "고용·창업",
              supportType: "현금",
              benefitText: "구직 활동비 지원",
              scope: "regional",
              detailUrl: "https://www.gov.kr/example/hidden-1",
              onlineApplicationUrl: null,
              reasons: [
                "대상 연령인 만 19~39세 범위에 해당합니다.",
                "현재 구직 중이라는 조건과 일치합니다.",
              ],
              additionalChecks: [
                "정확한 세부 선정기준은 공식 원문에서 확인해주세요.",
              ],
              score: 40,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<PolicyFinder />);

    await user.type(screen.getByLabelText("생년월일"), "1992-05-10");
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.type(screen.getByLabelText(/본인 연소득/), "4000");
    await user.type(screen.getByLabelText(/가구원 수/), "1");
    await user.click(screen.getByLabelText("현재 구직 중이에요"));
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.type(screen.getByLabelText("가구 전체 보유 주택 수"), "0");
    await user.click(screen.getByRole("button", { name: "내 혜택 결과 보기" }));

    expect(await screen.findByText("숨은 청년 구직 지원")).toBeInTheDocument();
    expect(screen.getByText(/10,964개 전체 정책 중 137개/)).toBeInTheDocument();
    expect(
      screen.getByText("현재 구직 중이라는 조건과 일치합니다."),
    ).toBeInTheDocument();

    const request = fetchMock.mock.calls[0];
    expect(request[0]).toBe("/api/catalog/recommendations");
    const sent = JSON.parse((request[1] as RequestInit).body as string);
    expect(sent).toEqual(
      expect.objectContaining({
        age: expect.any(Number),
        householdSize: 1,
        jobSeeking: true,
        householdHomeCount: 0,
        residenceSidoName: "서울",
      }),
    );
    expect(sent).not.toHaveProperty("birthDate");
    expect(sent).not.toHaveProperty("applicantIncomeAnnual");
    expect(
      screen.getByText(/원본 입력값은 브라우저에서 계산하고, 매칭용 파생값만 서버로 보내며 저장하지 않습니다/),
    ).toBeInTheDocument();
  });
});
