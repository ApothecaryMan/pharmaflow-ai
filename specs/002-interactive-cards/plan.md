# Implementation Plan: Interactive Theme-Aware Information Cards

**Status**: Draft
**Spec**: [spec.md](./spec.md)

## Technical Context

- **Framework**: React 19 / TypeScript
- **Styling**: Tailwind CSS
- **Design Tokens**: `CARD_BASE`, `CARD_MD` (utils/themeStyles.ts)
- **Component Pattern**: Composition with optional paging state

## Proposed Changes

### UI Components

#### [MODIFY] [InteractiveCard.tsx](file:///home/x1carbon/Projects/HTML/pharmaflow-ai/components/common/InteractiveCard.tsx)
- Integrate `framer-motion` for gesture handling.
- Use `motion.div` for the card container.
- Implement `drag` support (horizontal and vertical).
- Implement `onDragEnd` logic to switch pages based on `offset` and `velocity`.
- Ensure fallback support for navigation dots.

## Verification Plan

### Manual Verification
1.  **Gesture Navigation Test**:
    - Perform quick horizontal and vertical swipes.
    - Verify that the card switches pages.
    - Perform a slow drag and release to verify "snap-back" behavior.
2.  **Momentum Test**:
    - Flick the card quickly to see if it responds to velocity.
