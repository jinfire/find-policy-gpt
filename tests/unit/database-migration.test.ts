import { readFile } from "node:fs/promises";
import path from "node:path";
import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";

describe("D1 database migration", () => {
  it("빈 SQLite 호환 DB에 스키마와 정책 10개를 적용한다", async () => {
    const SQL = await initSqlJs();
    const database = new SQL.Database();
    const migration = await readFile(
      path.join(process.cwd(), "drizzle", "0000_silky_kabuki.sql"),
      "utf8",
    );

    database.run(migration.replaceAll("--> statement-breakpoint", ""));

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
  });
});
