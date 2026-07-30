import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const policyDir = path.join(root, "data", "policies");
const migrationDir = path.join(root, "drizzle");
const marker = "-- generated-policy-seed";

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const nullable = (value) => (value === null ? "NULL" : quote(value));
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const files = (await readdir(policyDir))
  .filter((file) => file.endsWith(".json"))
  .sort();
const policies = await Promise.all(
  files.map(async (file) =>
    JSON.parse(await readFile(path.join(policyDir, file), "utf8")),
  ),
);

const migrationFile = (await readdir(migrationDir)).find((file) =>
  file.startsWith("0000_"),
);
if (!migrationFile) {
  throw new Error("0000 Drizzle migration을 먼저 생성해 주세요.");
}

const statements = [marker];
for (const policy of policies) {
  statements.push(
    `INSERT INTO policies (id, slug, official_name, summary, policy_type, scope, provider_name, status, catalog_level) VALUES (${quote(policy.id)}, ${quote(policy.slug)}, ${quote(policy.officialName)}, ${quote(policy.summary)}, ${quote(policy.policyType)}, 'national', ${quote(policy.providerName)}, 'active', ${quote(policy.catalogLevel)});`,
    "--> statement-breakpoint",
    `INSERT INTO policy_versions (id, policy_id, version_no, effective_from, effective_to, eligibility_rule, benefit, application, required_documents, review_status, reviewed_at, published_at, content_hash) VALUES (${quote(policy.versionId)}, ${quote(policy.id)}, 1, ${quote(policy.effectiveFrom)}, ${nullable(policy.effectiveTo)}, ${quote(JSON.stringify(policy.eligibilityRule))}, ${quote(JSON.stringify({ summary: policy.benefitSummary }))}, ${quote(JSON.stringify(policy.application))}, '[]', 'published', ${quote(policy.sources[0].verifiedAt)}, ${quote(policy.sources[0].verifiedAt)}, ${quote(hash(policy))});`,
    "--> statement-breakpoint",
  );

  for (const source of policy.sources) {
    statements.push(
      `INSERT INTO policy_sources (id, policy_id, source_type, url, title, publisher, retrieved_at, last_verified_at, content_hash, is_primary) VALUES (${quote(source.id)}, ${quote(policy.id)}, 'agency', ${quote(source.url)}, ${quote(source.title)}, ${quote(source.publisher)}, ${quote(source.verifiedAt)}, ${quote(source.verifiedAt)}, ${quote(hash(source))}, ${source.isPrimary ? 1 : 0});`,
      "--> statement-breakpoint",
    );
  }
}

const filePath = path.join(migrationDir, migrationFile);
const current = await readFile(filePath, "utf8");
const base = current.includes(marker)
  ? current.slice(0, current.indexOf(marker)).trimEnd()
  : current.trimEnd();
await writeFile(filePath, `${base}\n--> statement-breakpoint\n${statements.join("\n")}\n`);

console.log(`${policies.length}개 정책 seed를 ${migrationFile}에 반영했습니다.`);
