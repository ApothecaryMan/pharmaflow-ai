# Realtime Unification — Regression Checklist

> **Baseline run**: 2026-07-20  
> **Branch**: `main` (pre-change)  
> **Purpose**: Confirm each phase doesn't break existing behavior.

## Instructions

For each item, perform the action in **Tab A** and confirm the result in **Tab B** without refreshing. Check (y/n) and note any issues.

---

### Sales / Checkout

| # | Action (Tab A) | Expected Result (Tab B) | Pass? | Notes |
|---|---|---|---|---|
| 1 | Complete a POS sale (cash) | SalesHistory shows new sale | | |
| 2 | Complete a POS sale (visa) | SalesHistory shows new sale | | |
| 3 | Complete a POS sale | Inventory stock decreases | | |
| 4 | Complete a POS sale | Dashboard todayRevenue updates (within 5 min) | | |
| 5 | Open SaleDetailModal in Tab A, modify sale in Tab B | Modal updates live | | |
| 6 | Complete a sale with a customer | Customer purchase history updated | | |
| 7 | Complete a sale with a customer | Customer loyalty points reflect | | |

### Sales Returns

| # | Action (Tab A) | Expected Result (Tab B) | Pass? | Notes |
|---|---|---|---|---|
| 8 | Process a partial return | ReturnHistory shows new return | | |
| 9 | Process a full return | Sale status changes to 'returned' in SalesHistory | | |
| 10 | Process a return | Inventory stock increases | | |
| 11 | Process a return | Dashboard refund metrics updated (within 5 min) | | |

### Purchases

| # | Action (Tab A) | Expected Result (Tab B) | Pass? | Notes |
|---|---|---|---|---|
| 12 | Create a purchase order (pending) | PurchaseHistory shows new PO | | |
| 13 | Approve a purchase | PendingApproval queue updated | | |
| 14 | Mark a purchase as received | Inventory stock increases | | |
| 15 | Mark a purchase as received | StockMovementReport shows purchase entry | | |
| 16 | Reject a purchase | Purchase status shows 'rejected' | | |

### Purchase Returns

| # | Action (Tab A) | Expected Result (Tab B) | Pass? | Notes |
|---|---|---|---|---|
| 17 | Create a purchase return | PurchaseReturns list updated | | |
| 18 | Create a purchase return | Inventory stock decreases | | |

### Stock Adjustments

| # | Action (Tab A) | Expected Result (Tab B) | Pass? | Notes |
|---|---|---|---|---|
| 19 | Add stock via StockAdjustment | Inventory stock increases | | |
| 20 | Remove stock via StockAdjustment | Inventory stock decreases | | |
| 21 | Adjust stock | StockMovementReport shows adjustment entry | | |
| 22 | Adjust stock | ShortagesPage updates | | |

### Shifts / Cash

| # | Action (Tab A) | Expected Result (Tab B) | Pass? | Notes |
|---|---|---|---|---|
| 23 | Open a shift | CashRegister shows open shift | | |
| 24 | Close a shift | ShiftHistory shows closed shift | | |
| 25 | Add cash transaction (cash in) | CashRegister balance updates | | |
| 26 | Add cash transaction (cash out) | CashRegister balance updates | | |

### Expenses

| # | Action (Tab A) | Expected Result (Tab B) | Pass? | Notes |
|---|---|---|---|---|
| 27 | Record an expense | ExpenseTracker list updates | | |
| 28 | Record an expense | CashRegister shows expense in shift | | |
| 29 | Delete an expense | ExpenseTracker list updates | | |

### Delivery Orders

| # | Action (Tab A) | Expected Result (Tab B) | Pass? | Notes |
|---|---|---|---|---|
| 30 | Finalize a delivery order | DeliveryOrdersModal status updates | | |
| 31 | Finalize a delivery order | SalesHistory status changes | | |

### Audit

| # | Action (Tab A) | Expected Result (Tab B) | Pass? | Notes |
|---|---|---|---|---|
| 32 | Perform any transaction | AuditPage shows it (may need manual refresh) | | |

### Product CRUD

| # | Action (Tab A) | Expected Result (Tab B) | Pass? | Notes |
|---|---|---|---|---|
| 33 | Add a new product | Inventory list updates | | |
| 34 | Edit a product | Inventory list shows changes | | |
| 35 | Delete a product | Inventory list removes it | | |

### Disconnected / Recovery

| # | Action | Expected Result | Pass? | Notes |
|---|---|---|---|---|
| 36 | Disconnect network for 5s mid-transaction, reconnect | App recovers without manual reload | | |
| 37 | Open 3+ tabs, perform transaction in each | No duplicate rows, no ghost data | | |

---

## Test Execution Log

| Date | Phase | Passed | Failed | Notes |
|---|---|---|---|---|
| 2026-07-20 | Baseline (main) | — | — | Pre-change baseline recorded |
| | | | | |
| | | | | |
