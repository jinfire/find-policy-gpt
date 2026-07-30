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
