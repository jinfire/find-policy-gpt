import { and, asc, desc, eq, like, or } from "drizzle-orm";
import { getDb } from "../../../db";
import { sourceCatalogServices } from "../../../db/schema";
import { parseCatalogSearchParams } from "../../../packages/policy-catalog/src";

export async function GET(request: Request) {
  let params: ReturnType<typeof parseCatalogSearchParams>;
  try {
    params = parseCatalogSearchParams(new URL(request.url));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "검색어를 확인해주세요." },
      { status: 400 },
    );
  }

  const safeQuery = params.query.replaceAll("%", "").replaceAll("_", "");
  const pattern = `%${safeQuery}%`;

  try {
    const db = getDb();
    const results = await db
      .select({
        id: sourceCatalogServices.id,
        name: sourceCatalogServices.name,
        summary: sourceCatalogServices.summary,
        providerName: sourceCatalogServices.providerName,
        serviceField: sourceCatalogServices.serviceField,
        supportType: sourceCatalogServices.supportType,
        scope: sourceCatalogServices.scope,
        detailUrl: sourceCatalogServices.detailUrl,
        onlineApplicationUrl: sourceCatalogServices.onlineApplicationUrl,
      })
      .from(sourceCatalogServices)
      .where(
        and(
          eq(sourceCatalogServices.isActive, true),
          params.scope
            ? eq(sourceCatalogServices.scope, params.scope)
            : undefined,
          or(
            like(sourceCatalogServices.name, pattern),
            like(sourceCatalogServices.summary, pattern),
            like(sourceCatalogServices.targetText, pattern),
            like(sourceCatalogServices.benefitText, pattern),
            like(sourceCatalogServices.providerName, pattern),
          ),
        ),
      )
      .orderBy(desc(sourceCatalogServices.viewCount), asc(sourceCatalogServices.name))
      .limit(params.limit);

    return Response.json({ results, count: results.length });
  } catch {
    return Response.json(
      { error: "전체 혜택 DB가 아직 준비되지 않았습니다. 카탈로그를 동기화해주세요." },
      { status: 503 },
    );
  }
}
