import { MORNING_LOAD, PRODUCTS, SHOPS } from "./catalog";
import { piecesOf } from "./format";
import { availablePieces, quoteFromQty } from "./pricing";
import { creditRoom, draftOf, effectiveTender, qtyOrEmpty, shopById, visitForShop } from "./selectors";
import type { Channel, Draft, LineQty, State, Unit, Visit } from "./types";

export type Action =
  | { type: "select"; shopId: string }
  | { type: "view"; view: State["view"] }
  | { type: "glove" }
  | { type: "inc"; shopId: string; productId: string; unit: Unit; delta: number }
  | { type: "usual"; shopId: string }
  | { type: "clear"; shopId: string }
  | { type: "skip"; shopId: string }
  | { type: "unskip"; shopId: string }
  | { type: "tender"; shopId: string; channel: Channel; deltaCents: number }
  | { type: "fill"; shopId: string; channel: Channel }
  | { type: "preset"; shopId: string; mode: "cash" | "khqr" | "split" }
  | { type: "confirm"; shopId: string; at: string }
  | { type: "khqrPaid"; at: string }
  | { type: "closeOverlay" }
  | { type: "showReceipt"; visitId: string }
  | { type: "amend"; shopId: string }
  | { type: "physical"; productId: string; delta: number }
  | { type: "cashCount"; cents: number }
  | { type: "acceptSystem" }
  | { type: "closeRoute" }
  | { type: "reopen" }
  | { type: "toastClear" }
  | { type: "reset"; state: State };

const ZERO: LineQty = { single: 0, pack: 0, crate: 0 };

function toast(state: State, text: string): State {
  const toastSeq = state.toastSeq + 1;
  return { ...state, toastSeq, toast: { id: toastSeq, text } };
}

function putDraft(state: State, shopId: string, draft: Draft): State {
  return { ...state, drafts: { ...state.drafts, [shopId]: draft } };
}

function dropDraft(state: State, shopId: string): State {
  if (!state.drafts[shopId]) return state;
  const drafts = { ...state.drafts };
  delete drafts[shopId];
  return { ...state, drafts };
}

function systemPieces(state: State, productId: string): number {
  let posted = 0;
  for (const visit of state.visits) {
    for (const line of visit.lines) if (line.productId === productId) posted += line.pieces;
  }
  return (MORNING_LOAD[productId] ?? 0) - posted;
}

function clampQty(desired: LineQty, productId: string, maxPieces: number): LineQty {
  const product = PRODUCTS.find((item) => item.id === productId);
  if (!product) return { ...ZERO };
  const qty = { ...desired };
  while (piecesOf(product, qty) > maxPieces) {
    if (qty.crate > 0) qty.crate -= 1;
    else if (qty.pack > 0) qty.pack -= 1;
    else if (qty.single > 0) qty.single -= 1;
    else break;
  }
  return qty;
}

function applyChannel(
  current: Record<Channel, number>,
  channel: Channel,
  nextValue: number,
  due: number,
  room: number,
): { tender: Record<Channel, number>; note: string | null } {
  const tender = { ...current, [channel]: Math.max(0, nextValue) };
  let note: string | null = null;
  if (channel === "credit" && tender.credit > room) {
    tender.credit = room;
    note = "លើសដែនជំពាក់របស់ហាង";
  }
  const sum = tender.cash + tender.khqr + tender.credit;
  if (sum > due) tender[channel] = Math.max(0, tender[channel] - (sum - due));
  return { tender, note };
}

export function commitDelivery(state: State, shopId: string, at: string): State {
  if (state.closed) return toast(state, "ផ្លូវបានបិទហើយ");
  if (state.skipped.includes(shopId)) return toast(state, "ហាងនេះត្រូវបានរំលង");
  if (visitForShop(state, shopId)) return toast(state, "ហាងនេះបានចេញវិក្កយបត្រហើយ");

  const draft = draftOf(state, shopId);
  const quote = quoteFromQty(shopId, draft.qty);
  if (quote.due <= 0) return toast(state, "មិនទាន់មានទំនិញ");

  for (const line of quote.lines) {
    if (line.pieces > availablePieces(state, line.product.id, shopId)) {
      return toast(state, `ស្តុកលើឡានអស់ · ${line.product.nameKm}`);
    }
  }

  const tender = effectiveTender(draft, quote.due);
  if (tender.cash + tender.khqr + tender.credit !== quote.due) {
    return toast(state, "សាច់ប្រាក់ KHQR និងជំពាក់ មិនទាន់គ្រប់");
  }
  if (tender.credit > creditRoom(state, shopId)) return toast(state, "លើសដែនជំពាក់របស់ហាង");

  const receiptNo = `VS-261008-${String(state.receiptSeq).padStart(3, "0")}`;
  const visit: Visit = {
    id: receiptNo,
    shopId,
    receiptNo,
    at,
    lines: quote.lines.map((line) => ({
      productId: line.product.id,
      qty: line.qty,
      pieces: line.pieces,
      gross: line.gross,
    })),
    gross: quote.gross,
    volume: quote.volume,
    trade: quote.trade,
    due: quote.due,
    cash: tender.cash,
    khqr: tender.khqr,
    credit: tender.credit,
    beerCases: quote.beerCases,
  };

  return dropDraft(
    {
      ...state,
      visits: [...state.visits, visit],
      receiptSeq: state.receiptSeq + 1,
      overlay: { kind: "receipt", visitId: visit.id },
      view: "route",
    },
    shopId,
  );
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "reset":
      return action.state;
    case "toastClear":
      return { ...state, toast: null };
    case "glove":
      return { ...state, glove: !state.glove };
    case "view":
      return { ...state, view: action.view };
    case "select":
      return { ...state, selectedShopId: action.shopId, view: "route" };
    case "closeOverlay":
      return { ...state, overlay: null };
    case "showReceipt":
      return { ...state, overlay: { kind: "receipt", visitId: action.visitId } };
    case "clear":
      return dropDraft(state, action.shopId);
    case "skip": {
      if (visitForShop(state, action.shopId)) return toast(state, "ហាងនេះបានដឹកហើយ");
      const skipped = state.skipped.includes(action.shopId) ? state.skipped : [...state.skipped, action.shopId];
      return toast(dropDraft({ ...state, skipped }, action.shopId), "បានរំលងហាង · ស្តុកនៅលើឡាន");
    }
    case "unskip":
      return { ...state, skipped: state.skipped.filter((id) => id !== action.shopId) };
    case "inc": {
      if (state.closed) return toast(state, "ផ្លូវបានបិទហើយ");
      if (visitForShop(state, action.shopId) || state.skipped.includes(action.shopId)) return state;
      const product = PRODUCTS.find((item) => item.id === action.productId);
      if (!product) return state;
      const draft = draftOf(state, action.shopId);
      const current = qtyOrEmpty(draft.qty, action.productId);
      const next = { ...current, [action.unit]: Math.max(0, current[action.unit] + action.delta) };
      if (piecesOf(product, next) > availablePieces(state, action.productId, action.shopId)) {
        return toast(state, `ស្តុកលើឡានអស់ · ${product.nameKm}`);
      }
      return putDraft(state, action.shopId, { ...draft, qty: { ...draft.qty, [action.productId]: next } });
    }
    case "usual": {
      if (state.closed) return toast(state, "ផ្លូវបានបិទហើយ");
      if (visitForShop(state, action.shopId) || state.skipped.includes(action.shopId)) return state;
      const shop = shopById(action.shopId);
      const draft = draftOf(state, action.shopId);
      const qty: Record<string, LineQty> = {};
      let scratch = putDraft(state, action.shopId, { ...draft, qty: {} });
      for (const product of PRODUCTS) {
        const fitted = clampQty(shop.usual[product.id] ?? ZERO, product.id, availablePieces(scratch, product.id, action.shopId));
        if (fitted.single || fitted.pack || fitted.crate) qty[product.id] = fitted;
        scratch = putDraft(scratch, action.shopId, { ...draft, qty: { ...qty } });
      }
      return putDraft(state, action.shopId, { ...draft, qty });
    }
    case "tender":
    case "fill":
    case "preset": {
      if (visitForShop(state, action.shopId)) return state;
      const draft = draftOf(state, action.shopId);
      const due = quoteFromQty(action.shopId, draft.qty).due;
      const room = creditRoom(state, action.shopId);
      const base = effectiveTender(draft, due);
      let next = base;
      let note: string | null = null;
      if (action.type === "preset") {
        if (action.mode === "cash") next = { cash: due, khqr: 0, credit: 0 };
        if (action.mode === "khqr") next = { cash: 0, khqr: due, credit: 0 };
        if (action.mode === "split") {
          const credit = Math.min(room, Math.floor(due / 2));
          next = { cash: due - credit, khqr: 0, credit };
          if (credit < Math.floor(due / 2)) note = "ជំពាក់ត្រូវបានកាត់តាមដែនហាង";
        }
      } else if (action.type === "fill") {
        const gap = due - (base.cash + base.khqr + base.credit);
        const applied = applyChannel(base, action.channel, base[action.channel] + gap, due, room);
        next = applied.tender;
        note = applied.note;
      } else {
        const applied = applyChannel(base, action.channel, base[action.channel] + action.deltaCents, due, room);
        next = applied.tender;
        note = applied.note;
      }
      const updated = putDraft(state, action.shopId, { ...draft, ...next, tenderTouched: true });
      return note ? toast(updated, note) : updated;
    }
    case "confirm": {
      const draft = draftOf(state, action.shopId);
      const due = quoteFromQty(action.shopId, draft.qty).due;
      const tender = effectiveTender(draft, due);
      if (tender.khqr > 0) {
        if (due <= 0) return toast(state, "មិនទាន់មានទំនិញ");
        if (draft.tenderTouched && tender.cash + tender.khqr + tender.credit !== due) {
          return toast(state, "សាច់ប្រាក់ KHQR និងជំពាក់ មិនទាន់គ្រប់");
        }
        return { ...state, overlay: { kind: "khqr", shopId: action.shopId } };
      }
      return commitDelivery(state, action.shopId, action.at);
    }
    case "khqrPaid": {
      if (state.overlay?.kind !== "khqr") return state;
      return commitDelivery({ ...state, overlay: null }, state.overlay.shopId, action.at);
    }
    case "amend": {
      if (state.closed) return toast(state, "ផ្លូវបានបិទហើយ");
      const visit = visitForShop(state, action.shopId);
      if (!visit) return state;
      const qty: Record<string, LineQty> = {};
      for (const line of visit.lines) qty[line.productId] = line.qty;
      return toast(
        {
          ...state,
          visits: state.visits.filter((item) => item.id !== visit.id),
          drafts: {
            ...state.drafts,
            [action.shopId]: {
              qty,
              cash: visit.cash,
              khqr: visit.khqr,
              credit: visit.credit,
              tenderTouched: true,
            },
          },
          overlay: null,
          view: "route",
          selectedShopId: action.shopId,
        },
        "បានដកវិក្កយបត្រ · ស្តុកត្រឡប់លើឡាន",
      );
    }
    case "physical":
      return {
        ...state,
        physical: {
          ...state.physical,
          [action.productId]: Math.max(0, (state.physical[action.productId] ?? systemPieces(state, action.productId)) + action.delta),
        },
      };
    case "cashCount":
      return { ...state, cashCounted: Math.max(0, action.cents) };
    case "acceptSystem": {
      const physical: Record<string, number | null> = {};
      for (const product of PRODUCTS) physical[product.id] = systemPieces(state, product.id);
      return { ...state, physical };
    }
    case "closeRoute": {
      if (state.cashCounted === null) return toast(state, "រាប់សាច់ប្រាក់ក្នុងកាបូបជាមុន");
      if (PRODUCTS.some((product) => state.physical[product.id] == null)) return toast(state, "រាប់ស្តុកនៅលើឡានជាមុន");
      return { ...state, closed: true };
    }
    case "reopen":
      return { ...state, closed: false };
    default:
      return state;
  }
}

export function blankState(): State {
  return {
    glove: true,
    view: "route",
    selectedShopId: SHOPS[2]?.id ?? SHOPS[0].id,
    drafts: {},
    visits: [],
    skipped: [],
    physical: {},
    cashCounted: null,
    closed: false,
    receiptSeq: 14,
    toast: null,
    overlay: null,
    toastSeq: 0,
  };
}
