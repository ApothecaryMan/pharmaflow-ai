# Cart QR Transfer — Purchases

## Goal

Allow a purchase cart to be **exported** as a QR code (to physically transfer between
pharmacies/branches) and **imported back** by scanning. Two use cases:

1. **Write** — generate a QR from the current cart so another pharmacy / branch / future
   "move stock to another branch" page can receive it.
2. **Read** — scan a supplier-provided (or previously generated) QR that populates the cart.

Constraints negotiated with the team:

- Payload stays **tiny** — the QR carries **only `barcode|qty|expiry`** per line, never the
  resolved drug data (names/prices/tax). The reader resolves the drug from its **own inventory**
  by international barcode. This keeps the QR scannable and works across pharmacies because
  GS1 barcodes are standard and catalogs are shared org-wide.
- **International barcode only** — `internalCode` is deliberately excluded; any pharmacy with the
  same catalog can receive it. Items with no barcode are skipped.
- **No batch number** in the payload.
- Canonical **expiry = `YYYY-MM`**, sanitized strictly; read back into the cart's native MMYY.

---

## 1. `utils/cartQr.ts` (pure, unit-testable, reusable by the future transfer page)

### Canonical payload format

`|`-separated fields, newline-separated lines. Header carries protocol version, page count,
page index (0-based) and a timestamp for transaction identity.

**Single page:**

```
PFAQ|1|1|0|<timestampMs>
<barcode>|<qty>|<YYYY-MM>
...
```

**Multiple pages (auto-split):**

```
PFAQ|1|<totalPages>|<pageIndex>|<timestampMs>
<barcode>|<qty>|<YYYY-MM>
...
```

### Sanitization (per line — **before** any line is emitted; skip + count on failure)

- **code** — `item.barcode` only; must match `^[A-Za-z0-9]+$` (rejects `|`, newline, and stray
  chars a manually typed code could contain). Non-match → skip line.
- **qty** — `Number.isFinite(qty) && qty > 0`, else skip line.
- **expiry** — `toIsoMonth(expiry)` then strict `^\d{4}-\d{2}$`; no valid parse → skip line.

### Constants

```ts
export const MAX_CHARS = 600; // QR density ceiling (conservative for phone cameras, EC level M)
export const MAX_PAGES = 6;   // hard ceiling (~3.6KB total) — beyond this, refuse
```

### Duplicate merging (decided)

Duplicate handling works at **two levels**, keyed by drug **+ same expiry**.

- **Level 1 — within the scan** (`mergeDuplicateLines`): after all pages arrive, merge lines
  whose **`code|expiry`** match, summing quantity. Same barcode with a **different expiry stays
  a separate line** (genuinely different batch, even without a batch number in the payload) so
  no expiry data is lost.
- **Level 2 — vs. existing cart** (`upsertCartItem` in `Purchases.tsx`): the same merge logic as
  a manual `handleAddItem` add — same `drugId` + same `expiryDate` → sum quantity; otherwise a
  new row. QR-imported items behave exactly like manually added ones (open a QR scanner uses the
  shared helper), avoiding spurious duplicate rows.

### Duplicate page rescan (decided)

On a repeated scan of the **same `pageIndex`**, the accumulated fragment is **overwritten by
index** — safe, idempotent, never merges or corrupts the buffer. A different `ts` (new
transaction) resets the buffer.

### Exports

| Function | Description |
|---|---|
| `toIsoMonth(expiry): string \| null` | Normalize any cart format → `YYYY-MM`. Accepts MMYY, YYYY-MM, YYYY-MM-DD, MM/YYYY (mirrors `normalizeExpiryToISO` + slice). `null` if unparseable. |
| `toMmyy(isoOrRaw): string` | `YYYY-MM` → MMYY (`2026-03` → `0326`); pass-through otherwise. |
| `serializePages(cart, meta): { pages: string[] } \| { error: 'too-large' }` | Sanitize lines, greedy-pack into pages each ≤ `MAX_CHARS`; set per-page header; if `totalPages > MAX_PAGES` → `{ error: 'too-large' }`. |
| `parsePage(str): { fragment, lines, invalid } \| null` | Header must be `PFAQ|1|N|i|ts` else `null`. Splits on `|` requiring exactly 3 fields per line, validates each, skips malformed (counted in `invalid`). Never throws. Returns `fragment = { pageIndex, totalPages, ts }`. |
| `serializePageCount(cart): number` | Compute page count without generating payload (for UI hint). |
| `mergeDuplicateLines(lines): CartQrLine[]` | Merge same `code|expiry` (sum qty); preserve distinct expiries. |
| `toIsoMonth` / `toMmyy` | Expiry conversions (see §1). |

Sanitization + pagination are fully deterministic → easy unit tests (see §5).

---

## 2. `components/purchases/CartQRModal.tsx`

Reuses existing `Modal` (from `../common`) and `InlineBarcodeScanner` (from
`../mobile/InlineBarcodeScanner`, already configured for `qr_code`).

Props:

```ts
interface CartQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: PurchaseItem[];
  t: Translations;
  language: 'EN' | 'AR';
  onScanned: (lines: CartQrLine[], { invalid, skipped }: { invalid: number; skipped: number }) => void;
}
```

### Generate tab

- `serializePages(cart)`.
- **`error: 'too-large'`** → show "Cart too large, split it" (refuse).
- **single page** → one QR + Copy + Print.
- **multi-page** → page navigation (prev/next) + "Page i/N" + Copy/Print per page, so the user
  scans them in order.
- Shows a small note when some items were skipped (no barcode / bad expiry).

QR rendering via `QRCode.toDataURL(text, { width, margin })` — same pattern as
`components/inventory/BarcodeStudio.tsx:911`.

### Scan tab

- Embeds `InlineBarcodeScanner`; on each successful scan call `parsePage`.
- Single page (`totalPages === 1`) → immediately finalize.
- Multi-page → accumulate fragments in a buffer keyed by `ts`; show "Page i/N scanned";
  **re-scan of the same `pageIndex` overwrites by index (idempotent)**; a different/new `ts`
  resets the buffer; auto-finalize when the last page arrives.
- On completion: `mergeDuplicateLines` across all fragments (level-1 dedupe by `code|expiry`),
  then fire `onScanned` once with merged lines + invalid/skipped counts.
- Closing the modal before completion discards the buffer.

---

## 3. `components/purchases/Purchases.tsx` wiring

### Indexed lookup (O(1) per line, not linear scan)

```ts
const barcodeIndex = useMemo(() => {
  const map = new Map<string, Drug>();
  for (const d of inventory) if (d.barcode) map.set(d.barcode, d);
  return map;
}, [inventory]);
```

### Shared helpers

- Extract the item-building logic currently inside `handleAddItem` (`Purchases.tsx:895`) into
  `buildCartItem(drug, overrides?)`; have both `handleAddItem` and `addScannedLine` use it (DRY).
- `upsertCartItem(cart, item)` — module-scope pure helper shared by **both** `handleAddItem` and
  QR import: same `drugId` + same `expiryDate` → sum quantity, else append. Keeps QR-imported
  items consistent with manual adds (level-2 merge).
- `handleCartScanned(lines, report)`:
  ```ts
  for (const line of lines) {
    const drug = barcodeIndex.get(line.code);
    if (!drug) { notFound.push(line.code); continue; }
    added.push(buildCartItem(drug, { quantity: line.qty, expiryDate: toMmyy(line.expiry) }));
  }
  setCart((prev) => added.reduce((acc, i) => upsertCartItem(acc, i), prev));
  // toast added / notFound / invalid counts; playBeep();
  ```

### UI

- Add `isCartQrOpen` state.
- Add a `qr_code_2` icon button in the cart header near the ID controls (`Purchases.tsx:~1855`)
  → opens `CartQRModal`.
- `onScanned(lines, { invalid, skipped })` → append found items via `setCart`; skip codes not in
  inventory; toast invalid/skipped/not-found counts; close modal.

---

## 4. i18n

Add bilingual keys (EN + AR — the app is fully EN/AR, enforced by `translation-hunter`):

| Key | EN | AR |
|---|---|---|
| `cartQr.generate` | Generate | توليد |
| `cartQr.scan` | Scan | مسح |
| `cartQr.page` | Page | صفحة |
| `cartQr.tooLarge` | Cart is too large, split it | الكارت كبير قوي، قسّمه |
| `cartQr.notFound` | Products not found in inventory | أصناف غير موجودة بالمخزون |
| `cartQr.skipped` | Skipped items | أصناف تم تجاوزها |

Add to the `purchases` block: `translations.ts:1059` (EN) and `translations.ts:4754` (AR).

---

## 5. Unit tests

`utils/cartQr.spec.ts` (Vitest):

- Sanitization — line with barcode containing `|` / newline / illegal chars is skipped.
- qty `0`, negative, `NaN`, `Infinity` skipped.
- Expiry normalization: MMYY / YYYY-MM / YYYY-MM-DD / MM/YYYY → `YYYY-MM`; unparseable → skip.
- `toIsoMonth` / `toMmyy` round-trip (`0326` ↔ `2026-03`).
- `serializePages` respects `MAX_CHARS` per page; determinism of page split.
- Refuse fallback — payload exceeding `MAX_PAGES` returns `{ error: 'too-large' }`.
- `parsePage` — bad header → `null`; malformed lines → `invalid` counted, valid ones kept;
  multi-page header correctness (`PFAQ|1|N|i|ts`).

---

## 6. Out of scope (future)

The **"move stock to another branch"** page is NOT built now. `cartQr.ts` + `CartQRModal` are
designed as the shared, exported building blocks that page reuses later. Nothing here loads
inventory/drug data into the QR — the reader always resolves from its own catalog.

---

## Behavior summary

| Cart size | QR result |
|---|---|
| Small / normal | One clean scannable QR. |
| Large | Auto-split into pages (≤ `MAX_CHARS` each), recombined on scan. |
| Huge (> `MAX_PAGES`) | Refused with "split it" message. |
| Read from another pharmacy | Resolves by international barcode in receiver's inventory; unknown/invalid lines reported, not silently dropped. |