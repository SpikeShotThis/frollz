export function allocateCostForFilm(totalAmount: number, quantity: number, filmId: number): number {
  if (quantity <= 0) {
    return 0;
  }

  const cents = Math.round(totalAmount * 100);
  const base = Math.floor(cents / quantity);
  const remainder = cents % quantity;
  const remainderSlot = (filmId - 1) % quantity;
  const allocatedCents = base + (remainderSlot < remainder ? 1 : 0);
  return allocatedCents / 100;
}
