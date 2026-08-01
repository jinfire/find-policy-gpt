import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";
import {
  fetchGov24Catalog,
  generateCatalogSyncSql,
} from "../packages/policy-catalog/src";

function loadLocalEnvironment() {
  for (const filename of [".env.local", ".env"]) {
    try {
      loadEnvFile(path.join(process.cwd(), filename));
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

loadLocalEnvironment();

const serviceKey = process.env.GOV24_SERVICE_KEY?.trim();
if (!serviceKey) {
  throw new Error(
    "GOV24_SERVICE_KEY가 없습니다. .env.local에 공공데이터포털 일반 인증키(Decoding)를 넣어주세요.",
  );
}

const syncedAt = new Date().toISOString();
const syncRunId = `gov24-${syncedAt.replace(/\D/g, "").slice(0, 14)}`;
console.log("정부24 전체 혜택 목록·상세·지원조건을 가져오는 중입니다.");

const services = await fetchGov24Catalog({ serviceKey, syncedAt });
const outputDirectory = path.join(process.cwd(), ".local");
await mkdir(outputDirectory, { recursive: true });

const snapshotPath = path.join(outputDirectory, "gov24-catalog.json");
const sqlPath = path.join(outputDirectory, "gov24-catalog.sql");
await Promise.all([
  writeFile(snapshotPath, `${JSON.stringify(services)}\n`, "utf8"),
  writeFile(
    sqlPath,
    `${generateCatalogSyncSql(services, { syncRunId, syncedAt })}\n`,
    "utf8",
  ),
]);

console.log(`${services.length.toLocaleString("ko-KR")}개 서비스를 정규화했습니다.`);
console.log(`스냅샷: ${snapshotPath}`);
console.log(`D1 적재 SQL: ${sqlPath}`);
