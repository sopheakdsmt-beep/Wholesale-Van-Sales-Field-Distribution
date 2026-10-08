import { DEPOT, PRODUCT_MAP, SHOPS } from "../catalog";
import { money } from "../format";
import { visitForShop } from "../selectors";
import { useStore } from "../store";
import type { Shop } from "../types";

function usualBrief(shop: Shop): string {
  const parts: string[] = [];
  for (const [id, qty] of Object.entries(shop.usual)) {
    const product = PRODUCT_MAP[id];
    if (!product) continue;
    if (qty.crate) parts.push(`${product.nameKm} ${qty.crate} ${product.unitCrateKm}`);
    else if (qty.pack) parts.push(`${product.nameKm} ${qty.pack} ${product.unitPackKm}`);
    else if (qty.single) parts.push(`${product.nameKm} ${qty.single}`);
  }
  return parts.slice(0, 2).join(" · ");
}

export function RoutePane() {
  const { state, dispatch } = useStore();
  const road = [`28,188`, ...SHOPS.map((shop) => `${shop.mapX},${shop.mapY}`)].join(" ");
  const focus = SHOPS.find((shop) => shop.id === state.selectedShopId) ?? SHOPS[0];

  return (
    <aside className="route-pane">
      <div className="map-wrap">
        <svg viewBox="0 0 420 210" role="img" aria-label="ផែនទីផ្លូវ RC-07">
          <rect x="0" y="0" width="420" height="210" fill="#d7e4ea" />
          <path d="M0 40 C80 20 140 70 220 36 C300 8 360 48 420 22 L420 0 L0 0 Z" fill="#edf4f6" />
          <path d="M0 168 C70 150 120 190 190 160 C270 128 320 176 420 150 L420 210 L0 210 Z" fill="#b7d0dc" opacity="0.85" />
          <text x="16" y="22" className="map-label">
            ទន្លេមេគង្គ
          </text>
          <polyline points={road} fill="none" stroke="#f3e2c4" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={road} fill="none" stroke="#8d5a2b" strokeWidth="3" strokeDasharray="2 7" strokeLinejoin="round" />
          <g>
            <circle cx="28" cy="188" r="7" fill="#241c14" />
            <text x="38" y="192" className="map-label">
              {DEPOT.nameKm}
            </text>
          </g>
          {SHOPS.map((shop, index) => {
            const visit = visitForShop(state, shop.id);
            const skipped = state.skipped.includes(shop.id);
            const selected = shop.id === state.selectedShopId;
            const fill = visit ? "#0e7a45" : skipped ? "#8a8175" : selected ? "#e07a1f" : "#fffdf8";
            return (
              <g key={shop.id} onClick={() => dispatch({ type: "select", shopId: shop.id })} className="map-stop">
                <circle cx={shop.mapX} cy={shop.mapY} r={selected ? 13 : 10} fill={fill} stroke="#23190f" strokeWidth="2" />
                <text x={shop.mapX} y={shop.mapY + 4} textAnchor="middle" className="map-num">
                  {index + 1}
                </text>
              </g>
            );
          })}
          <g transform={`translate(${focus.mapX - 8} ${focus.mapY - 28})`}>
            <rect width="22" height="12" rx="2" fill="#241c14" />
            <rect x="4" y="-6" width="12" height="7" rx="1" fill="#e07a1f" />
          </g>
        </svg>
      </div>
      <ol className="route-list">
        {SHOPS.map((shop, index) => {
          const visit = visitForShop(state, shop.id);
          const skipped = state.skipped.includes(shop.id);
          const status = visit ? "done" : skipped ? "skipped" : shop.id === state.selectedShopId ? "active" : "wait";
          return (
            <li key={shop.id}>
              <button className={`stop ${status}`} onClick={() => dispatch({ type: "select", shopId: shop.id })}>
                <span className="stop-no num">{String(index + 1).padStart(2, "0")}</span>
                <span className="stop-body">
                  <span className="stop-title">
                    <strong>{shop.nameKm}</strong>
                    <em>{visit ? "បានដឹក" : skipped ? "រំលង" : status === "active" ? "កំពុងដាក់" : "រង់ចាំ"}</em>
                  </span>
                  <small>
                    {shop.ownerKm} · {shop.minutesFromPrev} នាទី · {shop.areaKm}
                  </small>
                  <small className="muted">
                    {visit
                      ? `${visit.receiptNo} · ${money(visit.due)}${visit.credit ? " · មានជំពាក់" : ""}${visit.khqr ? " · KHQR" : ""}`
                      : usualBrief(shop)}
                  </small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
