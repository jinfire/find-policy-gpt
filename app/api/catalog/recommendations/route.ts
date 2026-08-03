import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { sourceCatalogServices } from "../../../../db/schema";
import {
  parseGov24RecommendationInput,
  recommendGov24Services,
} from "../../../../packages/policy-catalog/src";

export async function POST(request: Request) {
  let input: ReturnType<typeof parseGov24RecommendationInput>;
  try {
    input = parseGov24RecommendationInput(await request.json());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const services = await db
      .select({
        id: sourceCatalogServices.id,
        name: sourceCatalogServices.name,
        summary: sourceCatalogServices.summary,
        providerName: sourceCatalogServices.providerName,
        audienceType: sourceCatalogServices.audienceType,
        serviceField: sourceCatalogServices.serviceField,
        supportType: sourceCatalogServices.supportType,
        benefitText: sourceCatalogServices.benefitText,
        targetText: sourceCatalogServices.targetText,
        criteriaText: sourceCatalogServices.criteriaText,
        scope: sourceCatalogServices.scope,
        detailUrl: sourceCatalogServices.detailUrl,
        onlineApplicationUrl: sourceCatalogServices.onlineApplicationUrl,
        viewCount: sourceCatalogServices.viewCount,
        eligibilityProfile: sourceCatalogServices.eligibilityProfile,
      })
      .from(sourceCatalogServices)
      .where(eq(sourceCatalogServices.isActive, true));

    const recommendations = recommendGov24Services(services, input);

    return Response.json({
      catalogCount: services.length,
      candidateCount: recommendations.length,
      results: recommendations.slice(0, 50),
    });
  } catch {
    return Response.json(
      { error: "전체 혜택 조건 DB가 아직 준비되지 않았습니다. 카탈로그를 동기화해주세요." },
      { status: 503 },
    );
  }
}
