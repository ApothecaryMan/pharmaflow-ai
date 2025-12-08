# Contributing to PharmaFlow AI

## 🚨 Mandatory Standards

### Dropdown/Combobox Components

**RULE:** All dropdown/combobox implementations MUST use:
- ✅ `PosDropdown` component from `utils/PosDropdown.tsx`
- ✅ `useExpandingDropdown` hook from `hooks/useExpandingDropdown.ts`

**FORBIDDEN:**
- ❌ Native HTML `<select>` elements
- ❌ Native HTML `<option>` elements
- ❌ Custom dropdown implementations

**Enforcement:**
- ESLint will **block** commits with native select elements
- Pull requests will be **rejected** if they violate this rule

**Documentation:**
See [`docs/dropdown-usage.md`](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/docs/dropdown-usage.md) for complete usage guide and examples.

---

### Input Fields

**RULE:** For **free-text** input fields (e.g., Names, Addresses, Notes, Descriptions):
- ✅ Use the `SmartInput` component from `utils/SmartInput.tsx`
- OR ✅ explicitly use the `useSmartDirection` hook if you must use a native input or textarea.

**EXCEPTIONS (Force LTR):**
- ❌ Email addresses
- ❌ Phone numbers
- ❌ IDs / Codes / SKUs
- ❌ URL / Links
- ❌ Passwords

**Example:**
```tsx
import { SmartInput } from '../utils/SmartInput';

// ✅ CORRECT
<SmartInput 
  value={name} 
  onChange={e => setName(e.target.value)} 
  placeholder="Enter name (detects Arabic/English automatically)" 
/>

// ❌ INCORRECT (for text that might be Arabic)
<input
  type="text"
  value={name}
  // Missing dir={...} or not using SmartInput
/>
```

---

## 📝 Code Review Checklist

Before submitting a PR, ensure:
- [ ] No native `<select>` or `<option>` elements used
- [ ] All dropdowns use `PosDropdown` component
- [ ] ESLint passes with no errors
- [ ] TypeScript compiles without errors
- [ ] Components follow existing patterns in codebase

---

## 🔍 Pre-commit Checks

Run these commands before committing:

```bash
# Check for ESLint errors
npm run lint

# Type check
npm run type-check

# Build to verify no errors
npm run build
```

---

## 🎯 Best Practices

1. **Consistency:** Follow existing component patterns
2. **Accessibility:** Use provided components that include keyboard navigation
3. **Styling:** Use Tailwind classes and design system colors
4. **TypeScript:** Always provide proper types for generic components
5. **Documentation:** Update docs when adding new features

---

## 📚 Resources

- [Dropdown Usage Guide](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/docs/dropdown-usage.md)
- [Component Examples](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/)
- [Type Definitions](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/types.ts)

---

## ❓ Questions?

If you're unsure about any standard or need clarification:
1. Check existing implementations in the codebase
2. Review the documentation
3. Ask the development team

---

**Thank you for contributing to PharmaFlow AI!** 🎉
