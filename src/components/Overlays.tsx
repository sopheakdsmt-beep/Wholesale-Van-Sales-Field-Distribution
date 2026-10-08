import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { DEPOT, KHR_PER_USD, PRODUCT_MAP, SHOP_MAP } from "../catalog";
import { khr, money, receiptStamp } from "../format";
import { useStore } from "../store";
import type { Unit, Visit } from "../types";

export function Overlays() {
  const { state, dispatch } = useStore();
  const overlay = state.overlay;
  if (!overlay) return null;
  if (overlay.kind === "khqr") {
    return <Khqr shopId={overlay.shopId} onClose={() => dispatch({ type: "closeOverlay" })} />;
  }
  const visit = state.visits.find((item) => item.id === overlay.visitId);
  if (!visit) return null;
  return <Receipt visit={visit} onClose={() => dispatch({ type: "closeOverlay" })} />;
}

function Khqr({ shopId, onClose }: { shopId: string; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const shop = SHOP_MAP[shopId];
  const draft = state.drafts[shopId];
  const amount = draft?.khqr ?? 0;
  const ref = `VS-261008-${String(state.receiptSeq).padStart(3, "0")}`;
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    const payload = [
      "000201010212",
      "KHQR DEMO CABIN",
      `MERCHANT:${DEPOT.merchant}`,
      `SHOP:${shop?.nameEn ?? shopId}`,
      `AMOUNT:${(amount / 100).toFixed(2)}`,
      "CCY:USD",
      `REF:${ref}`,
      `RIEL:${Math.round((amount / 100) * KHR_PER_USD)}`,
    ].join("|");
    let cancel = false;
    QRCode.toDataURL(payload, {
      margin: 1,
      width: 360,
      errorCorrectionLevel: "M",
      color: { dark: "#1a1214", light: "#ffffff" },
    }).then((next) => {
      if (!cancel) setUrl(next);
    });
    return () => {
      cancel = true;
    };
  }, [amount, ref, shop?.nameEn, shopId]);

  if (!shop) return null;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="KHQR">
      <article className="khqr-card">
        <header>
          <strong>KHQR</strong>
          <span>USD</span>
        </header>
        <p className="khqr-shop">{shop.nameKm}</p>
        <p className="khqr-amount num">{money(amount)}</p>
        <p className="num khqr-riel">{khr(amount)}</p>
        <p className="khqr-merchant">
          {DEPOT.merchant}
          <small>{ref}</small>
        </p>
        {url ? <img src={url} alt="KHQR code for this invoice" /> : <div className="qr-wait">កំពុងបង្កើត QR…</div>}
        <p className="fine">អតិថិជនស្កេនតាម ABA, ACLEDA, ឬកម្មវិធីធនាគារណាមួយដែលទទួល KHQR។ QR នេះសម្រាប់អេក្រង់កាប៊ីន។</p>
        <div className="row-actions">
          <button onClick={onClose}>បោះបង់</button>
          <button className="primary" onClick={() => dispatch({ type: "khqrPaid", at: new Date().toISOString() })}>
            បានទទួលប្រាក់
            <small>Payment received</small>
          </button>
        </div>
      </article>
    </div>
  );
}

function Receipt({ visit, onClose }: { visit: Visit; onClose: () => void }) {
  const [phase, setPhase] = useState<"feed" | "printed">("feed");
  const shop = SHOP_MAP[visit.shopId];

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase("printed"), 900);
    return () => window.clearTimeout(timer);
  }, [visit.id]);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Receipt">
      <article className="printer">
        <div className="printer-status">
          <span className={phase === "printed" ? "dot on" : "dot"} />
          {phase === "printed" ? `${DEPOT.printer} · បានបោះពុម្ព` : `${DEPOT.printer} · កំពុងបញ្ចេញក្រដាស`}
        </div>
        <div className={`paper ${phase}`}>
          <h2>{DEPOT.nameKm}</h2>
          <p>
            {DEPOT.provinceKm}
            <br />
            {DEPOT.phone} · {DEPOT.van} {DEPOT.plate}
          </p>
          <p>
            វិក្កយបត្រ {visit.receiptNo}
            <br />
            {receiptStamp(visit.at)} · {DEPOT.driverKm}
          </p>
          <hr />
          <p className="who">
            <strong>{shop?.nameKm}</strong>
            <br />
            {shop?.ownerKm} · {shop?.phone}
          </p>
          <ul>
            {visit.lines.flatMap((line) => {
              const product = PRODUCT_MAP[line.productId];
              if (!product) return [];
              const units: Unit[] = ["crate", "pack", "single"];
              return units
                .filter((unit) => line.qty[unit] > 0)
                .map((unit) => {
                  const count = line.qty[unit];
                  const price = unit === "crate" ? product.priceCrate : unit === "pack" ? product.pricePack : product.priceSingle;
                  const name = unit === "crate" ? product.unitCrateKm : unit === "pack" ? product.unitPackKm : product.unitSingleKm;
                  return (
                    <li key={`${line.productId}-${unit}`}>
                      <span>
                        {product.nameKm}
                        <small>
                          {count} {name} × {money(price)}
                        </small>
                      </span>
                      <strong className="num">{money(count * price)}</strong>
                    </li>
                  );
                });
            })}
          </ul>
          <hr />
          <p className="tot">
            <span>សរុប</span>
            <span className="num">{money(visit.gross)}</span>
          </p>
          {visit.volume > 0 ? (
            <p className="tot">
              <span>បញ្ចុះស្រា 2%</span>
              <span className="num">−{money(visit.volume).replace("$", "")}</span>
            </p>
          ) : null}
          {visit.trade > 0 ? (
            <p className="tot">
              <span>បញ្ចុះហាង</span>
              <span className="num">−{money(visit.trade).replace("$", "")}</span>
            </p>
          ) : null}
          <p className="tot due">
            <span>ត្រូវបង់</span>
            <span className="num">{money(visit.due)}</span>
          </p>
          <p className="tot">
            <span>សាច់ប្រាក់</span>
            <span className="num">{money(visit.cash)}</span>
          </p>
          <p className="tot">
            <span>KHQR</span>
            <span className="num">{money(visit.khqr)}</span>
          </p>
          <p className="tot">
            <span>ជំពាក់</span>
            <span className="num">{money(visit.credit)}</span>
          </p>
          {visit.credit > 0 ? <p className="sign">ហត្ថលេខាទទួលទំនិញជំពាក់ ________</p> : null}
          <p className="thanks">អរគុណ · ច្បាប់ចម្លងអ្នកបើកបរ</p>
        </div>
        <button className="primary" onClick={onClose}>
          រួចរាល់
        </button>
      </article>
    </div>
  );
}
