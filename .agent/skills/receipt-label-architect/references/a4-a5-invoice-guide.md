# A4/A5 Document Invoice — Complete Reference

## 1. Paper Size Quick Reference

### ISO A-Series Paper Dimensions

| Size | Width (mm) | Height (mm) | Area (cm²) | Aspect Ratio |
|------|-----------|-------------|------------|-------------|
| A0   | 841       | 1189        | 9999.49    | 1:√2        |
| A1   | 594       | 841         | 4995.54    | 1:√2        |
| A2   | 420       | 594         | 2494.80    | 1:√2        |
| A3   | 297       | 420         | 1247.40    | 1:√2        |
| **A4** | **210** | **297**     | **623.70** | **1:√2**    |
| **A5** | **148** | **210**     | **310.80** | **1:√2**    |
| A6   | 105       | 148         | 155.40     | 1:√2        |

The ratio 1:√2 (≈1:1.414) means folding an A-size sheet in half always
produces the next A-size. This is critical for understanding scaling.

### CSS Pixel Equivalents (96 DPI)

| Size | Portrait (W × H px) | Landscape (W × H px) |
|------|---------------------|----------------------|
| **A4** | 793 × 1122 | 1122 × 793 |
| **A5** | 559 × 793 | 793 × 559 |
| **A6** | 397 × 559 | 559 × 397 |

---

## 2. Printable Area & Margins

### Hardware Margins

All printers have a non-printable area at each edge. Common minimums:

| Printer Type | Top | Bottom | Left | Right |
|-------------|-----|--------|------|-------|
| Laser (standard) | 4mm | 4mm | 4mm | 4mm |
| Laser (full-bleed capable) | 1mm | 1mm | 1mm | 1mm |
| Inkjet (standard) | 3mm | 12mm | 3mm | 3mm |
| Inkjet (borderless) | 0mm | 0mm | 0mm | 0mm |

### Recommended Document Margins

| Document Type | Margin | Rationale |
|--------------|--------|-----------|
| Purchase invoice | 8mm all sides | Compact but safe for all printers |
| Official tax document | 15mm all sides | Generous, professional appearance |
| Internal report | 10mm all sides | Balance of density and readability |
| Envelope label | 5mm all sides | Maximum usable area |

**PharmaFlow default: `padding: 8mm` on `.page-div`**

---

## 3. Orientation-Responsive Design

### When to Use Portrait

- **Tall content**: Many line items, vertical lists
- **Standard documents**: Invoices, letters, contracts
- **Filing**: Standard binder/filing systems expect portrait

### When to Use Landscape

- **Wide tables**: Many columns that don't fit in portrait
- **Charts/Graphs**: Wider aspect ratio for data visualization
- **Comparison layouts**: Side-by-side supplier/pharmacy info

### Responsive Patterns

The A5InvoiceDesigner uses conditional rendering based on orientation:

#### Header Layout
```
Portrait:                           Landscape:
┌──────────────────────────┐        ┌──────────────────────────────────┐
│ [Supplier Info]          │        │ [Supplier Info] | [Bill-To Info] │
├──────────────────────────┤        │ (grid 1.1fr)   | (grid 0.9fr)   │
│ [Bill-To] | [Invoice#]   │        └──────────────────────────────────┘
└──────────────────────────┘
(Stacked — border-b between)        (Side-by-side — single border-b)
```

#### Font Size Adaptation
```typescript
const fontSizeByOrientation = {
  portrait: {
    body: 'text-[10px]',
    header: 'text-sm',
    terms: 'text-[8px]',
    disclaimer: 'text-[7px]',
    stamp: 'text-[7px]',
    total: 'text-xs',
    netValue: 'text-sm',
  },
  landscape: {
    body: 'text-[9px]',
    header: 'text-xs',
    terms: 'text-[7.5px]',
    disclaimer: 'text-[6.5px]',
    stamp: 'text-[5.5px]',
    total: 'text-[10px]',
    netValue: 'text-xs',
  },
};
```

#### Element Size Adaptation
```typescript
const elementSizes = {
  portrait: {
    stamp: 'w-20 h-20',
    signatureLine: 'h-3',
    qrPlaceholder: 'w-12 h-12',
    spacing: 'gap-4 mt-3',
  },
  landscape: {
    stamp: 'w-14 h-14',
    signatureLine: 'h-2',
    qrPlaceholder: 'w-9 h-9',
    spacing: 'gap-2.5 mt-1.5',
  },
};
```

---

## 4. Pagination Deep Dive

### Row Capacity Calculation

The available vertical space for table rows depends on:

```
Available height = Page height - Header height - Footer height - Margins
Row height = 24px (fixed)
Rows per page = floor(Available height / Row height)
```

For A5 with 8mm padding:

| Page Type | Portrait (210mm height) | Landscape (148mm height) |
|-----------|------------------------|--------------------------|
| Intermediate (header + table only) | ~18 rows | ~13 rows |
| Last page (header + table + totals + footer) | ~11 rows | ~8 rows |

### Edge Cases

1. **Exactly `maxLast` items**: Everything fits on one page with footer ✓
2. **`maxLast + 1` items**: Page 1 gets `maxIntermediate` items → Page 2 gets remaining + footer
3. **`maxIntermediate` items exactly**: Risk of empty last page with only footer
4. **0 items**: Show empty table message on single page with footer

### Page Break CSS

```css
/* On the page div element */
.page-div {
  page-break-after: always;
  break-after: page;
}
.page-div:last-child {
  page-break-after: auto;
  break-after: auto;
}

/* Prevent rows from splitting across pages */
tr {
  break-inside: avoid;
  page-break-inside: avoid;
}
```

---

## 5. Table Design for Invoices

### Column Priority (A5 Portrait, ~140mm usable width)

| Column | Width | Priority | Hideable? |
|--------|-------|----------|-----------|
| # (Row number) | 6mm | Required | No |
| Medicine Name | 30-40mm | Required | No |
| Batch | 15mm | Optional | Yes (`showBatchNumber`) |
| Expiry | 15mm | Required | No |
| Quantity | 10mm | Required | No |
| Bonus | 10mm | Optional | Yes (`showBonusColumn`) |
| Public Price | 15mm | Required | No |
| Buy Price | 15mm | Required | No |
| Discount % | 10mm | Required | No |
| Total | 18mm | Required | No |

### Column Alignment

| Data Type | Alignment | Rationale |
|-----------|-----------|-----------|
| Row number | Center | Quick scanning |
| Text (names) | Start (RTL-aware) | Natural reading direction |
| Dates | Center | Uniform fixed-width format |
| Quantities | Center | Small numbers, easy comparison |
| Prices | End (right in LTR, left in RTL) | Decimal alignment |
| Percentages | Center | Small, uniform values |

### Table Styling

```css
/* Alternating rows for readability */
tr:nth-child(even) { background: rgba(0,0,0,0.02); }

/* Hover feedback (screen only) */
tr:hover { background: rgba(0,0,0,0.04); }

/* Cell borders for formal invoices */
td, th {
  border-right: 1px solid #e5e7eb;
  padding: 4px 6px;
}

/* Header row */
thead tr {
  background: #f4f4f5;
  font-weight: 800;
  font-size: 9px;
}
```

---

## 6. Stamp & Signature Elements

### Circular Stamp Design

```css
.stamp {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 4px double rgba(accent, 0.8);
  color: rgba(accent, 0.8);
  font-family: monospace;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transform: rotate(6deg);    /* Slight angle for realism */
  opacity: 0.8;               /* Slightly faded for authenticity */
}
```

### Stamp Content Structure

```
        ★ APPROVED ★
      SUPPLIER-NAME-ID
    ─────────────────────
        مستودع مصر
        2026-05-18
```

### Signature Block

```html
<div class="space-y-2">
  <p class="font-bold text-zinc-500 text-[9px]">
    المستلم (مدير الصيدلية):
  </p>
  <div class="border-b border-black w-24 h-3"></div>
  <p class="text-[7px] text-zinc-400">
    التوقيع والختم الصيدلاني
  </p>
</div>
```

---

## 7. Bilingual Invoice Patterns

### Language Switching

The invoice supports three modes:
- **Arabic only** (`language === 'AR'`)
- **English only** (`language === 'EN'`)
- **Bilingual items** (`itemsLanguage === 'BOTH'`)

### Text Direction

```typescript
// Page-level direction
<div style={{ direction: language === 'AR' ? 'rtl' : 'ltr' }}>

// Individual elements use natural direction
// Numbers and dates always display LTR regardless of page direction
<span className="font-mono">{invoiceNumber}</span>  // Always LTR
```

### Currency Formatting

For Egyptian pharmaceutical invoices:
- Currency: **EGP** (Egyptian Pound)
- Format: `123,456.78 EGP`
- Decimal places: Always 2 (`.toFixed(2)`)
- Thousands separator: Optional comma for values > 9,999

---

## 8. Color System for Supplier Branding

Each supplier has a unique accent color that permeates the invoice:

| Element | Color Application |
|---------|------------------|
| Header icon + store name | `style={{ color: accentColor }}` |
| Phone badge | `style={{ backgroundColor: accentColor }}` white text |
| Header separator line | `style={{ borderColor: accentColor }}` |
| Discount column text | Fixed amber-700 (cross-supplier) |
| Net total row | `style={{ backgroundColor: accentColor }}` white text |
| Stamp border + text | `accentColor + 'cc'` (80% opacity) |

### Pre-defined Supplier Palette

| Supplier | Accent Color | Hex |
|---------|-------------|-----|
| United Pharmacists (UCP) | Amber-700 | `#b45309` |
| Ibnsina Pharma | Emerald-700 | `#047857` |
| Egyptian Drug Trading Co. | Blue-700 | `#1d4ed8` |
