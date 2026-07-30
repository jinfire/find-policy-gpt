import {
  policyCatalog,
  type PolicyDefinition,
} from "../../policy-data/src/catalog";
import type { PolicyMatchResult, UserProfile } from "../../shared/src";
import { deriveProfile } from "./derive-profile";
import { matchPolicy } from "./rule-engine";

export type PolicyProfile = UserProfile & Record<string, unknown>;

export type PolicyRecommendation = {
  policy: PolicyDefinition;
  match: PolicyMatchResult;
};

const statusOrder: Record<PolicyMatchResult["status"], number> = {
  eligible: 0,
  needs_review: 1,
  unlikely: 2,
};

export function recommendPolicies(
  profile: PolicyProfile,
  asOf = new Date(),
): PolicyRecommendation[] {
  const derived = deriveProfile(profile, asOf) as unknown as Record<
    string,
    unknown
  >;

  return policyCatalog
    .map((policy) => ({
      policy,
      match: matchPolicy({
        policyId: policy.id,
        policyVersionId: policy.versionId,
        rule: policy.eligibilityRule,
        profile: derived,
      }),
    }))
    .sort((left, right) => {
      const byStatus =
        statusOrder[left.match.status] - statusOrder[right.match.status];
      return byStatus || left.policy.officialName.localeCompare(
        right.policy.officialName,
        "ko",
      );
    });
}
