import type {
  ConditionDetail,
  ConditionLeaf,
  ConditionNode,
  PolicyMatchResult,
  TruthValue,
} from "../../shared/src/types";

const DEFAULT_DISCLAIMER =
  "이 결과는 입력한 정보를 바탕으로 한 사전 안내이며, 최종 자격과 지원 내용은 반드시 공식 기관에서 확인해 주세요.";

type InternalDetail = ConditionDetail & {
  successMessage: string;
  failureMessage: string;
  unknownMessage: string;
};

type Evaluation = {
  value: TruthValue;
  details: InternalDetail[];
};

function getFieldValue(
  profile: Record<string, unknown>,
  path: string,
): unknown {
  return path.split(".").reduce<unknown>((value, segment) => {
    if (
      value === null ||
      value === undefined ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return undefined;
    }
    return (value as Record<string, unknown>)[segment];
  }, profile);
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function includes(container: unknown, value: unknown): boolean {
  if (Array.isArray(container)) {
    return container.includes(value);
  }
  return typeof container === "string" && typeof value === "string"
    ? container.includes(value)
    : false;
}

function compare(leaf: ConditionLeaf, actual: unknown): TruthValue {
  if (leaf.op === "exists") {
    return !isMissing(actual);
  }
  if (leaf.op === "not_exists") {
    return isMissing(actual);
  }
  if (isMissing(actual)) {
    return "unknown";
  }

  switch (leaf.op) {
    case "eq":
      return actual === leaf.value;
    case "neq":
      return actual !== leaf.value;
    case "gt":
      return typeof actual === "number" &&
        typeof leaf.value === "number" &&
        actual > leaf.value;
    case "gte":
      return typeof actual === "number" &&
        typeof leaf.value === "number" &&
        actual >= leaf.value;
    case "lt":
      return typeof actual === "number" &&
        typeof leaf.value === "number" &&
        actual < leaf.value;
    case "lte":
      return typeof actual === "number" &&
        typeof leaf.value === "number" &&
        actual <= leaf.value;
    case "in":
      return Array.isArray(leaf.value) && leaf.value.includes(actual);
    case "not_in":
      return Array.isArray(leaf.value) && !leaf.value.includes(actual);
    case "contains":
      return includes(actual, leaf.value);
    case "between":
      return (
        typeof actual === "number" &&
        Array.isArray(leaf.value) &&
        leaf.value.length === 2 &&
        typeof leaf.value[0] === "number" &&
        typeof leaf.value[1] === "number" &&
        actual >= leaf.value[0] &&
        actual <= leaf.value[1]
      );
    case "date_before":
      return (
        typeof actual === "string" &&
        typeof leaf.value === "string" &&
        actual < leaf.value
      );
    case "date_after":
      return (
        typeof actual === "string" &&
        typeof leaf.value === "string" &&
        actual > leaf.value
      );
    default: {
      const exhaustive: never = leaf.op;
      throw new Error(`지원하지 않는 조건 연산자입니다: ${exhaustive}`);
    }
  }
}

function makeDetail(leaf: ConditionLeaf, value: TruthValue): InternalDetail {
  const successMessage =
    leaf.reason ?? `${leaf.label} 조건을 충족합니다.`;
  const failureMessage =
    leaf.failureReason ?? `${leaf.label} 조건을 충족하지 않습니다.`;
  const unknownMessage = `${leaf.label} 정보를 확인하면 자격을 더 정확히 판단할 수 있습니다.`;

  return {
    field: leaf.field,
    label: leaf.label,
    value,
    message:
      value === true
        ? successMessage
        : value === false
          ? failureMessage
          : unknownMessage,
    question:
      value === "unknown"
        ? (leaf.question ?? `${leaf.label} 정보를 입력해 주세요.`)
        : undefined,
    sourceId: leaf.sourceId,
    successMessage,
    failureMessage,
    unknownMessage,
  };
}

function evaluateLeaf(
  leaf: ConditionLeaf,
  profile: Record<string, unknown>,
): Evaluation {
  const value = compare(leaf, getFieldValue(profile, leaf.field));
  return { value, details: [makeDetail(leaf, value)] };
}

function evaluateAll(children: Evaluation[]): Evaluation {
  const value: TruthValue = children.some((child) => child.value === false)
    ? false
    : children.every((child) => child.value === true)
      ? true
      : "unknown";

  return { value, details: children.flatMap((child) => child.details) };
}

function evaluateAny(children: Evaluation[]): Evaluation {
  const trueChildren = children.filter((child) => child.value === true);
  if (trueChildren.length > 0) {
    return {
      value: true,
      details: trueChildren.flatMap((child) => child.details),
    };
  }

  const unknownChildren = children.filter((child) => child.value === "unknown");
  if (unknownChildren.length > 0) {
    return {
      value: "unknown",
      details: unknownChildren.flatMap((child) => child.details),
    };
  }

  return {
    value: false,
    details: children.flatMap((child) => child.details),
  };
}

function invert(evaluation: Evaluation): Evaluation {
  const value: TruthValue =
    evaluation.value === "unknown" ? "unknown" : !evaluation.value;
  const details = evaluation.details.map((detail): InternalDetail => {
    const detailValue: TruthValue =
      detail.value === "unknown" ? "unknown" : !detail.value;
    const successMessage = detail.failureMessage;
    const failureMessage = detail.successMessage;
    return {
      ...detail,
      value: detailValue,
      message:
        detailValue === true
          ? successMessage
          : detailValue === false
            ? failureMessage
            : detail.unknownMessage,
      successMessage,
      failureMessage,
    };
  });
  return { value, details };
}

function isLeaf(node: ConditionNode): node is ConditionLeaf {
  return "field" in node;
}

export function evaluateCondition(
  node: ConditionNode,
  profile: Record<string, unknown>,
): Evaluation {
  if (isLeaf(node)) {
    return evaluateLeaf(node, profile);
  }
  if ("all" in node) {
    return evaluateAll(
      node.all.map((child) => evaluateCondition(child, profile)),
    );
  }
  if ("any" in node) {
    return evaluateAny(
      node.any.map((child) => evaluateCondition(child, profile)),
    );
  }
  return invert(evaluateCondition(node.not, profile));
}

function publicDetail(detail: InternalDetail): ConditionDetail {
  return {
    field: detail.field,
    label: detail.label,
    value: detail.value,
    message: detail.message,
    question: detail.question,
    sourceId: detail.sourceId,
  };
}

export function matchPolicy({
  policyId,
  policyVersionId,
  rule,
  profile,
  disclaimer = DEFAULT_DISCLAIMER,
}: {
  policyId: string;
  policyVersionId: string;
  rule: ConditionNode;
  profile: Record<string, unknown>;
  disclaimer?: string;
}): PolicyMatchResult {
  const evaluation = evaluateCondition(rule, profile);
  const matched = evaluation.details
    .filter((detail) => detail.value === true)
    .map(publicDetail);
  const unmatched = evaluation.details
    .filter((detail) => detail.value === false)
    .map(publicDetail);
  const unknown = evaluation.details
    .filter((detail) => detail.value === "unknown")
    .map(publicDetail);

  return {
    policyId,
    policyVersionId,
    status:
      evaluation.value === true
        ? "eligible"
        : evaluation.value === false
          ? "unlikely"
          : "needs_review",
    recommendationReasons: matched.map((detail) => detail.message),
    matched,
    unmatched,
    unknown,
    disclaimer,
  };
}
