import { render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PolicyFinder } from "../../app/components/PolicyFinder";

function catalogResponse(overrides: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({
      catalogCount: 10_964,
      candidateCount: 0,
      results: [],
      ...overrides,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

async function fillBasic(
  user: UserEvent,
  options: { sido?: string; sigungu?: string; married?: boolean } = {},
) {
  await user.type(screen.getByLabelText("생년월일"), "1992-05-10");
  if (options.sido) {
    await user.selectOptions(screen.getByLabelText("시·도"), options.sido);
  }
  await user.selectOptions(
    screen.getByLabelText("시·군·구"),
    options.sigungu ?? "마포구",
  );
  if (options.married) {
    await user.selectOptions(screen.getByLabelText("혼인 상태"), "married");
    await user.type(screen.getByLabelText("혼인신고일"), "2024-04-20");
  }
  await user.click(screen.getByRole("button", { name: "다음" }));
}

async function fillFamily(
  user: UserEvent,
  options: {
    householdSize?: string;
    applicantIncome?: string;
    spouseIncome?: string;
    childCount?: string;
  } = {},
) {
  await user.type(
    screen.getByLabelText(/본인 연소득/),
    options.applicantIncome ?? "4000",
  );
  if (options.spouseIncome) {
    await user.type(
      screen.getByLabelText(/배우자 연소득/),
      options.spouseIncome,
    );
  }
  await user.type(
    screen.getByLabelText(/가구원 수/),
    options.householdSize ?? "1",
  );
  if (options.childCount) {
    await user.clear(screen.getByLabelText("총 자녀 수"));
    await user.type(screen.getByLabelText("총 자녀 수"), options.childCount);
    await user.type(
      screen.getByLabelText("가장 어린 자녀 생년월일"),
      "2025-12-15",
    );
  }
  await user.click(screen.getByRole("button", { name: "다음" }));
}

async function fillOccupation(user: UserEvent, occupation = "employee") {
  await user.selectOptions(screen.getByLabelText("현재 직업·소속"), occupation);
  await user.click(screen.getByRole("button", { name: "다음" }));
}

describe("PolicyFinder", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(catalogResponse()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("모든 날짜 항목을 달력 선택 입력으로 제공한다", async () => {
    const user = userEvent.setup();
    render(<PolicyFinder />);

    expect(screen.getByLabelText("생년월일")).toHaveAttribute("type", "date");

    await user.selectOptions(screen.getByLabelText("혼인 상태"), "married");
    expect(screen.getByLabelText("혼인신고일")).toHaveAttribute("type", "date");

    await user.selectOptions(screen.getByLabelText("혼인 상태"), "planned");
    expect(screen.getByLabelText("결혼 예정일")).toHaveAttribute("type", "date");

    await user.selectOptions(screen.getByLabelText("혼인 상태"), "single");
    await user.type(screen.getByLabelText("생년월일"), "1992-05-10");
    await user.click(screen.getByRole("button", { name: "다음" }));
    await user.clear(screen.getByLabelText("총 자녀 수"));
    await user.type(screen.getByLabelText("총 자녀 수"), "1");

    expect(screen.getByLabelText("가장 어린 자녀 생년월일")).toHaveAttribute(
      "type",
      "date",
    );
  });

  it("중위소득은 입력 중 숨기고 결과 화면에서만 보여준다", async () => {
    const user = userEvent.setup();
    render(<PolicyFinder />);

    await fillBasic(user);
    await user.type(screen.getByLabelText(/본인 연소득/), "4000");
    await user.type(screen.getByLabelText(/가구원 수/), "1");

    expect(screen.queryByText("예상 기준 중위소득 130.0%")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다음" }));
    await fillOccupation(user);
    await user.click(screen.getByRole("button", { name: "내 혜택 결과 보기" }));

    expect(screen.getByText("예상 기준 중위소득 130.0%")).toBeInTheDocument();
    expect(screen.getByText(/실제 소득인정액과 다를 수 있어요/)).toBeInTheDocument();
  });

  it("추천 결과에서 가능성 낮은 정책과 외부 제보 버튼을 보여주지 않는다", async () => {
    const user = userEvent.setup();
    render(<PolicyFinder />);

    await fillBasic(user);
    await fillFamily(user);
    await fillOccupation(user);
    await user.click(screen.getByRole("button", { name: "내 혜택 결과 보기" }));

    expect(screen.queryByText(/가능성 낮은 정책/)).not.toBeInTheDocument();
    expect(screen.queryByText("정보가 다르다면 알려주세요")).not.toBeInTheDocument();
  });

  it("가구원 수와 총 자녀 수를 각각 직접 받고 출생 순위로 추론하지 않는다", async () => {
    const user = userEvent.setup();
    render(<PolicyFinder />);

    await fillBasic(user, { married: true });
    await fillFamily(user, {
      applicantIncome: "4000",
      spouseIncome: "3000",
      householdSize: "3",
      childCount: "2",
    });

    expect(screen.queryByLabelText("출생 순위")).not.toBeInTheDocument();

    await fillOccupation(user);
    await user.click(screen.getByRole("button", { name: "내 혜택 결과 보기" }));

    expect(screen.getByText("2026년 · 3인 가구 기준")).toBeInTheDocument();
    expect(screen.getByText("예상 기준 중위소득 108.9%")).toBeInTheDocument();
  });

  it("사립학교 교직원을 선택한 경우에만 사학연금 가입 여부를 묻는다", async () => {
    const user = userEvent.setup();
    render(<PolicyFinder />);

    await fillBasic(user);
    await fillFamily(user);

    await user.selectOptions(screen.getByLabelText("현재 직업·소속"), "employee");
    expect(screen.queryByLabelText("사학연금에 가입했어요")).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("현재 직업·소속"),
      "private_school_employee",
    );
    expect(screen.getByLabelText("사학연금에 가입했어요")).toBeInTheDocument();
  });

  it("정확한 지역·가족·직업·특수조건을 보내고 모든 정책을 한 목록으로 보여준다", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      catalogResponse({
        candidateCount: 1,
        results: [
          {
            id: "gov24:hidden-1",
            name: "숨은 청년 구직 지원",
            summary: "지역 청년의 구직 활동을 지원합니다.",
            providerName: "경기도 여주시",
            audienceType: "개인",
            serviceField: "고용·창업",
            supportType: "현금",
            benefitText: "구직 활동비 지원",
            scope: "regional",
            detailUrl: "https://www.gov.kr/example/hidden-1",
            onlineApplicationUrl: null,
            reasons: ["현재 구직 중이라는 조건과 일치합니다."],
            additionalChecks: [
              "정확한 세부 선정기준은 공식 원문에서 확인해주세요.",
            ],
            score: 20,
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<PolicyFinder />);

    await fillBasic(user, { sido: "41", sigungu: "여주시" });
    await user.type(screen.getByLabelText(/본인 연소득/), "4000");
    await user.type(screen.getByLabelText(/가구원 수/), "3");
    await user.clear(screen.getByLabelText("총 자녀 수"));
    await user.type(screen.getByLabelText("총 자녀 수"), "2");
    await user.type(
      screen.getByLabelText("가장 어린 자녀 생년월일"),
      "2025-12-15",
    );
    await user.click(screen.getByRole("button", { name: "다음" }));
    await fillOccupation(user, "job_seeker");
    await user.click(screen.getByLabelText("한부모·조손가정이에요"));
    await user.type(screen.getByLabelText("가구 전체 보유 주택 수"), "0");
    await user.click(screen.getByRole("button", { name: "내 혜택 결과 보기" }));

    expect(await screen.findByText("숨은 청년 구직 지원")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "맞춤 추천 정책" })).toBeInTheDocument();
    expect(screen.queryByText("직접 검토한 주요 정책")).not.toBeInTheDocument();
    expect(screen.queryByText(/정부24 전체 DB 1차 매칭/)).not.toBeInTheDocument();
    expect(screen.getByText("현재 구직 중이라는 조건과 일치합니다.")).toBeInTheDocument();

    const request = fetchMock.mock.calls[0];
    expect(request[0]).toBe("/api/catalog/recommendations");
    const sent = JSON.parse((request[1] as RequestInit).body as string);
    expect(sent).toEqual(
      expect.objectContaining({
        age: expect.any(Number),
        householdSize: 3,
        childCount: 2,
        hasChildren: true,
        hasAdoptedChild: false,
        occupation: "job_seeker",
        jobSeeking: true,
        privateSchoolPensionMember: false,
        singleParentFamily: true,
        residenceSidoName: "경기",
        residenceSigunguName: "여주시",
        householdHomeCount: 0,
      }),
    );
    expect(sent).not.toHaveProperty("birthDate");
    expect(sent).not.toHaveProperty("applicantIncomeAnnual");
  });
});
