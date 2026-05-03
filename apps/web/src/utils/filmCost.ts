type CostAmount = { amount: number; currencyCode: string } | null | undefined;

export function formatCost(cost: CostAmount): string {
  if (!cost) return 'Not recorded';
  return `${cost.currencyCode} ${cost.amount.toFixed(2)}`;
}

export function formatKnownCost(film: { purchaseCostAllocated: CostAmount; developmentCost: CostAmount }): string {
  const purchase = film.purchaseCostAllocated;
  const development = film.developmentCost;
  if (!purchase && !development) return 'Not recorded';
  if (purchase && development && purchase.currencyCode === development.currencyCode) {
    return formatCost({ amount: purchase.amount + development.amount, currencyCode: purchase.currencyCode });
  }
  if (purchase && development) {
    return `${formatCost(purchase)} + ${formatCost(development)}`;
  }
  return formatCost(purchase ?? development);
}
