import { SHOPS } from "./catalog";
import { commitDelivery, reducer } from "./reducer";
import { quoteShop } from "./pricing";
import type { State } from "./types";

function withUsual(state: State, shopId: string): State {
  return reducer(state, { type: "usual", shopId });
}

function withTenders(state: State, shopId: string, cash: number, khqr: number, credit: number): State {
  return {
    ...state,
    drafts: {
      ...state.drafts,
      [shopId]: { ...state.drafts[shopId], cash, khqr, credit, tenderTouched: true },
    },
  };
}

/** Two stops already served this morning, so the cage and the cash bag are mid-route. */
export function seedState(): State {
  let state = reducer({ ...blankish(), toast: null }, { type: "toastClear" });

  state = withUsual(state, "mom");
  state = commitDelivery(state, "mom", "2026-10-08T00:42:00.000Z");
  state = { ...state, overlay: null, toast: null };

  state = withUsual(state, "vireak");
  const due = quoteShop(state, "vireak").due;
  const cash = Math.round(due * 0.5);
  const khqr = Math.round(due * 0.3);
  const credit = due - cash - khqr;
  state = withTenders(state, "vireak", cash, khqr, credit);
  state = commitDelivery(state, "vireak", "2026-10-08T01:06:00.000Z");

  return {
    ...state,
    overlay: null,
    toast: null,
    selectedShopId: "prek",
    view: "route",
    glove: true,
    closed: false,
    physical: {},
    cashCounted: null,
  };
}

function blankish(): State {
  return {
    glove: true,
    view: "route",
    selectedShopId: SHOPS[2].id,
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

export const STORAGE_KEY = "van-sales-pad-v1";

export function serialize(state: State) {
  return {
    v: 1 as const,
    state: { ...state, toast: null, overlay: null },
  };
}
