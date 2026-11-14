const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kmFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const brl = (v: number) => brlFmt.format(v);
export const num = (v: number) => numFmt.format(v);
export const km = (v: number) => kmFmt.format(v);

export type FeeConfig = { fixed: number; perKm: number; maxKm: number; minOrder: number };

/** Taxa = fixo + km × valor por km. Fora do raio, não entrega. */
export function deliveryFee(distanceKm: number, cfg: FeeConfig) {
  const inArea = distanceKm <= cfg.maxKm;
  return { inArea, fee: inArea ? cfg.fixed + distanceKm * cfg.perKm : 0 };
}

/** Estimativa simples: 18 min de preparo + 4 min por km. */
export const etaMinutes = (distanceKm: number) => Math.round(18 + distanceKm * 4);
