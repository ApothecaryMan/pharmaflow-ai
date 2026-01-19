# Phase 8 Unit Tests Specification

## Goal

Implement unit tests for the remaining advanced utilities and UI components identified in `PROGRESS.md`.

- `utils/qzPrinter.ts`
- `hooks/usePrinter.ts`
- `components/common/ContextMenu.tsx`
- `components/common/TanStackTable.tsx`

## Scope

### 1. Printing Logic (`qzPrinter.ts`, `usePrinter.ts`)

- **Challenge**: These rely on the global `qz` object and WebSocket communication.
- **Strategy**:
  - Full mock of the `qz` global object in `vi`.
  - Test connection states (connected, disconnected, error).
  - Test printer discovery and settings persistence.
  - Test silent print fallback logic.

### 2. UI Components (`ContextMenu.tsx`, `TanStackTable.tsx`)

- **Challenge**: `TanStackTable` is large and relies on `ContextMenu`.
- **Strategy**:
  - **ContextMenu**: Test independently first. Verify visibility toggle, positioning logic (basic), and action execution.
  - **TanStackTable**:
    - Basic rendering with sample data.
    - Sorting interactions.
    - Integration with ContextMenu (right-click headers).
    - Verify column visibility toggles.

## Tech Stack

- Vitest
- React Testing Library
- `vi.mock` for QZ Tray
- `localStorage` mocking for settings persistence.

## Success Criteria

- All 4 files have >80% test coverage.
- Tests pass reliably in CI environment.
- No regression in existing tests.
