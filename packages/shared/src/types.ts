export type MaritalStatus =
  | "single"
  | "married"
  | "divorced"
  | "widowed"
  | "planned";

export type RelationshipType = "birth" | "adoption" | "guardianship";

export type Residence = {
  sidoCode: string;
  sigunguCode: string;
};

export type ChildProfile = {
  birthDate: string;
  relationshipType: RelationshipType;
  birthOrder?: number;
  nationalityStatus?: "korean" | "dual" | "refugee" | "other";
  residentRegistrationStatus?: "registered" | "exception" | "not_registered";
  careType?: "home" | "daycare" | "full_day_childcare" | "other";
};

export type HouseholdMember = {
  relationship: "parent" | "other";
  incomeAnnual?: number;
  homeCount?: number;
};

export type UserProfile = {
  birthDate: string;
  residence: Residence;
  maritalStatus?: MaritalStatus;
  marriageDate?: string;
  plannedMarriageDate?: string;
  applicantIncomeAnnual?: number;
  spouseIncomeAnnual?: number;
  householdNetAssets?: number;
  householdMembers: HouseholdMember[];
  children: ChildProfile[];
  housingTenure?: "own" | "jeonse" | "monthly_rent" | "family" | "other";
  employmentStatus?: "employed" | "self_employed" | "unemployed" | "student";
  jobSeeking?: boolean;
  householdHomeCount?: number;
  hasPresaleRight?: boolean;
  hasOccupancyRight?: boolean;
};

export type DerivedProfile = UserProfile & {
  age: number;
  isAdult: boolean;
  marriageMonths?: number;
  isNewlywedWithin7Years: boolean;
  childCount: number;
  minorChildCount: number;
  youngestChildAgeMonths?: number;
  hasChildBornWithin2Years: boolean;
  isCapitalRegion: boolean;
  coupleIncomeAnnual?: number;
  householdIncomeAnnual?: number;
  householdSize: number;
};

export type TruthValue = true | false | "unknown";

export type ConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "contains"
  | "between"
  | "date_before"
  | "date_after"
  | "exists"
  | "not_exists";

export type ConditionLeaf = {
  field: string;
  label: string;
  op: ConditionOperator;
  value?: unknown;
  reason?: string;
  failureReason?: string;
  question?: string;
  sourceId?: string;
};

export type ConditionNode =
  | ConditionLeaf
  | { all: ConditionNode[] }
  | { any: ConditionNode[] }
  | { not: ConditionNode };

export type ConditionDetail = {
  field: string;
  label: string;
  value: TruthValue;
  message: string;
  question?: string;
  sourceId?: string;
};

export type PolicyMatchStatus = "eligible" | "needs_review" | "unlikely";

export type PolicyMatchResult = {
  policyId: string;
  policyVersionId: string;
  status: PolicyMatchStatus;
  recommendationReasons: string[];
  matched: ConditionDetail[];
  unmatched: ConditionDetail[];
  unknown: ConditionDetail[];
  disclaimer: string;
};
