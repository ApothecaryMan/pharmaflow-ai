---
description: Enforce strict Arabic translations and type safety across the project
---

# Enforce Arabic Translations & Strict Typing

This workflow ensures all UI text is translated and strictly typed to prevent runtime errors.

## 1. Strict Typing Rule

**NEVER** use `any` for the `t` prop. Always blindly infer the type from the `TRANSLATIONS` object.

**Incorrect:**

```typescript
interface Props {
  t: any; // ❌ Bad
}
```

**Correct:**

```typescript
import { TRANSLATIONS } from "../../i18n/translations";

interface Props {
  // ✅ Good: Strictly matches the "pos" section of the dictionary
  t: typeof TRANSLATIONS.EN.pos;
}
```

## 2. No Hardcoded Strings

- Scan the file for any hardcoded English strings (e.g., inside `<div>`, `title=""`, `placeholder=""`).
- Replace them with `t.key`.
- If the key doesn't exist, **ADD IT** to `i18n/translations.ts` (both EN and AR).

## 2.1 Verify Keys Before Use (CRITICAL)

Before using a translation key `t.someKey`:

1. **ALWAYS** search `translations.ts` first to confirm the key exists.
2. If key doesn't exist → **Add it to EN and AR sections** before using it in code.
3. **NEVER** assume a key exists based on pattern similarity.

**Safe Pattern (for optional/new keys):**

```tsx
// Use fallback if key might not exist
{
  t.someOptionalKey || "Fallback Text";
}
```

**Preferred Pattern (for required keys):**

```tsx
// Add key to translations.ts FIRST, then use it
{
  t.requiredKey;
}
```

## 3. Mandatory Arabic

- Every new key added to `translations.ts` **MUST** have an Arabic equivalent in the `AR` object.
- **Do not** leave the Arabic value as the English string. Translate it.

## 4. Verification

- After changes, run the TypeScript compiler (or check IDE errors).
- if `t.someKey` shows an error, it means the key is missing from the dictionary. Add it.

## 5. Navbar & Navigation

- When modifying `Navbar.tsx` or any navigation component:
  - Check `menuTranslations.ts` for module names.
  - Check `translations.ts` (under `settings` or `nav`) for UI controls like "Dark Mode", "Theme", "Focus Mode".
- **Conditional Strings:** Pay attention to strings inside ternary operators (e.g., `isOpen ? 'Close' : 'Open'`). These are often missed.
- **Tooltips:** Ensure `title` attributes on buttons are also translated.
