import { describe, expect, it, vi } from "vitest";
import {
  fetchGov24Catalog,
  normalizeGov24Catalog,
} from "../../packages/policy-catalog/src/gov24";

const listRow = {
  서비스ID: "GOV24-001",
  지원유형: "현금",
  서비스명: "숨은 지역 출산 지원",
  서비스목적요약: "지역 출산 가정의 생활 안정을 지원합니다.",
  지원대상: "해당 시에 거주하는 출산 가정",
  선정기준: "거주기간 확인",
  지원내용: "출산지원금 지급",
  신청방법: "주민센터 방문",
  신청기한: "출생 후 90일 이내",
  상세조회URL: "https://www.gov.kr/example/GOV24-001",
  소관기관코드: "ORG-1",
  소관기관명: "예시시",
  부서명: "가족정책과",
  조회수: 12,
  소관기관유형: "시군구",
  사용자구분: "개인",
  서비스분야: "임신·출산",
  접수기관: "주민센터",
  전화문의: "123-4567",
  등록일시: "2025-01-01 00:00:00",
  수정일시: "2026-07-01 00:00:00",
};

describe("정부24 전체 혜택 카탈로그", () => {
  it("목록·상세·지원조건을 원본 ID 기준으로 합쳐 검색용 레코드로 만든다", () => {
    const [service] = normalizeGov24Catalog({
      lists: [listRow],
      details: [
        {
          서비스ID: "GOV24-001",
          서비스명: "숨은 지역 출산 지원",
          서비스목적: "지역 출산 가정 지원",
          구비서류: "신분증, 통장 사본",
          온라인신청사이트URL: "https://apply.example.go.kr",
          법령: "예시시 출산지원 조례",
          수정일시: "2026-07-01 00:00:00",
        },
      ],
      conditions: [
        {
          서비스ID: "GOV24-001",
          서비스명: "숨은 지역 출산 지원",
          JA0101: "Y",
          JA0102: "Y",
          JA0110: 20,
          JA0111: 45,
          JA0203: "Y",
          JA0303: "Y",
          JA0413: "N",
        },
      ],
      syncedAt: "2026-08-01T12:00:00.000Z",
    });

    expect(service.sourceServiceId).toBe("GOV24-001");
    expect(service.name).toBe("숨은 지역 출산 지원");
    expect(service.scope).toBe("regional");
    expect(service.onlineApplicationUrl).toBe("https://apply.example.go.kr");
    expect(service.conditionCodes).toEqual([
      "JA0101",
      "JA0102",
      "JA0203",
      "JA0303",
    ]);
    expect(service.eligibilityProfile).toEqual(
      expect.objectContaining({
        genders: ["male", "female"],
        minAge: 20,
        maxAge: 45,
        medianIncomeBands: ["76_100"],
        personalConditionCodes: ["JA0303"],
      }),
    );
    expect(service.catalogLevel).toBe("partially_structured");
    expect(service.contentHash).toMatch(/^[a-f0-9]{16}$/);
  });

  it("세 API를 끝 페이지까지 조회하고 인증키를 오류 메시지에 노출하지 않는다", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      const path = url.pathname;
      const page = Number(url.searchParams.get("page"));
      const data =
        path.endsWith("serviceList") && page === 1
          ? [listRow]
          : path.endsWith("serviceDetail") && page === 1
            ? [{ 서비스ID: "GOV24-001", 서비스명: "숨은 지역 출산 지원" }]
            : path.endsWith("supportConditions") && page === 1
              ? [{ 서비스ID: "GOV24-001", 서비스명: "숨은 지역 출산 지원" }]
              : [];
      return new Response(
        JSON.stringify({
          page,
          perPage: 1,
          totalCount: 1,
          currentCount: data.length,
          matchCount: 1,
          data,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const result = await fetchGov24Catalog({
      serviceKey: "secret-decoding-key",
      perPage: 1,
      fetchImpl: fetchMock,
      syncedAt: "2026-08-01T12:00:00.000Z",
    });

    expect(result).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(result)).not.toContain("secret-decoding-key");
  });
});
