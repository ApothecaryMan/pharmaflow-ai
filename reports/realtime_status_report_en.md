# Supabase Real-time Replication Report
Report Date: 2026-04-28

## 📱 Live Enabled UI Pages (Automatic Updates)
These specific pages update instantly without requiring a manual refresh:

1.  **Cash Register & Shifts Dashboard**: Live monitoring of drawer balance, cash sales, and all cash-in/out movements.
2.  **Sales Real-time Monitor**: Instant visibility of sales invoices and returns as they happen at the counter.
3.  **Inventory & Products List**: Automatic updates of stock levels and pricing during sales or modifications.

---

## 🟢 Technical Database Tables (Replicated)
| Table | Related Page | Status |
| :--- | :--- | :--- |
| `shifts` | Cash Register | Active ✅ |
| `cash_transactions` | Cash Register | Active ✅ |
| `sales` | Real-time Monitor | Active ✅ |
| `returns` | Real-time Monitor | Active ✅ |
| `drugs` | Inventory | Active ✅ |

---

## 🔴 Static Pages (Manual Refresh Required)
*   **Purchases & Invoices**
*   **Suppliers Records**
*   **Employee Management**

---
*Report generated automatically by Antigravity AI*
