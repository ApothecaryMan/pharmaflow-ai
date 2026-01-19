# Phase 8 Implementation Plan

## 1. Setup & Mocks

- [ ] Create `__mocks__/qz-tray.ts` or inline mock pattern for global `qz` object.
- [ ] Ensure `useLongPress` is mocked if needed for ContextMenu/Table interactions.

## 2. Printer Tests

- [ ] **`utils/qzPrinter.test.ts`**:
  - Test `loadQzTray` (script injection simulation).
  - Test `connect`, `disconnect`, `isConnected`.
  - Test `getPrinters` and `printHTML`.
- [ ] **`hooks/usePrinter.test.ts`**:
  - Test hook state transitions (connecting -> connected).
  - Test auto-connect on mount if enabled.
  - Test settings updates via `updateSettings`.

## 3. UI Tests

- [ ] **`components/common/ContextMenu.test.tsx`**:
  - Render `ContextMenuProvider`.
  - Trigger menu via `useContextMenu`.
  - Verify outside click closes menu.
  - Verify action clicks.
- [ ] **`components/common/TanStackTable.test.tsx`**:
  - Render table with dummy data.
  - Verify headers and rows render.
  - Test sorting (click header).
  - Test Context Menu trigger on header (visibility toggle).

## 4. Verification

- [ ] Run `npm run test` for new files.
- [ ] Update `PROGRESS.md`.
