---
name: version-management
description: Automated version bumping for ZINC project files
---

# Version Management Skill

Use this skill to quickly and accurately bump the application version across all required files.

## Files Handled

| File | Format |
|---|---|
| `package.json` | Semver (`2.0.70`) |
| `package-lock.json` | Semver |
| `public/version.json` | Semver + release date |
| `public/preflight.js` | Semver constant |
| `src-tauri/tauri.conf.json` | Semver (major.minor.patch) |
| `src-tauri/Cargo.toml` | Semver |

## Version Format

The project uses **semver** (`major.minor.patch`), e.g. `2.0.70`.  
The bump script auto-increments the patch segment and pads it to match the existing digit width.

## Instructions

When the user asks to "raise the version", "bump version", or "تحديث الإصدار", follow these steps:

1. **Run the Automation Script**:
   Instead of manually editing files, run the dedicated bump script:
   ```bash
   npm run bump-version
   ```

2. **Verification**:
   Verify all files were updated by checking:
   ```bash
   grep '"version"' package.json public/version.json src-tauri/tauri.conf.json
   grep '^version' src-tauri/Cargo.toml
   grep 'CURRENT_VERSION' public/preflight.js
   ```

3. **Confirmation**:
   Inform the user that the version has been bumped and mention the new version number.

## Benefits

- **Speed**: Single command updates all 6 files.
- **Consistency**: Prevents version mismatch between `package.json`, `Cargo.toml`, `tauri.conf.json`, and `version.json`.
- **Accuracy**: Automatically updates the `releaseDate` in `version.json`.
- **Safety**: Automatically clears stale user cache on next load via `preflight.js` version detection.
