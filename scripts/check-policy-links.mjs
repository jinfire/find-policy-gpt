import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const directory = path.join(process.cwd(), "data", "policies");
const files = (await readdir(directory)).filter((file) => file.endsWith(".json"));
const policies = await Promise.all(
  files.map(async (file) =>
    JSON.parse(await readFile(path.join(directory, file), "utf8")),
  ),
);

const results = await Promise.all(
  policies.flatMap((policy) =>
    policy.sources.map(async (source) => {
      try {
        const response = await fetch(source.url, {
          method: "GET",
          redirect: "follow",
          signal: AbortSignal.timeout(15_000),
          headers: { "user-agent": "find-policy-gpt-source-check/1.0" },
        });
        return {
          policyId: policy.id,
          url: source.url,
          ok: response.ok,
          status: response.status,
        };
      } catch (error) {
        return {
          policyId: policy.id,
          url: source.url,
          ok: false,
          status: error instanceof Error ? error.message : "unknown error",
        };
      }
    }),
  ),
);

console.table(results);
const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  console.error(`${failed.length}개 공식 출처를 확인하지 못했습니다.`);
  process.exitCode = 1;
}
