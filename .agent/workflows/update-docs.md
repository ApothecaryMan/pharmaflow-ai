---
description: Update CONTRIBUTING.md when adding new files or exported functions.
---

# Documentation Update Workflow

This workflow ensures `CONTRIBUTING.md` stays up-to-date whenever code changes are made.

## When to Trigger

Run this workflow when you:

1. **Add a new file** (component, hook, utility, etc.)
2. **Add a new exported function/component** to an existing file
3. **Delete or rename** a file or exported function

## Steps

### 1. Open CONTRIBUTING.md

Find the `## 📂 Project Structure` section.

### 2. For New Files

Add the file in the correct folder location in the tree:

```
│   ├── inventory/
│   │   ├── Inventory.tsx
│   │   ├── NewFile.tsx          # <-- ADD HERE with description
```

### 3. For New Exported Functions

Add the function under the file it belongs to:

```
│   │   ├── SmartInputs.tsx
│   │   │   ├── useSmartDirection()
│   │   │   ├── newFunction()    # <-- ADD HERE with description
```

### 4. For Deletions/Renames

- Remove or update the corresponding line in the tree.

## Naming Conventions

- **Functions:** `functionName()` with trailing `()`
- **Components:** `ComponentName` (no parentheses)
- **Comments:** Brief description after `#`, e.g., `# Validates email`

## Verification

- [ ] Did you add/update the file in `CONTRIBUTING.md`?
- [ ] Did you add exported functions under the file?
- [ ] Did you remove deleted items?
