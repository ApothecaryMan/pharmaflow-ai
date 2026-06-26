# Pharmacy Label Design Guide

## 1. Label Categories

### 1.1 Price/Shelf Labels (Primary in PharmaFlow)

Small adhesive labels affixed to product packaging for pricing and identification.

| Field | Priority | Typography |
|-------|----------|------------|
| Drug Name (EN/AR) | **Critical** | Bold, largest text on label |
| Public Price | **Critical** | Bold, prominent, right-aligned |
| Barcode | **Critical** | CODE128, minimum 8mm height |
| Expiry Date | High | Medium weight, visible placement |
| Store Name | Medium | Small, top or bottom |
| Generic Name | Low | Small italic, below drug name |

### 1.2 Prescription Labels

Applied to dispensed medication containers. Must convey dosage instructions clearly.

| Field | Priority | Notes |
|-------|----------|-------|
| Patient Name | **Critical** | Large, top of label |
| Drug Name + Strength | **Critical** | e.g., "Amoxicillin 500mg" |
| Dosage Instructions | **Critical** | Plain language, no abbreviations |
| Prescriber Name | High | Required by most regulations |
| Dispensing Date | High | — |
| Refill Information | Medium | "Refills: 2 remaining" |
| Warnings/Auxiliaries | High | Color-coded where possible |
| Pharmacy Info | Medium | Name, address, phone |
| Rx Number | Medium | For tracking |

### 1.3 Batch/Inventory Labels

Internal labels for stock management, bin identification, or cold chain tracking.

| Field | Priority | Notes |
|-------|----------|-------|
| Drug Name | **Critical** | — |
| Batch Number | **Critical** | — |
| Expiry Date | **Critical** | Bold, highlighted if near-expiry |
| Storage Conditions | High | e.g., "Store 2-8°C" |
| Internal Code | Medium | For internal scanning |

---

## 2. Standard Label Sizes

### 2.1 Common Pharmacy Presets

| Size (mm) | Aspect Ratio | Best For |
|-----------|-------------|----------|
| **38 × 25** | 1.52:1 | Price tags, shelf labels (double roll) |
| **50 × 25** | 2.0:1 | Small product labels |
| **50 × 30** | 1.67:1 | Medium labels with barcode |
| **60 × 30** | 2.0:1 | Product labels with more info |
| **60 × 40** | 1.5:1 | Prescription labels (small vials) |
| **70 × 35** | 2.0:1 | Standard prescription labels |
| **70 × 50** | 1.4:1 | Large prescription / warning labels |
| **100 × 50** | 2.0:1 | Shipping, bulk containers |
| **100 × 150** | 0.67:1 | Shipping labels (portrait) |

### 2.2 Label Orientation

- **Landscape** (width > height): Default for shelf/price labels
- **Portrait** (height > width): Used for prescription vial wraps

PharmaFlow's `deriveOrientation()` utility automatically detects this
from the design dimensions.

---

## 3. Typography on Labels

### 3.1 Font Size Guidelines (203 DPI)

| Element | Minimum | Recommended | Maximum |
|---------|---------|-------------|---------|
| Drug Name | 8pt | 10-12pt | 14pt |
| Price | 10pt | 12-14pt | 18pt |
| Barcode HRI | 6pt | 8pt | 10pt |
| Store Name | 6pt | 7-8pt | 10pt |
| Expiry Date | 7pt | 8-9pt | 11pt |
| Warning Text | 7pt | 8pt | 10pt |

### 3.2 Font Selection

| Context | Recommended Fonts |
|---------|-------------------|
| Drug Name (EN) | Arial, Helvetica, Roboto (sans-serif) |
| Drug Name (AR) | Noto Sans Arabic, Cairo, system Arabic |
| Price | Tabular/monospaced numbers (Roboto Mono) |
| Barcode HRI | Courier New, monospaced |
| Barcode Visual | Libre Barcode 128, Code128 font |

### 3.3 Bilingual Labels (EN/AR)

When both English and Arabic text appear on the same label:

1. **Drug name**: Show English name first (left-aligned), Arabic below or beside
2. **Direction**: Use `dir="auto"` on each text element independently
3. **Never set** `dir="rtl"` on the label container itself
4. **Font sizing**: Arabic text may need +10% size increase for readability
   (Arabic glyphs are denser than Latin)

---

## 4. Layout Principles

### 4.1 The Grid System

Labels use absolute positioning with mm coordinates:

```
┌───────────────────────────────────────┐
│ [Store Name]              [Price]     │  Top row
│                                       │
│ [Drug Name - EN]                      │  Main content
│ [Drug Name - AR]                      │
│                                       │
│ [|||||||||||||||||||||||||||||||||||]  │  Barcode
│ [         barcode text         ]      │  HRI
│ [Expiry: MM/YY]       [Type/Unit]    │  Bottom row
└───────────────────────────────────────┘
```

### 4.2 Margin & Padding

| Zone | Minimum |
|------|---------|
| **Edge margin** (all sides) | 1.5mm |
| **Barcode quiet zone** | Calculated per barcode type |
| **Text-to-text spacing** | 0.5mm vertical |
| **Text-to-barcode spacing** | 1mm |

### 4.3 Content Priority Layout

When space is limited, drop content in this order (last = drop first):

1. ⬆️ Drug Name (NEVER drop)
2. ⬆️ Price (NEVER drop)
3. ⬆️ Barcode (NEVER drop)
4. Expiry Date
5. Generic Name
6. Store Name
7. Unit/Type

---

## 5. Adhesive & Material Considerations

| Material | Durability | Chemical Resistance | Best For |
|----------|-----------|---------------------|----------|
| **Direct Thermal** | Low (weeks-months) | Low | Short-term price labels |
| **Thermal Transfer** | High (years) | Medium | Prescription labels |
| **Synthetic (PP/PE)** | Very High | High | Cold chain, wet environments |
| **Removable Adhesive** | Varies | Varies | Temporary pricing, sales |
| **Permanent Adhesive** | Varies | Varies | Standard pharmacy labels |

### Pharmacy-Specific Requirements

- **Glove-friendly adhesive**: Must stick to plastic bottles handled with latex/nitrile gloves
- **Chemical resistance**: Labels must survive alcohol wipes, hand sanitizer
- **Cold storage**: Adhesive must function at 2-8°C for refrigerated drugs
- **Tamper-evident**: Some regulations require labels that show visible damage if removed

---

## 6. Regulatory Compliance Notes

### 6.1 General Principles (Multi-Jurisdiction)

- Drug name and strength must be the **most prominent** information
- Dosage instructions must use **plain language** (no Latin abbreviations)
- Warning labels (e.g., "May cause drowsiness") should be visually distinct
- Expiry dates should follow local convention (MM/YYYY or YYYY-MM)

### 6.2 PharmaFlow Implementation

- All compliance fields are configurable via `LabelElement` field bindings
- The `BarcodeStudio` editor allows drag-and-drop positioning of all fields
- Templates can be saved per-branch for different regulatory requirements
- Default template (`38×25mm`) includes: name, price, barcode, expiry
