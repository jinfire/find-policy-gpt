import {
  parseGov24Eligibility,
  type Gov24EligibilityProfile,
} from "./eligibility";

const GOV24_API_BASE_URL = "https://api.odcloud.kr/api/gov24/v3";

type Gov24Row = Record<string, unknown>;

type Gov24ApiPage = {
  page: number;
  perPage: number;
  totalCount: number;
  currentCount: number;
  matchCount: number;
  data: Gov24Row[];
};

export type SourceCatalogService = {
  id: string;
  sourceId: "gov24";
  sourceServiceId: string;
  name: string;
  summary: string;
  supportType?: string;
  targetText?: string;
  criteriaText?: string;
  benefitText?: string;
  applicationMethod?: string;
  deadlineText?: string;
  detailUrl?: string;
  onlineApplicationUrl?: string;
  requiredDocuments?: string;
  providerCode?: string;
  providerName: string;
  providerType?: string;
  departmentName?: string;
  audienceType?: string;
  serviceField?: string;
  receivingAgency?: string;
  phone?: string;
  viewCount?: number;
  scope: "national" | "regional";
  conditionCodes: string[];
  eligibilityProfile: Gov24EligibilityProfile;
  legalBasis: string[];
  rawPayload: Record<string, unknown>;
  contentHash: string;
  catalogLevel: "partially_structured";
  sourceRegisteredAt?: string;
  sourceModifiedAt?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  isActive: true;
};

function stringValue(row: Gov24Row | undefined, key: string): string | undefined {
  const value = row?.[key];
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

function numberValue(row: Gov24Row, key: string): number | undefined {
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : undefined;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function fingerprint(value: unknown): string {
  const input = stableStringify(value);
  const hash32 = (seed: number) => {
    let hash = seed >>> 0;
    for (const character of input) {
      hash ^= character.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 16_777_619) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  };

  return `${hash32(0x811c9dc5)}${hash32(0x9e3779b9)}`;
}

function isSelectedCondition(value: unknown): boolean {
  if (value === true || value === 1) return true;
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["y", "yes", "예", "true", "1", "해당", "대상"].includes(
    normalized,
  );
}

export function normalizeGov24Catalog({
  lists,
  details,
  conditions,
  syncedAt,
}: {
  lists: Gov24Row[];
  details: Gov24Row[];
  conditions: Gov24Row[];
  syncedAt: string;
}): SourceCatalogService[] {
  const detailsById = new Map(
    details.map((row) => [stringValue(row, "서비스ID"), row]),
  );
  const conditionsById = new Map(
    conditions.map((row) => [stringValue(row, "서비스ID"), row]),
  );

  return lists.flatMap((list) => {
    const sourceServiceId = stringValue(list, "서비스ID");
    const name = stringValue(list, "서비스명");
    const providerName = stringValue(list, "소관기관명");
    if (!sourceServiceId || !name || !providerName) return [];

    const detail = detailsById.get(sourceServiceId);
    const condition = conditionsById.get(sourceServiceId);
    const providerType = stringValue(list, "소관기관유형");
    const rawPayload = { list, detail: detail ?? null, conditions: condition ?? null };
    const conditionCodes = Object.entries(condition ?? {})
      .filter(([code, value]) => /^JA\d{4}$/.test(code) && isSelectedCondition(value))
      .map(([code]) => code)
      .sort();
    const eligibilityProfile = parseGov24Eligibility(condition ?? {});
    const legalBasis = ["법령", "자치법규", "행정규칙"]
      .map((key) => stringValue(detail, key))
      .filter((value): value is string => value !== undefined);

    return [
      {
        id: `gov24:${sourceServiceId}`,
        sourceId: "gov24" as const,
        sourceServiceId,
        name,
        summary:
          stringValue(list, "서비스목적요약") ??
          stringValue(detail, "서비스목적") ??
          "",
        supportType: stringValue(list, "지원유형"),
        targetText:
          stringValue(detail, "지원대상") ?? stringValue(list, "지원대상"),
        criteriaText:
          stringValue(detail, "선정기준") ?? stringValue(list, "선정기준"),
        benefitText:
          stringValue(detail, "지원내용") ?? stringValue(list, "지원내용"),
        applicationMethod:
          stringValue(detail, "신청방법") ?? stringValue(list, "신청방법"),
        deadlineText:
          stringValue(detail, "신청기한") ?? stringValue(list, "신청기한"),
        detailUrl: stringValue(list, "상세조회URL"),
        onlineApplicationUrl: stringValue(detail, "온라인신청사이트URL"),
        requiredDocuments: stringValue(detail, "구비서류"),
        providerCode: stringValue(list, "소관기관코드"),
        providerName,
        providerType,
        departmentName: stringValue(list, "부서명"),
        audienceType: stringValue(list, "사용자구분"),
        serviceField: stringValue(list, "서비스분야"),
        receivingAgency:
          stringValue(detail, "접수기관명") ?? stringValue(list, "접수기관"),
        phone:
          stringValue(detail, "문의처") ?? stringValue(list, "전화문의"),
        viewCount: numberValue(list, "조회수"),
        scope:
          providerType && /시군구|광역시도|교육청|지방/.test(providerType)
            ? ("regional" as const)
            : ("national" as const),
        conditionCodes,
        eligibilityProfile,
        legalBasis,
        rawPayload,
        contentHash: fingerprint(rawPayload),
        catalogLevel: "partially_structured" as const,
        sourceRegisteredAt: stringValue(list, "등록일시"),
        sourceModifiedAt:
          stringValue(detail, "수정일시") ?? stringValue(list, "수정일시"),
        firstSeenAt: syncedAt,
        lastSeenAt: syncedAt,
        isActive: true as const,
      },
    ];
  });
}

async function fetchAllPages({
  endpoint,
  serviceKey,
  perPage,
  fetchImpl,
}: {
  endpoint: "serviceList" | "serviceDetail" | "supportConditions";
  serviceKey: string;
  perPage: number;
  fetchImpl: typeof fetch;
}): Promise<Gov24Row[]> {
  const rows: Gov24Row[] = [];
  let page = 1;
  let totalCount = Number.POSITIVE_INFINITY;

  while (rows.length < totalCount) {
    const url = new URL(`${GOV24_API_BASE_URL}/${endpoint}`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("perPage", String(perPage));
    url.searchParams.set("returnType", "JSON");
    url.searchParams.set("serviceKey", serviceKey);

    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new Error(`정부24 ${endpoint} 조회 실패 (HTTP ${response.status})`);
    }
    const payload = (await response.json()) as Partial<Gov24ApiPage>;
    if (!Array.isArray(payload.data) || typeof payload.totalCount !== "number") {
      throw new Error(`정부24 ${endpoint} 응답 형식이 올바르지 않습니다.`);
    }

    totalCount = payload.totalCount;
    rows.push(...payload.data);
    if (payload.data.length === 0) break;
    page += 1;
  }

  return rows;
}

export async function fetchGov24Catalog({
  serviceKey,
  perPage = 1_000,
  fetchImpl = fetch,
  syncedAt = new Date().toISOString(),
}: {
  serviceKey: string;
  perPage?: number;
  fetchImpl?: typeof fetch;
  syncedAt?: string;
}): Promise<SourceCatalogService[]> {
  if (!serviceKey.trim()) {
    throw new Error("GOV24_SERVICE_KEY가 필요합니다.");
  }
  if (!Number.isInteger(perPage) || perPage < 1) {
    throw new Error("perPage는 1 이상의 정수여야 합니다.");
  }

  const [lists, details, conditions] = await Promise.all([
    fetchAllPages({ endpoint: "serviceList", serviceKey, perPage, fetchImpl }),
    fetchAllPages({ endpoint: "serviceDetail", serviceKey, perPage, fetchImpl }),
    fetchAllPages({
      endpoint: "supportConditions",
      serviceKey,
      perPage,
      fetchImpl,
    }),
  ]);

  return normalizeGov24Catalog({ lists, details, conditions, syncedAt });
}
