# Precise Surgical Code Editing Skill

Procedural knowledge for making highly accurate code modifications when structured editing tools (like `replace_file_content`) fail due to whitespace mismatches, hidden characters, or complex indentation.

## Triggering Condition
Use this skill ONLY after **two consecutive failures** of standard structured editing tools for the same block of code, or when `cat -A` reveals inconsistent mixing of tabs and spaces.

## Guidelines

### 1. Diagnostic Phase (The "X-Ray")
Before attempting a fix, identify exactly what the file "sees":
- Execute: `grep -n "target_text" path | cat -A`
- **What to look for**:
  - `^I`: Hidden tab characters.
  - `$`: Line endings (check for trailing spaces before the `$`).
  - Count leading spaces exactly.

### 2. Surgical Modification (The "Scalpel")
#### A. Using Shell `sed`
- **Delimiter Selection**: If the code contains `/` (paths or divisions), use `#`, `|`, or `@` as delimiters.
  - *Example*: `sed -i 's#path/to/file#new/path#g' file.ts`
- **Escaping**: Escape special regex characters `[`, `]`, `.`, `*`, `^`, `$` if they are part of the literal string.
- **Scope**: Keep the search string as short as possible but unique enough to avoid global collateral damage.

#### B. Fallback Strategy (Python One-Liner)
If `sed` fails or the replacement is multi-line/complex, use Python. It handles quotes and special characters more robustly than `sed`.
- *Example*:
  ```bash
  python3 -c "import sys; content = open('file.ts').read(); print(content.replace('old_text', 'new_text'), end='')" > file.ts.tmp && mv file.ts.tmp file.ts
  ```

### 3. Verification & Safety
- **Visual Check**: `grep -nC 2 "modified_text" path`
- **Type Safety**: ALWAYS run `npx tsc --noEmit` (if applicable) after a surgical edit to catch syntax errors or accidental deletions.

## Complex Example Scenarios

### Case: Path Replacement with Delimiter
- **Scenario**: Replacing a URL or file path.
- **Action**: `sed -i 's#https://old-api.com/v1#https://new-api.com/v2#g' config.ts`

### Case: Multi-line / Complex Quotes (Python Fallback)
- **Scenario**: Replacing a React prop that spans multiple lines or has nested quotes.
- **Action**:
  ```bash
  python3 -c "
  old = '''onConfirm={(d) => {\n    onProcessReturn(d);\n    onClose();\n  }}'''
  new = '''onConfirm={async (d) => {\n    await onProcessReturn(d);\n    onClose();\n  }}'''
  with open('Modal.tsx', 'r') as f:
      content = f.read()
  with open('Modal.tsx', 'w') as f:
      f.write(content.replace(old, new))
  "
  ```
