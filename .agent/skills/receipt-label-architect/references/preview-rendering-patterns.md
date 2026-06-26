# Receipt Preview Rendering — Engineering Patterns

## 1. The Core Challenge

A thermal receipt is authored at `width: 302px` (80mm × 3.7795 px/mm at 96 DPI).
A gallery card might be 200px, 302px, or 400px wide. The preview must:

1. Show the receipt at the correct aspect ratio
2. Never clip content (horizontally or vertically)
3. Look "real" — fonts and spacing must feel like actual thermal paper
4. Handle dynamic content height (receipts vary in length)

---

## 2. Pattern A: Wrapper + Scale (Gallery Thumbnails)

**When to use**: Card width ≠ receipt width. You need a miniature preview.

### Architecture

```
┌─── Card ─────────────────────┐
│ ┌─── Wrapper (W × H) ─────┐ │
│ │ ┌─── Scale Container ──┐ │ │
│ │ │ ┌─── iframe ────────┐│ │ │
│ │ │ │  Receipt content   ││ │ │
│ │ │ │  at 302px width    ││ │ │
│ │ │ │  (natural size)    ││ │ │
│ │ │ └───────────────────┘│ │ │
│ │ └──────────────────────┘ │ │
│ └──────────────────────────┘ │
│ [Template Name]    [$Price]  │
└──────────────────────────────┘
```

### CSS Implementation

```css
.preview-wrapper {
  width: 200px;          /* Visual footprint = desired thumbnail width */
  height: 280px;         /* Visual footprint = desired thumbnail height */
  overflow: hidden;      /* Clip anything outside the footprint */
  position: relative;
}

.scale-container {
  width: 302px;          /* Receipt's natural CSS width */
  transform-origin: top left;
  transform: scale(0.662);  /* 200 / 302 = 0.662 */
  pointer-events: none;
}

.preview-iframe {
  width: 302px;
  height: 800px;         /* Generous height to avoid clipping */
  border: none;
}
```

### React Implementation

```tsx
const RECEIPT_WIDTH = 302; // 80mm at 96 DPI
const scale = cardWidth / RECEIPT_WIDTH;

<div style={{ width: cardWidth, height: cardHeight, overflow: 'hidden' }}>
  <div style={{
    width: RECEIPT_WIDTH,
    transformOrigin: 'top left',
    transform: `scale(${scale})`,
    pointerEvents: 'none'
  }}>
    <iframe
      srcDoc={html}
      style={{ width: RECEIPT_WIDTH, height: 800 }}
      scrolling="no"
    />
  </div>
</div>
```

### Key Rules

1. **`transform-origin: top left`** — Without this, the scaled content
   shifts unpredictably toward the center
2. **Wrapper dimensions are the visual footprint** — The browser reserves
   space for the wrapper, not the (larger) scaled content
3. **`pointer-events: none`** — Users click the card, not the tiny receipt
4. **Fixed iframe height (800px)** — Must be tall enough to contain the
   longest possible receipt

---

## 3. Pattern B: Direct Embed (Full-Width Preview)

**When to use**: Card width = receipt width (302px). No scaling needed.

### Architecture

```
┌─── Card (302px) ─────────────┐
│ ┌─── iframe ────────────────┐│
│ │  Receipt content          ││
│ │  at natural size          ││
│ │  (scrollable if needed)   ││
│ └───────────────────────────┘│
│ [Template Name]    [$Price]  │
└──────────────────────────────┘
```

### Implementation

```tsx
<div className="flex-1 overflow-y-auto">
  <iframe
    srcDoc={html}
    scrolling="no"
    className="w-full border-none pointer-events-none"
    style={{ width: 302 }}
    onLoad={(e) => {
      const iframe = e.target as HTMLIFrameElement;
      if (iframe.contentWindow) {
        iframe.style.height =
          `${iframe.contentWindow.document.body.scrollHeight + 50}px`;
      }
    }}
  />
</div>
```

### Key Rules

1. **Dynamic height via `onLoad`** — Measure `scrollHeight` and apply
2. **+50px buffer** — Accounts for late-loading barcodes/fonts
3. **`overflow-y: auto` on container** — If receipt exceeds card height,
   allow scrolling
4. **Never set `width: 100%` on iframe body** — This destroys the 80mm layout

---

## 4. Pattern C: Image Snapshot (High-Performance Gallery)

**When to use**: Many thumbnails (10+), performance is critical.

### Concept

Render the receipt once in a hidden iframe, capture it as an image using
`html2canvas`, then display the image. This eliminates the overhead of
multiple live iframes.

```typescript
import html2canvas from 'html2canvas';

async function captureReceipt(html: string): Promise<string> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;width:302px;height:800px';
  document.body.appendChild(iframe);
  iframe.contentDocument!.write(html);
  iframe.contentDocument!.close();

  await new Promise(resolve => iframe.onload = resolve);
  await new Promise(resolve => setTimeout(resolve, 500)); // Wait for fonts/barcodes

  const canvas = await html2canvas(iframe.contentDocument!.body, {
    width: 302,
    backgroundColor: '#ffffff',
  });

  document.body.removeChild(iframe);
  return canvas.toDataURL('image/png');
}
```

### Trade-offs

| Aspect | iframe (Pattern A/B) | Image (Pattern C) |
|--------|---------------------|-------------------|
| Fidelity | Perfect | Rasterized (may blur at zoom) |
| Performance | Heavy (DOM per preview) | Light (single image) |
| Interactivity | Can select text | Static |
| Dynamic updates | Instant | Requires re-capture |
| Font rendering | Native | Dependent on html2canvas |

---

## 5. Label Preview (Fixed Dimensions)

Labels differ from receipts: they have **both** width AND height fixed.

```tsx
const LABEL_W = designWidth * 3.7795;  // mm to px
const LABEL_H = designHeight * 3.7795;

<div style={{
  width: LABEL_W * scale,
  height: LABEL_H * scale,
  overflow: 'hidden'
}}>
  <div style={{
    width: LABEL_W,
    height: LABEL_H,
    transform: `scale(${scale})`,
    transformOrigin: 'top left'
  }}>
    {/* Label content with absolute-positioned elements */}
  </div>
</div>
```

---

## 6. Troubleshooting Matrix

| Problem | Root Cause | Solution |
|---------|-----------|---------|
| Receipt cut off at bottom | `iframe.height` too small or measured before fonts load | Use `onLoad` + 50px buffer + 500ms `setTimeout` re-measure |
| Receipt stretched horizontally | Body width set to `100%` instead of `302px` | Never override receipt's internal CSS. Scale the container. |
| Empty space on sides | Card wider than receipt, no scale | Either: (a) set card width = 302px, or (b) use Pattern A with scale |
| Empty space above receipt | Container uses `items-center` vertically | Use `items-start` or remove vertical centering |
| Preview looks blurry | Scale factor produces sub-pixel rendering | Use whole-number-friendly scales (0.5, 0.25, 0.75) when possible |
| Barcode missing in preview | Barcode font/SVG not loaded at render time | Add `setTimeout` re-measure in `onLoad` handler |
| Preview doesn't update | iframe caches `srcDoc` | Add a cache-busting key: `key={templateId + timestamp}` |
| Click doesn't work on card | `pointer-events: none` on wrong element | Apply `pointer-events: none` only on the iframe, not the card |
