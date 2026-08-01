import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PolicyFinder } from "../../app/components/PolicyFinder";

describe("PolicyFinder", () => {
  it("소득 입력 즉시 예상 기준 중위소득 비율을 보여준다", async () => {
    const user = userEvent.setup();
    render(<PolicyFinder />);

    await user.type(screen.getByLabelText("생년월일"), "1992-05-10");
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.type(screen.getByLabelText(/본인 연소득/), "4000");

    expect(
      screen.getByText("예상 기준 중위소득 130.0%"),
    ).toBeInTheDocument();
    expect(screen.getByText(/실제 소득인정액과 다를 수 있어요/)).toBeInTheDocument();
  });
});
