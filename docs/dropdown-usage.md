# Dropdown/Combobox Usage Guide

## ⚠️ MANDATORY COMPONENTS

**ALL dropdown/combobox implementations MUST use:**
- ✅ `useFilterDropdown` hook from `hooks/useFilterDropdown.ts`
- ✅ `PosDropdown` component from `components/PosDropdown.tsx`

**FORBIDDEN:**
- ❌ Native `<select>` elements
- ❌ Native `<option>` elements
- ❌ Custom dropdown implementations

ESLint will **block** any code using native select elements.

---

## 📋 Quick Start

### Basic Example

```tsx
import { useState } from 'react';
import { PosDropdown } from './components/PosDropdown';

interface Category {
  id: string;
  name: string;
}

function MyComponent() {
  const categories: Category[] = [
    { id: '1', name: 'Medicine' },
    { id: '2', name: 'General' },
    { id: '3', name: 'Cosmetics' }
  ];

  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(categories[0]);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <PosDropdown
      items={categories}
      selectedItem={selectedCategory}
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      onSelect={(item) => {
        setSelectedCategory(item);
        setIsOpen(false);
      }}
      keyExtractor={(item) => item.id}
      renderSelected={(item) => (
        <span className="text-sm font-medium">
          {item?.name || 'Select Category'}
        </span>
      )}
      renderItem={(item, isSelected) => (
        <span className="text-sm">{item.name}</span>
      )}
      variant="input"
      color="blue"
    />
  );
}
```

---

## 🎨 Variants

### 1. Input Variant (Default for Forms)
```tsx
<PosDropdown
  variant="input"
  // ... other props
/>
```
- Full border and background
- Dropdown arrow indicator
- Best for: Search filters, form fields

### 2. Minimal Variant (Pill Style)
```tsx
<PosDropdown
  variant="minimal"
  transparentIfSingle={true}
  // ... other props
/>
```
- Transparent when only one item
- Compact pill design
- Best for: Grid filters, category pills

---

## 🎯 Props Reference

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | `T[]` | ✅ | Array of items to display |
| `selectedItem` | `T \| undefined` | ✅ | Currently selected item |
| `isOpen` | `boolean` | ✅ | Dropdown open state |
| `onToggle` | `() => void` | ✅ | Toggle dropdown open/closed |
| `onSelect` | `(item: T) => void` | ✅ | Handle item selection |
| `keyExtractor` | `(item: T) => string` | ✅ | Extract unique key from item |
| `renderSelected` | `(item: T \| undefined) => ReactNode` | ✅ | Render selected item display |
| `renderItem` | `(item: T, isSelected: boolean) => ReactNode` | ✅ | Render dropdown item |
| `variant` | `'minimal' \| 'input'` | ❌ | Style variant (default: 'minimal') |
| `color` | `string` | ❌ | Theme color (default: 'blue') |
| `transparentIfSingle` | `boolean` | ❌ | Hide border when 1 item (default: false) |
| `onEnter` | `() => void` | ❌ | Custom Enter key handler |
| `className` | `string` | ❌ | Additional CSS classes |

---

## ⌨️ Keyboard Navigation

The `useFilterDropdown` hook provides full keyboard support:

| Key | Action |
|-----|--------|
| `Space` | Toggle dropdown |
| `Enter` | Select item / Custom action |
| `ArrowDown` | Navigate to next item |
| `ArrowUp` | Navigate to previous item |
| `Escape` | Close dropdown |

---

## 🔧 Advanced Examples

### With Custom Enter Handler
```tsx
<PosDropdown
  // ... other props
  onEnter={() => {
    // Custom action on Enter key
    console.log('Enter pressed!');
  }}
/>
```

### With Custom Styling
```tsx
<PosDropdown
  className="w-64"
  color="green"
  // ... other props
/>
```

### Complex Object Rendering
```tsx
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

<PosDropdown
  items={products}
  keyExtractor={(p) => p.id}
  renderSelected={(p) => (
    <div className="flex items-center gap-2">
      <span className="font-medium">{p?.name || 'Select Product'}</span>
      {p && <span className="text-xs text-gray-500">${p.price}</span>}
    </div>
  )}
  renderItem={(p) => (
    <div className="flex justify-between items-center">
      <span>{p.name}</span>
      <div className="text-xs text-gray-500">
        <span>${p.price}</span>
        <span className="ml-2">Stock: {p.stock}</span>
      </div>
    </div>
  )}
  // ... other props
/>
```

---

## 🚫 Migration from Native Select

### ❌ OLD WAY (Forbidden)
```tsx
<select value={value} onChange={(e) => setValue(e.target.value)}>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>
```

### ✅ NEW WAY (Required)
```tsx
const options = [
  { id: '1', label: 'Option 1' },
  { id: '2', label: 'Option 2' }
];

const [selected, setSelected] = useState(options[0]);
const [isOpen, setIsOpen] = useState(false);

<PosDropdown
  items={options}
  selectedItem={selected}
  isOpen={isOpen}
  onToggle={() => setIsOpen(!isOpen)}
  onSelect={(item) => {
    setSelected(item);
    setIsOpen(false);
  }}
  keyExtractor={(item) => item.id}
  renderSelected={(item) => <span>{item?.label || 'Select'}</span>}
  renderItem={(item) => <span>{item.label}</span>}
  variant="input"
/>
```

---

## 📚 Real-World Examples

See these components for reference:
- [`POS.tsx`](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/POS.tsx) - Category and payment method dropdowns
- [`Purchases.tsx`](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/Purchases.tsx) - Supplier selection
- [`SalesHistory.tsx`](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/SalesHistory.tsx) - Filter dropdowns

---

## ❓ FAQ

**Q: Why can't I use native `<select>`?**  
A: Native selects have inconsistent styling across browsers, poor keyboard navigation, and don't match our design system. `PosDropdown` provides a consistent, accessible, and beautiful experience.

**Q: What if I need a simple dropdown?**  
A: Still use `PosDropdown` with `variant="input"`. It's optimized for all use cases.

**Q: Can I customize the appearance?**  
A: Yes! Use the `className`, `color`, and `variant` props. For deeper customization, modify `PosDropdown.tsx`.

**Q: Does it work with forms?**  
A: Yes! The selected value is controlled via `selectedItem` and `onSelect` props.

---

## 🐛 Troubleshooting

### Dropdown not opening
- Ensure `isOpen` state is properly managed
- Check that `onToggle` updates the state

### Items not displaying
- Verify `items` array is not empty
- Check `keyExtractor` returns unique strings
- Ensure `renderItem` returns valid JSX

### Keyboard navigation not working
- Make sure the dropdown container has `tabIndex={0}`
- This is handled automatically by `PosDropdown`

---

## 📞 Support

For issues or questions:
1. Check existing implementations in the codebase
2. Review this documentation
3. Check ESLint errors for guidance
4. Contact the development team

---

**Remember:** Using `PosDropdown` + `useFilterDropdown` is **mandatory** for all dropdown/combobox needs! 🎯
