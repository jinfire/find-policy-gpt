import Ajv2020, { type ErrorObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import policySchema from "../../../schemas/policy.schema.json";
export * from "./catalog";

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validatePolicy = ajv.compile(policySchema);

function describeError(error: ErrorObject): string {
  const path = error.instancePath || "/";
  return `${path}: ${error.message ?? error.keyword}`;
}

export function validatePolicyCatalog(catalog: unknown[]): {
  valid: boolean;
  errors: string[];
} {
  const errors = catalog.flatMap((policy, index) => {
    const valid = validatePolicy(policy);
    return valid
      ? []
      : (validatePolicy.errors ?? []).map(
          (error) => `policy[${index}] ${describeError(error)}`,
        );
  });

  return { valid: errors.length === 0, errors };
}
