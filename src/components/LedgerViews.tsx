import { DEPOT, MORNING_LOAD, PRODUCTS } from "../catalog";
import { money, stockLabel } from "../format";
import {
  expectedCash,
  expectedKhqr,
  newCredit,
  physicalOnTruck,
  postedPieces,
  priorDebt,
  reservedPieces,
} from "../selectors";
import { useStore } from "../store";

export function LedgerView() {
  const { state } = useStore();
  return (
    <section className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">សៀវភៅស្តុកលើឡាន · {DEPOT.plate}</p>
          <h1>ស្តុកកេសដកភ្លាមពេលចេញវិក្កយបត្រ</h1>
        </div>
        <p className="sheet-note">
          «នៅលើឡាន» គឺស្តុកពិតបន្ទាប់ពីការដឹក។ «កំពុងចុះ» គឺការបញ្ជាដែលមិនទាន់បញ្ជាក់ ហើយមិនទាន់ចេញពីឡាន។
        </p>
      </header>
      <div className="sheet-scroll">
        <table className="ledger">
          <thead>
            <tr>
              <th>ទំនិញ</th>
              <th>ដាក់ព្រឹក</th>
              <th>បានដឹក</th>
              <th>កំពុងចុះ</th>
              <th>នៅលើឡាន</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map((product) => {
              const loaded = MORNING_LOAD[product.id] ?? 0;
              const posted = postedPieces(state, product.id);
              const reserved = reservedPieces(state, product.id);
              const onTruck = physicalOnTruck(state, product.id);
              return (
                <tr key={product.id} className={reserved > 0 ? "hot-row" : ""}>
                  <td>
                    <strong>{product.nameKm}</strong>
                    <small>{product.nameEn}</small>
                  </td>
                  <td>{stockLabel(product, loaded)}</td>
                  <td>{stockLabel(product, posted)}</td>
                  <td>{stockLabel(product, reserved)}</td>
                  <td className="num emphasis">{stockLabel(product, onTruck)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ReconcileView() {
  const { state, dispatch } = useStore();
  const cash = expectedCash(state);
  const khqr = expectedKhqr(state);
  const credit = newCredit(state);
  const counted = state.cashCounted;
  const cashGap = counted === null ? null : counted - cash;

  return (
    <section className="sheet reconcile">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">សម្របសម្រួលមុនចូលដេប៉ូ</p>
          <h1>សាច់ប្រាក់ ទល់នឹង ទំនិញជំពាក់</h1>
        </div>
        {state.closed ? <div className="stamp">បានបិទផ្លូវ</div> : null}
      </header>
      <div className="summary">
        <article>
          <span>សាច់ប្រាក់ត្រូវប្រគល់</span>
          <strong className="num">{money(cash)}</strong>
          <small>នៅក្នុងកាបូបអ្នកបើកបរ</small>
        </article>
        <article>
          <span>KHQR ចូលហើយ</span>
          <strong className="num">{money(khqr)}</strong>
          <small>មិនរាប់ក្នុងកាបូប</small>
        </article>
        <article>
          <span>ជំពាក់ថ្មីថ្ងៃនេះ</span>
          <strong className="num">{money(credit)}</strong>
          <small>ទំនិញជំពាក់ · បំណុលចាស់ {money(priorDebt())}</small>
        </article>
      </div>
      <div className="reconcile-grid">
        <div className="panel">
          <h2>រាប់កាបូប</h2>
          <p className="panel-figure num">{counted === null ? "មិនទាន់រាប់" : money(counted)}</p>
          <p className={cashGap === null ? "gap" : cashGap === 0 ? "gap ok" : "gap bad"}>
            {cashGap === null ? "ប្រៀបធៀបនឹងវិក្កយបត្រ" : cashGap === 0 ? "គ្រប់នឹងវិក្កយបត្រ" : cashGap > 0 ? `លើស ${money(cashGap)}` : `ខ្វះ ${money(Math.abs(cashGap))}`}
          </p>
          <div className="stepper">
            <button onClick={() => dispatch({ type: "cashCount", cents: Math.max(0, (counted ?? cash) - 1000) })}>−10</button>
            <button onClick={() => dispatch({ type: "cashCount", cents: Math.max(0, (counted ?? cash) - 100) })}>−1</button>
            <button onClick={() => dispatch({ type: "cashCount", cents: (counted ?? cash) + 100 })}>+1</button>
            <button onClick={() => dispatch({ type: "cashCount", cents: (counted ?? cash) + 1000 })}>+10</button>
          </div>
          <button onClick={() => dispatch({ type: "cashCount", cents: cash })}>ដាក់តាមវិក្កយបត្រ</button>
        </div>
        <div className="panel">
          <h2>រាប់ស្តុកនៅលើឡាន</h2>
          <button onClick={() => dispatch({ type: "acceptSystem" })}>ដាក់តាមប្រព័ន្ធជាមុន</button>
          <div className="count-list">
            {PRODUCTS.map((product) => {
              const system = physicalOnTruck(state, product.id);
              const countedPieces = state.physical[product.id];
              const gap = countedPieces === null || countedPieces === undefined ? null : countedPieces - system;
              return (
                <div key={product.id} className="count-row">
                  <div>
                    <strong>{product.nameKm}</strong>
                    <small>ប្រព័ន្ធ {stockLabel(product, system)}</small>
                  </div>
                  <div className="stepper slim">
                    <button aria-label={`Count down ${product.nameEn}`} onClick={() => dispatch({ type: "physical", productId: product.id, delta: -product.cratePieces })}>
                      −1 កេស
                    </button>
                    <span className="num">{countedPieces == null ? "—" : stockLabel(product, countedPieces)}</span>
                    <button aria-label={`Count up ${product.nameEn}`} onClick={() => dispatch({ type: "physical", productId: product.id, delta: product.cratePieces })}>
                      +1 កេស
                    </button>
                  </div>
                  <em className={gap === null ? "" : gap === 0 ? "ok" : "bad"}>
                    {gap === null ? "មិនទាន់" : gap === 0 ? "គ្រប់" : gap > 0 ? `លើស ${stockLabel(product, gap)}` : `ខ្វះ ${stockLabel(product, Math.abs(gap))}`}
                  </em>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="row-actions end">
        {state.closed ? (
          <button className="primary" onClick={() => dispatch({ type: "reopen" })}>
            បើកផ្លូវវិញ
          </button>
        ) : (
          <button className="primary big" onClick={() => dispatch({ type: "closeRoute" })}>
            បិទផ្លូវ RC-07
            <small>Lock the day</small>
          </button>
        )}
      </div>
    </section>
  );
}
