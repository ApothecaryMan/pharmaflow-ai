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
import { TRANSLATIONS } from '../../i18n/translations';

interface Props {
  // ✅ Good: Strictly matches the "pos" section of the dictionary
  t: typeof TRANSLATIONS.EN.pos; 
}
```

## 2. No Hardcoded Strings
- Scan the file for any hardcoded English strings (e.g., inside `<div>`, `title=""`, `placeholder=""`).
- Replace them with `t.key`.
- If the key doesn't exist, **ADD IT** to `i18n/translations.ts` (both EN and AR).

## 3. Mandatory Arabic
- Every new key added to `translations.ts` **MUST** have an Arabic equivalent in the `AR` object.
- **Do not** leave the Arabic value as the English string. Translate it.

## 4. Verification
- After changes, run the TypeScript compiler (or check IDE errors).
- if `t.someKey` shows an error, it means the key is missing from the dictionary. Add it.
