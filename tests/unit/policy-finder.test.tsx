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
});
