import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";

describe("D1 database migration", () => {
  it("빈 SQLite 호환 DB에 전체 마이그레이션과 정책 10개를 적용한다", async () => {
    const SQL = await initSqlJs();
    const database = new SQL.Database();
    const migrationDirectory = path.join(process.cwd(), "drizzle");
    const migrationFiles = (await readdir(migrationDirectory))
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (const file of migrationFiles) {
      const migration = await readFile(
        path.join(migrationDirectory, file),
        "utf8",
      );
      database.run(migration.replaceAll("--> statement-breakpoint", ""));
    }

    const policyCount = database.exec(
      "SELECT COUNT(*) AS count FROM policies",
    )[0].values[0][0];
    const versionCount = database.exec(
      "SELECT COUNT(*) AS count FROM policy_versions",
    )[0].values[0][0];
    const sourceCount = database.exec(
      "SELECT COUNT(*) AS count FROM policy_sources",
    )[0].values[0][0];

    expect(policyCount).toBe(10);
    expect(versionCount).toBe(10);
    expect(sourceCount).toBe(10);

    const catalogTables = database.exec(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('catalog_sources', 'catalog_sync_runs', 'source_catalog_services', 'policy_catalog_mappings') ORDER BY name",
    )[0].values.flat();
    expect(catalogTables).toEqual([
      "catalog_sources",
      "catalog_sync_runs",
      "policy_catalog_mappings",
      "source_catalog_services",
    ]);
  });
});
