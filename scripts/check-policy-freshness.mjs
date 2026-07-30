import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const maximumAgeDays = Number(process.env.POLICY_MAX_AGE_DAYS ?? 90);
const now = new Date();
const directory = path.join(process.cwd(), "data", "policies");
const files = (await readdir(directory)).filter((file) => file.endsWith(".json"));
const policies = await Promise.all(
  files.map(async (file) =>
    JSON.parse(await readFile(path.join(directory, file), "utf8")),
  ),
);

const findings = policies.flatMap((policy) =>
  policy.sources.flatMap((source) => {
    const ageDays = Math.floor(
      (now.getTime() - new Date(`${source.verifiedAt}T00:00:00+09:00`).getTime()) /
        86_400_000,
    );
    return ageDays > maximumAgeDays
      ? [{ policyId: policy.id, verifiedAt: source.verifiedAt, ageDays }]
      : [];
  }),
);

if (findings.length > 0) {
  console.table(findings);
  console.error(`확인 주기 ${maximumAgeDays}일을 넘긴 정책이 있습니다.`);
  process.exitCode = 1;
} else {
  console.log(
    `${policies.length}개 정책의 출처 확인일이 ${maximumAgeDays}일 이내입니다.`,
  );
}
