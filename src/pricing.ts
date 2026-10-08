import { MORNING_LOAD, PRODUCTS, PRODUCT_MAP, SHOP_MAP, VOLUME_CASE_THRESHOLD, VOLUME_RATE } from "./catalog";
import { grossOf, piecesOf, singleEquivalent } from "./format";
import type { LineQty, Quote, QuoteLine, State } from "./types";

export function emptyLine(): LineQty {
  return { single: 0, pack: 0, crate: 0 };
}

export function quoteFromQty(shopId: string, qtyMap: Record<string, LineQty>): Quote {
  const shop = SHOP_MAP[shopId];
  const lines: QuoteLine[] = [];
  let gross = 0;
  let pieces = 0;
  let beerPieces = 0;
  let beerGross = 0;

  for (const product of PRODUCTS) {
    const qty = qtyMap[product.id] ?? emptyLine();
    const linePieces = piecesOf(product, qty);
    if (linePieces <= 0) continue;
    const lineGross = grossOf(product, qty);
    const savings = Math.max(0, singleEquivalent(product, qty) - lineGross);
    lines.push({ product, qty, pieces: linePieces, gross: lineGross, savings });
    gross += lineGross;
    pieces += linePieces;
    if (product.category === "beer") {
      beerPieces += linePieces;
      beerGross += lineGross;
    }
  }

  const beerCases = beerPieces / 24;
  const volume = beerCases + 1e-9 >= VOLUME_CASE_THRESHOLD ? Math.round(beerGross * VOLUME_RATE) : 0;
  const trade = shop ? Math.round(((gross - volume) * shop.tradePct) / 100) : 0;
  return {
    lines,
    gross,
    volume,
    trade,
    due: gross - volume - trade,
    pieces,
    beerCases,
    beerGross,
  };
}

export function postedPieces(state: State, productId: string): number {
  let n = 0;
  for (const visit of state.visits) {
    for (const line of visit.lines) {
      if (line.productId === productId) n += line.pieces;
    }
  }
  return n;
}

export function reservedPieces(state: State, productId: string, exceptShopId?: string): number {
  const product = PRODUCT_MAP[productId];
  if (!product) return 0;
  const delivered = new Set(state.visits.map((v) => v.shopId));
  let n = 0;
  for (const [shopId, draft] of Object.entries(state.drafts)) {
    if (shopId === exceptShopId || delivered.has(shopId)) continue;
    n += piecesOf(product, draft.qty[productId] ?? emptyLine());
  }
  return n;
}

export function physicalOnTruck(state: State, productId: string): number {
  return (MORNING_LOAD[productId] ?? 0) - postedPieces(state, productId);
}

/** Pieces still free to promise. Pass the shop being edited so its own draft is not counted twice. */
export function availablePieces(state: State, productId: string, exceptShopId?: string): number {
  return physicalOnTruck(state, productId) - reservedPieces(state, productId, exceptShopId);
}

export function quoteShop(state: State, shopId: string): Quote {
  return quoteFromQty(shopId, state.drafts[shopId]?.qty ?? {});
}
