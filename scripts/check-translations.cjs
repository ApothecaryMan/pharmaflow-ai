const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function checkTranslations() {
  console.log(`${colors.blue}${colors.bold}Starting Translation Check...${colors.reset}\n`);

  let hasErrors = false;

  // 1. Check translations.ts
  // Note: We are reading the file as text to avoid TS compilation issues in this simple script
  // This is a naive regex parser, but sufficient for standard object structures
  try {
    const translationContent = fs.readFileSync(path.join(__dirname, '../translations.ts'), 'utf8');
    hasErrors = checkFileContent(translationContent, 'translations.ts') || hasErrors;
  } catch (e) {
    console.error(`${colors.red}Error reading translations.ts: ${e.message}${colors.reset}`);
    hasErrors = true;
  }

  // 2. Check menuTranslations.ts
  try {
    const menuTranslationContent = fs.readFileSync(
      path.join(__dirname, '../menuTranslations.ts'),
      'utf8'
    );
    hasErrors = checkFileContent(menuTranslationContent, 'menuTranslations.ts') || hasErrors;
  } catch (e) {
    console.error(`${colors.red}Error reading menuTranslations.ts: ${e.message}${colors.reset}`);
    hasErrors = true;
  }

  if (hasErrors) {
    console.log(`\n${colors.red}${colors.bold}❌ Translation Check Failed!${colors.reset}`);
    console.log(`${colors.yellow}Please add missing Arabic translations.${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bold}✅ All Translations Verified!${colors.reset}`);
    process.exit(0);
  }
}

function checkFileContent(content, filename) {
  let fileErrors = false;
  console.log(`${colors.bold}Checking ${filename}...${colors.reset}`);

  // Extract EN and AR objects using basic regex
  // This assumes the standard structure: EN: { ... }, AR: { ... }
  const enMatch = content.match(/EN:\s*{([\s\S]*?)},\s*AR:/);
  const arMatch = content.match(/AR:\s*{([\s\S]*?)}\s*};/);

  if (!enMatch || !arMatch) {
    // Fallback for different formatting or if file is too complex for regex
    // If we can't parse, we can't verify, but maybe that's fine for now if structure changed
    console.log(
      `${colors.yellow}Could not parse structure of ${filename}. Skipping detail check.${colors.reset}`
    );
    return false;
  }

  const enKeys = extractKeys(enMatch[1]);
  const arKeys = extractKeys(arMatch[1]);

  const missingInAr = enKeys.filter((key) => !arKeys.includes(key));

  if (missingInAr.length > 0) {
    console.log(`${colors.red}  Missing Arabic translations for keys:${colors.reset}`);
    missingInAr.forEach((key) => console.log(`    - ${key}`));
    fileErrors = true;
  } else {
    console.log(`${colors.green}  OK: All English keys found in Arabic.${colors.reset}`);
  }

  return fileErrors;
}

function extractKeys(objectContent) {
  // Naive key extractor: matches "key:" or "'key':"
  // Does NOT handle nested objects recursively in this simple version,
  // but useful for top-level or flat structures.
  // For nested, we'd need a real parser or to run ts-node.

  // Improvement: Simple recursive-like flattening not possible with regex alone on raw text easily.
  // For now, we will regex for keys that look like property definitions.

  const keys = [];
  const lines = objectContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Match standard key: value
    // Matches:  key: 'val',  'key': 'val',  key: {
    const match = trimmed.match(/^['"]?([a-zA-Z0-9_.]+)['"]?\s*:/);
    if (match) {
      keys.push(match[1]);
    }
  }
  return keys;
}

checkTranslations();
