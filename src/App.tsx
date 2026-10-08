import { useEffect } from "react";
import { Header } from "./components/Header";
import { LedgerView, ReconcileView } from "./components/LedgerViews";
import { Overlays } from "./components/Overlays";
import { RestockPane } from "./components/RestockPane";
import { RoutePane } from "./components/RoutePane";
import { useStore } from "./store";

export function App() {
  const { state, dispatch } = useStore();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch({ type: "closeOverlay" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  return (
    <div className={state.glove ? "app glove" : "app"}>
      <Header />
      {state.closed && state.view === "route" ? <p className="banner">ផ្លូវ RC-07 បានបិទ។ បើកវិញពីចុងផ្លូវ បើត្រូវកែ។</p> : null}
      {state.view === "route" ? (
        <main className="workspace">
          <RoutePane />
          <RestockPane />
        </main>
      ) : null}
      {state.view === "ledger" ? <LedgerView /> : null}
      {state.view === "reconcile" ? <ReconcileView /> : null}
      <Overlays />
      {state.toast ? (
        <div className="toast" role="status">
          {state.toast.text}
        </div>
      ) : null}
    </div>
  );
}
