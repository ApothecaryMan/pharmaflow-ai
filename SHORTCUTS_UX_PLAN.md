# 🎹 PharmaFlow Pro: Keyboard UX Master Plan

> **Objective:** Transform PharmaFlow into a "Keyboard-First" application where power users (pharmacists) can perform 95% of tasks without touching the mouse. This document outlines the architecture, UX design, and implementation strategy for a professional-grade shortcut system.

---

## 1. UX Philosophy: The "Flow" State

Pharmacists work in a high-pressure, high-speed environment. Every time they reach for the mouse, they lose milliseconds and focus.

- **Consistency:** `Ctrl+S` should always save, whether in Settings, Stock Adjustment, or Receipt Design.
- **Discoverability:** Users shouldn't have to memorize a manual. The UI should _teach_ them shortcuts (e.g., `Save [Ctrl+S]` on buttons).

* **Safety:** Destructive actions (Delete) trigger an **Actionable Alert** (via `AlertContext`) with an **Undo** option. We prefer **Undo** over **Confirmation Modals** for high-velocity tasks (like POS).
* **Internationalization:** We bind to **Physical Keys** (`event.code`), not characters. `Ctrl+S` works whether the keyboard is in English (`S`) or Arabic (`س`).
* **Context-Awareness:** Pressing `Enter` in the Search bar adds an item; pressing `Enter` in a payment modal confirms payment. The system must know "where" the user is.

---

## 2. Technical Architecture

### 2.1 The "Brain": Global Shortcut Registry

We will introduce a central configuration file (`config/keyboardMap.ts`) and a React Context (`ShortcutContext`) to manage the state.

**Core Components:**

1.  **`ShortcutRegistry`**: A singleton or persistent store that holds all defined shortcuts.
1.  **`ShortcutRegistry`**: A singleton or persistent store that holds all defined shortcuts.
1.  **`react-hotkeys-hook`**: We will use this industry-standard library to handle **Bindings, Scoping, and Event Propagation**.
1.  **`useShortcut` Hook**: A wrapper around `useHotkeys` that injects our **Scanner Intelligence** and **Config Lookup**.

### 2.2 Scope Management (The "Layers")

The application usually has multiple "layers" active at once. We need a priority system:

1.  **Modal Level (Highest Priority):** If a modal is open, it captures specific keys (Esc=Close, Enter=Confirm).
2.  **Page Level (Medium Priority):** The active page (POS, Inventory) handles its specific actions (F9=Search, Arrow Keys=Grid).
3.  **Global Level (Lowest Priority):** Always active unless overridden (Ctrl+B=Sidebar, F2-F4=Navigation).

**Conflict Resolution:**
If `Enter` is pressed:

- Is a Modal open? -> Trigger Modal's `onConfirm`.
- If no Modal, is a Dropdown open? -> Select Dropdown Item.
- If no Dropdown, does the Page use Enter? -> Add to Cart (POS).

### 2.3 The Configuration File (`keyboardMap.ts`)

Instead of hardcoding strings like `'F9'` everywhere, we use a structured config object. This handles:

- **Key Definitions:** What physical key is it?
- **Action ID:** Machine-readable name (e.g., `POS_CHECKOUT`).
- **Label:** Human-readable name for UI (e.g., "Checkout").
- **Description:** For the help screen.

```typescript
// Example Structure
export const KEYBOARD_MAP = {
  GLOBAL: {
    TOGGLE_SIDEBAR: { keys: ["ctrl+b"], label: "Toggle Sidebar" },
    NAV_DASHBOARD: { keys: ["f2"], label: "Go to Dashboard" },
    OPEN_COMMAND_PALETTE: {
      keys: ["ctrl+k", "cmd+k"],
      label: "Search Actions",
    },
    SHOW_HELP: { keys: ["shift+?"], label: "Show Shortcuts" },
  },
  POS: {
    FOCUS_SEARCH: { keys: ["f9", "/"], label: "Search Product" },
    CHECKOUT: { keys: ["ctrl+enter"], label: "Complete Sale" },
    NEW_CUSTOMER: { keys: ["alt+c"], label: "Add Customer" },
  },
  // ...
};
```

### 2.4 Barcode Scanner Intelligence 🔌

**Critical Issue:** Most scanners send an `Enter` keystroke after the barcode. If not handled, this could accidentally trigger "Pay" or "Confirm".

**The Solution:** Adaptive Velocity Detection (Auto-Calibration).
Different scanners have different speeds (10ms to 200ms). Hardcoded thresholds fail.

**Logic:**

1.  **Profiles:** define profiles for `FAST` (20ms), `MEDIUM` (50ms), and `SLOW` (100ms+).
2.  **Learning:** If the system detects a pattern (e.g., 13 digits in a burst) multiple times, it **calibrates** to that specific profile.
3.  **Heuristic:**
    - Listen to global buffer.
    - Match against current calibrated profile.
    - If `Enter` is part of a burst -> **Consume as Scan**.
    - Else -> **Pass as User Input**.

### 2.5 Internationalization (Arabic Support) 🌍

**The Trap:** `event.key` changes based on layout. `Ctrl+S` becomes `Ctrl+س` in Arabic, breaking most apps.
**The Fix:** We rely on `event.code` (e.g., `KeyS`), which represents the **Physical Location** of the key.

- **Result:** Shortcuts work instanty without switching language.
  - Else -> **Pass as User Input**.

### 2.6 POS Undo Architecture (Stack-based) 🔄

**Philosophy:** Not just "Last Action", but "Smart Recovery".
**Mechanism:** A `Stack` of actions, not just a single state.

**Logic:**

1.  **Priorities:**
    - `REMOVE` (Priority 10): Always undoable.
    - `QTY_CHANGE` (Priority 5): Undoable.
    - `ADD` (Priority 3): Undoable.
    - `CHECKOUT` (Priority 1): **Irreversible**. Clears the stack.
2.  **Sliding Window:**
    - **Count Limit:** Max 10 actions.
    - **Time Limit:** Automatic expiration after 5 minutes.
3.  **Behavior:** `Ctrl+Z` pops the top of the stack and reverses the delta.

### 2.7 Analytics Telemetry 📊

**Goal:** Optimize UX by tracking what pharmacists _actually_ use.
**Metric:** `SHORTCUT_USAGE` event with properties `{ key, context, result }`.

- **High Usage:** Good! (e.g., F9 is critical).
- **Low Usage:** Problem? (e.g., Maybe users don't know Ctrl+Z exists).
- **Implementation:** The `useShortcut` hook automatically fires a lightweight tracking event on every successful trigger.

---

## 3. Visual UX Features

### 3.1 The "Cheat Sheet" (Show on `?` or `Shift + /`)

A beautiful, glassy modal that appears instantly when the user presses `?`.

- **Dynamic:** It only shows shortcuts relevant to the _current_ page.
- **Categorized:** Grouped by "Navigation", "Actions", "Data Entry".
- **Searchable:** Users can type to find "How do I print?".

### 3.2 Key Tips (Inline Hints)

Instead of hiding shortcuts, we display them subtly on the UI elements they trigger.

- **Buttons:** A button labeled "Save" will have a small `Ctrl+S` badge in the corner or tooltip.
- **Inputs:** Search bars will have a `F9` or `/` icon on the right side.
- **Logic:** These hints dim or disappear when the user is using the mouse, preventing visual clutter.

### 3.3 Command Palette (`Ctrl + K`)

A Spotlight-style search bar that lets users execute _any_ command by typing.

- "Go to Inventory"
- "Create New Shift"
- "Toggle Dark Mode"
- This is the ultimate accessibility feature for power users.

---

## 4. Proposed Shortcut Map

### 🌍 Global (Always Active)

| Key Combination        | Action                                        |
| :--------------------- | :-------------------------------------------- |
| `Ctrl + K` / `Cmd + K` | **Command Palette** (Global Search & Actions) |
| `Shift + ?`            | **Show Shortcut Help**                        |
| `Ctrl + B`             | Toggle Sidebar                                |
| `Ctrl + /`             | Toggle Dark/Light Mode                        |
| `F11`                  | Toggle Fullscreen                             |
| `F2`                   | Navigate: Dashboard                           |
| `F3`                   | Navigate: POS                                 |
| `F4`                   | Navigate: Inventory                           |

### 🛒 Point of Sale (POS)

| Key Combination            | Scope    | Action                                     |
| :------------------------- | :------- | :----------------------------------------- |
| `F9` or `/`                | Search   | Focus Search Bar                           |
| `Ctrl + Enter`             | Cart     | **Checkout / Payment**                     |
| `Alt + S`                  | Cart     | Quick Save / Walk-in                       |
| `Alt + C`                  | Customer | Add/Select Customer                        |
| `Arrow Up/Down`            | List     | Navigate Products or Cart                  |
| `Enter` (on list)          | List     | Add Product to Cart                        |
| `+` / `-`                  | Cart     | Increase/Decrease Quantity                 |
| `Delete`                   | Cart     | Remove Item (Triggers Undo AlertContext)   |
| `Ctrl + Z`                 | Cart     | **Undo Last Action** (Qty Change / Delete) |
| `Shift + Arrow Left/Right` | Tabs     | Cycle Cart Tabs (Next/Prev)                |
| `Ctrl + T`                 | Tabs     | New Cart Tab                               |

### 📦 Inventory & Tables

| Key Combination | Experience | Action                   |
| :-------------- | :--------- | :----------------------- |
| `Ctrl + F`      | Search     | Filter List              |
| `Ctrl + N`      | Actions    | Add New Item             |
| `Ctrl + E`      | Actions    | Export to Excel          |
| `Space`         | Row        | Toggle Row Selection     |
| `Esc`           | Context    | Clear Selection / Search |

### 📝 Forms & Modals

| Key Combination | Action                                         |
| :-------------- | :--------------------------------------------- |
| `Enter`         | **Submit Primary Action** (Save/Login/Confirm) |
| `Ctrl + Enter`  | Submit (TextArea/Multi-line forms)             |
| `Esc`           | **Cancel / Close Modal**                       |
| `Tab`           | Next Field                                     |
| `Shift + Tab`   | Previous Field                                 |

---

## 5. Implementation Roadmap

### Phase 1: Foundation 🏗️

0.  **Install Dependency:** `npm install react-hotkeys-hook`
1.  **Refactor Shortcuts:** Move hardcoded key listeners (currently scattered in `usePosShortcuts`, `useGlobalEventHandlers`, `POS.tsx`) into the new `keyboardMap.ts` config.
2.  **Upgrade `AlertContext`:** Add support for `action` prop (label + callback) to enabling "Undo" buttons in alerts.
3.  **Create `useShortcut` Hook:** A robust wrapper around `useHotkeys` that accepts an action ID (e.g., `POS_CHECKOUT`) and handles Scanner Velocity checks.
4.  **Implement Scanner Detection:** Add velocity-based heuristics to `ShortcutProvider` to swallow "Scanner Enters".

### Phase 2: Visuals ✨

3.  **Build `KeyVisual` Component:** A tiny React component `<KeyCombo keys={['ctrl','k']} />` that renders nice keyboard badges.
4.  **Implement `CheatSheetModal`:** The `?` help screen.
5.  **Update UI:** Add key hints to the POS buttons (Checkout, Search, etc.).

### Phase 3: Advanced 🚀

6.  **Implement Command Palette (`Ctrl+K`):** Build the omni-search interface.
7.  **Scope Management:** Ensure modal shortcuts strictly block page shortcuts behind them.

---

## 6. Current Shortcuts (Reference Only)

### Global Navigation

- **Ctrl + B:** Toggle Sidebar visibility.
- **F2:** Go to Dashboard.
- **F3:** Go to POS (Point of Sale).
- **F4:** Go to Inventory.

### POS (Point of Sale)

- **F9:** Focus the Search Input.
- **Ctrl + Enter:** Trigger Checkout.
- **Alt + S** (or **Alt + س**): Assessment/Walk-in Checkout (conditional).
- **Alphanumeric Keys:** Automatically focus search and start typing (when not in an input).
- **Arrow Up / Down:** Navigate through the Product Table or Cart Items.
- **Enter:** Add the highlighted item from the table to the cart.
- **+ / = / Numpad Add:** Increase quantity of selected cart item.
- **- / \_ / Numpad Subtract:** Decrease quantity of selected cart item.
- **Delete / Backspace:** Remove selected item from cart.

### Inventory & Barcode Printer

- **Alt + P** (or **Alt + ح**): Print Labels (in Barcode Printer queue).
- **Alt + C** (or **Alt + ؤ**): Clear Print Queue.
- **Arrow Up / Down:** Navigate Search Suggestions.
- **Enter:** Add selected suggestion to queue.
- **Escape:** Blur search input or close suggestions.

### Barcode Studio (Label Editor)

- **Ctrl + Z:** Undo last action.
- **Ctrl + Y** (or **Ctrl + Shift + Z**): Redo last action.

### General UI & Forms

- **Tab / Arrow Right:** Accept "Ghost Text" autocomplete suggestion (in Smart Autocomplete fields).
- **Escape**:
  - Reject autocomplete suggestion.
  - Close Modals (Global).
  - Close Mobile Drawer.
  - Cancel Tab Renaming (in POS Tabs).
  - Reset/Cancel Login (in User Info status bar).
- **Enter**:
  - Confirm Cash Register actions (Open/Close Shift, Add/Remove Cash).
  - Create/Save Template Name (in Receipt Designer).
  - Save Tab Rename (in POS Tabs).
  - Submit Login (in User Info status bar).

---

## 7. File Structure

```
pharmaflow-ai/
├── config/
│   └── keyboardMap.ts          # Central shortcut definitions
│
├── hooks/
│   ├── useShortcut.ts          # Core shortcut hook (wraps react-hotkeys-hook)
│   ├── useScannerDetection.ts  # Scanner velocity heuristics
│   └── usePosUndoStack.ts      # Stack-based undo for POS
│
├── components/
│   ├── common/
│   │   ├── ShortcutProvider.tsx    # Global context for scoping
│   │   ├── KeyCombo.tsx            # Visual key badge component
│   │   └── CheatSheetModal.tsx     # Help overlay (Shift+?)
│   │
│   └── features/
│       └── alerts/
│           └── AlertContext.tsx    # Upgraded with 'action' support
│
└── SHORTCUTS_UX_PLAN.md        # This plan document
```
