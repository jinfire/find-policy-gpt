import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  getLatestRequiredReviewWindow,
  getNextReviewWindow,
  isPolicySourceCurrent,
} from "../packages/policy-ops/src";

type PolicyFile = {
  id: string;
  sources: Array<{ verifiedAt: string; url: string }>;
};

const asOf = process.env.POLICY_AS_OF
  ? new Date(`${process.env.POLICY_AS_OF}T12:00:00+09:00`)
  : new Date();
const directory = path.join(process.cwd(), "data", "policies");
const files = (await readdir(directory)).filter((file) => file.endsWith(".json"));
const policies = await Promise.all(
  files.map(async (file) =>
    JSON.parse(await readFile(path.join(directory, file), "utf8")) as PolicyFile,
  ),
);

const findings = policies.flatMap((policy) =>
  policy.sources.flatMap((source) =>
    isPolicySourceCurrent(source.verifiedAt, asOf)
      ? []
      : [
          {
            policyId: policy.id,
            verifiedAt: source.verifiedAt,
            url: source.url,
          },
        ],
  ),
);
const requiredWindow = getLatestRequiredReviewWindow(asOf);
const nextWindow = getNextReviewWindow(asOf);

if (findings.length > 0) {
  console.table(findings);
  console.error(
    `${requiredWindow.year}년 ${requiredWindow.month}월 정기 검토 이후 확인되지 않은 정책 출처가 있습니다.`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `${policies.length}개 정책의 출처가 ${requiredWindow.year}년 ${requiredWindow.month}월 필수 검토 기준을 충족합니다.`,
  );
  console.log(
    `다음 정기 검토 기간은 ${nextWindow.startsOn} ~ ${nextWindow.endsOn}입니다.`,
  );
}
