# Barcode & QR Code Design Specifications

## 1. CODE128 (Primary — PharmaFlow Default)

### Physical Specifications

| Property | Requirement |
|----------|-------------|
| **Data capacity** | Full ASCII (128 characters) |
| **Quiet zone** | ≥10X on each side (X = narrowest bar width) |
| **Minimum bar height** | 10mm (for handheld scanners) |
| **Minimum module width** | 0.264mm at 203 DPI (1 dot) |
| **Recommended module width** | 0.5mm (2 dots at 203 DPI) |
| **Maximum data density** | ~22 characters per inch |

### Character Set Subsets

| Subset | Characters | Auto-Switched? |
|--------|-----------|----------------|
| **128A** | UPPERCASE, control chars, digits | Yes |
| **128B** | UPPERCASE, lowercase, digits, symbols | Yes (default) |
| **128C** | Digit pairs (00-99), ultra-compact | Yes |

Modern encoders (including PharmaFlow's `encodeCode128()`) auto-switch
subsets for optimal density.

### Sizing Formula for 80mm Paper

```
Available width = 72mm (printable) - 2 × quiet_zone
Quiet zone at 2-dot module = 2 × (10 × 0.5mm) = 10mm
Available for bars = 72mm - 10mm = 62mm
Max encodable chars ≈ 62mm / (11 × 0.5mm per char) ≈ 11 chars
```

For longer data (e.g., 20-char transaction IDs), reduce module width to
0.264mm (1 dot) or use a smaller font for the HRI text.

---

## 2. EAN-13

### Physical Specifications

| Property | Requirement |
|----------|-------------|
| **Data capacity** | Exactly 13 digits (12 + check digit) |
| **Quiet zone (left)** | ≥11X (3.63mm at 100% magnification) |
| **Quiet zone (right)** | ≥7X (2.31mm at 100% magnification) |
| **Nominal size (100%)** | 31.35mm × 22.85mm |
| **Magnification range** | 80% – 200% |
| **Minimum size (80%)** | 25.08mm × 18.28mm |

### When to Use EAN-13

- Product is sold at retail and needs to be scannable at any POS
- Existing manufacturer barcode needs to be reproduced
- Integration with external inventory systems requiring GS1 standards

---

## 3. QR Code

### Physical Specifications

| Property | Requirement |
|----------|-------------|
| **Data capacity** | Up to 4,296 alphanumeric characters |
| **Quiet zone** | 4 modules on ALL four sides |
| **Minimum module size** | 0.33mm (print), 0.76mm (mobile scan) |
| **Error correction levels** | L (7%), M (15%), Q (25%), H (30%) |
| **Recommended level** | M (15%) for general use |

### Sizing for Thermal Print

| Use Case | Module Size | Physical Size (V5, 37 modules) |
|----------|-------------|-------------------------------|
| Scanner (close range) | 0.33mm | 12.2mm × 12.2mm |
| Mobile phone scan | 0.76mm | 28.1mm × 28.1mm |
| Customer-facing (comfortable) | 1.0mm | 37mm × 37mm |

### Best Practices

1. **Always use Error Correction M or higher** for thermal print
   (ink spread can corrupt low-EC codes)
2. **Never invert** QR codes (light on dark) for thermal — the print
   medium is inherently white
3. **Test at 80% size** — if it scans at 80%, it will scan at 100%

---

## 4. DataMatrix (Pharmaceutical Serialization)

### When to Use

- Drug serialization (e.g., EU FMD, US DSCSA compliance)
- Encoding batch number + expiry date + serial number in minimal space
- Small packages where CODE128 doesn't fit

### Specifications

| Property | Requirement |
|----------|-------------|
| **Data capacity** | Up to 2,335 alphanumeric characters |
| **Quiet zone** | 1 module on all sides (minimal!) |
| **Error correction** | Built-in Reed-Solomon (up to 25% recovery) |
| **Minimum module** | 0.3mm (ideal for high-density DPI printers) |

---

## 5. Barcode Rendering in HTML/CSS

### SVG-Based (Recommended)

```html
<svg class="barcode-svg" viewBox="0 0 WIDTH HEIGHT">
  <!-- bars rendered as <rect> elements -->
</svg>
```

Advantages:
- Resolution-independent (crisp at any DPI)
- Scales perfectly in print
- No font loading dependency

### Font-Based (Legacy, used in BarcodeStudio)

```css
.barcode-text {
  font-family: 'Libre Barcode 128', cursive;
  font-size: 32px;
  white-space: nowrap;
  letter-spacing: 0; /* CRITICAL: never add spacing */
}
```

Advantages:
- Simple to implement
- Small payload

Disadvantages:
- Dependent on font loading (can cause preview cutoff)
- Less control over module width
- Some characters render incorrectly in certain fonts

### Canvas-Based (For Dynamic Generation)

Use libraries like `JsBarcode` or `bwip-js` for programmatic generation.
Convert to Data URL for embedding in receipts:

```typescript
import JsBarcode from 'jsbarcode';
const canvas = document.createElement('canvas');
JsBarcode(canvas, data, { format: 'CODE128', width: 2, height: 50 });
const dataUrl = canvas.toDataURL('image/png');
```

---

## 6. Common Barcode Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| Scanner doesn't read | Quiet zone too small | Increase margin ≥10X |
| Barcode looks "fuzzy" | Module width < 1 dot at printer DPI | Increase module width |
| Partial scan (wrong data) | Truncated barcode (clipped by container) | Ensure `overflow: visible` |
| Barcode appears blank | Font not loaded / SVG not rendered | Add onLoad delay + buffer |
| HRI text misaligned | Different font metrics | Use monospaced font for HRI |
