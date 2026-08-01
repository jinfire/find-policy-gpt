import type {
  DerivedProfile,
  UserProfile,
} from "../../shared/src/types";
import { calculateMedianIncomeRatio } from "./median-income";

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function parseDateOnly(value: string): DateParts {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`올바르지 않은 날짜입니다: ${value}`);
  }
  return { year, month, day };
}

function partsInKorea(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
  };
}

function fullYearsBetween(start: DateParts, end: DateParts): number {
  let years = end.year - start.year;
  if (
    end.month < start.month ||
    (end.month === start.month && end.day < start.day)
  ) {
    years -= 1;
  }
  return years;
}

function fullMonthsBetween(start: DateParts, end: DateParts): number {
  let months = (end.year - start.year) * 12 + end.month - start.month;
  if (end.day < start.day) {
    months -= 1;
  }
  return months;
}

function isOnOrBefore(left: DateParts, right: DateParts): boolean {
  return (
    left.year < right.year ||
    (left.year === right.year &&
      (left.month < right.month ||
        (left.month === right.month && left.day <= right.day)))
  );
}

function twoYearsBefore(value: DateParts): DateParts {
  return { ...value, year: value.year - 2 };
}

function completeSum(values: Array<number | undefined>): number | undefined {
  return values.every((value): value is number => value !== undefined)
    ? values.reduce((total, value) => total + value, 0)
    : undefined;
}

function addMonths(value: DateParts, months: number): DateParts {
  const monthIndex = value.month - 1 + months;
  const year = value.year + Math.floor(monthIndex / 12);
  const month = (monthIndex % 12) + 1;
  return { year, month, day: value.day };
}

export function deriveProfile(
  profile: UserProfile,
  asOf = new Date(),
): DerivedProfile {
  const today = partsInKorea(asOf);
  const birth = parseDateOnly(profile.birthDate);
  const age = fullYearsBetween(birth, today);

  const marriageMonths = profile.marriageDate
    ? fullMonthsBetween(parseDateOnly(profile.marriageDate), today)
    : undefined;

  const childrenWithAge = profile.children.map((child) => ({
    child,
    birth: parseDateOnly(child.birthDate),
    age: fullYearsBetween(parseDateOnly(child.birthDate), today),
    ageMonths: fullMonthsBetween(parseDateOnly(child.birthDate), today),
  }));
  const youngestChildAgeMonths =
    childrenWithAge.length > 0
      ? Math.min(...childrenWithAge.map(({ ageMonths }) => ageMonths))
      : undefined;
  const youngestChild =
    childrenWithAge.length > 0
      ? childrenWithAge.reduce((youngest, current) =>
          current.ageMonths < youngest.ageMonths ? current : youngest,
        ).child
      : undefined;

  const recentBirthThreshold = twoYearsBefore(today);
  const hasChildBornWithin2Years = childrenWithAge.some(({ birth }) => {
    return (
      isOnOrBefore(recentBirthThreshold, birth) && isOnOrBefore(birth, today)
    );
  });

  const hasSpouse =
    profile.maritalStatus === "married" ||
    profile.maritalStatus === "planned" ||
    profile.spouseIncomeAnnual !== undefined;
  const hasConfirmedNoSpouse = ["single", "divorced", "widowed"].includes(
    profile.maritalStatus ?? "",
  );
  const coupleIncomeAnnual =
    hasSpouse || hasConfirmedNoSpouse
      ? completeSum([
          profile.applicantIncomeAnnual,
          ...(hasSpouse ? [profile.spouseIncomeAnnual] : []),
        ])
      : undefined;
  const householdIncomeAnnual =
    hasSpouse || hasConfirmedNoSpouse
      ? completeSum([
          profile.applicantIncomeAnnual,
          ...(hasSpouse ? [profile.spouseIncomeAnnual] : []),
          ...profile.householdMembers.map((member) => member.incomeAnnual),
        ])
      : undefined;
  const plannedMarriage = profile.plannedMarriageDate
    ? parseDateOnly(profile.plannedMarriageDate)
    : undefined;
  const childCount = profile.children.reduce(
    (count, child) => Math.max(count, child.birthOrder ?? 0),
    profile.children.length,
  );
  const householdSize =
    1 +
    (profile.maritalStatus === "married" ||
    profile.spouseIncomeAnnual !== undefined
      ? 1
      : 0) +
    profile.householdMembers.length +
    childCount;

  return {
    ...profile,
    age,
    isAdult: age >= 19,
    marriageMonths,
    isNewlywedWithin7Years:
      marriageMonths !== undefined && marriageMonths >= 0 && marriageMonths <= 84,
    childCount,
    minorChildCount: childrenWithAge.filter(({ age: childAge }) => childAge < 19)
      .length,
    youngestChildAgeMonths,
    hasChildBornWithin2Years,
    isCapitalRegion: ["11", "28", "41"].includes(profile.residence.sidoCode),
    coupleIncomeAnnual,
    householdIncomeAnnual,
    householdSize,
    householdMedianIncomeRatio: calculateMedianIncomeRatio({
      householdIncomeAnnual,
      householdSize,
      year: today.year,
    }),
    isDualIncome:
      profile.applicantIncomeAnnual === undefined ||
      profile.spouseIncomeAnnual === undefined
        ? undefined
        : profile.applicantIncomeAnnual > 0 && profile.spouseIncomeAnnual > 0,
    plannedMarriageWithin3Months:
      plannedMarriage === undefined
        ? undefined
        : isOnOrBefore(today, plannedMarriage) &&
          isOnOrBefore(plannedMarriage, addMonths(today, 3)),
    youngestChildNationalityStatus: youngestChild?.nationalityStatus,
    youngestChildResidentRegistered:
      youngestChild?.residentRegistrationStatus === undefined
        ? undefined
        : youngestChild.residentRegistrationStatus === "registered",
    youngestChildBirthOrder: youngestChild?.birthOrder,
  };
}
