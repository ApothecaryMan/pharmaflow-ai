---
name: translation-hunter
description: "Ultra-fast detection and migration of hardcoded Arabic/English strings into the i18n/translations.ts system. Use when asked to 'find hardcoded strings', 'enforce translations', 'hunt translations', 'صيد الترجمة', 'هاردكود', or when fixing any hardcoded text in components."
---

# Translation Hunter 🎯

Ultra-fast, token-efficient skill for detecting **every** hardcoded string (Arabic or English — even a single character) in TSX/TS files and migrating them into `i18n/translations.ts`.

## Architecture Reference

```
i18n/translations.ts  →  { EN: { ... }, AR: { ... } }   (line ~2385 = AR start)
Usage pattern:          const t = TRANSLATIONS[language];  →  t.section.key
EN section:             Lines 7–2384
AR section:             Lines 2385–4777
```

## ⚡ Golden Rules

1. **NEVER output the full translations.ts** — only surgical line-range edits.
2. **Batch all findings** — one `multi_replace_file_content` call, not one per key.
3. **Mirror structure exactly** — the EN key path must match the AR key path.
4. **Preserve all comments** — never delete existing comments in any file.
5. **Use existing keys first** — before adding a new key, `grep_search` for the English text in translations.ts. If a key exists, reuse it.

## 🔍 Phase 1: DETECT (The Hunt)

### Step 1A: Scope the Target

Determine what to scan:
- **Single file**: User points to a specific file → scan only that file.
- **Directory**: User says "scan sales" → scan `components/sales/`.
- **Full sweep**: User says "scan everything" → scan `components/` + `pages/` + `hooks/`.

### Step 1B: Run Detection Queries

Execute these `grep_search` calls **in parallel** on the target scope. Each catches a different hardcoded pattern:

```
// PATTERN 1: Inline ternary translations (HIGHEST PRIORITY — most common violation)
// Catches: language === 'AR' ? 'عربي' : 'English'
Query (regex): language\s*===\s*'AR'\s*\?\s*'
Includes: ["*.tsx", "*.ts"]

// PATTERN 2: Fallback hardcoded strings  
// Catches: t.key || 'Fallback Text'
Query (regex): \|\|\s*'[A-Za-z\u0600-\u06FF]
Includes: ["*.tsx", "*.ts"]

// PATTERN 3: Raw Arabic in JSX (catches ANY Arabic character in string literals)
// Catches: 'أي نص عربي' or "أي نص عربي" or `أي نص عربي`
Query (regex): ['"`][\u0600-\u06FF]
Includes: ["*.tsx"]

// PATTERN 4: Hardcoded English in JSX attributes
// Catches: title="Some Text", placeholder="Enter...", label="Name"
Query (regex): (title|placeholder|label|subtitle|header|text)=["'][A-Z]
Includes: ["*.tsx"]

// PATTERN 5: Hardcoded strings inside JSX text content
// Catches: >Some visible text< (text between JSX tags)
Query (regex): >[A-Z][a-z]+\s+[a-z]
Includes: ["*.tsx"]
```

> **Token Budget**: Only run patterns relevant to the scope. For a single file, all 5 patterns cost ~5 grep calls. For a full sweep, run Pattern 1 and 3 first (they catch 80% of violations).

### Step 1C: Triage Results

After detection, classify each finding into:

| Category | Description | Example | Action |
|----------|-------------|---------|--------|
| 🔴 **Critical** | Inline ternary (`language === 'AR' ? ...`) | `language === 'AR' ? 'حذف' : 'Delete'` | Move both values to EN/AR keys |
| 🟠 **High** | Fallback string (`t.key \|\| 'text'`) | `t.returns.unit \|\| 'Unit'` | Add missing key to translations.ts |
| 🟡 **Medium** | Raw Arabic/English in JSX | `<span>مرتجع</span>` | Create new key with both translations |
| ⚪ **Skip** | Console logs, comments, CSS classes, icon names, variable names | `console.error('Failed')` | Do NOT touch |

### Skip List (DO NOT flag these):

- `console.log/warn/error` messages
- Code comments (`// ...`)
- CSS class names
- Material icon names (e.g., `>check<`, `>close<`, `>add<`)
- String comparisons (`=== 'cash'`, `=== 'active'`) — these are logic, not UI
- Format strings (`'MM/YY'`, `'+1'`)
- `dir={language === 'AR' ? 'rtl' : 'ltr'}` — this is layout, not translation
- `type=`, `className=`, `style=` attribute values
- File paths, URLs, regex patterns
- Single punctuation characters (`':'`, `'/'`, `'.'`)

## 🔧 Phase 2: FIX (The Migration)

### Step 2A: Plan the Keys

For each finding, determine the **key path** following these rules:

1. **Match the component's section** in translations.ts:
   - `ReturnModal.tsx` uses `t.returns.*` → new keys go under `returns`
   - `BranchSettings.tsx` uses `t.settings.*` → new keys go under `settings`
   
2. **Use semantic, camelCase names**:
   - ✅ `returns.refundLimitExceeded`
   - ❌ `returns.error1`

3. **Group related keys** under sub-objects when there are 3+ related items:
   ```ts
   validation: {
     noOpenShift: '...',
     insufficientBalance: '...',
     refundLimitExceeded: '...',
   }
   ```

4. **Check for existing keys first**: `grep_search` for the English text value in translations.ts before creating a duplicate.

### Step 2B: Add Keys to translations.ts

Use `multi_replace_file_content` with **two chunks** (one for EN, one for AR):

```
Chunk 1: EN section — find the closing `},` of the relevant section, insert keys before it.
Chunk 2: AR section — find the matching closing `},` in AR, insert Arabic translations.
```

**Critical**: Always `view_file` the exact line range where you'll insert to get precise `StartLine`/`EndLine`. The file is 4778 lines — blind edits WILL fail.

### Step 2C: Update the Component

Replace hardcoded strings with translation keys:

```tsx
// BEFORE (inline ternary):
language === 'AR' ? 'حذف' : 'Delete'

// AFTER:
t.returns.delete   // (or t.common.delete if it exists globally)
```

```tsx
// BEFORE (fallback):
t.returns.unit || 'Unit'

// AFTER (key now exists):
t.returns.unit
```

```tsx
// BEFORE (raw Arabic):
{item.returnedQty} {language === 'AR' ? 'مرتجع' : 'returned'}

// AFTER:
{item.returnedQty} {t.returns.returnedLabel}
```

## 📊 Phase 3: REPORT

After fixing, output a concise summary table:

```markdown
## Translation Hunt Report: [FileName]

| # | Line | Before (snippet) | Key Added | Status |
|---|------|-------------------|-----------|--------|
| 1 | 171  | `'AR' ? 'خطأ:...' : 'Error:...'` | `returns.validation.pharmacistLimit` | ✅ Fixed |
| 2 | 449  | `'مرتجع' : 'returned'` | `returns.returnedLabel` | ✅ Fixed |

**Keys Added**: 5 EN + 5 AR
**Files Modified**: 2 (translations.ts, ReturnModal.tsx)
```

## 🚀 Speed Optimization Tips

1. **Parallel grep**: Run all 5 patterns in one tool call block.
2. **Batch edits**: All translation insertions in ONE `multi_replace_file_content` call.
3. **Skip view_file for known files**: If you just viewed the file, don't re-read it.
4. **Reuse existing keys**: `grep_search` the value in translations.ts before adding duplicates.
5. **Arabic translations**: Use your built-in Arabic knowledge. Don't search the web for pharma terms — you already know them.

## 💡 Common Gotcha Patterns

### Pattern: Error messages with template literals
```tsx
// BEFORE:
const errorMsg = language === 'AR'
  ? `خطأ: لا يمكن استرجاع مبلغ أكبر من ${formatCurrency(limit)}`
  : `Error: Cannot refund more than ${formatCurrency(limit)}`;

// AFTER (use interpolation in translation):
// In translations.ts:
//   EN: pharmacistRefundLimit: 'Cannot refund more than {{limit}} per invoice. Manager approval required.'
//   AR: pharmacistRefundLimit: 'لا يمكن استرجاع مبلغ أكبر من {{limit}} في العملية الواحدة. يرجى طلب موافقة المدير.'
// In component:
const errorMsg = t.returns.validation.pharmacistRefundLimit.replace('{{limit}}', formatCurrency(limit));
```

### Pattern: Conditional plurals
```tsx
// BEFORE:
{qty === 1 ? 'unit' : 'units'}

// AFTER:
{qty === 1 ? t.returns.unit : t.returns.units}
// (make sure both keys exist in translations.ts)
```

### Pattern: Multi-value ternary chains
```tsx
// BEFORE:
{status === 'active' ? (language === 'AR' ? 'نشط' : 'Active') : (language === 'AR' ? 'غير نشط' : 'Inactive')}

// AFTER:
{status === 'active' ? t.common.active : t.common.inactive}
// (reuse existing common keys when possible)
```

---

## 🧬 Phase 4: EVOLVE (Self-Improvement Engine)

After **every** hunt (Phase 3), execute Phase 4 automatically. This is what makes the skill get smarter over time.

### Memory System

The skill maintains a persistent memory file at:

```
.agent/skills/translation-hunter/memory/hunt-ledger.json
```

#### Ledger Schema

```jsonc
{
  "version": 2,
  "lastUpdated": "2026-05-09T17:50:00Z",
  "totalRuns": 14,
  "stats": {
    "totalViolationsFound": 247,
    "totalFixed": 189,
    "totalSkipped": 58,
    "totalFalsePositives": 12,
    "totalKeysAdded": 156
  },

  // 🧠 PATTERN EVOLUTION — tracks regex effectiveness
  "patterns": {
    "P1_ternary":       { "hits": 120, "falsePositives": 2,  "precision": 0.98 },
    "P2_fallback":      { "hits": 89,  "falsePositives": 8,  "precision": 0.91 },
    "P3_raw_arabic":    { "hits": 34,  "falsePositives": 15, "precision": 0.56 },
    "P4_attributes":    { "hits": 22,  "falsePositives": 5,  "precision": 0.77 },
    "P5_jsx_text":      { "hits": 18,  "falsePositives": 28, "precision": 0.39 },
    // Dynamically discovered patterns get added here:
    "P6_template_lit":  { "hits": 11,  "falsePositives": 0,  "precision": 1.0, "addedOn": "2026-05-09", "regex": "language\\s*===\\s*'AR'\\s*\\?\\s*`" }
  },

  // 🚫 EVOLVED SKIP LIST — learned from false positives
  "learnedSkips": [
    "QZ Tray",          // hardware brand name, not translatable
    "EGP",              // currency code, keep as-is
    "MMYY",             // date format pattern
    "toISOString",      // API method, not UI
    "sellable",         // enum value, not UI text
    "localStorage",     // API, not UI
    "console.",         // logging
    "import ",          // import statements
    ".slice(",          // string operations
    ".replace("         // string operations
  ],

  // 🔑 KEY REUSE INDEX — most commonly reused translation keys
  "hotKeys": {
    "common.close":    12,    // reused 12 times across files
    "common.save":     9,
    "common.cancel":   8,
    "common.delete":   7,
    "common.edit":     6,
    "common.loading":  5
  },

  // 📁 FILE SCAN HISTORY — prevents redundant re-scans
  "scannedFiles": {
    "components/sales/ReturnModal.tsx": { 
      "lastScan": "2026-05-09", 
      "violations": 8, 
      "fixed": 8, 
      "clean": true,
      "tokensConsumed": 1450   // 🪙 TRACKS PER-FILE COST
    },
    "components/settings/BranchSettings.tsx": { "lastScan": "2026-05-09", "violations": 52, "fixed": 40, "clean": false }
  },

  // 🆕 DISCOVERED PATTERNS — new patterns found during hunts
  "pendingPatterns": [
    {
      "description": "Template literal ternaries with backticks",
      "regex": "language\\s*===\\s*'AR'\\s*\\?\\s*`",
      "discoveredIn": "ReturnModal.tsx",
      "sampleMatch": "language === 'AR' ? `خطأ: ${msg}` : `Error: ${msg}`",
      "occurrences": 6,
      "promoted": false
    }
  ]
}
```

### Step 4A: Update Stats

After each hunt, update the ledger:

```
1. Increment totalRuns
2. Add violations found/fixed/skipped to running totals
3. Update per-pattern hit counts
4. Mark scanned files with timestamp and clean/dirty status
```

### Step 4B: Detect False Positives (Auto-Calibration)

During Phase 1 triage, when you **skip** a grep result because it's not a real violation:

1. **Log the false positive** against the pattern that caught it.
2. **Recalculate precision** for that pattern: `precision = hits / (hits + falsePositives)`
3. **If precision < 0.40** → Mark pattern as ⚠️ LOW CONFIDENCE in the next report.
4. **If precision < 0.20 for 3+ runs** → Auto-retire the pattern (move to `retiredPatterns` array, stop running it).

```
Example: Pattern P5 (JSX text content) catches too many false positives 
like icon names and CSS class strings:
  precision = 18 / (18 + 28) = 0.39 → ⚠️ LOW CONFIDENCE
  → Next run: skip P5 unless user explicitly requests "deep scan"
```

### Step 4C: Discover New Patterns

During the hunt, if you notice a hardcoded string that **none of the 5 patterns caught**, do this:

1. **Extract the pattern** — what regex would catch it?
2. **Add to `pendingPatterns`** in the ledger with:
   - The regex
   - The file where it was discovered
   - A sample match
   - Occurrence count
3. **After 3+ occurrences** across different files → **Promote** to the main pattern list:
   - Add it to Phase 1B's grep queries as `PATTERN 6+`
   - Update this SKILL.md file directly (add the new pattern to Step 1B)

```
Promotion flow:
  pendingPatterns → 3+ occurrences → promoted: true → added to SKILL.md Phase 1B
```

### Step 4D: Build Hot Keys Index

Track which translation keys are reused most frequently:

1. Every time an existing key is reused (instead of creating a new one), increment its count in `hotKeys`.
2. **Top 10 hot keys** are displayed at the start of each hunt to remind the AI to check these first.
3. Reduces duplicate key creation by **~30%**.

### Step 4E: Smart Re-scan (Dirt Tracking)

The `scannedFiles` map tracks which files are "clean" (all violations fixed) vs "dirty":

- **Clean file** → Skip in full sweeps unless file was modified since last scan.
- **Dirty file** → Prioritize in the next sweep.
- **New file** (not in ledger) → Always scan.

```
On "hunt all hardcoded strings":
  1. Read scannedFiles from ledger
  2. Get file modification dates (via list_dir)
  3. Skip clean files that haven't changed
  4. Scan dirty + new + modified files only
  → Saves 40-70% of tokens on repeat sweeps
```

### Step 4F: Self-Update SKILL.md

When a pattern is **promoted** (Step 4C) or **retired** (Step 4B), the skill **edits its own SKILL.md**:

1. **Promoted pattern**: Add a new `// PATTERN N:` block to Phase 1B.
2. **Retired pattern**: Add `// [RETIRED]` annotation to the pattern and move it to a "Retired Patterns" section.
3. **New skip entry**: If a term causes 3+ false positives, add it to the Skip List in Phase 1C.

> ⚠️ **Self-edit safety**: Only modify sections marked with structured comments (`// PATTERN N:`, `### Skip List`). Never touch Golden Rules or Architecture Reference.

### Step 4G: Evolution Report

At the end of Phase 4, append this to the Phase 3 report:

```markdown
### 🧬 Evolution Update

| Metric | Before | After | Δ |
|--------|--------|-------|---|
| Total Violations Fixed | 181 | 189 | +8 |
| Pattern P3 Precision | 0.60 | 0.56 | -0.04 ⚠️ |
| Hot Keys Indexed | 8 | 10 | +2 |
| Files Clean | 5/12 | 6/12 | +1 |

**New Pattern Discovered**: Template literal ternaries (6 occurrences) — needs 3 more to promote.
**Skip List Updated**: Added "QZ Tray" (hardware brand, 3 false positives).
```

---

## 🧰 Ledger Operations Quick Reference

| When | Do |
|------|-----|
| **First ever run** | Create `memory/hunt-ledger.json` with empty stats |
| **Each hunt start** | Read ledger → load hotKeys, skip clean files |
| **Each grep result triaged** | Update pattern hit/falsePositive counts |
| **Each key reused** | Increment hotKeys counter |
| **Each file completed** | Update scannedFiles with status |
| **New unknown pattern found** | Add to pendingPatterns |
| **Pattern hits 3+ files** | Promote → edit SKILL.md Phase 1B |
| **Pattern precision < 0.20** | Retire → edit SKILL.md, stop running |
| **Hunt complete** | Write updated ledger, append evolution report |

---

## Invocation Examples

User says | Action
----------|--------
"scan ReturnModal.tsx" | Phase 1 on that file → Phase 2 → Phase 3 → Phase 4 (evolve)
"صيد الترجمة في كل ملفات sales" | Phase 1 on `components/sales/` → Phase 2 → Phase 3 → Phase 4
"hunt all hardcoded strings" | Phase 1 full sweep (skip clean files via ledger) → report only → Phase 4
"fix line 171 in ReturnModal" | Skip Phase 1, go straight to Phase 2 for that specific line → Phase 4
"deep scan" | Run ALL patterns including low-confidence/retired ones → full report → Phase 4
"show hunt stats" | Just read and display the ledger — no scanning
"evolve" / "تطوير السكيل" | Force Phase 4: recalculate all precisions, promote pending patterns, clean ledger
