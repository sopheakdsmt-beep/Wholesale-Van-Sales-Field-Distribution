import { PRODUCTS, VOLUME_CASE_THRESHOLD } from "../catalog";
import { khr, money, piecesOf, stockLabel } from "../format";
import {
  availablePieces,
  creditRoom,
  draftOf,
  effectiveTender,
  qtyOrEmpty,
  quoteShop,
  shopById,
  shopOutstanding,
  visitForShop,
} from "../selectors";
import { useStore } from "../store";
import type { Channel, Product, Unit } from "../types";

const TIERS: { unit: Unit; title: string; en: string }[] = [
  { unit: "single", title: "រាយ", en: "Single" },
  { unit: "pack", title: "វេច", en: "Pack" },
  { unit: "crate", title: "កេស", en: "Crate" },
];

export function RestockPane() {
  const { state } = useStore();
  const shop = shopById(state.selectedShopId);
  const visit = visitForShop(state, shop.id);
  const skipped = state.skipped.includes(shop.id);

  return (
    <section className="restock">
      <header className="shop-head">
        <div>
          <p className="eyebrow">
            ហាងលើផ្លូវ · {shop.nameEn}
          </p>
          <h1>{shop.nameKm}</h1>
          <p>
            {shop.ownerKm} · {shop.phone} · {shop.areaKm}
          </p>
        </div>
        <dl className="shop-facts">
          <div>
            <dt>ជំពាក់ស្រាប់</dt>
            <dd className="num">{money(shopOutstanding(state, shop.id))}</dd>
          </div>
          <div>
            <dt>នៅអាចជំពាក់</dt>
            <dd className="num">{money(creditRoom(state, shop.id))}</dd>
          </div>
          <div>
            <dt>បញ្ចុះហាង</dt>
            <dd className="num">{shop.tradePct}%</dd>
          </div>
        </dl>
      </header>
      {visit ? <Delivered visitId={visit.id} shopId={shop.id} /> : skipped ? <Skipped shopId={shop.id} /> : <OrderPad shopId={shop.id} />}
    </section>
  );
}

function Delivered({ visitId, shopId }: { visitId: string; shopId: string }) {
  const { state, dispatch } = useStore();
  const visit = state.visits.find((item) => item.id === visitId);
  if (!visit) return null;
  return (
    <div className="locked">
      <p className="done-flag">បានដឹក · {visit.receiptNo}</p>
      <ul className="locked-lines">
        {visit.lines.map((line) => {
          const product = PRODUCTS.find((item) => item.id === line.productId);
          if (!product) return null;
          return (
            <li key={line.productId}>
              <span>
                {product.nameKm}
                <small>
                  {line.qty.crate ? ` ${line.qty.crate} ${product.unitCrateKm}` : ""}
                  {line.qty.pack ? ` ${line.qty.pack} ${product.unitPackKm}` : ""}
                  {line.qty.single ? ` ${line.qty.single} ${product.unitSingleKm}` : ""}
                </small>
              </span>
              <strong className="num">{money(line.gross)}</strong>
            </li>
          );
        })}
      </ul>
      <p className="due-line">
        ត្រូវបានទូទាត់ <strong className="num">{money(visit.due)}</strong>
        <span>
          សាច់ប្រាក់ {money(visit.cash)} · KHQR {money(visit.khqr)} · ជំពាក់ {money(visit.credit)}
        </span>
      </p>
      <div className="row-actions">
        <button className="primary" onClick={() => dispatch({ type: "showReceipt", visitId })}>
          បោះពុម្ពម្តងទៀត
          <small>Reprint</small>
        </button>
        <button onClick={() => dispatch({ type: "amend", shopId })}>កែវិក្កយបត្រ</button>
      </div>
    </div>
  );
}

function Skipped({ shopId }: { shopId: string }) {
  const { dispatch } = useStore();
  return (
    <div className="locked">
      <p className="done-flag wait">បានរំលងហាងនេះ · ស្តុកមិនបានដក</p>
      <button className="primary" onClick={() => dispatch({ type: "unskip", shopId })}>
        បើកហាងវិញ
      </button>
    </div>
  );
}

function OrderPad({ shopId }: { shopId: string }) {
  const { state, dispatch } = useStore();
  const shop = shopById(shopId);
  const draft = draftOf(state, shopId);
  const quote = quoteShop(state, shopId);
  const tender = effectiveTender(draft, quote.due);
  const paid = tender.cash + tender.khqr + tender.credit;
  const gap = quote.due - paid;
  const ready = quote.due > 0 && gap === 0 && !state.closed;

  return (
    <>
      <div className="rules">
        <span className={quote.beerCases + 1e-9 >= VOLUME_CASE_THRESHOLD ? "chip on" : "chip"}>
          ស្រាបៀរ {quote.beerCases.toFixed(1)} កេស · បញ្ចុះ 2% ចាប់ពី {VOLUME_CASE_THRESHOLD} កេស
        </span>
        <span className="chip">បញ្ចុះហាង {shop.tradePct}% គណនាឲ្យស្រាប់</span>
        <span className="chip quiet">តម្លៃរាយ វេច និងកេស នៅលើជួរតែមួយ</span>
        <div className="row-actions tight">
          <button onClick={() => dispatch({ type: "usual", shopId })}>ដាក់ការបញ្ជាធម្មតា</button>
          <button onClick={() => dispatch({ type: "clear", shopId })}>សម្អាត</button>
          <button onClick={() => dispatch({ type: "skip", shopId })}>រំលងហាង</button>
        </div>
      </div>
      <div className="matrix-scroll">
        <div className="matrix" role="table" aria-label="តារាងដាក់ទំនិញ">
          <div className="matrix-head" role="row">
            <span>ទំនិញ</span>
            {TIERS.map((tier) => (
              <span key={tier.unit}>
                {tier.title}
                <small>{tier.en}</small>
              </span>
            ))}
            <span>ជួរ</span>
          </div>
          {PRODUCTS.map((product) => (
            <ProductRow key={product.id} product={product} shopId={shopId} />
          ))}
        </div>
      </div>
      <footer className="settle">
        <div className="totals">
          <p>
            <span>សរុប</span>
            <strong className="num">{money(quote.gross)}</strong>
          </p>
          <p>
            <span>បញ្ចុះកេសស្រា</span>
            <strong className="num">{quote.volume ? `−${money(quote.volume).slice(1)}` : money(0)}</strong>
          </p>
          <p>
            <span>បញ្ចុះហាង</span>
            <strong className="num">{quote.trade ? `−${money(quote.trade).slice(1)}` : money(0)}</strong>
          </p>
          <p className="due">
            <span>ត្រូវបង់</span>
            <strong className="num">{money(quote.due)}</strong>
          </p>
          <small className="num">{khr(quote.due)} · អត្រាដេប៉ូ $1 = ៛4,100</small>
        </div>
        <div className="preset-row">
          <button onClick={() => dispatch({ type: "preset", shopId, mode: "cash" })}>ទាំងអស់សាច់ប្រាក់</button>
          <button onClick={() => dispatch({ type: "preset", shopId, mode: "khqr" })}>ទាំងអស់ KHQR</button>
          <button onClick={() => dispatch({ type: "preset", shopId, mode: "split" })}>ពាក់កណ្តាលជំពាក់</button>
        </div>
        <div className="tenders">
          <Tender shopId={shopId} channel="cash" label="សាច់ប្រាក់" en="Cash" amount={tender.cash} />
          <Tender shopId={shopId} channel="khqr" label="KHQR" en="Bakong QR" amount={tender.khqr} />
          <Tender
            shopId={shopId}
            channel="credit"
            label="ជំពាក់"
            en={`Room ${money(creditRoom(state, shopId))}`}
            amount={tender.credit}
          />
        </div>
        <div className="confirm-row">
          <p className={gap === 0 ? "gap ok" : "gap"}>
            {gap === 0 ? "គណនាគ្រប់ហើយ" : `នៅខ្វះ ${money(gap)}`}
            <small>{draft.tenderTouched ? "បានបំបែកការទូទាត់" : "លំនាំដើមជាសាច់ប្រាក់ទាំងអស់"}</small>
          </p>
          <button
            className="primary big"
            disabled={!ready}
            onClick={() => dispatch({ type: "confirm", shopId, at: new Date().toISOString() })}
          >
            បញ្ជាក់ និងបោះពុម្ព
            <small>Confirm & print</small>
          </button>
        </div>
      </footer>
    </>
  );
}

function ProductRow({ product, shopId }: { product: Product; shopId: string }) {
  const { state, dispatch } = useStore();
  const qty = qtyOrEmpty(draftOf(state, shopId).qty, product.id);
  const free = availablePieces(state, product.id, shopId);
  const quote = quoteShop(state, shopId).lines.find((line) => line.product.id === product.id);
  const priceOf = (unit: Unit) =>
    unit === "single" ? product.priceSingle : unit === "pack" ? product.pricePack : product.priceCrate;
  const sizeOf = (unit: Unit) => (unit === "single" ? 1 : unit === "pack" ? product.packPieces : product.cratePieces);
  const unitName = (unit: Unit) =>
    unit === "single" ? product.unitSingleKm : unit === "pack" ? product.unitPackKm : product.unitCrateKm;

  return (
    <div className="row" role="row">
      <div className="sku">
        <span className={`swatch ${product.category}`} aria-hidden />
        <div>
          <strong>{product.nameKm}</strong>
          <small>{product.nameEn}</small>
          <small className={free < product.cratePieces * 2 ? "hot" : ""}>អាចដាក់ {stockLabel(product, free)}</small>
        </div>
      </div>
      {TIERS.map((tier) => {
        const count = qty[tier.unit];
        const savePer = Math.max(0, product.priceSingle * sizeOf(tier.unit) - priceOf(tier.unit));
        return (
          <div className="tier" key={tier.unit} role="cell">
            <div className="stepper">
              <button
                aria-label={`Decrease ${product.nameEn} ${tier.en}`}
                onClick={() => dispatch({ type: "inc", shopId, productId: product.id, unit: tier.unit, delta: -1 })}
              >
                −
              </button>
              <strong className="num">{count}</strong>
              <button
                aria-label={`Increase ${product.nameEn} ${tier.en}`}
                onClick={() => dispatch({ type: "inc", shopId, productId: product.id, unit: tier.unit, delta: 1 })}
              >
                +
              </button>
            </div>
            <small className="num">
              {money(priceOf(tier.unit))} · {sizeOf(tier.unit)} {unitName(tier.unit)}
              {savePer > 0 && tier.unit !== "single" ? ` · សន្សំ ${money(savePer)}` : ""}
            </small>
          </div>
        );
      })}
      <div className="line-total" role="cell">
        <strong className="num">{quote ? money(quote.gross) : "—"}</strong>
        <small>{quote ? stockLabel(product, piecesOf(product, qty)) : ""}</small>
        {quote && quote.savings > 0 ? <small className="save">សន្សំ {money(quote.savings)}</small> : null}
      </div>
    </div>
  );
}

function Tender({
  shopId,
  channel,
  label,
  en,
  amount,
}: {
  shopId: string;
  channel: Channel;
  label: string;
  en: string;
  amount: number;
}) {
  const { dispatch } = useStore();
  const bump = (deltaCents: number) => dispatch({ type: "tender", shopId, channel, deltaCents });
  return (
    <div className={`tender ${channel}`}>
      <div className="tender-name">
        <strong>{label}</strong>
        <small>{en}</small>
      </div>
      <div className="stepper tender-step">
        <button aria-label={`${label} minus 10`} onClick={() => bump(-1000)}>
          −10
        </button>
        <button aria-label={`${label} minus 1`} onClick={() => bump(-100)}>
          −1
        </button>
        <strong className="num">{money(amount)}</strong>
        <button aria-label={`${label} plus 1`} onClick={() => bump(100)}>
          +1
        </button>
        <button aria-label={`${label} plus 10`} onClick={() => bump(1000)}>
          +10
        </button>
      </div>
      <button className="fill" onClick={() => dispatch({ type: "fill", shopId, channel })}>
        ដាក់នៅសល់
      </button>
    </div>
  );
}
