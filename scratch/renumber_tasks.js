import fs from 'fs';

const filePath = '/home/x1carbon/Projects/HTML/pharmaflow-ai/UI_LOGIC_INVENTORY.md';
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
let inOrderSection = false;
let counter = 1;

const newLines = lines.map(line => {
    if (line.startsWith('### Refactor Order')) {
        inOrderSection = true;
        return line;
    }
    if (inOrderSection && line.trim() === '') {
        // Stop renumbering at the end of the section or at empty line if applicable
        // But the list seems to have no empty lines except for section ends
    }
    if (inOrderSection && line.match(/^\d+\.\s/)) {
        const newLine = line.replace(/^\d+\.\s/, `${counter}. `);
        counter++;
        return newLine;
    }
    if (line.startsWith('### Shared Utilities')) {
        inOrderSection = false;
    }
    return line;
});

fs.writeFileSync(filePath, newLines.join('\n'));
console.log('Renumbered successfully');
