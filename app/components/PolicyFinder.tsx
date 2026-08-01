"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { CatalogSearch } from "./CatalogSearch";
import {
  deriveProfile,
  recommendPolicies,
  type PolicyProfile,
  type PolicyRecommendation,
} from "../../packages/policy-engine/src";

type FormState = {
  birthDate: string;
  sidoCode: string;
  maritalStatus: "single" | "married" | "planned";
  marriageDate: string;
  plannedMarriageDate: string;
  applicantIncome: string;
  spouseIncome: string;
  householdSize: string;
  hasChild: boolean;
  childBirthDate: string;
  childBirthOrder: string;
  childRegistered: boolean;
  jobSeeking: boolean;
  isHouseholdHead: "" | "yes" | "no";
  homeCount: string;
  netAssets: string;
};

const initialForm: FormState = {
  birthDate: "",
  sidoCode: "11",
  maritalStatus: "single",
  marriageDate: "",
  plannedMarriageDate: "",
  applicantIncome: "",
  spouseIncome: "",
  householdSize: "",
  hasChild: false,
  childBirthDate: "",
  childBirthOrder: "1",
  childRegistered: true,
  jobSeeking: false,
  isHouseholdHead: "",
  homeCount: "",
  netAssets: "",
};

const statusCopy = {
  eligible: { label: "신청 가능성 높음", icon: "✓" },
  needs_review: { label: "몇 가지만 더 확인", icon: "?" },
  unlikely: { label: "현재는 가능성 낮음", icon: "–" },
} as const;

const regions = [
  ["11", "서울"],
  ["26", "부산"],
  ["27", "대구"],
  ["28", "인천"],
  ["29", "광주"],
  ["30", "대전"],
  ["31", "울산"],
  ["36", "세종"],
  ["41", "경기"],
  ["42", "강원"],
  ["43", "충북"],
  ["44", "충남"],
  ["45", "전북"],
  ["46", "전남"],
  ["47", "경북"],
  ["48", "경남"],
  ["50", "제주"],
];

function won(value: string): number | undefined {
  return value === "" ? undefined : Number(value) * 10_000;
}

function buildProfile(form: FormState): PolicyProfile {
  return {
    birthDate: form.birthDate,
    residence: { sidoCode: form.sidoCode, sigunguCode: "" },
    maritalStatus: form.maritalStatus,
    marriageDate:
      form.maritalStatus === "married" && form.marriageDate
        ? form.marriageDate
        : undefined,
    plannedMarriageDate:
      form.maritalStatus === "planned" && form.plannedMarriageDate
        ? form.plannedMarriageDate
        : undefined,
    applicantIncomeAnnual: won(form.applicantIncome),
    spouseIncomeAnnual:
      form.maritalStatus === "married" || form.maritalStatus === "planned"
        ? won(form.spouseIncome)
        : undefined,
    householdSize:
      form.householdSize === "" ? undefined : Number(form.householdSize),
    householdNetAssets: won(form.netAssets),
    householdMembers: [],
    children:
      form.hasChild && form.childBirthDate
        ? [
            {
              birthDate: form.childBirthDate,
              relationshipType: "birth",
              birthOrder: Number(form.childBirthOrder),
              nationalityStatus: "korean",
              residentRegistrationStatus: form.childRegistered
                ? "registered"
                : "not_registered",
            },
          ]
        : [],
    jobSeeking: form.jobSeeking,
    isHouseholdHead:
      form.isHouseholdHead === ""
        ? undefined
        : form.isHouseholdHead === "yes",
    householdHomeCount:
      form.homeCount === "" ? undefined : Number(form.homeCount),
  };
}

function RecommendationCard({
  recommendation,
}: {
  recommendation: PolicyRecommendation;
}) {
  const { policy, match } = recommendation;
  const copy = statusCopy[match.status];

  return (
    <article className={`result-card ${match.status}`}>
      <div className="result-head">
        <div>
          <span className="policy-type">
            {policy.policyType === "loan" ? "정책대출" : "정부지원"}
          </span>
          <h3>{policy.officialName}</h3>
        </div>
        <span className="status-badge">
          <b aria-hidden="true">{copy.icon}</b> {copy.label}
        </span>
      </div>
      <p className="policy-summary">{policy.summary}</p>

      {match.recommendationReasons.length > 0 && (
        <div className="reason-box">
          <strong>추천한 이유</strong>
          <ul>
            {match.recommendationReasons.slice(0, 4).map((reason) => (
              <li key={reason}>
                <span aria-hidden="true">✓</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {match.unknown.length > 0 && (
        <div className="check-box">
          <strong>확인하면 더 정확해져요</strong>
          <ul>
            {match.unknown.slice(0, 3).map((item) => (
              <li key={`${item.field}-${item.question}`}>
                {item.question ?? item.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="benefit">
        <span>지원 내용</span>
        <p>{policy.benefitSummary}</p>
      </div>
      <a
        className="official-link"
        href={policy.application.officialUrl}
        target="_blank"
        rel="noreferrer"
      >
        공식 사이트에서 확인하기 <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}

export function PolicyFinder() {
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(1);
  const [results, setResults] = useState<PolicyRecommendation[] | null>(null);

  const incomeEstimate = useMemo(() => {
    if (!form.birthDate) return undefined;
    try {
      return deriveProfile(buildProfile(form));
    } catch {
      return undefined;
    }
  }, [form]);

  const update = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setResults(recommendPolicies(buildProfile(form)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (results) {
    const eligible = results.filter(
      (result) => result.match.status === "eligible",
    ).length;
    const review = results.filter(
      (result) => result.match.status === "needs_review",
    ).length;

    return (
      <main>
        <header className="topbar">
          <Link className="brand" href="/" aria-label="혜택나침반 홈">
            <span className="brand-mark">ㅎ</span>
            혜택나침반
          </Link>
          <span className="top-note">정부 공식 출처 기반</span>
        </header>
        <section className="results-hero">
          <button className="back-button" onClick={() => setResults(null)}>
            ← 입력 수정하기
          </button>
          <p className="eyebrow">맞춤 탐색 완료</p>
          <h1>
            놓치고 있던 혜택,
            <br />
            <em>{eligible + review}개</em>를 찾았어요
          </h1>
          <p>
            신청 가능성이 높은 정책 {eligible}개와 추가 확인이 필요한 정책{" "}
            {review}개입니다.
          </p>
        </section>
        <section className="result-list" aria-live="polite">
          {incomeEstimate?.householdMedianIncomeRatio !== undefined && (
            <aside className="median-income-card">
              <span>2026년 · {incomeEstimate.householdSize}인 가구 기준</span>
              <strong>
                예상 기준 중위소득{" "}
                {incomeEstimate.householdMedianIncomeRatio.toFixed(1)}%
              </strong>
              <p>
                입력한 가구원 수와 연소득으로 계산한 참고값이에요. 복지 심사는
                소득·재산을 반영하므로 실제 소득인정액과 다를 수 있어요.
              </p>
            </aside>
          )}
          {results.map((result) => (
            <RecommendationCard
              key={result.policy.versionId}
              recommendation={result}
            />
          ))}
          <p className="disclaimer">
            추천 결과는 입력 정보에 따른 사전 안내입니다. 실제 선정 여부,
            금리와 한도는 정책 시행기관의 최신 공고와 심사 결과를 따릅니다.
            기준 확인일 2026.07.30
          </p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="혜택나침반 홈">
          <span className="brand-mark">ㅎ</span>
          혜택나침반
        </Link>
        <span className="top-note">정부 공식 출처 기반</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">몰라서 놓치는 혜택이 없도록</p>
          <h1>
            내 상황에 맞는
            <br />
            정부 혜택을 <em>한 번에</em>
          </h1>
          <p className="hero-description">
            복잡한 검색 없이, 몇 가지 정보만 알려주세요.
            <br />
            받을 가능성이 있는 지원금과 정책대출을 이유와 함께 찾아드려요.
          </p>
          <div className="trust-row">
            <span>✓ AI 추측 없이 조건 매칭</span>
            <span>✓ 입력값은 브라우저에서만 사용</span>
          </div>
        </div>

        <form className="finder-card" onSubmit={submit}>
          <div className="progress-head">
            <div>
              <span>맞춤 혜택 찾기</span>
              <strong>{step} / 3</strong>
            </div>
            <div className="progress-track">
              <i style={{ width: `${(step / 3) * 100}%` }} />
            </div>
          </div>

          {step === 1 && (
            <fieldset>
              <legend>
                먼저, 기본 정보를
                <br />
                알려주세요
              </legend>
              <label>
                생년월일
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}-\d{2}-\d{2}"
                  placeholder="예: 1992-05-10"
                  required
                  value={form.birthDate}
                  onChange={(event) => update("birthDate", event.target.value)}
                />
              </label>
              <label>
                현재 거주 지역
                <select
                  value={form.sidoCode}
                  onChange={(event) => update("sidoCode", event.target.value)}
                >
                  {regions.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                혼인 상태
                <select
                  value={form.maritalStatus}
                  onChange={(event) =>
                    update(
                      "maritalStatus",
                      event.target.value as FormState["maritalStatus"],
                    )
                  }
                >
                  <option value="single">미혼</option>
                  <option value="married">기혼</option>
                  <option value="planned">결혼 예정</option>
                </select>
              </label>
              {form.maritalStatus === "married" && (
                <label>
                  혼인신고일
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{4}-\d{2}-\d{2}"
                    placeholder="예: 2024-04-20"
                    required
                    value={form.marriageDate}
                    onChange={(event) =>
                      update("marriageDate", event.target.value)
                    }
                  />
                </label>
              )}
              {form.maritalStatus === "planned" && (
                <label>
                  결혼 예정일
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{4}-\d{2}-\d{2}"
                    placeholder="예: 2026-09-30"
                    required
                    value={form.plannedMarriageDate}
                    onChange={(event) =>
                      update("plannedMarriageDate", event.target.value)
                    }
                  />
                </label>
              )}
              <button
                type="button"
                className="primary-button"
                onClick={(event) => {
                  if (event.currentTarget.form?.reportValidity()) setStep(2);
                }}
              >
                다음
              </button>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset>
              <legend>
                가족과 소득 정보를
                <br />
                알려주세요
              </legend>
              <label>
                본인 연소득 <small>만원 단위</small>
                <input
                  type="number"
                  min="0"
                  placeholder="예: 4000"
                  value={form.applicantIncome}
                  onChange={(event) =>
                    update("applicantIncome", event.target.value)
                  }
                />
              </label>
              {form.maritalStatus !== "single" && (
                <label>
                  배우자 연소득 <small>만원 단위</small>
                  <input
                    type="number"
                    min="0"
                    placeholder="예: 3000"
                    value={form.spouseIncome}
                    onChange={(event) =>
                      update("spouseIncome", event.target.value)
                    }
                  />
                </label>
              )}
              <label>
                가구원 수 <small>본인 포함</small>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="예: 3"
                  required
                  value={form.householdSize}
                  onChange={(event) =>
                    update("householdSize", event.target.value)
                  }
                />
              </label>
              <p className="field-help">
                본인을 포함해 현재 함께 생활하는 인원을 입력해 주세요.
                한부모·조부모 동거 등 실제 가구 구성을 그대로 반영해요.
              </p>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={form.hasChild}
                  onChange={(event) => update("hasChild", event.target.checked)}
                />
                자녀가 있어요
              </label>
              {form.hasChild && (
                <div className="conditional">
                  <label>
                    가장 어린 자녀 생년월일
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{4}-\d{2}-\d{2}"
                      placeholder="예: 2025-12-15"
                      required
                      value={form.childBirthDate}
                      onChange={(event) =>
                        update("childBirthDate", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    출생 순위
                    <select
                      value={form.childBirthOrder}
                      onChange={(event) =>
                        update("childBirthOrder", event.target.value)
                      }
                    >
                      <option value="1">첫째</option>
                      <option value="2">둘째</option>
                      <option value="3">셋째 이상</option>
                    </select>
                  </label>
                </div>
              )}
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={form.jobSeeking}
                  onChange={(event) => update("jobSeeking", event.target.checked)}
                />
                현재 구직 중이에요
              </label>
              <div className="button-row">
                <button type="button" className="text-button" onClick={() => setStep(1)}>
                  이전
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={(event) => {
                    if (event.currentTarget.form?.reportValidity()) setStep(3);
                  }}
                >
                  다음
                </button>
              </div>
            </fieldset>
          )}

          {step === 3 && (
            <fieldset>
              <legend>
                주거 혜택도
                <br />
                함께 찾아볼까요?
              </legend>
              <p className="field-help">
                모르는 항목은 비워두세요. 탈락 처리하지 않고 결과에서 필요한
                확인사항으로 알려드려요.
              </p>
              <label>
                세대주 여부
                <select
                  value={form.isHouseholdHead}
                  onChange={(event) =>
                    update(
                      "isHouseholdHead",
                      event.target.value as FormState["isHouseholdHead"],
                    )
                  }
                >
                  <option value="">잘 모르겠어요</option>
                  <option value="yes">예</option>
                  <option value="no">아니요</option>
                </select>
              </label>
              <label>
                가구 전체 보유 주택 수
                <input
                  type="number"
                  min="0"
                  placeholder="모르면 비워두세요"
                  value={form.homeCount}
                  onChange={(event) => update("homeCount", event.target.value)}
                />
              </label>
              <label>
                가구 순자산 <small>만원 단위</small>
                <input
                  type="number"
                  min="0"
                  placeholder="자산에서 부채를 뺀 금액"
                  value={form.netAssets}
                  onChange={(event) => update("netAssets", event.target.value)}
                />
              </label>
              <div className="button-row">
                <button type="button" className="text-button" onClick={() => setStep(2)}>
                  이전
                </button>
                <button type="submit" className="primary-button">
                  내 혜택 결과 보기
                </button>
              </div>
              <p className="privacy-note">
                🔒 입력 정보는 서버에 저장하지 않고 이번 조회에만 사용합니다.
              </p>
            </fieldset>
          )}
        </form>
      </section>

      <section className="how-it-works">
        <p className="eyebrow">어떻게 찾아주나요?</p>
        <h2>추측하지 않고, 조건을 하나씩 비교해요</h2>
        <div className="steps">
          <div><b>01</b><strong>한 번 입력</strong><span>겹치는 질문 없이 기본 상황을 받아요</span></div>
          <div><b>02</b><strong>정책 조건 비교</strong><span>공식 기준과 입력값을 직접 대조해요</span></div>
          <div><b>03</b><strong>이유와 함께 추천</strong><span>왜 추천했는지, 무엇을 더 볼지 알려줘요</span></div>
        </div>
      </section>
      <CatalogSearch />
    </main>
  );
}
