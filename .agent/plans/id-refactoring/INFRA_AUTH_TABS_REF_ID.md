# Refactoring Plan: Employees, Auth & Session Tabs

## 1. Current State (Gaps)

- **Employee Matching:** Some audit logs and "sold by" fields rely on string names. If a manager fixes a typo in an employee's name, their performance history "breaks."
- **POS Tabs:** High-frequency operations (opening/closing tabs) sometimes use arrays indexes which can be unstable if multiple tabs are closed in quick succession.

## 2. Strategic Shift

- **EMP-ID Authority:** Use the the `employeeId` GUID for ALL relational tracking (Sales, Voids, Adjustments, Logins).
- **Tab Stabilization:** Every POS Tab MUST be identified by a GUID generated at creation. UI operations (switching, deleting, updating) should strictly search by `tab.id`.

## 3. Implementation Steps

1. **Refactor `useAuthenticatedData`:** Ensure it returns the `currentEmployeeId` as the primary identifier, not just the names or roles.
2. **Tab Logic Cleanup:** In `usePOSTabs.ts`, replace all `.index` logic with `.find(t => t.id === activeTabId)`.
3. **Permission Scaling:** Map permissions (`canPerformAction`) to the `employeeId` / `role` combination. Ensure the `employeeId` is the key in the RBAC cache.

## 4. Expected Outcome

- Rock-solid session management in the POS.
- Accurate, permanent audit trails for every modification in the system.
- Zero-bug multi-tab experience, regardless of the order of creation or deletion.
