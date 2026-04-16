# ZINC - Smart Pharmacy Management System built with React, TypeScript, and Tailwind CSS.

<!-- OLD **Live Demo:** [pharmaflow-ai.netlify.app](https://pharmaflow-ai.netlify.app) -->

**Live Demo:** [zinc.netlify.app](https://zinc.netlify.app)

---

## ✨ Features

- **Point of Sale (POS)**: Multi-tab system, barcode scanning, customer lookup
- **Inventory Management**: Stock tracking, expiry alerts, batch management
- **Sales & Returns**: Complete sales history, return processing, receipt printing
- **Cash Register**: Shift management, cash reconciliation
- **Dashboard**: Real-time sales monitoring, analytics, top products
- **Customer Management**: Customer directory, VIP tracking
- **AI Assistant**: Gemini-powered assistant (optional)
- **Fully Bilingual**: Complete EN/AR support with RTL

---

## 🚀 Quick Start

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Environment Variables:** Set `GEMINI_API_KEY` in `.env.local` for AI features.

---

## 📂 Project Structure

```
zinc/
├── components/          # React components (organized by module)
│   ├── common/          # Shared UI (SmartInputs, SegmentedControl, Switch, etc.)
│   ├── layout/          # Navigation (Navbar, Sidebar, TabBar)
│   ├── dashboard/       # Dashboard views
│   ├── sales/           # POS, CashRegister, SalesHistory
│   ├── inventory/       # Inventory management
│   ├── purchases/       # Purchase orders
│   └── customers/       # Customer directory
├── services/            # Backend service layer
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
├── data/                # Static data (locations, categories)
├── config/              # App configuration (menu, page registry)
├── i18n/                # Translations (EN + AR)
└── types/               # TypeScript definitions
```

---

## ⚠️ Development Rules

### 1. Use Standard Components

| Component          | Use For                       |
| ------------------ | ----------------------------- |
| `SmartInputs`      | All text inputs (handles RTL) |
| `FilterDropdown`   | Dropdown selections           |
| `SegmentedControl` | Segmented buttons             |
| `Switch`           | Toggle switches               |
| `TanStackTable`    | Data tables                   |

**Forbidden:** Native `<select>`, raw `<input>`, HTML `<table>`.

### 2. Internationalization

All text MUST be in `i18n/translations.ts` with both EN and AR.

### 3. iOS Safari Compatibility

Buttons with explicit dimensions need:

```tsx
style={{ WebkitAppearance: 'none', appearance: 'none' }}
```

---

## 📚 Documentation

- **[Contributing Guidelines](CONTRIBUTING.md)** - Full development standards
- **[Theme Guide](THEME_GUIDE.md)** - Color and styling guide
- **[Type Definitions](types/index.ts)** - TypeScript types

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS (local build, not CDN)
- **State**: Props-based (App.tsx as central store)
- **Tables**: TanStack Table
- **Drag & Drop**: dnd-kit
- **Icons**: Material Symbols
- **Build**: Vite

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before making changes.

**Quick Checklist:**

1. Use standard components (no raw HTML)
2. Add translations (EN + AR)
3. Test in RTL mode
4. Run `npm run lint` before committing

---

**Built with ❤️ for modern pharmacy management**
