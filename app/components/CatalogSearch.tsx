"use client";

import { FormEvent, useState } from "react";
import type { CatalogSearchItem } from "../../packages/policy-catalog/src";

export function CatalogSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogSearchItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized.length < 2) {
      setError("검색어를 두 글자 이상 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/catalog?q=${encodeURIComponent(normalized)}`);
      const payload = (await response.json()) as {
        results?: CatalogSearchItem[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "검색에 실패했습니다.");
      setResults(payload.results ?? []);
    } catch (cause) {
      setResults(null);
      setError(cause instanceof Error ? cause.message : "검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="catalog-search-section">
      <div className="catalog-search-intro">
        <p className="eyebrow">잘 알려지지 않은 혜택까지</p>
        <h2>전국 1만여 개 혜택을 직접 찾아보세요</h2>
        <p>
          중앙부처뿐 아니라 지자체·공공기관·교육청의 정부24 원본 카탈로그를
          검색합니다.
        </p>
      </div>

      <div className="catalog-search-panel">
        <form onSubmit={search} className="catalog-search-form">
          <label htmlFor="catalog-query">전체 혜택 검색어</label>
          <div>
            <input
              id="catalog-query"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예: 귀농, 난임, 소상공인, 장학금"
            />
            <button type="submit" disabled={loading}>
              {loading ? "검색 중" : "검색"}
            </button>
          </div>
        </form>

        {error && <p className="catalog-message error">{error}</p>}
        {results?.length === 0 && (
          <p className="catalog-message">일치하는 혜택을 찾지 못했습니다.</p>
        )}
        {results && results.length > 0 && (
          <div className="catalog-results" aria-live="polite">
            <p className="catalog-count">상위 {results.length}개 결과</p>
            {results.map((result) => {
              const officialUrl = result.detailUrl ?? result.onlineApplicationUrl;
              return (
                <article key={result.id} className="catalog-result-card">
                  <div className="catalog-meta">
                    <span>{result.scope === "regional" ? "지역" : "전국"}</span>
                    {result.serviceField && <span>{result.serviceField}</span>}
                    {result.supportType && <span>{result.supportType}</span>}
                  </div>
                  <h3>{result.name}</h3>
                  <p>{result.summary || "정부24에서 상세 내용을 확인해주세요."}</p>
                  <div className="catalog-result-foot">
                    <strong>{result.providerName}</strong>
                    {officialUrl && (
                      <a href={officialUrl} target="_blank" rel="noreferrer">
                        공식 상세 보기 <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <p className="catalog-disclaimer">
          전체 검색은 공식 원문을 찾기 위한 기능이며 자격을 확정한 추천 결과가
          아니에요. 신청 전 담당 기관의 최신 기준을 확인해주세요.
        </p>
      </div>
    </section>
  );
}
