import type { Gov24MatchInput } from "./eligibility";

export type Gov24TextEligibilityConstraints = {
  minChildCount?: number;
  minResidenceMonths?: number;
  maxMonthlyIncomeWon?: number;
  maxMonthlyIncomeInclusive?: boolean;
  requiresAdoptedChild: boolean;
  requiresEducationEmployee: boolean;
  requiresPrivateSchoolEmployee: boolean;
  requiresPrivateSchoolPension: boolean;
};

type TextConstraintSource = {
  name: string;
  providerName: string;
  targetText: string | null;
  criteriaText: string | null;
};

export type Gov24TextEligibilityMatch = {
  status: "candidate" | "unlikely";
  reasons: string[];
  additionalChecks: string[];
};

function minimum(values: number[]): number | undefined {
  return values.length > 0 ? Math.min(...values) : undefined;
}

function childThreshold(text: string): number | undefined {
  const values: number[] = [];
  for (const match of text.matchAll(/(?:자녀(?:가|는)?\s*)?(\d+)\s*명\s*이상/g)) {
    const value = Number(match[1]);
    if (value >= 2 && value <= 10) values.push(value);
  }
  for (const match of text.matchAll(/(\d+)\s*자녀(?:\s*이상)?/g)) {
    const value = Number(match[1]);
    if (value >= 2 && value <= 10) values.push(value);
  }
  if (/셋째(?:아|자녀)?\s*이상|세\s*자녀\s*이상/.test(text)) values.push(3);
  if (/둘째(?:아|자녀)?\s*이상|두\s*자녀\s*이상/.test(text)) values.push(2);
  return minimum(values);
}

function residenceThreshold(text: string): number | undefined {
  const values: number[] = [];
  const patterns = [
    /(\d+)\s*년\s*이상.{0,30}(?:거주|주민등록)/g,
    /(?:거주|주민등록).{0,30}?(\d+)\s*년\s*이상/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const years = Number(match[1]);
      if (years > 0 && years <= 100) values.push(years * 12);
    }
  }
  const monthPatterns = [
    /(\d+)\s*개월\s*이상.{0,30}(?:거주|주민등록)/g,
    /(?:거주|주민등록).{0,30}?(\d+)\s*개월\s*이상/g,
  ];
  for (const pattern of monthPatterns) {
    for (const match of text.matchAll(pattern)) {
      const months = Number(match[1]);
      if (months > 0 && months <= 1_200) values.push(months);
    }
  }
  return minimum(values);
}

function monthlyIncomeCeiling(
  text: string,
): { won: number; inclusive: boolean } | undefined {
  const ceilings: Array<{ won: number; inclusive: boolean }> = [];
  for (const match of text.matchAll(
    /월\s*평균\s*보수(?:액)?\s*([\d,]+)\s*만\s*원\s*(미만|이하)/g,
  )) {
    const amountInManwon = Number(match[1].replaceAll(",", ""));
    if (amountInManwon > 0 && amountInManwon <= 100_000) {
      ceilings.push({
        won: amountInManwon * 10_000,
        inclusive: match[2] === "이하",
      });
    }
  }
  return ceilings.sort(
    (left, right) =>
      left.won - right.won || Number(left.inclusive) - Number(right.inclusive),
  )[0];
}

export function parseGov24TextEligibility(
  source: TextConstraintSource,
): Gov24TextEligibilityConstraints {
  const eligibilityText = [source.name, source.targetText, source.criteriaText]
    .filter((value): value is string => Boolean(value))
    .join("\n");
  const adoptionOnlyName =
    /입양/.test(source.name) && !/출산.*입양|입양.*출산/.test(source.name);
  const adoptionOnlyTarget =
    /입양가정|입양아동|입양 신고/.test(
      [source.targetText, source.criteriaText].filter(Boolean).join("\n"),
    ) && !/출산가정|출생아/.test(eligibilityText);
  const privateSchoolEmployee =
    /사립학교\s*교직원/.test(eligibilityText) ||
    (/사립학교교직원연금공단/.test(source.providerName) &&
      /교직원/.test(eligibilityText));
  const educationEmployeeText = [source.targetText, source.criteriaText]
    .filter(Boolean)
    .join("\n");
  const educationEmployee =
    /교직원|교원|교사/.test(source.name) ||
    /(?:대상|신청자|재직).{0,30}(?:교직원|교원|교사)|(?:교직원|교원|교사).{0,30}(?:재직|대상|신청)/.test(
      educationEmployeeText,
    );
  const monthlyIncome = monthlyIncomeCeiling(eligibilityText);

  return {
    ...(childThreshold(eligibilityText) !== undefined
      ? { minChildCount: childThreshold(eligibilityText) }
      : {}),
    ...(residenceThreshold(eligibilityText) !== undefined
      ? { minResidenceMonths: residenceThreshold(eligibilityText) }
      : {}),
    ...(monthlyIncome
      ? {
          maxMonthlyIncomeWon: monthlyIncome.won,
          maxMonthlyIncomeInclusive: monthlyIncome.inclusive,
        }
      : {}),
    requiresAdoptedChild: adoptionOnlyName || adoptionOnlyTarget,
    requiresEducationEmployee: educationEmployee,
    requiresPrivateSchoolEmployee: privateSchoolEmployee,
    requiresPrivateSchoolPension:
      /사학연금\s*가입자/.test(eligibilityText) ||
      (privateSchoolEmployee && /사립학교교직원연금공단/.test(source.providerName)),
  };
}

export function matchGov24TextEligibility(
  constraints: Gov24TextEligibilityConstraints,
  input: Gov24MatchInput & { residenceMonths?: number },
): Gov24TextEligibilityMatch {
  const reasons: string[] = [];
  const additionalChecks: string[] = [];

  if (constraints.minChildCount !== undefined) {
    if (input.childCount === undefined) {
      additionalChecks.push(`자녀가 ${constraints.minChildCount}명 이상인지 확인해주세요.`);
    } else if (input.childCount < constraints.minChildCount) {
      return { status: "unlikely", reasons: [], additionalChecks: [] };
    } else {
      reasons.push(
        `자녀가 ${constraints.minChildCount}명 이상이어서 정책의 다자녀 조건과 일치합니다.`,
      );
    }
  }

  if (constraints.minResidenceMonths !== undefined) {
    if (input.residenceMonths === undefined) {
      additionalChecks.push(
        `현재 지역에 ${constraints.minResidenceMonths}개월 이상 거주했는지 확인해주세요.`,
      );
    } else if (input.residenceMonths < constraints.minResidenceMonths) {
      return { status: "unlikely", reasons: [], additionalChecks: [] };
    } else {
      reasons.push(
        `현재 지역 거주기간이 ${constraints.minResidenceMonths}개월 이상 조건과 일치합니다.`,
      );
    }
  }

  if (constraints.maxMonthlyIncomeWon !== undefined) {
    const ceiling = constraints.maxMonthlyIncomeWon;
    const label = `${ceiling / 10_000}만원 ${
      constraints.maxMonthlyIncomeInclusive ? "이하" : "미만"
    }`;
    if (input.applicantMonthlyIncomeWon === undefined) {
      additionalChecks.push(`월평균보수가 ${label}인지 확인해주세요.`);
    } else {
      const exceeds = constraints.maxMonthlyIncomeInclusive
        ? input.applicantMonthlyIncomeWon > ceiling
        : input.applicantMonthlyIncomeWon >= ceiling;
      if (exceeds) {
        return { status: "unlikely", reasons: [], additionalChecks: [] };
      }
      reasons.push(
        `연소득 월 환산액이 월평균보수 ${label} 조건과 일치합니다.`,
      );
    }
  }

  if (constraints.requiresAdoptedChild) {
    if (input.hasAdoptedChild === false) {
      return { status: "unlikely", reasons: [], additionalChecks: [] };
    }
    if (input.hasAdoptedChild === true) {
      reasons.push("입양한 자녀가 있어 입양가정 대상 조건과 일치합니다.");
    } else {
      additionalChecks.push("입양한 자녀가 있는지 확인해주세요.");
    }
  }

  if (constraints.requiresEducationEmployee) {
    if (
      input.occupation !== undefined &&
      !["teacher", "private_school_employee"].includes(input.occupation)
    ) {
      return { status: "unlikely", reasons: [], additionalChecks: [] };
    }
    if (
      input.occupation === "teacher" ||
      input.occupation === "private_school_employee"
    ) {
      reasons.push("교사·교직원 대상 조건과 일치합니다.");
    } else {
      additionalChecks.push("교사·교직원인지 확인해주세요.");
    }
  }

  if (constraints.requiresPrivateSchoolEmployee) {
    if (
      input.occupation !== undefined &&
      input.occupation !== "private_school_employee"
    ) {
      return { status: "unlikely", reasons: [], additionalChecks: [] };
    }
    if (input.occupation === "private_school_employee") {
      reasons.push("사립학교 교직원 대상 조건과 일치합니다.");
    } else {
      additionalChecks.push("사립학교 교직원인지 확인해주세요.");
    }
  }

  if (constraints.requiresPrivateSchoolPension) {
    if (input.privateSchoolPensionMember === false) {
      return { status: "unlikely", reasons: [], additionalChecks: [] };
    }
    if (input.privateSchoolPensionMember === true) {
      reasons.push("사학연금 가입자 대상 조건과 일치합니다.");
    } else {
      additionalChecks.push("사학연금 가입 여부를 확인해주세요.");
    }
  }

  return { status: "candidate", reasons, additionalChecks };
}
