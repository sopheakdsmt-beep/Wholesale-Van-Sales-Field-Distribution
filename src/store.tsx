import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from "react";
import { reducer, type Action } from "./reducer";
import { seedState, serialize, STORAGE_KEY } from "./seed";
import type { State } from "./types";

interface StoreValue {
  state: State;
  dispatch: Dispatch<Action>;
}

const StoreContext = createContext<StoreValue | null>(null);

function hydrate(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as { v?: number; state?: State };
    if (parsed?.v !== 1 || !parsed.state?.visits || !parsed.state.selectedShopId) return seedState();
    return { ...parsed.state, toast: null, overlay: null };
  } catch {
    return seedState();
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, hydrate);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize(state)));
  }, [state]);

  useEffect(() => {
    if (!state.toast) return;
    const timer = window.setTimeout(() => dispatch({ type: "toastClear" }), 2600);
    return () => window.clearTimeout(timer);
  }, [state.toast]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("Store missing");
  return value;
}
