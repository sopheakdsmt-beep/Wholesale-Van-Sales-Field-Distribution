import { DEPOT, SHOPS } from "../catalog";
import { money } from "../format";
import { seedState } from "../seed";
import { expectedCash, totalCasesOnTruck } from "../selectors";
import { useStore } from "../store";
import type { View } from "../types";

const VIEWS: { id: View; km: string; en: string }[] = [
  { id: "route", km: "ផ្លូវ", en: "Route" },
  { id: "ledger", km: "ស្តុកឡាន", en: "Truck" },
  { id: "reconcile", km: "ចុងផ្លូវ", en: "Close" },
];

export function Header() {
  const { state, dispatch } = useStore();
  const done = state.visits.length;
  return (
    <header className="topbar">
      <div className="brand">
        <span className="seal" aria-hidden>
          ដេប៉ូ
        </span>
        <div>
          <strong>{DEPOT.nameKm}</strong>
          <small>
            {DEPOT.provinceKm} · {DEPOT.plate}
          </small>
        </div>
      </div>
      <div className="route-meta">
        <strong>{DEPOT.routeKm}</strong>
        <small>
          {DEPOT.driverKm} · ជំនួយ {DEPOT.helperKm} · ៨ តុលា ២០២៦ · {done}/{SHOPS.length} ហាង
        </small>
      </div>
      <button className="stat" onClick={() => dispatch({ type: "view", view: "ledger" })}>
        <span>នៅលើឡាន</span>
        <strong className="num">{totalCasesOnTruck(state)} កេស</strong>
      </button>
      <button className="stat" onClick={() => dispatch({ type: "view", view: "reconcile" })}>
        <span>សាច់ប្រាក់កាបូប</span>
        <strong className="num">{money(expectedCash(state))}</strong>
      </button>
      <div className="seg" role="tablist" aria-label="Views">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            role="tab"
            aria-selected={state.view === view.id}
            onClick={() => dispatch({ type: "view", view: view.id })}
          >
            {view.km}
            <small>{view.en}</small>
          </button>
        ))}
      </div>
      <button className={state.glove ? "ghost on" : "ghost"} aria-pressed={state.glove} onClick={() => dispatch({ type: "glove" })}>
        ស្រោមដៃ
      </button>
      <button className="ghost" onClick={() => dispatch({ type: "reset", state: seedState() })}>
        ថ្ងៃថ្មី
      </button>
    </header>
  );
}
