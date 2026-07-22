---
name: translation-hunter
description: Hunts down translation violations in bilingual (EN/AR) apps. Scans for hardcoded language-specific strings, missing AR keys, and inconsistent translation shapes in components and i18n files. Use when reviewing or writing code that displays user-facing text.
risk: safe
---

# Translation Hunter

## Mission

Find and eliminate every hardcoded language-conditional string in components and ensure every translation key exists symmetrically in both `EN` and `AR`.

## Rules

1. **All keys must exist in both EN and AR.** Every key present in one locale must have a corresponding key in the other. Symmetry is enforced.

2. **Types/shape are inferred from EN.** The `EN` locale defines the canonical structure. `AR` must mirror it exactly. No adding or removing keys in one locale without the other.

3. **No hardcoded language-conditional display strings in components.** Do NOT use:
   - `language === 'AR' ? 'نص عربي' : 'English text'`
   - `language === 'EN' ? ...`
   - Any ternary or `if/else` branching on `language` to produce literal display text
   
   Instead, read from the translation object:
   ```ts
   const t = TRANSLATIONS[language]?.sectionName;
   // use: t?.keyName || 'English fallback'
   ```

4. **Fallback string must be in English only.** If a key may be undefined, the `||` fallback must be a single English string — never a language-conditional expression.

5. **Component `t` references must match existing subsections.** All keys used via `t?.keyName` must exist in the targeted subsection of both EN and AR.

## Hunting Checklist

- [ ] Zero `language === 'AR'` or `language === 'EN'` for display text in JSX/component logic
- [ ] All user-facing strings use `t?.keyName` or `TRANSLATIONS[language]?.section?.key`
- [ ] Every key referenced in components exists in both `EN` and `AR` translation objects
- [ ] EN and AR translation objects have identical key structure

## When to Hunt

- Component modified that uses `TRANSLATIONS` or `language` for display
- New translation keys added to `i18n/translations.ts`
- Reviewing a PR/branch with i18n changes
