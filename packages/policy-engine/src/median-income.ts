const MONTHLY_MEDIAN_INCOME_BY_YEAR: Record<number, readonly number[]> = {
  2026: [
    2_564_238,
    4_199_292,
    5_359_036,
    6_494_738,
    7_556_719,
    8_555_952,
    9_515_150,
  ],
};

export function getMonthlyMedianIncome(
  householdSize: number,
  year: number,
): number | undefined {
  if (!Number.isInteger(householdSize) || householdSize < 1) return undefined;

  const amounts = MONTHLY_MEDIAN_INCOME_BY_YEAR[year];
  if (!amounts) return undefined;
  if (householdSize <= amounts.length) return amounts[householdSize - 1];

  const perAdditionalMember =
    amounts[amounts.length - 1] - amounts[amounts.length - 2];
  return (
    amounts[amounts.length - 1] +
    perAdditionalMember * (householdSize - amounts.length)
  );
}

export function calculateMedianIncomeRatio({
  householdIncomeAnnual,
  householdSize,
  year,
}: {
  householdIncomeAnnual?: number;
  householdSize: number;
  year: number;
}): number | undefined {
  if (
    householdIncomeAnnual === undefined ||
    !Number.isFinite(householdIncomeAnnual) ||
    householdIncomeAnnual < 0
  ) {
    return undefined;
  }

  const monthlyMedianIncome = getMonthlyMedianIncome(householdSize, year);
  if (monthlyMedianIncome === undefined) return undefined;

  const ratio = (householdIncomeAnnual / 12 / monthlyMedianIncome) * 100;
  return Math.round(ratio * 10) / 10;
}
