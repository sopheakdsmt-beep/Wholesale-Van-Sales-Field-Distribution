import { describe, expect, it } from "vitest";
import { PRODUCTS, SHOPS } from "./catalog";
import { quoteFromQty } from "./pricing";
import { blankState, commitDelivery, reducer } from "./reducer";
import { seedState } from "./seed";
import { availablePieces, creditRoom, physicalOnTruck, shopOutstanding } from "./selectors";

const angkor = PRODUCTS[0];

describe("tier pricing", () => {
  it("prices a crate below the single-can equivalent", () => {
    const quote = quoteFromQty("prek", { angkor: { single: 0, pack: 0, crate: 1 } });
    expect(quote.gross).toBe(1480);
    expect(quote.lines[0].savings).toBe(24 * 70 - 1480);
    expect(quote.trade).toBe(Math.round(1480 * 0.03));
    expect(quote.due).toBe(1480 - quote.trade);
  });

  it("applies the beer volume discount only at five cases", () => {
    const under = quoteFromQty("lyhuor", { angkor: { single: 0, pack: 0, crate: 4 } });
    expect(under.volume).toBe(0);
    const hit = quoteFromQty("lyhuor", {
      angkor: { single: 0, pack: 0, crate: 3 },
      cambodia: { single: 0, pack: 0, crate: 2 },
    });
    expect(hit.beerCases).toBe(5);
    expect(hit.volume).toBe(Math.round(hit.beerGross * 0.02));
    expect(hit.due).toBe(hit.gross - hit.volume - hit.trade);
  });
});

describe("truck ledger", () => {
  it("seeds two delivered stops and keeps the rest of the cage", () => {
    const state = seedState();
    expect(state.visits).toHaveLength(2);
    expect(state.visits[0].receiptNo).toBe("VS-261008-014");
    expect(physicalOnTruck(state, "angkor")).toBe(48 * 24 - (2 + 3) * 24);
    expect(state.visits[1].cash + state.visits[1].khqr + state.visits[1].credit).toBe(state.visits[1].due);
  });

  it("reserves a draft without removing physical stock, then deducts on confirm", () => {
    let state = blankState();
    state = reducer(state, { type: "inc", shopId: "prek", productId: "angkor", unit: "crate", delta: 2 });
    expect(physicalOnTruck(state, "angkor")).toBe(48 * 24);
    expect(availablePieces(state, "angkor")).toBe(48 * 24 - 48);
    const before = physicalOnTruck(state, "angkor");
    state = commitDelivery(state, "prek", "2026-10-08T02:00:00.000Z");
    expect(state.overlay?.kind).toBe("receipt");
    expect(physicalOnTruck(state, "angkor")).toBe(before - 48);
    expect(state.visits[0].cash).toBe(state.visits[0].due);
  });

  it("refuses to promise more than the cage holds", () => {
    let state = blankState();
    state = reducer(state, { type: "inc", shopId: "prek", productId: "oil", unit: "crate", delta: 16 });
    const blocked = reducer(state, { type: "inc", shopId: "prek", productId: "oil", unit: "crate", delta: 1 });
    expect(blocked.toast?.text).toMatch(/អស់/);
    expect(blocked.drafts.prek.qty.oil.crate).toBe(16);
  });

  it("splits cash, KHQR, and credit, and blocks credit past the shop ceiling", () => {
    let state = blankState();
    state = reducer(state, { type: "usual", shopId: "hoeun" });
    const room = creditRoom(state, "hoeun");
    expect(room).toBe(SHOPS.find((s) => s.id === "hoeun")!.creditLimit - 7800);
    state = reducer(state, { type: "preset", shopId: "hoeun", mode: "split" });
    expect(state.drafts.hoeun.credit).toBeLessThanOrEqual(room);
    expect(state.drafts.hoeun.cash + state.drafts.hoeun.credit).toBe(
      quoteFromQty("hoeun", state.drafts.hoeun.qty).due,
    );
  });

  it("returns stock and debt when a receipt is amended", () => {
    const seeded = seedState();
    const owed = shopOutstanding(seeded, "vireak");
    const onTruck = physicalOnTruck(seeded, "angkor");
    const amended = reducer(seeded, { type: "amend", shopId: "vireak" });
    expect(physicalOnTruck(amended, "angkor")).toBeGreaterThan(onTruck);
    expect(shopOutstanding(amended, "vireak")).toBeLessThan(owed);
    expect(amended.drafts.vireak.qty.angkor.crate).toBe(3);
  });

  it("keeps an untouched order on all-cash until the driver splits it", () => {
    let state = reducer(blankState(), { type: "inc", shopId: "mao", productId: "mama", unit: "pack", delta: 2 });
    const quote = quoteFromQty("mao", state.drafts.mao.qty);
    expect(quote.trade).toBe(0);
    state = reducer(state, { type: "preset", shopId: "mao", mode: "khqr" });
    state = reducer(state, { type: "confirm", shopId: "mao", at: "2026-10-08T03:00:00.000Z" });
    expect(state.overlay?.kind).toBe("khqr");
    expect(state.visits).toHaveLength(0);
    state = reducer(state, { type: "khqrPaid", at: "2026-10-08T03:01:00.000Z" });
    expect(state.visits[0].khqr).toBe(quote.due);
    expect(state.visits[0].cash).toBe(0);
    expect(angkor.sku).toBe("ANK-330");
  });
});
