# Feature Specification: Interactive Theme-Aware Information Cards

**Feature Branch**: `002-interactive-cards`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "cards as in ShiftHistory.tsx using CARD_BASE as base and same size but have inside and corner dot to switch btw cards data also switched btw theme automatic when change happen if one or one of theme whem more than one"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Paged Card Data Navigation (Priority: P1)

Users can view different sets of data within a single card by navigating through multiple "pages" or "frames" of information. This allows high-density dashboards to remain compact while still providing access to detailed or secondary metrics.

**Why this priority**: Core requirement for the "interactive" nature of the cards.

**Independent Test**: Can be tested by clicking on navigation dots and verifying that the content of the card changes accordingly.

**Acceptance Scenarios**:

1. **Given** a card with 3 sets of data, **When** the user clicks the second navigation dot, **Then** the card content updates to show the second data set.
2. **Given** a card on its last page, **When** no more data sets exist, **Then** no further navigation is possible or the navigation wraps (depending on design).

---

### User Story 2 - Visual Navigation Indicators (Priority: P1)

Users see visual indicators (dots) in the corner/inner area of the card to understand how many pages of data are available and which page they are currently viewing.

**Why this priority**: Essential for discoverability and user orientation.

**Independent Test**: Can be tested by visually inspecting the card for dots and verifying the active dot changes state on navigation.

**Acceptance Scenarios**:

1. **Given** multiple pages of data, **When** the card renders, **Then** navigation dots appear in the specified corner.
2. **Given** the user is on page 2, **When** viewing the dots, **Then** the second dot is visually distinguished as "active".

---

### User Story 3 - Automatic Contextual Theme Switching (Priority: P2)

The card's theme (e.g., color palette, background tint) automatically updates based on the data context currently being displayed. For example, a "Sales" page might use a green theme, while a "Losses" page might use a red theme.

**Why this priority**: Enhances visual feedback and aligns with the user's requirement for "automatic theme switching".

**Independent Test**: Can be tested by navigating between different data pages and verifying that the card's theme properties (colors, borders) change according to the defined context.

**Acceptance Scenarios**:

1. **Given** a card with a "Sales" page (Green) and a "Returns" page (Red), **When** switching from Sales to Returns, **Then** the card theme transition to the Red palette automatically.

---

### User Story 4 - Gesture-Based Momentum Navigation (Priority: P2)

Users can navigate between card data pages using natural swipe/scroll gestures. This includes horizontal and vertical swiping via touch, touchpad, or mouse-drag. The navigation reacts to the velocity of the gesture, allowing users to rapidly flick through cards or move slowly for precision.

**Why this priority**: Enhances the "premium" feel and provides modern interaction patterns.

**Independent Test**: Can be tested by dragging/swiping on the card and verifying that momentum is respected and transitions feel smooth and non-linear.

**Acceptance Scenarios**:

1. **Given** multiple pages, **When** the user performs a high-velocity swipe, **Then** the card switches pages quickly with momentum.
2. **Given** a multi-directional data layout, **When** the user swipes up/down or left/right, **Then** the card navigates according to the gesture direction.
3. **Given** a slow drag, **When** the user releases below a specific threshold, **Then** the card snaps back to the current page.

---

### Edge Cases

- **Single Page Data**: If only one set of data is provided, navigation dots should be hidden.
- **Empty Data Frames**: How does the card handle a "page" with missing or null data? (Should probably show a fallback "No data" state within the card).
- **Rapid Navigation**: Ensure theme transitions feel smooth and don't "flicker" during rapid paging.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cards MUST use `CARD_BASE` from `utils/themeStyles.ts` for their underlying structure and shadow.
- **FR-002**: Cards MUST maintain the same size and padding as the summary cards found in `ShiftHistory.tsx`.
- **FR-003**: System MUST support defining multiple data objects/components per card.
- **FR-004**: Cards MUST render navigation dots in a configurable corner (default: inner corner) to allow switching between data sets.
- **FR-005**: System MUST support mapping specific themes to individual data pages.
- **FR-006**: Cards MUST automatically apply the corresponding theme when its associated data page becomes active.
- **FR-007**: Transitions between themes and data pages MUST be visually smooth (e.g., using CSS transitions).
- **FR-008**: Cards MUST support swipe/scroll gestures (horizontal and vertical) for navigation.
- **FR-009**: Navigation MUST be velocity-aware, adjusting transition speed based on gesture momentum.
- **FR-010**: Cards MUST support mouse-drag as a fallback for non-touch devices.

### Key Entities *(include if feature involves data)*

- **InteractiveCard**: The UI container managing state, navigation, and theme application.
- **CardPageData**: A definition of the content and theme context for a single "frame" of the card.
- **CardTheme**: A set of stylistic properties (background tint, text color, etc.) derived from the application's design system.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Transition between data pages completes in under 300ms.
- **SC-002**: Navigation dots are accessible and respond to user input reliably.
- **SC-003**: 100% of defined theme mappings are correctly applied upon page transition.
- **SC-004**: Gesture recognition responds to swipes with less than 20ms latency.
- **SC-005**: Momentum-based scrolling correctly predicts the target page based on flick velocity.
- **SC-006**: The component is reusable across different modules (Sales, HR, Inventory) without requiring ad-hoc styling.
