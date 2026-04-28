---
name: native-compact-ui
description: Philosophy for building high-performance, RTL-stable, and declarative UI components using Logical CSS Properties, CSS Variables, and direct DOM optimization.
---

# Native & Compact UI Philosophy

This skill defines the "PharmaFlow AI" standard for building UI components that are resilient to language direction (RTL/LTR), performant, and code-efficient.

## Core Principles

1. **Native RTL First**: Use CSS Logical Properties instead of physical ones (Left/Right).
2. **Performance Over Dogma**: Touch the DOM surgically for layout movement instead of relying solely on React state.
3. **Compactness**: Reduce file size by inlining presentational logic and avoiding boilerplate.
4. **Declarative States**: Use Data Attributes and CSS Variables to bridge JavaScript logic and CSS rendering.

## Implementation Pattern

### 1. Logical Properties
Always use direction-agnostic CSS:
- `inset-inline-start` instead of `left` or `right`.
- `margin-inline` instead of `margin-left/right`.
- Tailwind: `ms-`, `ps-`, `start-`, `end-` instead of `ml-`, `pl-`, `left-`, `right-`.

### 2. CSS Variables for State
Move dynamic layout values (position, width, height) to CSS Variables.
```tsx
// Inside update logic
container.style.setProperty('--ind-x', `${calculatedX}px`);
```

### 3. Data Attributes for Animation Control
Use `data-*` attributes on the container to control transitions without React re-renders.
- `data-settled`: `false` during mount/unmount to suppress initial transitions.
- `data-dir-changing`: `true` momentarily during LTR/RTL toggle to prevent sliding across the screen.

### 4. Robust Tracking
Use `ResizeObserver` inside a `useLayoutEffect` to ensure the UI stays synchronized with its container regardless of window resizing or parent layout changes.

## Example (Switch Pattern)
```tsx
<button
  data-checked={checked}
  className="relative ... [--tx:0.25rem] data-[checked=true]:[--tx:1.5rem]"
>
  <span 
    className="absolute ... transition-[inset-inline-start]"
    style={{ insetInlineStart: 'var(--tx)' }}
  />
</button>
```

## When to Use This Skill (Use Cases)

### ✅ Recommended Scenarios
- **Building Reusable UI Components**: Core elements used across the app (e.g., `Tabs`, `Switches`, `Modals`, `Buttons`).
- **Movement & Layout Calculations**: Any logic that involves physical movement, sliding, or dimension tracking.
- **Perfect RTL Stability**: Ensuring zero **"layout shifts"** or **"flash of unstyled content" (FOUC)** when loading or switching languages.
- **High-Performance Controls**: Elements that require instant, 60fps feedback without React re-render overhead.

### ❌ When NOT to Use (Avoid Over-engineering)
- **Business Logic & Forms**: Managing form state, API data, or complex business rules (use **Standard React State**).
- **Static Content**: Simple text/image layouts with no movement (use **Standard Tailwind Logical Properties**).
- **Rapid Prototyping**: One-off features where speed of development is more important than perfect performance.
- **Cross-Platform Sharing**: Codebases that must run on **React Native** (which lacks the Web DOM).

## Anti-Patterns to Avoid
- ❌ Hardcoding `rtl:right-0` and `ltr:left-0`.
- ❌ Using `translate-x-[20px]` where the value depends on direction.
- ❌ Animating `all` instead of specific properties like `inset-inline-start`.
- ❌ Using React state to store pixel values for CSS transforms.
- ❌ Manipulating the DOM for data-heavy logic (e.g., trying to render a list of 100 items via direct DOM manipulation).
