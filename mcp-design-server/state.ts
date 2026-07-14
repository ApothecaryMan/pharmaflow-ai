import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type CssPropMap = Record<string, string>;

export interface ThemeState {
  properties: CssPropMap;
  enabled: boolean;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, '..', '.theme-studio-state.json');

export async function loadState(): Promise<ThemeState> {
  try {
    const raw = await readFile(STATE_FILE, 'utf-8');
    return JSON.parse(raw) as ThemeState;
  } catch {
    return { properties: {}, enabled: true };
  }
}

export async function saveState(state: ThemeState): Promise<void> {
  try {
    await writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save theme state:', e);
  }
}

export function cssToProps(css: string): CssPropMap {
  const props: CssPropMap = {};
  css.split(';').forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed.includes(':')) return;
    const colonIdx = trimmed.indexOf(':');
    const name = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const value = trimmed.slice(colonIdx + 1).trim();
    if (name) props[name] = value;
  });
  return props;
}

export function propsToCss(props: CssPropMap): string {
  return Object.entries(props)
    .map(([name, value]) => (value ? `${name}: ${value}` : ''))
    .filter(Boolean)
    .join(';\n');
}
