# ESC/POS Command Quick Reference

This reference covers the most critical ESC/POS commands used in thermal receipt
printers. While PharmaFlow currently uses HTML-to-print via `window.print()`,
understanding ESC/POS is essential for future direct-print integrations.

## Initialization

| Command | Hex | Decimal | Purpose |
|---------|-----|---------|---------|
| `ESC @` | `1B 40` | `27 64` | **Initialize printer** — always send first |

## Text Formatting

| Command | Hex | Description |
|---------|-----|-------------|
| `ESC E n` | `1B 45 n` | Bold on (`n=1`) / off (`n=0`) |
| `ESC ! n` | `1B 21 n` | Select print mode (font, bold, double) |
| `GS ! n` | `1D 21 n` | Character size scaling |
| `ESC a n` | `1B 61 n` | Alignment: `0`=Left, `1`=Center, `2`=Right |

### Character Size via `GS ! n`

The `n` byte encodes both width and height multipliers:

```
n = (widthMultiplier - 1) × 16 + (heightMultiplier - 1)
```

| Size | n (Decimal) | n (Hex) |
|------|-------------|---------|
| 1×1 (Normal) | 0 | 00 |
| 2×1 (Double Width) | 16 | 10 |
| 1×2 (Double Height) | 1 | 01 |
| 2×2 (Double W+H) | 17 | 11 |
| 3×3 | 34 | 22 |

### Font Selection via `ESC ! n`

Bit flags in `n`:

| Bit | Meaning |
|-----|---------|
| 0 | Font B (9×17) when set; Font A (12×24) when clear |
| 3 | Emphasized (bold) |
| 4 | Double height |
| 5 | Double width |
| 6 | Strikethrough |
| 7 | Underline |

## Paper Control

| Command | Hex | Purpose |
|---------|-----|---------|
| `ESC d n` | `1B 64 n` | Feed `n` lines |
| `GS V m` | `1D 56 m` | Cut paper: `m=0` full, `m=1` partial |
| `ESC p m t1 t2` | `1B 70 ...` | Open cash drawer |

## Characters Per Line Reference

### Font A (12×24 dots)

| Paper Width | Normal | Double Width |
|-------------|--------|--------------|
| 80mm | 48 chars | 24 chars |
| 58mm | 32 chars | 16 chars |

### Font B (9×17 dots)

| Paper Width | Normal | Double Width |
|-------------|--------|--------------|
| 80mm | 64 chars | 32 chars |
| 58mm | 42 chars | 21 chars |

## Barcode Printing

| Command | Hex | Purpose |
|---------|-----|---------|
| `GS h n` | `1D 68 n` | Set barcode height (`n` in dots) |
| `GS w n` | `1D 77 n` | Set barcode width (`n` = 2-6, module width) |
| `GS H n` | `1D 48 n` | HRI position: `0`=none, `1`=above, `2`=below, `3`=both |
| `GS k m d...` | `1D 6B ...` | Print barcode (symbology `m`, data `d`) |

### Symbology Codes (`m`)

| m | Type |
|---|------|
| 2 | EAN-13 |
| 4 | CODE39 |
| 6 | ITF |
| 8 | CODE128 |
| 73 | CODE128 (Function B) |

## QR Code (Two-Step)

```
Step 1: Store data
  1D 28 6B pL pH 31 50 30 [data]

Step 2: Print
  1D 28 6B 03 00 31 51 30
```

## Practical Tips

1. **Always initialize** (`ESC @`) before every print job
2. **Reset formatting** after each section — bold/size commands are sticky
3. **Test barcode module width**: Start with `GS w 2` and increase until scannable
4. **Partial cut** (`GS V 1`) is preferred over full cut for receipt strips
5. **Cash drawer**: `ESC p 0 25 250` opens drawer pin 2 for ~200ms
