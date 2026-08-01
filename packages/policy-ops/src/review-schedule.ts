export type PolicyReviewWindow = {
  year: number;
  month: 6 | 12;
  startsOn: string;
  endsOn: string;
};

function koreaDateParts(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const read = (type: "year" | "month") =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month") };
}

function reviewWindow(year: number, month: 6 | 12): PolicyReviewWindow {
  const monthText = String(month).padStart(2, "0");
  const finalDay = month === 6 ? 30 : 31;
  return {
    year,
    month,
    startsOn: `${year}-${monthText}-01`,
    endsOn: `${year}-${monthText}-${finalDay}`,
  };
}

export function getLatestRequiredReviewWindow(
  asOf = new Date(),
): PolicyReviewWindow {
  const { year, month } = koreaDateParts(asOf);
  return month >= 7
    ? reviewWindow(year, 6)
    : reviewWindow(year - 1, 12);
}

export function getNextReviewWindow(asOf = new Date()): PolicyReviewWindow {
  const { year, month } = koreaDateParts(asOf);
  return month <= 6 ? reviewWindow(year, 6) : reviewWindow(year, 12);
}

export function isPolicySourceCurrent(
  verifiedOn: string,
  asOf = new Date(),
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(verifiedOn)) return false;
  return verifiedOn >= getLatestRequiredReviewWindow(asOf).startsOn;
}
