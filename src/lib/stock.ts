// Splits a raw piece count into whole Case/Carton count + remaining loose Pieces,
// mirroring the Case/Pcs entry convention used on Purchase/Sale (never a fractional case).
export function splitCasePcs(totalPcs: number, packing: number): { case: number; pcs: number } {
  const p = packing > 0 ? packing : 1;
  const wholeCase = Math.floor(totalPcs / p);
  const pcs = Math.round(totalPcs - wholeCase * p);
  return { case: wholeCase, pcs };
}
