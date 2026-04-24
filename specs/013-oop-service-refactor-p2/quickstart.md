# Quickstart: OOP Service Refactor - Phase 2

## Development Environment
- **Node.js**: v18+
- **Package Manager**: npm
- **Database**: Supabase (ensure environment variables are set)

## Installation
```bash
npm install
```

## Running the App
```bash
npm run dev
```

## Verifying the Refactor
1. **Entity Management**: Navigate to Customers or Suppliers. Test the unified search and active/inactive toggle.
2. **Analytics**: Check the Dashboard. Ensure top products and revenue charts are populated.
3. **Purchases**: Create a purchase order and set status to "Received". Verify that inventory batches are automatically created in the Inventory section.
4. **Permissions**: Log in with different roles and verify that restricted actions (like deleting a sale) are correctly blocked by the `PermissionsService`.

## Troubleshooting
- If analytics don't load, check the browser console for Supabase aggregation errors.
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correctly configured in `.env.local`.
