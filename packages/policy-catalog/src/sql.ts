import type { SourceCatalogService } from "./gov24";

function sqlValue(value: string | number | boolean | null | undefined): string {
  if (value === undefined || value === null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${value.replaceAll("\0", "").replaceAll("'", "''")}'`;
}

function jsonValue(value: unknown): string {
  return sqlValue(JSON.stringify(value));
}

const insertColumns = [
  "id",
  "source_id",
  "source_service_id",
  "name",
  "summary",
  "support_type",
  "target_text",
  "criteria_text",
  "benefit_text",
  "application_method",
  "deadline_text",
  "detail_url",
  "online_application_url",
  "required_documents",
  "provider_code",
  "provider_name",
  "provider_type",
  "department_name",
  "audience_type",
  "service_field",
  "receiving_agency",
  "phone",
  "view_count",
  "scope",
  "condition_codes",
  "legal_basis",
  "raw_payload",
  "content_hash",
  "catalog_level",
  "source_registered_at",
  "source_modified_at",
  "first_seen_at",
  "last_seen_at",
  "is_active",
] as const;

function serviceValues(service: SourceCatalogService): string[] {
  return [
    sqlValue(service.id),
    sqlValue(service.sourceId),
    sqlValue(service.sourceServiceId),
    sqlValue(service.name),
    sqlValue(service.summary),
    sqlValue(service.supportType),
    sqlValue(service.targetText),
    sqlValue(service.criteriaText),
    sqlValue(service.benefitText),
    sqlValue(service.applicationMethod),
    sqlValue(service.deadlineText),
    sqlValue(service.detailUrl),
    sqlValue(service.onlineApplicationUrl),
    sqlValue(service.requiredDocuments),
    sqlValue(service.providerCode),
    sqlValue(service.providerName),
    sqlValue(service.providerType),
    sqlValue(service.departmentName),
    sqlValue(service.audienceType),
    sqlValue(service.serviceField),
    sqlValue(service.receivingAgency),
    sqlValue(service.phone),
    sqlValue(service.viewCount),
    sqlValue(service.scope),
    jsonValue(service.conditionCodes),
    jsonValue(service.legalBasis),
    jsonValue(service.rawPayload),
    sqlValue(service.contentHash),
    sqlValue(service.catalogLevel),
    sqlValue(service.sourceRegisteredAt),
    sqlValue(service.sourceModifiedAt),
    sqlValue(service.firstSeenAt),
    sqlValue(service.lastSeenAt),
    sqlValue(service.isActive),
  ];
}

export function generateCatalogSyncSql(
  services: SourceCatalogService[],
  {
    syncRunId,
    syncedAt,
  }: {
    syncRunId: string;
    syncedAt: string;
  },
): string {
  const updateColumns = insertColumns.filter(
    (column) =>
      !["id", "source_id", "source_service_id", "first_seen_at"].includes(
        column,
      ),
  );
  const statements = services.map(
    (service) => `INSERT INTO source_catalog_services (${insertColumns
      .map((column) => `\`${column}\``)
      .join(", ")}) VALUES (${serviceValues(service).join(", ")})
ON CONFLICT(source_id, source_service_id) DO UPDATE SET ${updateColumns
      .map((column) => `\`${column}\` = excluded.\`${column}\``)
      .join(", ")}, updated_at = CURRENT_TIMESTAMP;`,
  );

  return [
    "BEGIN TRANSACTION;",
    `INSERT INTO catalog_sync_runs (id, source_id, status, started_at, source_count) VALUES (${sqlValue(syncRunId)}, 'gov24', 'running', ${sqlValue(syncedAt)}, ${services.length});`,
    `UPDATE source_catalog_services SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE source_id = 'gov24';`,
    ...statements,
    `UPDATE catalog_sync_runs SET status = 'completed', completed_at = ${sqlValue(syncedAt)}, upserted_count = ${services.length}, deactivated_count = (SELECT COUNT(*) FROM source_catalog_services WHERE source_id = 'gov24' AND is_active = 0), updated_at = CURRENT_TIMESTAMP WHERE id = ${sqlValue(syncRunId)};`,
    `UPDATE catalog_sources SET last_successful_sync_at = ${sqlValue(syncedAt)}, updated_at = CURRENT_TIMESTAMP WHERE id = 'gov24';`,
    "COMMIT;",
  ].join("\n");
}
