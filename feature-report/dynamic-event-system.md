# Dynamic Event System 🚀

The **Dynamic Event System** is a sophisticated infrastructure designed for **PharmaFlow AI** to manage time-bound visual effects and interactive experiences automatically.

---

## 1. Directory of this Feature
Below are the files that make up this system:

| File Path | Description |
|-----------|-------------|
| `utils/events/dynamicEvents.ts` | **Configuration**: Centralized list of all events (Dates, Cursors, Targeting Rules). |
| `utils/events/eventManager.ts` | **Logic Engine**: Filters and resolves active events based on complex context. |
| `components/layout/DynamicEventLayer.tsx` | **Global UI Component**: Applies side-effects (e.g., CSS injections) globally. |
| `components/layout/MainLayout.tsx` | **Integration**: Where the event layer is mounted. |
| `index.css` | **Styling**: Defines global CSS variables for the system. |

---

## 2. Granular Targeting Scenarios
This system supports highly specific scenarios to ensure the right effect reaches the right user at the right time.

### A. Specific Employee/User
You can reward a specific top-performing employee with a custom "Money" cursor or badge by targeting their `Employee ID`.
```typescript
targetEmployees: ['EMP-9921'], // Only for Mr. X
```

### B. Specific Branch or Organization
Perfect for regional holidays or organization-wide celebrations.
```typescript
targetBranches: ['CAIRO-MAIN-01'], 
targetOrgs: ['AL-NOUR-GROUP'],
```

### C. Component-Level Targeting
Instead of changing the cursor for the whole page, you can target specific elements inside a page.
```typescript
targetSelector: '.navbar',        // Only in Navbar
targetSelector: '.pos-cart-item', // Only when hovering over items in the cart
```

### D. Advanced Condition Logic
The system supports a `condition` function for logic that depends on live data (e.g., "Active only if the user has completed 10 sales today").

---

## 3. How to Add a New Scenario
1. Open `utils/events/dynamicEvents.ts`.
2. Define your event with the required targeting fields:

```typescript
{
  id: 'anniversary-cairo-branch',
  type: 'CURSOR',
  payload: '/assets/party-cursor.png',
  startDate: '2026-05-10T00:00:00Z',
  endDate: '2026-05-12T23:59:59Z',
  targetBranches: ['B-001'],    // Targeted Branch
  targetSelector: '.header',     // Targeted Component
  priority: 100
}
```

---

## 4. Future Extensibility
The architecture is ready to handle:
- **ANIMATIONS**: Lottie files triggered by specific user actions or dates.
- **WIDGETS**: Custom components that mount/unmount based on these dynamic rules.
- **REMOTE UPDATES**: The system is prepared to fetch these JSON rules from a database in the future.

---

**Prepared by Antigravity for the PharmaFlow AI Project.**
