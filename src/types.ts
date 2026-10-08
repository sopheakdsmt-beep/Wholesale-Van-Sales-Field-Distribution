export type Unit = "single" | "pack" | "crate";
export type Channel = "cash" | "khqr" | "credit";
export type View = "route" | "ledger" | "reconcile";
export type Category = "beer" | "beverage" | "grocery";

export interface LineQty {
  single: number;
  pack: number;
  crate: number;
}

export interface Product {
  id: string;
  sku: string;
  nameKm: string;
  nameEn: string;
  category: Category;
  unitSingleKm: string;
  unitPackKm: string;
  unitCrateKm: string;
  packPieces: number;
  cratePieces: number;
  /** Prices in US cents. */
  priceSingle: number;
  pricePack: number;
  priceCrate: number;
}

export interface Shop {
  id: string;
  nameKm: string;
  nameEn: string;
  ownerKm: string;
  phone: string;
  areaKm: string;
  minutesFromPrev: number;
  mapX: number;
  mapY: number;
  /** Invoice trade discount, percent. */
  tradePct: number;
  /** Credit ceiling in cents. */
  creditLimit: number;
  /** Debt carried into this morning, cents. */
  baseOutstanding: number;
  usual: Record<string, LineQty>;
}

export interface Draft {
  qty: Record<string, LineQty>;
  cash: number;
  khqr: number;
  credit: number;
  tenderTouched: boolean;
}

export interface VisitLine {
  productId: string;
  qty: LineQty;
  pieces: number;
  gross: number;
}

export interface Visit {
  id: string;
  shopId: string;
  receiptNo: string;
  at: string;
  lines: VisitLine[];
  gross: number;
  volume: number;
  trade: number;
  due: number;
  cash: number;
  khqr: number;
  credit: number;
  beerCases: number;
}

export interface State {
  glove: boolean;
  view: View;
  selectedShopId: string;
  drafts: Record<string, Draft>;
  visits: Visit[];
  skipped: string[];
  /** Counted pieces still on the truck. Null until the driver counts. */
  physical: Record<string, number | null>;
  cashCounted: number | null;
  closed: boolean;
  receiptSeq: number;
  toast: { id: number; text: string } | null;
  overlay: null | { kind: "khqr"; shopId: string } | { kind: "receipt"; visitId: string };
  toastSeq: number;
}

export interface QuoteLine {
  product: Product;
  qty: LineQty;
  pieces: number;
  gross: number;
  savings: number;
}

export interface Quote {
  lines: QuoteLine[];
  gross: number;
  volume: number;
  trade: number;
  due: number;
  pieces: number;
  beerCases: number;
  beerGross: number;
}
