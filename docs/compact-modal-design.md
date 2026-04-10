# Hyper-Compact Modal Design Standard

This document outlines the design patterns and technical implementation for **Hyper-Compact Modals** in the PharmaFlow AI application. Use this standard for "Quick Edit" or "Small Form" modals to maximize screen efficiency and maintain a professional, high-density aesthetic.

## 1. Core Principles

- **Efficiency First**: Minimize negative space (padding/margins).
- **Subtle Partitioning**: Use light backgrounds and thin borders instead of large gaps to separate fields.
- **Micro-Typography**: Use very small, bold, uppercase labels for a "technical/professional" look.
- **Component Synergy**: Integrate `SmartInputs` with tailored padding overrides.

---

## 2. Technical Implementation

### Modal Configuration

Always use `size="sm"` (or smaller) and override the default body padding.

```tsx
<Modal
  title="Action Title"
  size="sm"
  bodyClassName="p-1.5" // Essential: overrides default p-5
  icon="your_icon"
  isOpen={...}
  onClose={...}
>
  {/* Content goes here */}
</Modal>
```

### Internal Layout Structure

Group related fields in "Input Cells" using a light background and subtle border.

```tsx
<div className="flex flex-col gap-2"> {/* Main Container Gap */}
  
  {/* Input Cell */}
  <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/50">
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
        Field Label
      </label>
      <SmartInput
        value={...}
        onChange={...}
        className="!py-1.5 text-sm" // Override internal padding
      />
    </div>
  </div>

</div>
```

---

## 3. Design Tokens

| Property | Value | Tailwind Class |
| :--- | :--- | :--- |
| **Modal Body Padding** | 6px | `p-1.5` |
| **Field Group Padding** | 10px | `p-2.5` |
| **Field Group Background** | Light Gray | `bg-zinc-50` / `dark:bg-zinc-900/50` |
| **Label Font Size** | 10px | `text-[10px]` |
| **Label Font Weight** | Black (900) | `font-black` |
| **Label Transform** | Uppercase | `uppercase tracking-widest` |
| **Button Height** | 32px - 36px | `py-1.5` |
| **Button Typography** | XS Black | `text-xs font-black uppercase tracking-widest` |
| **Cancel Button Style** | Minimalist | `bg-transparent border-transparent hover:border-zinc-200 cursor-pointer` |

---

## 4. Usage Guidelines

1. **Vertical Space**: Use `min-h-[60px]` for textareas unless heavy input is expected.
2. **Action Buttons**: Use `flex gap-1.5` for the footer buttons.
3. **Ghost Buttons**: For 'Cancel' or 'Close' actions, use a transparent background that only reveals a border on hover.
4. **Interactive States**: Always use `cursor-pointer` for any clickable element to provide clear affordance.
5. **Animations**: Use `transition-all active:scale-95` on buttons for tactile feedback.
6. **Borders**: Always use `border-zinc-100`/`dark:border-zinc-800/50` for field groups to prevent "melting" into the background.
