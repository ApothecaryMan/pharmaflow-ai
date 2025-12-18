

# PharmaFlow AI 💊

A modern pharmacy management system built with React and TypeScript.

View your app in AI Studio: https://ai.studio/apps/drive/1wPbz9vbBakTJ9mKgBHCTEqw3ZfXFLxlM

---

## ⚠️ MANDATORY Development Rules

### Dropdown/Combobox Components

**🚨 REQUIRED:** All dropdown/select components MUST use:
- ✅ `PosDropdown` component from `components/PosDropdown.tsx`
- ✅ `useExpandingDropdown` hook from `hooks/useExpandingDropdown.ts`

**❌ FORBIDDEN:**
- Native `<select>` elements
- Native `<option>` elements
- Custom dropdown implementations

**Enforcement:** ESLint will **block** any code violating this rule.

📖 **Complete Guide:** See [`docs/dropdown-usage.md`](docs/dropdown-usage.md)

---

## 🚀 Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Run linter (checks for forbidden patterns):
   ```bash
   npm run lint
   ```

---

## 📚 Documentation

- **[Dropdown Usage Guide](docs/dropdown-usage.md)** - Required reading for all developers
- **[Contributing Guidelines](CONTRIBUTING.md)** - Development standards and rules
- **[Type Definitions](types.ts)** - TypeScript types

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before making changes.

**Key Rules:**
1. Use `PosDropdown` for ALL dropdowns
2. Run ESLint before committing
3. Follow existing code patterns
4. Update documentation when needed

---

**Built with ❤️ for modern pharmacy management**
