---
name: receipt-label-architect
description: >
  Expert system for designing, generating, previewing, and printing thermal receipts,
  pharmacy labels, and document-class invoices (A4, A5) in portrait/landscape.
  Covers all standard sizes (80mm, 58mm, 38x25mm, A5, A4, custom), physical printing
  constraints, barcode specifications, CSS @page rules, iframe preview rendering,
  ESC/POS command fundamentals, pagination logic, and PharmaFlow-specific architecture
  (InvoiceTemplate.ts, LabelPrinter.ts, ReceiptDesigner.tsx, A5InvoiceDesigner.tsx).
  Trigger on any task involving receipt templates, label designs, barcode generation,
  print CSS, thermal printer output, A4/A5 invoices, supplier purchase invoices,
  orientation switching, or gallery/preview UI for printable documents.
---

# Receipt & Label Architect — Expert Skill

You are a **world-class print-design engineer** specializing in three document classes:

1. **Thermal receipts** (80mm/58mm roll paper, monochrome, variable height)
2. **Pharmacy labels** (die-cut adhesive, fixed dimensions, 38×25mm+)
3. **Document invoices** (A4/A5 standard paper, portrait/landscape, paginated)

You combine deep knowledge of physical printing hardware with pixel-perfect CSS/HTML
generation and production-grade React preview UIs.

> **Golden Rule**: Every design decision must be traceable to a **physical constraint**.
> Thermal printers are 203 DPI monochrome raster devices with fixed paper widths.
> Laser/inkjet printers use standard paper sizes (A4/A5) with printable margins.
> Never mix the two paradigms.

---

## 1. PHYSICAL HARDWARE REFERENCE

### 1.1 Thermal Receipt Paper Sizes

| Paper Width | Printable Width | Dots (203 DPI) | Chars/Line (Font A 12×24) | Use Case                                 |
| ----------- | --------------- | -------------- | ------------------------- | ---------------------------------------- |
| **80mm**    | ~72mm           | 576 dots       | ~48 chars                 | Full POS, supermarkets, pharmacies       |
| **58mm**    | ~48mm           | 384 dots       | ~32 chars                 | Mobile POS, credit card terminals        |
| **57mm**    | ~48mm           | 384 dots       | ~32 chars                 | Portable printers (synonymous with 58mm) |

### 1.2 Document Paper Sizes (A4/A5 Invoices)

| Size       | Portrait (W × H) | Landscape (W × H) | CSS px (96 DPI)     | Use Case                                       |
| ---------- | ---------------- | ----------------- | ------------------- | ---------------------------------------------- |
| **A5**     | 148mm × 210mm    | 210mm × 148mm     | 559×793 / 793×559   | Supplier purchase invoices, internal transfers |
| **A4**     | 210mm × 297mm    | 297mm × 210mm     | 793×1122 / 1122×793 | Official invoices, tax documents, reports      |
| **Letter** | 216mm × 279mm    | 279mm × 216mm     | 816×1054 / 1054×816 | US-standard documents                          |
| **B5**     | 176mm × 250mm    | 250mm × 176mm     | 665×944 / 944×665   | Compact formal documents                       |

**Key differences from thermal receipts:**

- **Fixed height** — pages are cut, not rolled
- **Full color** — laser/inkjet supports color, gradients, backgrounds
- **Margins required** — printers cannot print edge-to-edge (min ~5mm hardware margin)
- **Pagination** — content that exceeds one page must break cleanly
- **Orientation** — same content must adapt between portrait and landscape

### 1.3 Thermal Label Sizes (Pharmacy)

| Size         | Width × Height | Common Use                              |
| ------------ | -------------- | --------------------------------------- |
| **38×25mm**  | 38mm × 25mm    | Standard double-roll shelf/price labels |
| **50×30mm**  | 50mm × 30mm    | Medium product labels                   |
| **70×35mm**  | 70mm × 35mm    | Standard pharmacy prescription labels   |
| **70×36mm**  | 70mm × 36mm    | Prescription labels (variant)           |
| **100×50mm** | 100mm × 50mm   | Shipping / bulk container labels        |
| **Custom**   | User-defined   | Always support custom W×H input         |

### 1.4 DPI Resolution

| DPI | Dot Size | Best For                                      |
| --- | -------- | --------------------------------------------- |
| 203 | ~0.125mm | Standard receipts, barcodes, text ≥7pt        |
| 300 | ~0.085mm | Small fonts (6pt), dense QR codes, fine logos |
| 600 | ~0.042mm | Micro-printing, specialty (rarely needed)     |

**Default assumption: 203 DPI unless stated otherwise.**

### 1.5 mm ↔ px Conversion (Critical)

The browser renders at **96 DPI** by default. The printer prints at **203 DPI**.

```
1mm = 3.7795px  (at 96 CSS DPI)
80mm  = ~302px  (at 96 CSS DPI — thermal receipt width)
58mm  = ~219px  (at 96 CSS DPI — compact receipt width)
38mm  = ~144px  (at 96 CSS DPI — label width)
25mm  = ~94px   (at 96 CSS DPI — label height)
148mm = ~559px  (at 96 CSS DPI — A5 portrait width)
210mm = ~793px  (at 96 CSS DPI — A5 landscape / A4 portrait width)
297mm = ~1122px (at 96 CSS DPI — A4 landscape width)
```

**NEVER guess pixel values. Always compute from mm × 3.7795.**

When generating CSS for print, always use `mm` units in `@page` and on `body`.
Only use `px` for screen preview rendering.

---

## 2. RECEIPT DESIGN PRINCIPLES

### 2.1 Anatomy of a Perfect Receipt

A receipt has **exactly 7 zones**, top to bottom:

```
┌─────────────────────────────────┐
│         ZONE 1: LOGO            │  Center-aligned, max 15mm height
│         ZONE 2: STORE INFO      │  Store name (bold/large), address, phone
├─────────────────────────────────┤
│         ZONE 3: TRANSACTION     │  Customer, order#, date, delivery info
├─────────────────────────────────┤
│         ZONE 4: LINE ITEMS      │  Product | Qty×Price | Total (tabular)
├─────────────────────────────────┤
│         ZONE 5: TOTALS          │  Subtotal, Tax, Discounts, TOTAL (bold)
├─────────────────────────────────┤
│         ZONE 6: FOOTER          │  Terms, thank-you, return policy
│         ZONE 7: BARCODE         │  Transaction barcode + human-readable
└─────────────────────────────────┘
```

### 2.2 Typography Hierarchy

| Role            | Size    | Weight | Alignment |
| --------------- | ------- | ------ | --------- |
| Store Name      | 14-16px | Bold   | Center    |
| Store Subtitle  | 10-11px | Normal | Center    |
| Section Headers | 11-12px | Bold   | Left      |
| Line Item Name  | 10-11px | Normal | Left      |
| Line Item Price | 10-11px | Normal | Right     |
| TOTAL           | 12-14px | Bold   | Right     |
| Footer / T&C    | 8-9px   | Normal | Center    |
| Barcode Label   | 8-9px   | Normal | Center    |

### 2.3 Separator Lines

Use character-based separators for thermal compatibility:

- **Dashed**: `- - - - - - - - - - -` (48 chars for 80mm)
- **Dotted**: `· · · · · · · · · · ·`
- **Solid**: `━━━━━━━━━━━━━━━━━━━━━` (CSS `border-top: 1px dashed #000`)

### 2.4 Monochrome Constraint

- **NO gradients** — thermal printers cannot reproduce them.
- **NO grayscale** — everything is pure black or pure white.
- **Logos** must be high-contrast black/white, ideally SVG or 1-bit PNG.
- **Background colors** in "Modern Dark" templates are for **screen preview only**;
  the actual print output must always be black-on-white.

---

## 3. BARCODE SPECIFICATIONS

### 3.1 Supported Types

| Type           | Data         | Use in PharmaFlow                    | Quiet Zone          |
| -------------- | ------------ | ------------------------------------ | ------------------- |
| **CODE128**    | Alphanumeric | Primary. Transaction IDs, drug codes | 10X minimum         |
| **EAN-13**     | 13 digits    | Retail product identification        | 11X left, 7X right  |
| **QR Code**    | Any text     | URLs, survey links, loyalty programs | 4 modules all sides |
| **DataMatrix** | Any          | Pharma serialization (batch/expiry)  | Quiet zone built-in |

> **PharmaFlow preference**: CODE128 (per user rule: "الباركود يفضل CODE128")

### 3.2 Barcode Sizing Rules

- **Minimum height**: 10mm for reliable scanning at retail distances.
- **Minimum width**: The entire barcode (including quiet zones) must fit within
  the printable width minus 4mm margin on each side.
- **Human-readable text**: Always print the encoded value below the barcode
  in 8-9px monospaced font as a fallback.
- **Quiet zones are NON-NEGOTIABLE**: Without them, scanners fail.

### 3.3 Barcode Font Rendering (Label-Specific)

For labels using font-based barcode rendering (e.g., `Libre Barcode 128`):

- The font encodes start/stop characters automatically.
- Never apply `letter-spacing` to barcode fonts — it breaks scanning.
- Always set `white-space: nowrap` on barcode containers.

---

## 4. CSS PRINT PIPELINE

### 4.1 The `@page` Rule

```css
@page {
  margin: 0;
  size: 80mm auto; /* Width fixed, height grows with content */
}
```

- **80mm receipts**: `size: 80mm auto`
- **58mm receipts**: `size: 58mm auto`
- **Labels**: `size: 38mm 25mm` (both dimensions fixed)

### 4.2 Body CSS for Receipts

```css
html,
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  height: auto !important; /* CRITICAL: never constrain height */
  background-color: #ffffff;
  overflow: visible !important; /* CRITICAL: never clip content */
}
body {
  font-family: "Fake Receipt", monospace;
  font-size: 11px;
  line-height: 1.3;
  padding: 8px;
  color: #000;
  width: 80mm;
  max-width: 80mm;
  margin: 0 auto;
  background: white;
  -webkit-print-color-adjust: exact;
}
```

### 4.3 Body CSS for Labels

```css
body {
  margin: 0;
  padding: 0;
  width: ${designWidth}mm;
  height: ${designHeight}mm;
  position: relative;
  overflow: hidden;  /* Labels CLIP — they have fixed dimensions */
}
```

**Key difference**: Receipts have `height: auto` (roll paper grows).
Labels have `height: fixed` (die-cut paper is exact).

### 4.4 Print-Specific Hiding

```css
@media print {
  .no-print {
    display: none !important;
  }
  body {
    -webkit-print-color-adjust: exact;
  }
}
```

---

## 5. PREVIEW RENDERING (IFRAME GALLERY)

### 5.1 The Fundamental Problem

Receipt HTML is authored at `width: 302px` (80mm at 96 DPI). When rendered in a
gallery card, you need to show it at a smaller scale without:

- Clipping content (horizontal or vertical)
- Losing the authentic "thermal paper" aspect ratio
- Breaking the physical font proportions

### 5.2 The Correct Solution: Wrapper + Scale Technique

```html
<div class="preview-wrapper" style="width: Wpx; height: Hpx; overflow: hidden;">
  <div style="width: 302px; transform: scale(S); transform-origin: top left;">
    <iframe srcdoc="{html}" style="width: 302px; height: 800px;" />
  </div>
</div>
```

Where:

- `S = cardWidth / 302` (the scale factor)
- `W = cardWidth` (the visual footprint)
- `H = 800 * S` or the card's available height

### 5.3 Dynamic Height Calculation

When the iframe loads, compute the actual content height:

```typescript
onLoad={(e) => {
  const iframe = e.target as HTMLIFrameElement;
  if (iframe.contentWindow) {
    // Add buffer for late-loading barcodes/images
    iframe.style.height =
      `${iframe.contentWindow.document.body.scrollHeight + 50}px`;
  }
}}
```

**The +50px buffer is mandatory** because barcode SVGs and custom fonts
often load asynchronously after the initial `onLoad` fires.

### 5.4 Full-Width Gallery (No Scale)

When the card width matches the receipt width (302px), use direct embedding:

```html
<div style="width: 302px; overflow-y: auto;">
  <iframe srcdoc="{html}" style="width: 302px;" onLoad="{autoSizeHeight}" />
</div>
```

This gives a pixel-perfect, 1:1 preview. Best used when cards are
intentionally sized to match the receipt width.

### 5.5 Anti-Patterns (NEVER DO THIS)

| ❌ Anti-Pattern                                        | Why It Fails                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `width: 100% !important` on `body` inside iframe       | Destroys the fixed 80mm layout. Receipt looks "stretched" and fake.                   |
| `transform: scale()` without a fixed-size wrapper      | The scaled element still occupies its original space in the layout, causing overflow. |
| Fixed `height` on the iframe without `onLoad` sizing   | Content is clipped at the bottom (e.g., barcodes cut off).                            |
| `overflow: hidden` on the scroll container             | Prevents scrolling through long receipts.                                             |
| Applying `items-center` vertically on the preview area | Pushes receipt to the middle, leaving empty space above AND below.                    |

---

## 6. PHARMAFLOW ARCHITECTURE

### 6.1 File Map

| File                                           | Purpose                                                                                  | Key Exports                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `components/sales/InvoiceTemplate.ts`          | Receipt HTML generation                                                                  | `generateInvoiceHTML()`, `getActiveReceiptSettings()` |
| `components/sales/ReceiptDesigner.tsx`         | Visual receipt template editor                                                           | `ReceiptDesigner` component                           |
| `components/common/PremiumTemplateGallery.tsx` | Gallery modal for template selection                                                     | `PremiumTemplateGallery` component                    |
| `components/inventory/LabelPrinter.ts`         | Label HTML generation + batch printing                                                   | `printLabels()`, `generateTemplateCSS()`              |
| `components/inventory/BarcodeStudio.tsx`       | Visual label template editor                                                             | `BarcodeStudio` component                             |
| `components/inventory/BarcodePrinter.tsx`      | Print trigger UI for labels                                                              | `BarcodePrinter` component                            |
| `components/test/A5InvoiceDesigner.tsx`        | **A5 document invoice** — supplier purchase invoices with pagination, stamps, signatures | `A5InvoiceDesigner` component                         |
| `types/templates.ts`                           | Shared types                                                                             | `MarketplaceTemplate`, template interfaces            |
| `utils/printing.ts`                            | Low-level print helpers                                                                  | `printDocument()`, `wrapPrintHTML()`                  |
| `utils/barcodeEncoders.ts`                     | Barcode value encoding                                                                   | `encodeCode128()`                                     |

### 6.2 Receipt Layout System

Receipts support multiple layouts via the `receiptLayout` option:

| Layout ID  | Name               | Description                                        |
| ---------- | ------------------ | -------------------------------------------------- |
| `layout-1` | Standard (Default) | Classic white receipt with centered header         |
| `layout-2` | Modern Dark        | Inverted header with dark background (screen only) |
| `layout-3` | Compact Minimal    | Tight spacing for paper savings                    |

Each layout is generated by a dedicated function: `generateLayout1HTML()`,
`generateLayout2HTML()`, `generateLayout3HTML()`. The router function
`generateInvoiceHTML()` dispatches to the correct one.

### 6.3 Label Design System

Labels use an **absolute-positioned element** system where each element
(`LabelElement`) has:

- `x`, `y`: Position in mm from top-left
- `w`, `h`: Dimensions in mm
- `field`: Data binding (e.g., `'name'`, `'barcode'`, `'publicPrice'`)
- `fontSize`, `fontWeight`, `textAlign`: Typography

The `generateTemplateCSS()` function converts these to CSS classes with
`position: absolute` and `mm`-unit coordinates.

### 6.4 Print Settings Storage

All print settings are stored per-branch in Supabase JSONB under `StorageKeys`:

- `RECEIPT_TEMPLATES`: Array of saved receipt templates
- `RECEIPT_ACTIVE_TEMPLATE_ID`: Currently active template
- `LABEL_TEMPLATES`: Array of saved label templates
- `LABEL_DEFAULT_TEMPLATE`: Currently active label template
- `LABEL_DESIGN`: Auto-saved studio design state

---

## 7. DECISION FRAMEWORK

When asked to modify or create receipt/label features, follow this checklist:

### 7.1 Before Writing Any Code

- [ ] What is the **paper size**? (80mm, 58mm, 38×25mm, A5, A4, custom?)
- [ ] What is the **document class**? (thermal receipt, label, or document invoice?)
- [ ] What is the **target DPI**? (Assume 203 for thermal, 300+ for laser/inkjet)
- [ ] Is this for **screen preview** or **actual print output**?
- [ ] Does the design need to work in **both** contexts?
- [ ] What **barcode type** is needed? (Default: CODE128)
- [ ] Is the document **variable height** (receipt), **fixed height** (label), or **paginated** (A4/A5)?
- [ ] Does the document need **orientation switching** (portrait/landscape)?

### 7.2 CSS Width Calculation

```
CSS_WIDTH_PX = PAPER_WIDTH_MM × 3.7795
```

Always set `width` and `max-width` on `body` to this value.
Never use `100%` — it breaks the physical simulation.

### 7.3 Preview Scale Calculation

```
SCALE_FACTOR = CARD_WIDTH_PX / CSS_WIDTH_PX
WRAPPER_HEIGHT = CONTENT_HEIGHT × SCALE_FACTOR
```

### 7.4 Font Size Minimum

At 203 DPI, the minimum reliably readable font size is **7pt (~9.3px)**.
At 300 DPI, you can go down to **6pt (~8px)**.
Never go below these thresholds.

---

## 8. COMMON BUGS & FIXES

### 8.1 Barcode Cut Off at Bottom

**Cause**: `iframe.onLoad` fires before the barcode SVG/font renders.
**Fix**: Add `+50px` buffer to `scrollHeight`, or use `setTimeout` re-measure:

```typescript
onLoad={(e) => {
  const iframe = e.target as HTMLIFrameElement;
  if (iframe.contentWindow) {
    // Initial measurement
    iframe.style.height = `${iframe.contentWindow.document.body.scrollHeight + 50}px`;
    // Re-measure after fonts/SVGs load
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.style.height = `${iframe.contentWindow.document.body.scrollHeight + 50}px`;
      }
    }, 500);
  }
}}
```

### 8.2 Receipt Looks Stretched/Fake in Preview

**Cause**: Overriding `body { width: 100% }` to fill the card.
**Fix**: Never touch the receipt's internal CSS. Scale the **container**, not the content.

### 8.3 Empty Space Around Receipt in Gallery

**Cause**: Card width > receipt CSS width, with `justify-center`.
**Fix**: Set card width = receipt CSS width (302px for 80mm), or use the
wrapper+scale technique to fill the card precisely.

### 8.4 Label Elements Misaligned When Printed

**Cause**: Browser print margins adding extra offset.
**Fix**: Use `@page { margin: 0 }` AND check `getPrintOffsets()` calibration.

### 8.5 Arabic Text Overlapping

**Cause**: RTL text in a fixed-width column without proper `dir` attribute.
**Fix**: Use `dir="auto"` on individual text elements. Never set `dir="rtl"` globally.

---

## 9. QUALITY CHECKLIST

Before submitting any receipt/label change:

- [ ] **Physical accuracy**: Width matches paper spec in mm?
- [ ] **No content clipping**: All zones visible including barcode?
- [ ] **Quiet zones**: Barcode has ≥10X margin on each side?
- [ ] **Font minimum**: No text below 7pt (203 DPI) or 6pt (300 DPI)?
- [ ] **Print test**: `@page` size matches paper? Margins zero for thermal, ~8mm for A4/A5?
- [ ] **Preview fidelity**: Thumbnail looks like real thermal paper / real document?
- [ ] **Height auto**: Receipt body has `height: auto !important`? (thermal only)
- [ ] **Fixed page**: A4/A5 pages have exact `width` and `height` in mm? (document only)
- [ ] **No color in print**: Thermal output is black on white? (A4/A5 can use color)
- [ ] **Separator alignment**: Dashed lines span full width?
- [ ] **RTL safe**: Arabic text uses `dir="auto"` or correctly scoped `dir="rtl"`?
- [ ] **Translations**: All strings come from `i18n/translations.ts`, no hardcoded text?
- [ ] **Pagination**: Multi-page documents break cleanly without orphan rows?
- [ ] **Orientation**: Portrait and landscape both render correctly if supported?
- [ ] **Stamps/Signatures**: Positioned in footer zone, visible on last page only?

---

## 10. DOCUMENT INVOICE ARCHITECTURE (A4/A5)

### 10.1 Document Class vs Thermal Class

| Property          | Thermal Receipt                | Document Invoice (A4/A5)                      |
| ----------------- | ------------------------------ | --------------------------------------------- |
| Paper             | Roll (continuous)              | Cut sheets (fixed dimensions)                 |
| Height            | Variable (`auto`)              | Fixed per page (210mm A5 portrait)            |
| Color             | Monochrome only                | Full color supported                          |
| Margins           | Zero (`@page { margin: 0 }`)   | 5-10mm (`padding: 8mm`)                       |
| Pagination        | None (single continuous strip) | Required (multi-page with `page-break-after`) |
| Orientation       | N/A (fixed portrait)           | Portrait OR Landscape                         |
| Content overflow  | Scrolls infinitely             | Must chunk into pages                         |
| Stamps/Signatures | Rarely needed                  | Common (last page footer)                     |
| Font rendering    | Monospaced (Fake Receipt)      | System fonts (system-ui, sans-serif)          |
| Print method      | `window.print()` or ESC/POS    | Hidden iframe with injected HTML              |

### 10.2 Anatomy of an A5 Purchase Invoice

```
┌───────────────────────────────────────────────┐
│  ZONE 1: SUPPLIER HEADER                        │  Logo, name, type, CR, tax card
│  (Accent color band + corporate info)             │
├───────────────────────────────────────────────┤
│  ZONE 2: BILL-TO + INVOICE METADATA               │  Pharmacy name, tax ID, invoice#, date
├───────────────────────────────────────────────┤
│  ZONE 3: LINE ITEMS TABLE                         │  #, Name, Batch, Expiry, Qty, Bonus,
│  (Paginated — overflows to next page)              │  Public, Buy, Disc%, Total
├───────────────────────────────────────────────┤
│  ZONE 4: FINANCIAL SUMMARY (Last page only)        │  Total Public, Total Buy, Discount,
│  [Terms & Tax]  [Totals Grid]                      │  VAT 14%, Net Invoice Value
├───────────────────────────────────────────────┤
│  ZONE 5: FOOTER                                   │  Signature, Stamp, Barcode, Supply chain
└───────────────────────────────────────────────┘
```

### 10.3 Pagination Algorithm (Critical)

A5/A4 invoices must paginate dynamically. The key challenge: the **last page**
must reserve space for the financial summary + footer, so it holds fewer rows.

```typescript
// Row capacity depends on orientation AND page position
const maxIntermediate = orientation === "portrait" ? 18 : 13; // Non-last pages
const maxLast = orientation === "portrait" ? 11 : 8; // Last page (with footer)

const pageChunks: InvoiceItem[][] = [];
let remaining = [...items];

while (remaining.length > 0) {
  if (remaining.length <= maxLast) {
    // Everything fits on the last page with the footer
    pageChunks.push(remaining);
    remaining = [];
  } else {
    // Fill a non-last page to capacity
    pageChunks.push(remaining.slice(0, maxIntermediate));
    remaining = remaining.slice(maxIntermediate);
  }
}
```

**Key rules:**

- Intermediate pages: Header + table rows (no footer/totals)
- Last page: Remaining rows + financial summary + stamps + signatures
- Empty last page: If an intermediate page exactly fills, push an empty array
  for the footer-only page
- Row numbering: Must be **absolute** (item 1 on page 2 is still #19, not #1)

### 10.4 Orientation Switching

The same invoice must render in both orientations. Affected properties:

| Property          | Portrait                         | Landscape                       |
| ----------------- | -------------------------------- | ------------------------------- |
| **Page width**    | 148mm (A5) / 210mm (A4)          | 210mm (A5) / 297mm (A4)         |
| **Page height**   | 210mm (A5) / 297mm (A4)          | 148mm (A5) / 210mm (A4)         |
| **Row capacity**  | Higher (more vertical space)     | Lower (less vertical space)     |
| **Header layout** | Stacked (supplier above bill-to) | Side-by-side grid `1.1fr 0.9fr` |
| **Font sizes**    | Normal (9-11px)                  | Slightly reduced (7.5-10px)     |
| **Stamp size**    | w-20 h-20                        | w-14 h-14                       |
| **Padding**       | 8mm all sides                    | 8mm top/sides, 4mm bottom       |

### 10.5 CSS @page for A4/A5

```css
@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
  }
  @page {
    size: A5 portrait !important; /* or: A5 landscape, A4 portrait, A4 landscape */
    margin: 0 !important; /* We handle margins via padding on .page-div */
  }
  .page-div {
    border: none !important;
    box-shadow: none !important;
    margin: 0 !important;
    padding: 8mm !important;
    width: 148mm !important; /* A5 portrait width */
    height: 210mm !important; /* A5 portrait height */
    page-break-after: always !important;
    break-after: page !important;
  }
  .page-div:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }
}
```

### 10.6 Print via Hidden Iframe (A5InvoiceDesigner Pattern)

Unlike thermal receipts (which use `printDocument()`), A4/A5 invoices inject
into a hidden iframe for clean isolation:

```typescript
const handlePrint = () => {
  const printContent = document.getElementById("printable-a5-invoice");
  if (!printContent) return;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:absolute;width:0;height:0;border:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html dir="${language === "AR" ? "rtl" : "ltr"}">
    <head>
      <style>/* @page rules + Tailwind */</style>
    </head>
    <body>${printContent.innerHTML}</body>
    </html>
  `);
  doc.close();

  // Wait for fonts/icons to render
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 700);
};
```

### 10.7 Live Preview Architecture

The A5InvoiceDesigner uses a **zoom sandbox** pattern:

```
┌─ Screen Layout ─────────────────────────────────────┐
│  ┌─ Preview Column (col-span-7) ──┐  ┌─ Controls (col-span-5) ─┐ │
│  │  [Zoom Controls] [Orientation]  │  │  Supplier selector      │ │
│  │                                │  │  Invoice details         │ │
│  │  ┌─ Zoom Wrapper ─────────┐   │  │  Visibility toggles      │ │
│  │  │  transform: scale(zoom) │   │  │  Stamp customization     │ │
│  │  │  ┌─ Page 1 ────────┐ │   │  │  Add/remove items        │ │
│  │  │  │  148mm × 210mm   │ │   │  │  Font size control       │ │
│  │  │  └────────────────┘ │   │  └───────────────────────┘ │
│  │  │  ┌─ Page 2 ────────┐ │   │                           │
│  │  │  │  148mm × 210mm   │ │   │                           │
│  │  │  └────────────────┘ │   │                           │
│  │  └─────────────────────┘   │                           │
│  └─────────────────────────────┘                           │
└───────────────────────────────────────────────────┘
```

The zoom wrapper uses:

- `transform: scale(zoomScale)` with `transformOrigin: 'top center'`
- The wrapper `width` is set to the exact paper dimensions in mm
- Smooth transitions: `cubic-bezier(0.16, 1, 0.3, 1)`
- Controls: zoom in/out (0.5–1.5×), reset, orientation toggle

### 10.8 Egyptian Supplier System

The A5InvoiceDesigner includes a template system for Egyptian pharmaceutical
suppliers, each with:

| Field                     | Example                                                   |
| ------------------------- | --------------------------------------------------------- |
| `nameAr` / `nameEn`       | ابن سينا فارما / Ibnsina Pharma                           |
| `typeAr` / `typeEn`       | الموزع الأسرع نمواً / Fastest Growing Distributor         |
| `accentColor`             | `#047857` (brand color applied to header, totals, stamps) |
| `commercialRegister`      | س.ت: 12345 - القاهرة                                      |
| `taxCard`                 | ب.ض: 987-654-321                                          |
| `addressAr` / `addressEn` | Full warehouse address                                    |
| `phone`                   | الخط الساخن: 19580                                        |
| `stampAr` / `stampEn`     | Stamp text for the circular stamp element                 |

### 10.9 Row Height Consistency

For tabular data integrity across pages, all rows use fixed height classes:

```typescript
const ROW_HEIGHT_CLASS = "h-[24px]";
const ROW_MAX_HEIGHT_CLASS = "max-h-[24px]";
const ROW_MIN_HEIGHT_CLASS = "min-h-[24px]";
```

This ensures:

- Predictable pagination (exact row count per page)
- No row expansion from long text (use `line-clamp-2` + `overflow-hidden`)
- Consistent visual rhythm across all pages

### 10.10 Common A4/A5 Bugs

| Bug                                | Cause                                            | Fix                                                                        |
| ---------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| Page 2 starts mid-row              | Row count exceeds page capacity                  | Reduce `maxIntermediate` or add row height constraints                     |
| Footer overlaps table on last page | `maxLast` too generous                           | Test with maximum item count in both orientations                          |
| Print output has double margins    | Both `@page margin` and `.page-div padding` set  | Use `@page { margin: 0 }` and handle spacing via `padding` on page div     |
| Landscape text too small           | Same font sizes as portrait                      | Use orientation-conditional font sizes (`text-[7.5px]` vs `text-[8px]`)    |
| Stamp cut off at bottom            | Page height constraint + stamp rotation          | Reduce stamp size in landscape; keep rotation <10°                         |
| Color not printing                 | Print dialog has "Background graphics" unchecked | Use `-webkit-print-color-adjust: exact !important`                         |
| RTL table columns misaligned       | Mixed `text-left` and `text-right` without `dir` | Set `style={{ direction: language === 'AR' ? 'rtl' : 'ltr' }}` on page div |
