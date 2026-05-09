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

## Invocation Examples

User says | Action
----------|--------
"scan ReturnModal.tsx" | Phase 1 on that file → Phase 2 → Phase 3
"صيد الترجمة في كل ملفات sales" | Phase 1 on `components/sales/` → Phase 2 → Phase 3
"hunt all hardcoded strings" | Phase 1 full sweep → report only (no fixes until approved)
"fix line 171 in ReturnModal" | Skip Phase 1, go straight to Phase 2 for that specific line
