import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";
import type { SourceCatalogService } from "../../packages/policy-catalog/src/gov24";
import { generateCatalogSyncSql } from "../../packages/policy-catalog/src/sql";

const service: SourceCatalogService = {
  id: "gov24:GOV24-001",
  sourceId: "gov24",
  sourceServiceId: "GOV24-001",
  name: "숨은 지역 출산 지원",
  summary: "지역 출산 가정 지원",
  providerName: "예시시",
  scope: "regional",
  conditionCodes: ["JA0303"],
  legalBasis: ["예시시 출산지원 조례"],
  rawPayload: { list: { 서비스ID: "GOV24-001" } },
  contentHash: "0123456789abcdef",
  catalogLevel: "search_only",
  firstSeenAt: "2026-08-01T12:00:00.000Z",
  lastSeenAt: "2026-08-01T12:00:00.000Z",
  isActive: true,
};

describe("전체 카탈로그 D1 적재 SQL", () => {
  it("동일한 원본 서비스 ID를 멱등 upsert하고 동기화 이력을 완료 처리한다", async () => {
    const SQL = await initSqlJs();
    const database = new SQL.Database();
    const migrationDirectory = path.join(process.cwd(), "drizzle");
    const migrationFiles = (await readdir(migrationDirectory))
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (const file of migrationFiles) {
      database.run(
        (await readFile(path.join(migrationDirectory, file), "utf8")).replaceAll(
          "--> statement-breakpoint",
          "",
        ),
      );
    }

    database.run(
      generateCatalogSyncSql([service], {
        syncRunId: "sync-1",
        syncedAt: "2026-08-01T12:00:00.000Z",
      }),
    );
    database.run(
      generateCatalogSyncSql(
        [{ ...service, summary: "변경된 요약", lastSeenAt: "2026-12-01T00:00:00.000Z" }],
        {
          syncRunId: "sync-2",
          syncedAt: "2026-12-01T00:00:00.000Z",
        },
      ),
    );

    expect(
      database.exec("SELECT COUNT(*) FROM source_catalog_services")[0].values[0][0],
    ).toBe(1);
    expect(
      database.exec("SELECT summary FROM source_catalog_services")[0].values[0][0],
    ).toBe("변경된 요약");
    expect(
      database.exec("SELECT COUNT(*) FROM catalog_sync_runs WHERE status = 'completed'")[0]
        .values[0][0],
    ).toBe(2);
  });
});
