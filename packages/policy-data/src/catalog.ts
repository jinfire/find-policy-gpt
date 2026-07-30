import type { ConditionNode } from "../../shared/src";
import beotimmokJeonse from "../../../data/policies/beotimmok-jeonse.json";
import bogeumjari from "../../../data/policies/bogeumjari.json";
import childAllowance from "../../../data/policies/child-allowance.json";
import didimdol from "../../../data/policies/didimdol.json";
import firstMeetingVoucher from "../../../data/policies/first-meeting-voucher.json";
import nationalEmploymentSupport from "../../../data/policies/national-employment-support.json";
import newbornSpecialDidimdol from "../../../data/policies/newborn-special-didimdol.json";
import newlywedJeonse from "../../../data/policies/newlywed-jeonse.json";
import parentBenefit from "../../../data/policies/parent-benefit.json";
import youthBeotimmok from "../../../data/policies/youth-beotimmok.json";

export type PolicySource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  verifiedAt: string;
  isPrimary: boolean;
};

export type PolicyDefinition = {
  id: string;
  slug: string;
  versionId: string;
  officialName: string;
  summary: string;
  policyType: "grant" | "voucher" | "loan" | "service";
  providerName: string;
  catalogLevel: "search_only" | "partially_structured" | "rule_ready";
  effectiveFrom: string;
  effectiveTo: string | null;
  eligibilityRule: ConditionNode;
  benefitSummary: string;
  application: {
    officialUrl: string;
    channels: string[];
    confirmationRequired: true;
  };
  sources: PolicySource[];
};

export const policyCatalog = [
  firstMeetingVoucher,
  parentBenefit,
  childAllowance,
  nationalEmploymentSupport,
  newbornSpecialDidimdol,
  didimdol,
  beotimmokJeonse,
  youthBeotimmok,
  bogeumjari,
  newlywedJeonse,
] as unknown as PolicyDefinition[];

export function getPolicyById(id: string): PolicyDefinition | undefined {
  return policyCatalog.find((policy) => policy.id === id);
}
