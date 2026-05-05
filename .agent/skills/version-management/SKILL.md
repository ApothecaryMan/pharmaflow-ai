---
name: version-management
description: Automated version bumping for ZINC project files
---

# Version Management Skill

Use this skill to quickly and accurately bump the application version across all required files.

## Files Handled
- `package.json`: Main project version.
- `package-lock.json`: Lockfile version and package version.
- `public/version.json`: Frontend version check and release notes.

## Instructions

When the user asks to "raise the version", "bump version", or "تحديث الإصدار", follow these steps:

1. **Run the Automation Script**:
   Instead of manually editing files, run the dedicated bump script:
   ```bash
   npm run bump-version
   ```

2. **Verification**:
   Check the output to ensure all files were updated successfully.

3. **Confirmation**:
   Inform the user that the version has been bumped and mention the new version number.

## Benefits
- **Speed**: Takes less than a second to update all files.
- **Consistency**: Prevents version mismatch between `package.json` and `version.json`.
- **Accuracy**: Automatically updates the `releaseDate` in `version.json`.
- **Safety**: Automatically clears stale `localStorage` for users upon next load due to the version change logic in `index.html`.
