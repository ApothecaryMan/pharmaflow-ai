# Contributing to PharmaFlow AI

## � Project Structure

```
pharmaflow-ai/
├── components/
│   ├── common/         # Shared UI (Toast, DatePicker, HelpModal, etc.)
│   ├── layout/         # Navigation (Navbar, Sidebar, TabBar)
│   ├── dashboard/      # Dashboard pages
│   ├── sales/          # POS, SalesHistory, CashRegister
│   ├── inventory/      # Inventory, BarcodeStudio
│   ├── purchases/      # Purchases, Suppliers
│   ├── customers/      # CustomerManagement
│   └── ai/             # AI Assistant
├── services/           # Backend service layer
│   ├── api/            # API client (mock/real)
│   ├── inventory/      # Inventory CRUD
│   ├── sales/          # Sales transactions
│   ├── customers/      # Customer management
│   ├── purchases/      # Purchase orders
│   └── ...
├── config/             # menuData.ts, pageRegistry.ts
├── i18n/               # translations.ts, menuTranslations.ts, helpInstructions.ts
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── types/              # TypeScript types
```

---

## 🚨 Mandatory Standards

### Mandatory Internationalization (i18n)

**RULE:** All user-facing text MUST be internationalized.
**AR (Arabic) translation is MANDATORY for every new key.**

#### Translation Files Location
```
i18n/
├── translations.ts       # Main UI text (buttons, labels, messages)
├── menuTranslations.ts   # Sidebar/navigation menu items
└── helpInstructions.ts   # Help modal content
```

#### How to Add Translations

```typescript
// ✅ CORRECT - In i18n/translations.ts
export const TRANSLATIONS = {
  EN: {
    myNewFeature: {
      title: "New Feature",
      description: "This is a new feature"
    }
  },
  AR: {
    myNewFeature: {
      title: "ميزة جديدة",
      description: "هذه ميزة جديدة"
    }
  }
};

// ✅ Usage in component
const t = TRANSLATIONS[language];
<h1>{t.myNewFeature.title}</h1>
```

#### FORBIDDEN
- ❌ Hardcoded English: `<span>Hello</span>`
- ❌ Adding EN key without AR: `EN: { key: "..." }` without `AR: { key: "..." }`
- ❌ Using template literals for user text: `` `Hello ${name}` ``

#### What MUST Be Translated

**ALL user-facing text including:**
- ✅ **Page titles and subtitles**
- ✅ **Button labels** (Save, Cancel, Delete, Confirm, etc.)
- ✅ **Form labels** (Name, Email, Phone, Address, etc.)
- ✅ **Input placeholders** (Search..., Enter name..., etc.)
- ✅ **Modal/Dialog titles and content** (Confirm Delete?, Are you sure?, etc.)
- ✅ **Window titles** (Edit Supplier, Purchase Order Details, etc.)
- ✅ **Table headers** (ID, Name, Date, Total, Action, etc.)
- ✅ **Status labels** (Pending, Completed, Rejected, Active, etc.)
- ✅ **Empty states** (No results found, All caught up!, etc.)
- ✅ **Error/Success messages** (Saved successfully, Please fill required fields, etc.)
- ✅ **Tooltips and help text**
- ✅ **Context menu items** (View Details, Edit, Delete, Copy, etc.)
- ✅ **Subpage content** (History views, Details panels, Settings pages, etc.)
- ✅ **Filter/Sort options** (All, In Stock, Out of Stock, etc.)
- ✅ **Date/Time labels** (From, To, Date, Time, etc.)
- ✅ **Navigation breadcrumbs**
- ✅ **Tab labels**
- ✅ **Alert/Notification text**

**In summary: If a user can see it, it MUST be translated.**

#### Exceptions (NO translation needed)
- IDs, UUIDs, Database Keys
- URLs / Links
- Medical codes (e.g., NDC, ICD-10)
- Console.log / Debug messages
- Email addresses, Phone numbers

---

### Dropdown/Combobox Components

**RULE:** All dropdown/combobox implementations MUST use:
- ✅ `PosDropdown` from `components/common/PosDropdown.tsx`
- ✅ `useExpandingDropdown` from `hooks/useExpandingDropdown.ts`

**FORBIDDEN:**
- ❌ Native HTML `<select>` or `<option>` elements
- ❌ Custom dropdown implementations

---

### Input Fields

**RULE:** For free-text input fields:
- ✅ Use `SmartInput` from `components/common/SmartInput.tsx`
- OR ✅ Use `useSmartDirection` hook

**EXCEPTIONS (Force LTR):** Email, Phone, IDs, URLs, Passwords

---

### Service Layer

**RULE:** Data operations should use the service layer.
- ✅ Import from `services/index.ts`
- ✅ Use async/await patterns

```typescript
import { salesService, inventoryService } from './services';

// ✅ CORRECT
const sales = await salesService.getToday();
await inventoryService.updateStock(id, -5);
```

---

## 📝 Code Review Checklist

Before submitting a PR, ensure:
- [ ] No native `<select>` or `<option>` elements
- [ ] All dropdowns use `PosDropdown`
- [ ] All translations have EN + AR
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Components are in correct directory

---

## 🔍 Pre-commit Checks

```bash
npm run lint          # ESLint
npx tsc --noEmit      # TypeScript
npm run build         # Build verification
```

---

## 🎯 Best Practices

1. **File Location:** Place components in appropriate module folder
2. **Services:** Use service layer for data operations
3. **Imports:** Use barrel exports (`index.ts`)
4. **Consistency:** Follow existing patterns
5. **Types:** Always provide proper TypeScript types

---

## 📚 Resources

- [Dropdown Guide](docs/dropdown-usage.md)
- [Components](components/)
- [Services](services/)
- [Types](types/index.ts)

---

**Thank you for contributing to PharmaFlow AI!** 🎉
