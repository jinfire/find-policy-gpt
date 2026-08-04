import { readFile } from "node:fs/promises";
import path from "node:path";

const rows = JSON.parse(
  await readFile(path.join(process.cwd(), ".local", "gov24-catalog.json"), "utf8"),
);
const personal = rows.filter((row) => /개인|가구/.test(row.audienceType ?? ""));
const selected = (value) =>
  ["y", "yes", "예", "true", "1", "해당", "대상"].includes(
    String(value ?? "").trim().toLowerCase(),
  );

const codeCounts = {};
for (const row of personal) {
  for (const [code, value] of Object.entries(row.rawPayload?.conditions ?? {})) {
    if (/^JA\d{4}$/.test(code) && selected(value)) {
      codeCounts[code] = (codeCounts[code] ?? 0) + 1;
    }
  }
}

const patterns = {
  adoption: /입양|입양아|입양가정/,
  pregnancy: /임신|임산부|산모/,
  multiChild: /다자녀|다둥이|셋째|세 자녀|3자녀|자녀 3명|자녀가 3명/,
  twoChild: /두 자녀|2자녀|자녀 2명|자녀가 2명/,
  teacher: /교직원|교원|교사/,
  privatePension: /사학연금/,
  publicOfficer: /공무원/,
  military: /군인|군무원/,
  employed: /근로자|재직자|직장인|고용보험/,
  selfEmployed: /자영업|소상공인|사업자/,
  student: /대학생|대학원생|재학생|학생/,
  disability: /장애인|장애 정도|장애아/,
  singleParent: /한부모|조손/,
  multicultural: /다문화/,
  veteran: /보훈|국가유공자/,
  farmer: /농업인|농업경영체|농어민/,
  fisher: /어업인|어업경영체/,
  renter: /전세|월세|임차인|임대차/,
  homeOwnership: /무주택|주택 소유|자가/,
  residencePeriod: /거주기간|계속 거주|이상 거주|주민등록을 두고/,
  income: /중위소득|소득기준|연소득|건강보험료/,
  property: /재산|순자산|자산기준/,
};
const textOf = (row) =>
  [row.name, row.summary, row.targetText, row.criteriaText, row.benefitText]
    .filter(Boolean)
    .join("\n");

const keywordCounts = {};
const keywordExamples = {};
for (const [key, pattern] of Object.entries(patterns)) {
  const matches = personal.filter((row) => pattern.test(textOf(row)));
  keywordCounts[key] = matches.length;
  keywordExamples[key] = matches.slice(0, 4).map((row) => row.name);
}

const countBy = (items, read) => {
  const counts = {};
  for (const item of items) {
    const key = read(item) || "(없음)";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};

console.log(
  JSON.stringify(
    {
      total: rows.length,
      personalOrHousehold: personal.length,
      audienceCounts: countBy(rows, (row) => row.audienceType),
      providerCounts: countBy(rows, (row) => row.providerType),
      codeCounts: Object.fromEntries(
        Object.entries(codeCounts).sort((left, right) => right[1] - left[1]),
      ),
      keywordCounts,
      keywordExamples,
    },
    null,
    2,
  ),
);
