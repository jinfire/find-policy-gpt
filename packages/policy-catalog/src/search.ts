export type CatalogSearchScope = "national" | "regional";

export type CatalogSearchItem = {
  id: string;
  name: string;
  summary: string;
  providerName: string;
  serviceField: string | null;
  supportType: string | null;
  scope: CatalogSearchScope;
  detailUrl: string | null;
  onlineApplicationUrl?: string | null;
};

export function parseCatalogSearchParams(url: URL): {
  query: string;
  scope?: CatalogSearchScope;
  limit: number;
} {
  const query = (url.searchParams.get("q") ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (query.length < 2) {
    throw new Error("검색어는 두 글자 이상 입력해주세요.");
  }

  const rawScope = url.searchParams.get("scope");
  const scope =
    rawScope === "national" || rawScope === "regional"
      ? rawScope
      : undefined;
  const requestedLimit = Number(url.searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(50, Math.floor(requestedLimit)))
    : 20;

  return { query, ...(scope ? { scope } : {}), limit };
}
