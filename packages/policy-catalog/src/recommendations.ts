import {
  matchGov24Eligibility,
  type Gov24EligibilityProfile,
  type Gov24Gender,
  type Gov24MatchInput,
  type Gov24Occupation,
} from "./eligibility";
import {
  matchGov24TextEligibility,
  parseGov24TextEligibility,
} from "./text-eligibility";

const SIDO_NAMES = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

export type Gov24RecommendationInput = Gov24MatchInput & {
  residenceSidoName?: (typeof SIDO_NAMES)[number];
  residenceSigunguName?: string;
  residenceMonths?: number;
};

export type Gov24RecommendationService = {
  id: string;
  name: string;
  summary: string;
  providerName: string;
  providerType: string | null;
  audienceType: string | null;
  serviceField: string | null;
  supportType: string | null;
  benefitText: string | null;
  targetText: string | null;
  criteriaText: string | null;
  scope: "national" | "regional";
  detailUrl: string | null;
  onlineApplicationUrl: string | null;
  viewCount: number | null;
  eligibilityProfile: Gov24EligibilityProfile;
};

export type Gov24ServiceRecommendation = Omit<
  Gov24RecommendationService,
  | "eligibilityProfile"
  | "criteriaText"
  | "targetText"
  | "viewCount"
  | "providerType"
> & {
  reasons: string[];
  additionalChecks: string[];
  score: number;
};

function requiredAge(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 120) {
    throw new Error("나이는 0~120 사이의 정수여야 합니다.");
  }
  return value;
}

function optionalNumber(
  value: unknown,
  label: string,
  { integer = false, max = Number.POSITIVE_INFINITY }: { integer?: boolean; max?: number } = {},
): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max ||
    (integer && !Number.isInteger(value))
  ) {
    throw new Error(`${label} 값을 확인해주세요.`);
  }
  return value;
}

function optionalBoolean(value: unknown, label: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") throw new Error(`${label} 값을 확인해주세요.`);
  return value;
}

export function parseGov24RecommendationInput(value: unknown): Gov24RecommendationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("추천 요청 형식을 확인해주세요.");
  }
  const input = value as Record<string, unknown>;
  const gender = input.gender;
  if (gender !== undefined && gender !== "male" && gender !== "female") {
    throw new Error("성별 조건 값을 확인해주세요.");
  }
  const residenceSidoName = input.residenceSidoName;
  if (
    residenceSidoName !== undefined &&
    !SIDO_NAMES.includes(residenceSidoName as (typeof SIDO_NAMES)[number])
  ) {
    throw new Error("거주 지역 값을 확인해주세요.");
  }

  const residenceSigunguName = input.residenceSigunguName;
  if (
    residenceSigunguName !== undefined &&
    (typeof residenceSigunguName !== "string" ||
      !/^[가-힣·\s]+(?:시|군|구)$/.test(residenceSigunguName.trim()) ||
      residenceSigunguName.trim().length > 30)
  ) {
    throw new Error("시군구 값을 확인해주세요.");
  }

  const occupations: Gov24Occupation[] = [
    "employee",
    "job_seeker",
    "self_employed",
    "student",
    "teacher",
    "private_school_employee",
    "public_officer",
    "military",
    "farmer",
    "livestock_worker",
    "fisher",
    "forestry_worker",
    "unemployed",
    "other",
  ];
  const occupation = input.occupation;
  if (
    occupation !== undefined &&
    !occupations.includes(occupation as Gov24Occupation)
  ) {
    throw new Error("직업 상태 값을 확인해주세요.");
  }

  const householdMedianIncomeRatio = optionalNumber(
    input.householdMedianIncomeRatio,
    "기준 중위소득 비율",
    { max: 10_000 },
  );
  const householdSize = optionalNumber(input.householdSize, "가구원 수", {
    integer: true,
    max: 100,
  });
  const childCount = optionalNumber(input.childCount, "자녀 수", {
    integer: true,
    max: 100,
  });
  const householdHomeCount = optionalNumber(
    input.householdHomeCount,
    "보유 주택 수",
    { integer: true, max: 100 },
  );
  const residenceMonths = optionalNumber(input.residenceMonths, "거주기간", {
    integer: true,
    max: 1_200,
  });
  const booleanFields = {
    hasChildren: optionalBoolean(input.hasChildren, "자녀 여부"),
    jobSeeking: optionalBoolean(input.jobSeeking, "구직 여부"),
    pregnant: optionalBoolean(input.pregnant, "임신 여부"),
    hasAdoptedChild: optionalBoolean(input.hasAdoptedChild, "입양 자녀 여부"),
    privateSchoolPensionMember: optionalBoolean(
      input.privateSchoolPensionMember,
      "사학연금 가입 여부",
    ),
    hasDisability: optionalBoolean(input.hasDisability, "장애 여부"),
    singleParentFamily: optionalBoolean(input.singleParentFamily, "한부모 여부"),
    multiculturalFamily: optionalBoolean(input.multiculturalFamily, "다문화가족 여부"),
    northKoreanDefector: optionalBoolean(
      input.northKoreanDefector,
      "북한이탈주민 여부",
    ),
    veteran: optionalBoolean(input.veteran, "국가보훈대상 여부"),
    hasDisease: optionalBoolean(input.hasDisease, "질병·질환 여부"),
  };

  return {
    age: requiredAge(input.age),
    ...(gender ? { gender: gender as Gov24Gender } : {}),
    ...(householdMedianIncomeRatio !== undefined
      ? { householdMedianIncomeRatio }
      : {}),
    ...(householdSize !== undefined ? { householdSize } : {}),
    ...(childCount !== undefined ? { childCount } : {}),
    ...(householdHomeCount !== undefined ? { householdHomeCount } : {}),
    ...(residenceMonths !== undefined ? { residenceMonths } : {}),
    ...Object.fromEntries(
      Object.entries(booleanFields).filter(([, fieldValue]) => fieldValue !== undefined),
    ),
    ...(occupation ? { occupation: occupation as Gov24Occupation } : {}),
    ...(residenceSidoName
      ? { residenceSidoName: residenceSidoName as Gov24RecommendationInput["residenceSidoName"] }
      : {}),
    ...(typeof residenceSigunguName === "string"
      ? { residenceSigunguName: residenceSigunguName.trim() }
      : {}),
  };
}

function isPersonalAudience(audienceType: string | null): boolean {
  return audienceType !== null && /개인|가구/.test(audienceType);
}

function matchesResidence(
  service: Gov24RecommendationService,
  input: Gov24RecommendationInput,
): boolean {
  if (service.scope === "national") return true;
  if (!input.residenceSidoName) return false;
  if (service.providerType === "시군구") {
    return Boolean(
      input.residenceSigunguName &&
        service.providerName.includes(input.residenceSigunguName),
    );
  }
  return [service.providerName, service.targetText, service.summary]
    .filter((text): text is string => Boolean(text))
    .some((text) => text.includes(input.residenceSidoName!));
}

function compactText(value: string, maxLength: number): string {
  const compacted = value.replace(/\s+/g, " ").trim();
  return compacted.length > maxLength
    ? `${compacted.slice(0, maxLength)}…`
    : compacted;
}

export function recommendGov24Services(
  services: Gov24RecommendationService[],
  input: Gov24RecommendationInput,
): Gov24ServiceRecommendation[] {
  return services
    .flatMap((service) => {
      if (!isPersonalAudience(service.audienceType)) return [];
      if (!matchesResidence(service, input)) return [];

      const textMatch = matchGov24TextEligibility(
        parseGov24TextEligibility(service),
        input,
      );
      if (textMatch.status === "unlikely") return [];

      const match = matchGov24Eligibility(service.eligibilityProfile, input);
      if (match.status === "unlikely") return [];

      const reasons = [...textMatch.reasons, ...match.reasons];
      if (reasons.length === 0) return [];

      const additionalChecks = [
        ...textMatch.additionalChecks,
        ...match.additionalChecks,
      ];
      additionalChecks.push("정확한 세부 선정기준은 공식 원문에서 확인해주세요.");

      return [
        {
          id: service.id,
          name: service.name,
          summary: compactText(service.summary, 300),
          providerName: service.providerName,
          audienceType: service.audienceType,
          serviceField: service.serviceField,
          supportType: service.supportType,
          benefitText: service.benefitText
            ? compactText(service.benefitText, 500)
            : null,
          scope: service.scope,
          detailUrl: service.detailUrl,
          onlineApplicationUrl: service.onlineApplicationUrl,
          reasons,
          additionalChecks,
          score: Math.max(0, reasons.length * 20 - additionalChecks.length * 3),
        },
      ];
    })
    .sort(
      (left, right) =>
        right.score - left.score || left.name.localeCompare(right.name, "ko"),
    );
}
