# Simplified Customer History Page Implementation Plan

## Overview

Refactor the Customer History page to be a clean, data-focused view containing only the page title, a search bar, and a table of transactions. Profile cards, statistics, and complex tabs will be removed.

## Features (Simplified)

1.  **Page Title**: "Customer History" / "سجل العميل".
2.  **Unified Search**: A search bar that filters the transaction list by Customer Name, Code, Phone, or Invoice ID.
3.  **Transaction Table**: A single table (or simplified tabs) showing all sales and returns for the selected customer.

## Changes to `CustomerHistory.tsx`

- **[DELETE]**: Profile Card (the large gradient box).
- **[DELETE]**: Stats Badges (Visit count, Spent, Points).
- **[MODIFY]**: Search bar implementation to be more integrated with the table.
- **[MODIFY]**: Layout to be more compact, focusing on the `TanStackTable`.

## UI Structure

1.  **Header**: Title and Subtitle only.
2.  **Search Input**: Prominent search bar above the table.
3.  **Data Area**:
    - If no customer is searched/selected: Show an empty state with a search prompt.
    - If customer is selected: Show their specific transaction table with tabs for Invoices and Returns for better organization.

## Implementation Steps

1.  Strip out the decorative profile card and stats logic from `CustomerHistory.tsx`.
2.  Maintain the `SegmentedControl` for switching between Invoices and Returns as it keeps the table clean.
3.  Ensure the "Search" functionality remains powerful (searching name/code/phone).
4.  Remove all stats calculation logic to keep the component lightweight.
