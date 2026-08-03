export type Gov24Gender = "male" | "female";

export type Gov24MedianIncomeBand =
  | "0_50"
  | "51_75"
  | "76_100"
  | "101_200"
  | "over_200";

export type Gov24EligibilityProfile = {
  genders: Gov24Gender[];
  minAge?: number;
  maxAge?: number;
  medianIncomeBands: Gov24MedianIncomeBand[];
  personalConditionCodes: string[];
  householdConditionCodes: string[];
  businessStatusCodes: string[];
  businessIndustryCodes: string[];
  organizationTypeCodes: string[];
  organizationIndustryCodes: string[];
};

export type Gov24MatchInput = {
  age: number;
  gender?: Gov24Gender;
  householdMedianIncomeRatio?: number;
  householdSize?: number;
  childCount?: number;
  hasChildren?: boolean;
  jobSeeking?: boolean;
  householdHomeCount?: number;
};

export type Gov24EligibilityMatch = {
  status: "candidate" | "unlikely";
  reasons: string[];
  additionalChecks: string[];
  score: number;
};

const GENDER_CODES = ["JA0101", "JA0102"] as const;
const INCOME_CODES = ["JA0201", "JA0202", "JA0203", "JA0204", "JA0205"] as const;
const PERSONAL_CODES = [
  "JA0301",
  "JA0302",
  "JA0303",
  "JA0313",
  "JA0314",
  "JA0315",
  "JA0316",
  "JA0317",
  "JA0318",
  "JA0319",
  "JA0320",
  "JA0322",
  "JA0326",
  "JA0327",
  "JA0328",
  "JA0329",
  "JA0330",
] as const;
const HOUSEHOLD_CODES = [
  "JA0401",
  "JA0402",
  "JA0403",
  "JA0404",
  "JA0410",
  "JA0411",
  "JA0412",
  "JA0413",
  "JA0414",
] as const;
const BUSINESS_STATUS_CODES = ["JA1101", "JA1102", "JA1103"] as const;
const BUSINESS_INDUSTRY_CODES = ["JA1201", "JA1202", "JA1299"] as const;
const ORGANIZATION_TYPE_CODES = ["JA2101", "JA2102", "JA2103"] as const;
const ORGANIZATION_INDUSTRY_CODES = ["JA2201", "JA2202", "JA2203", "JA2299"] as const;

const incomeCodeToBand: Record<(typeof INCOME_CODES)[number], Gov24MedianIncomeBand> = {
  JA0201: "0_50",
  JA0202: "51_75",
  JA0203: "76_100",
  JA0204: "101_200",
  JA0205: "over_200",
};

const incomeBandLabels: Record<Gov24MedianIncomeBand, string> = {
  "0_50": "0~50%",
  "51_75": "51~75%",
  "76_100": "76~100%",
  "101_200": "101~200%",
  over_200: "200% 초과",
};

const conditionLabels: Record<string, string> = {
  JA0301: "예비부모/난임",
  JA0302: "임신",
  JA0303: "출산/입양",
  JA0313: "농업인",
  JA0314: "어업인",
  JA0315: "축산업인",
  JA0316: "임업인",
  JA0317: "초등학생",
  JA0318: "중학생",
  JA0319: "고등학생",
  JA0320: "대학생/대학원생",
  JA0326: "근로자",
  JA0327: "구직자",
  JA0328: "장애인",
  JA0329: "국가보훈대상자",
  JA0330: "질병/질환자",
  JA0401: "다문화가족",
  JA0402: "북한이탈주민",
  JA0403: "한부모가정/조손가정",
  JA0404: "1인가구",
  JA0411: "다자녀가구",
  JA0412: "무주택세대",
  JA0413: "신규전입가구",
  JA0414: "확대가족",
  JA1101: "예비창업자",
  JA1102: "영업 중 사업자",
  JA1103: "생계곤란/폐업 사업자",
  JA1201: "음식업",
  JA1202: "제조업",
  JA1299: "기타 업종",
  JA2101: "중소기업",
  JA2102: "사회복지시설",
  JA2103: "기관/단체",
  JA2201: "제조업 기관",
  JA2202: "농림어업 기관",
  JA2203: "정보통신업 기관",
  JA2299: "기타 업종 기관",
};

function isSelected(value: unknown): boolean {
  if (value === true) return true;
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["y", "yes", "예", "true", "1", "해당", "대상"].includes(normalized);
}

function selectedCodes<T extends readonly string[]>(
  conditions: Record<string, unknown>,
  codes: T,
): T[number][] {
  return codes.filter((code) => isSelected(conditions[code]));
}

function ageValue(value: unknown): number | undefined {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 120) return undefined;
  return number;
}

export function parseGov24Eligibility(
  conditions: Record<string, unknown>,
): Gov24EligibilityProfile {
  const selectedGenders = selectedCodes(conditions, GENDER_CODES);
  const minAge = ageValue(conditions.JA0110);
  const maxAge = ageValue(conditions.JA0111);

  return {
    genders: selectedGenders.map((code) => (code === "JA0101" ? "male" : "female")),
    ...(minAge !== undefined && minAge > 0 ? { minAge } : {}),
    ...(maxAge !== undefined && maxAge < 120 ? { maxAge } : {}),
    medianIncomeBands: selectedCodes(conditions, INCOME_CODES).map(
      (code) => incomeCodeToBand[code],
    ),
    personalConditionCodes: selectedCodes(conditions, PERSONAL_CODES),
    householdConditionCodes: selectedCodes(conditions, HOUSEHOLD_CODES),
    businessStatusCodes: selectedCodes(conditions, BUSINESS_STATUS_CODES),
    businessIndustryCodes: selectedCodes(conditions, BUSINESS_INDUSTRY_CODES),
    organizationTypeCodes: selectedCodes(conditions, ORGANIZATION_TYPE_CODES),
    organizationIndustryCodes: selectedCodes(conditions, ORGANIZATION_INDUSTRY_CODES),
  };
}

function incomeBandForRatio(ratio: number): Gov24MedianIncomeBand | undefined {
  if (!Number.isFinite(ratio) || ratio < 0) return undefined;
  if (ratio <= 50) return "0_50";
  if (ratio <= 75) return "51_75";
  if (ratio <= 100) return "76_100";
  if (ratio <= 200) return "101_200";
  return "over_200";
}

type KnownConditionResult = { matches?: boolean; reason?: string };

function knownConditionResult(code: string, input: Gov24MatchInput): KnownConditionResult {
  switch (code) {
    case "JA0303":
      return input.hasChildren === undefined
        ? {}
        : {
            matches: input.hasChildren,
            reason: input.hasChildren
              ? "자녀가 있어 출산/입양 관련 대상 조건과 일치합니다."
              : undefined,
          };
    case "JA0327":
      return input.jobSeeking === undefined
        ? {}
        : {
            matches: input.jobSeeking,
            reason: input.jobSeeking
              ? "현재 구직 중이라는 조건과 일치합니다."
              : undefined,
          };
    case "JA0404":
      return input.householdSize === undefined
        ? {}
        : {
            matches: input.householdSize === 1,
            reason:
              input.householdSize === 1
                ? "입력한 가구원 수 기준으로 1인가구 조건과 일치합니다."
                : undefined,
          };
    case "JA0411":
      return input.childCount === undefined
        ? {}
        : {
            matches: input.childCount >= 2,
            reason:
              input.childCount >= 2
                ? "자녀가 2명 이상이어서 다자녀가구 기본 조건과 일치합니다."
                : undefined,
          };
    case "JA0412":
      return input.householdHomeCount === undefined
        ? {}
        : {
            matches: input.householdHomeCount === 0,
            reason:
              input.householdHomeCount === 0
                ? "입력한 가구 주택 수 기준으로 무주택세대 조건과 일치합니다."
                : undefined,
          };
    default:
      return {};
  }
}

function evaluateConditionCategory(
  codes: string[],
  neutralCode: string,
  input: Gov24MatchInput,
  reasons: string[],
  checks: Set<string>,
): boolean {
  if (codes.length === 0 || codes.includes(neutralCode)) return true;

  const evaluated = codes.map((code) => ({ code, ...knownConditionResult(code, input) }));
  const positive = evaluated.find((condition) => condition.matches === true);
  if (positive) {
    if (positive.reason) reasons.push(positive.reason);
    return true;
  }

  const unresolved = evaluated.filter((condition) => condition.matches === undefined);
  if (unresolved.length > 0) {
    unresolved.forEach(({ code }) => {
      const label = conditionLabels[code];
      if (label) checks.add(`${label} 대상 조건을 확인해주세요.`);
    });
    return true;
  }

  return false;
}

function ageReason(profile: Gov24EligibilityProfile): string | undefined {
  if (profile.minAge !== undefined && profile.maxAge !== undefined) {
    return `대상 연령인 만 ${profile.minAge}~${profile.maxAge}세 범위에 해당합니다.`;
  }
  if (profile.minAge !== undefined) {
    return `대상 연령인 만 ${profile.minAge}세 이상 범위에 해당합니다.`;
  }
  if (profile.maxAge !== undefined) {
    return `대상 연령인 만 ${profile.maxAge}세 이하 범위에 해당합니다.`;
  }
  return undefined;
}

function unlikely(): Gov24EligibilityMatch {
  return { status: "unlikely", reasons: [], additionalChecks: [], score: 0 };
}

export function matchGov24Eligibility(
  profile: Gov24EligibilityProfile,
  input: Gov24MatchInput,
): Gov24EligibilityMatch {
  const reasons: string[] = [];
  const checks = new Set<string>();

  if (profile.minAge !== undefined && input.age < profile.minAge) return unlikely();
  if (profile.maxAge !== undefined && input.age > profile.maxAge) return unlikely();
  const matchingAgeReason = ageReason(profile);
  if (matchingAgeReason) reasons.push(matchingAgeReason);

  const genderRestricted = profile.genders.length === 1;
  if (genderRestricted && input.gender && profile.genders[0] !== input.gender) return unlikely();
  if (genderRestricted && input.gender) {
    reasons.push(
      `${profile.genders[0] === "male" ? "남성" : "여성"} 대상 조건과 일치합니다.`,
    );
  } else if (genderRestricted) {
    checks.add("성별 대상 조건을 확인해주세요.");
  }

  if (profile.medianIncomeBands.length > 0 && profile.medianIncomeBands.length < 5) {
    const incomeBand =
      input.householdMedianIncomeRatio === undefined
        ? undefined
        : incomeBandForRatio(input.householdMedianIncomeRatio);
    if (incomeBand && !profile.medianIncomeBands.includes(incomeBand)) return unlikely();
    if (incomeBand) {
      reasons.push(
        `예상 기준 중위소득이 정책의 ${incomeBandLabels[incomeBand]} 구간에 해당합니다.`,
      );
    } else {
      checks.add("기준 중위소득 조건을 확인해주세요.");
    }
  }

  if (
    !evaluateConditionCategory(
      profile.personalConditionCodes,
      "JA0322",
      input,
      reasons,
      checks,
    )
  ) {
    return unlikely();
  }
  if (
    !evaluateConditionCategory(
      profile.householdConditionCodes,
      "JA0410",
      input,
      reasons,
      checks,
    )
  ) {
    return unlikely();
  }

  return {
    status: "candidate",
    reasons,
    additionalChecks: [...checks],
    score: Math.max(0, reasons.length * 20 - checks.size * 3),
  };
}
