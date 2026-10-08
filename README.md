# ប្រព័ន្ធចែកចាយ និងលក់ចល័ត · Van Sales Pad

Tablet pad for a provincial FMCG depot. A driver on river road RC-07 (Kampong Cham) works the whole stop from one landscape screen: the route on the left, restock tiers on the right, and the truck ledger updating as soon as a receipt is printed.

## What the cabin screen does

- **Route matrix.** Mapped stops and a stop list. Tap a ហាង / តូប to open that shop.
- **Price tiers without a second page.** Single, pack, and crate sit on the same row, with the savings versus loose cans already shown.
- **Discounts without hand math.** Beer cases at 5 or more take 2% off beer. Each shop’s trade percent comes off after that.
- **Truck ledger.** Morning load, delivered, reserved on open orders, and what is still physically on the van. Confirming a delivery deducts cases immediately.
- **Split settlement.** Cash, on-screen KHQR, and shop credit (consignment) can share one invoice, capped by the shop’s credit room.
- **Belt printer.** A paired RPP02N preview feeds an itemized receipt. The QR is a cabin display for the driver to show the shop, not a live Bakong charge.
- **End of route.** Count the cash bag against receipts, count cages against the system, and close the route with shortages visible.

Glove mode is on by default so steppers stay large in a vibrating van. `ថ្ងៃថ្មី` restores the demo morning, with two stops already delivered.

## Run

```bash
npm install
npm test
npm run dev
```

Open the dev server in a landscape tablet window (about 1280×800).

Depot rate on the pad is $1 = ៛4,100.
