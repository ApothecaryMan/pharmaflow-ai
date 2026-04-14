# Nested Border Radius Standards

To achieve a professional and harmonious UI in the Phosphorus project, we follow the mathematical principle for nesting rounded elements (e.g., a button inside a container).

## The Core Principle

> **Outer Radius = Inner Radius + Padding**

When components are nested, the curves must be parallel to avoid visual "clash" or awkward "distortion" where the inner element feels too sharp or too round for its container.

### Visual Comparison

| Correct (Parallel Curves) | Incorrect (Clashing Curves) |
| :--- | :--- |
| **Formula:** $R_{outer} = R_{inner} + Padding$ | **Issue:** $R_{outer} = R_{inner}$ |
| Curves feel fluid and natural. | Curves feel disconnected or "pinched". |

## Implementation in Tailwind CSS

When implementing this, choose standard Tailwind spacing values and round them to the nearest radius token.

### Standard Combinations (Based on `h-12` standard)

| Outer Container | Outer Radius | Inner Element | Inner Radius | Required Padding |
| :--- | :--- | :--- | :--- | :--- |
| **Large Search/Card** | `rounded-3xl` (24px) | **Filter Box** | `rounded-2xl` (16px) | `p-2` (8px) |
| **Standard Input** | `rounded-2xl` (16px) | **Small Button** | `rounded-lg` (8px) | `p-2` (8px) |
| **Compact Pill** | `rounded-xl` (12px) | **Icon** | `rounded-md` (6px) | `p-1.5` (6px) |

## Example Case: `SearchInput`

In the `SearchInput` component, we use an `h-12` wrapper to allow for mathematically perfect nesting:

1.  **Wrapper Height**: `h-12` (48px)
2.  **Inner Group Height**: `h-8` (32px)
3.  **Calculated Padding**: $(48 - 32) / 2 = 8px$ (`p-2`)
4.  **Radii Choice**: 
    - Outer: `rounded-3xl` (24px)
    - Inner: `rounded-2xl` (16px)
    - *Verification*: $16px + 8px = 24px$. **Perfect Match.**

## Why this matters
Following this rule ensures that the "negative space" between elements is constant throughout the curve, giving the interface a premium, high-end feel similar to Apple or Vercel design systems.
