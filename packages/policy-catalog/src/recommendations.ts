import {
  matchGov24Eligibility,
  type Gov24EligibilityProfile,
  type Gov24Gender,
  type Gov24MatchInput,
} from "./eligibility";

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
};

export type Gov24RecommendationService = {
  id: string;
  name: string;
  summary: string;
  providerName: string;
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
  "eligibilityProfile" | "criteriaText" | "targetText" | "viewCount"
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

  return {
    age: requiredAge(input.age),
    ...(gender ? { gender: gender as Gov24Gender } : {}),
    ...(optionalNumber(input.householdMedianIncomeRatio, "기준 중위소득 비율", {
      max: 10_000,
    }) !== undefined
      ? {
          householdMedianIncomeRatio: optionalNumber(
            input.householdMedianIncomeRatio,
            "기준 중위소득 비율",
            { max: 10_000 },
          ),
        }
      : {}),
    ...(optionalNumber(input.householdSize, "가구원 수", { integer: true, max: 100 }) !==
    undefined
      ? {
          householdSize: optionalNumber(input.householdSize, "가구원 수", {
            integer: true,
            max: 100,
          }),
        }
      : {}),
    ...(optionalNumber(input.childCount, "자녀 수", { integer: true, max: 100 }) !==
    undefined
      ? {
          childCount: optionalNumber(input.childCount, "자녀 수", {
            integer: true,
            max: 100,
          }),
        }
      : {}),
    ...(optionalBoolean(input.hasChildren, "자녀 여부") !== undefined
      ? { hasChildren: optionalBoolean(input.hasChildren, "자녀 여부") }
      : {}),
    ...(optionalBoolean(input.jobSeeking, "구직 여부") !== undefined
      ? { jobSeeking: optionalBoolean(input.jobSeeking, "구직 여부") }
      : {}),
    ...(optionalNumber(input.householdHomeCount, "보유 주택 수", {
      integer: true,
      max: 100,
    }) !== undefined
      ? {
          householdHomeCount: optionalNumber(input.householdHomeCount, "보유 주택 수", {
            integer: true,
            max: 100,
          }),
        }
      : {}),
    ...(residenceSidoName
      ? { residenceSidoName: residenceSidoName as Gov24RecommendationInput["residenceSidoName"] }
      : {}),
  };
}

function isPersonalAudience(audienceType: string | null): boolean {
  return audienceType !== null && /개인|가구/.test(audienceType);
}

function matchesResidence(
  service: Gov24RecommendationService,
  residenceSidoName: Gov24RecommendationInput["residenceSidoName"],
): boolean {
  if (service.scope === "national") return true;
  if (!residenceSidoName) return false;
  return [service.providerName, service.targetText, service.summary]
    .filter((text): text is string => Boolean(text))
    .some((text) => text.includes(residenceSidoName));
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
      if (!matchesResidence(service, input.residenceSidoName)) return [];

      const match = matchGov24Eligibility(service.eligibilityProfile, input);
      if (match.status === "unlikely") return [];

      const additionalChecks = [...match.additionalChecks];
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
          reasons:
            match.reasons.length > 0
              ? match.reasons
              : ["정부24 구조화 조건에서 입력 정보와 충돌하는 항목이 없습니다."],
          additionalChecks,
          score: match.score,
        },
      ];
    })
    .sort(
      (left, right) =>
        right.score - left.score || left.name.localeCompare(right.name, "ko"),
    );
}
