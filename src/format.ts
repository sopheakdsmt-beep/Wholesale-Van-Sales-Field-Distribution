import { KHR_PER_USD, PRODUCT_MAP } from "./catalog";
import type { LineQty, Product } from "./types";

export function money(cents: number): string {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

export function khr(cents: number): string {
  const riel = Math.round((cents / 100) * KHR_PER_USD);
  return `៛${riel.toLocaleString("en-US")}`;
}

export function piecesOf(product: Product, qty: LineQty): number {
  return qty.single + qty.pack * product.packPieces + qty.crate * product.cratePieces;
}

export function grossOf(product: Product, qty: LineQty): number {
  return qty.single * product.priceSingle + qty.pack * product.pricePack + qty.crate * product.priceCrate;
}

export function singleEquivalent(product: Product, qty: LineQty): number {
  return piecesOf(product, qty) * product.priceSingle;
}

/** Human stock: crates, then packs, then singles. */
export function stockLabel(product: Product, pieces: number): string {
  const sign = pieces < 0 ? "−" : "";
  let left = Math.abs(pieces);
  const crates = Math.floor(left / product.cratePieces);
  left -= crates * product.cratePieces;
  const packs = Math.floor(left / product.packPieces);
  left -= packs * product.packPieces;
  const parts: string[] = [];
  if (crates) parts.push(`${crates} ${product.unitCrateKm}`);
  if (packs) parts.push(`${packs} ${product.unitPackKm}`);
  if (left || parts.length === 0) parts.push(`${left} ${product.unitSingleKm}`);
  return sign + parts.join(" ");
}

export function caseCount(piecesByProduct: Record<string, number>): number {
  let cases = 0;
  for (const [id, pieces] of Object.entries(piecesByProduct)) {
    const product = PRODUCT_MAP[id];
    if (!product) continue;
    cases += pieces / product.cratePieces;
  }
  return Math.round(cases * 10) / 10;
}

export function clock(iso: string): string {
  return new Intl.DateTimeFormat("km-KH", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Phnom_Penh",
  }).format(new Date(iso));
}

export function receiptStamp(iso: string): string {
  const d = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Phnom_Penh",
  }).format(new Date(iso));
  return d;
}
