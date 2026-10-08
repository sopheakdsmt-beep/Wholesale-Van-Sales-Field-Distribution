import { MORNING_LOAD, PRODUCT_MAP, PRODUCTS, SHOP_MAP, SHOPS } from "./catalog";
import { availablePieces, physicalOnTruck, postedPieces, quoteShop, reservedPieces } from "./pricing";
import type { Channel, Draft, LineQty, State } from "./types";

export function shopById(id: string) {
  const shop = SHOP_MAP[id];
  if (!shop) throw new Error(`Unknown shop ${id}`);
  return shop;
}

export function productById(id: string) {
  const product = PRODUCT_MAP[id];
  if (!product) throw new Error(`Unknown product ${id}`);
  return product;
}

export { availablePieces, physicalOnTruck, postedPieces, quoteShop, reservedPieces };

export function shopOutstanding(state: State, shopId: string): number {
  const shop = shopById(shopId);
  const today = state.visits.filter((v) => v.shopId === shopId).reduce((sum, v) => sum + v.credit, 0);
  return shop.baseOutstanding + today;
}

export function creditRoom(state: State, shopId: string): number {
  return Math.max(0, shopById(shopId).creditLimit - shopOutstanding(state, shopId));
}

export function emptyDraft(): Draft {
  return { qty: {}, cash: 0, khqr: 0, credit: 0, tenderTouched: false };
}

export function draftOf(state: State, shopId: string): Draft {
  return state.drafts[shopId] ?? emptyDraft();
}

export function effectiveTender(draft: Draft, due: number): Record<Channel, number> {
  if (!draft.tenderTouched) return { cash: due, khqr: 0, credit: 0 };
  return { cash: draft.cash, khqr: draft.khqr, credit: draft.credit };
}

export function visitForShop(state: State, shopId: string) {
  return state.visits.find((v) => v.shopId === shopId) ?? null;
}

export function expectedCash(state: State): number {
  return state.visits.reduce((sum, v) => sum + v.cash, 0);
}

export function expectedKhqr(state: State): number {
  return state.visits.reduce((sum, v) => sum + v.khqr, 0);
}

export function newCredit(state: State): number {
  return state.visits.reduce((sum, v) => sum + v.credit, 0);
}

export function priorDebt(): number {
  return SHOPS.reduce((sum, shop) => sum + shop.baseOutstanding, 0);
}

export function morningLoad(productId: string): number {
  return MORNING_LOAD[productId] ?? 0;
}

export function qtyOrEmpty(qty: Record<string, LineQty>, productId: string): LineQty {
  return qty[productId] ?? { single: 0, pack: 0, crate: 0 };
}

export function totalCasesOnTruck(state: State): number {
  let cases = 0;
  for (const product of PRODUCTS) {
    cases += physicalOnTruck(state, product.id) / product.cratePieces;
  }
  return Math.round(cases * 10) / 10;
}

export function nextPendingId(state: State): string | null {
  const delivered = new Set(state.visits.map((v) => v.shopId));
  const skipped = new Set(state.skipped);
  return SHOPS.find((shop) => !delivered.has(shop.id) && !skipped.has(shop.id))?.id ?? null;
}
