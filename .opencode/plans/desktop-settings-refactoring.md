# Implementation Plan: Desktop Settings Refactoring

## Overview

Refactor the Desktop Settings page (`DesktopSettings.tsx`) from a mock-data placeholder into a real, functional settings page. This involves extracting state logic into a custom hook, wiring real system data via the Rust backend, adding the `preferred_printer_interface` UI selector, and improving UX with OS-specific guidance.

---

## Step 1 — Install Dependencies

### 1a. Add `@tauri-apps/plugin-os` (npm)

```bash
npm install @tauri-apps/plugin-os
```

### 1b. Add `tauri-plugin-os` (Rust crate) + `sysinfo` (for RAM)

File: `src-tauri/Cargo.toml`

Add to `[dependencies]`:
```toml
tauri-plugin-os = "2"
sysinfo = "0.33"
```

### 1c. Register plugin in Rust backend

File: `src-tauri/src/lib.rs`

Add import and register:
```rust
.plugin(tauri_plugin_os::init())
```

---

## Step 2 — Add Rust Commands for System Info

File: `src-tauri/src/lib.rs`

Two new `#[tauri::command]` functions:

### 2a. `get_system_memory()` → `u64` (MB)

- Use `sysinfo::System` to get total memory.
- Returns total RAM in MB as `u64`.

### 2b. `get_app_version()` → `String`

- Reads `app.config().package.version()` from Tauri config.
- Returns version string (e.g. `"2.0.71"`).

### 2c. Register both commands

Add to `invoke_handler`:
```rust
.invoke_handler(tauri::generate_handler![
    set_titlebar_color,
    print_raw_data,
    update_tray_language,
    get_system_memory,
    get_app_version,
])
```

---

## Step 3 — Create `useDesktopSettings` Custom Hook

New file: `hooks/infrastructure/useDesktopSettings.ts`

### Responsibilities:

1. **Printer list management**
   - Wrap `list_thermal_printers()` calls with `@tauri-apps/api/core` `invoke` (or direct import).
   - Loading/error state for printer discovery.

2. **Printer selection (receipt + label)**
   - Persist to `localStorage` keys: `desktop_receipt_printer`, `desktop_label_printer`.
   - Expose `selectedReceiptPrinter`, `selectedLabelPrinter`, and their setters.

3. **Preferred printer interface**
   - Manage state for `preferredPrinterInterface` (`'auto' | 'tauri' | 'qz'`).
   - Persist to `localStorage` key: `preferred_printer_interface`.
   - Wire into `printerService` by calling a `printerService.setPreferredInterface()` method.

4. **Test print**
   - Wrap `test_thermal_printer()` calls.
   - `printerStatus` state.

5. **Real system info**
   - Use `@tauri-apps/plugin-os` for: `type()`, `version()`, `arch()`.
   - Use Tauri `invoke('get_system_memory')` for RAM.
   - Use Tauri `invoke('get_app_version')` for app version.
   - Returns `SystemInfo` object (not mocked).

6. **Update management**
   - Move update check/install logic from the component into the hook.
   - `updateStatus`, `updateInfo`, `checkUpdates()`, `installUpdate()`.

### Return interface:

```typescript
interface UseDesktopSettingsResult {
  printers: string[];
  isLoadingPrinters: boolean;
  refreshPrinters: () => Promise<void>;
  selectedReceiptPrinter: string | null;
  selectedLabelPrinter: string | null;
  setReceiptPrinter: (name: string) => void;
  setLabelPrinter: (name: string) => void;
  printerStatus: 'idle' | 'testing' | 'error';
  testPrint: () => Promise<void>;

  preferredInterface: 'auto' | 'tauri' | 'qz';
  setPreferredInterface: (val: 'auto' | 'tauri' | 'qz') => void;

  systemInfo: {
    os: string;
    osVersion: string;
    arch: string;
    memory: string;
    version: string;
  } | null;
  isLoadingSystemInfo: boolean;

  updateStatus: 'idle' | 'checking' | 'available' | 'downloading' | 'up_to_date' | 'error';
  updateInfo: any;
  checkUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
}
```

### Export from barrel

File: `hooks/index.ts`

Add:
```typescript
export { useDesktopSettings } from './infrastructure/useDesktopSettings';
```

---

## Step 4 — Add `setPreferredInterface` to `printerService`

File: `services/infrastructure/printerService.ts`

### Changes:

1. Add method:
```typescript
public setPreferredInterface(iface: 'auto' | 'tauri' | 'qz'): void {
  localStorage.setItem('preferred_printer_interface', iface);
  this.settings.preferredInterface = iface;
}
```

2. The existing `loadSettings()` already reads `preferred_printer_interface` from localStorage — it picks up the new value on next print. The `setPreferredInterface()` call ensures the in-memory settings object is updated immediately.

---

## Step 5 — Refactor `DesktopSettings.tsx`

Replace all inline state management with `useDesktopSettings` hook.

### New sections to add:

#### 5a. Preferred Printer Interface selector
- A dropdown/radio group with 3 options: `Auto`, `Tauri Native`, `QZ Tray`.
- Short description under each option explaining behavior.
- Persisted immediately via `printerService.setPreferredInterface()`.

#### 5b. OS-specific alert banner
- On mount, call `os.type()` from `@tauri-apps/plugin-os`.
- If `'linux'`: show a visible warning card about Tauri limitations.
- If `'windows'`: show an info card about full support.

#### 5c. Real system info grid
- Replace the hardcoded `systemInfo` object with data from the hook.
- Show OS name + version, real architecture, real RAM, real app version.

#### 5d. UX improvements for Receipt vs Label
- Add helper text below each dropdown explaining the difference and QZ Tray recommendation for labels.

### Remove:
- All `useState` / `useEffect` for printers (now in hook).
- All direct `localStorage.getItem/setItem` calls (now in hook).
- Mocked `systemInfo` constant.
- Raw `list_thermal_printers`, `test_thermal_printer` imports (now in hook).

### Keep:
- JSX structure, styling, layout.
- `isTauri()` guard.
- `onViewChange` for browser-settings link.

---

## Step 6 — Add Translation Keys

File: `i18n/translations.ts`

### New keys to add to `desktop` section (English, ~line 2314):

```typescript
preferredInterface: 'Preferred Printer Interface',
interfaceAuto: 'Auto — Try Tauri first, fall back to QZ Tray',
interfaceTauri: 'Tauri Native — Use system thermal printer API only',
interfaceQz: 'QZ Tray — Network-based silent printing',
receiptPrinterHelper: 'Standard 80mm thermal receipts. Works with Tauri Native and QZ Tray.',
labelPrinterHelper: 'Small adhesive labels (e.g. 38×12mm). QZ Tray recommended for custom sizes.',
linuxWarning: 'Thermal printers via Tauri Native may have limited support on Linux. QZ Tray is recommended for best stability.',
windowsInfo: 'Windows is fully supported. QZ Tray recommended for silent label printing.',
osVersion: 'OS Version',
```

### Arabic translations (~line 5886):

```typescript
preferredInterface: 'واجهة الطباعة المفضلة',
interfaceAuto: 'تلقائي — تجربة Tauri أولاً ثم QZ Tray',
interfaceTauri: 'Tauri — استخدام واجهة الطباعة النظامية فقط',
interfaceQz: 'QZ Tray — الطباعة الصامتة عبر الشبكة',
receiptPrinterHelper: 'فواتير حرارية 80 مم. تعمل مع Tauri و QZ Tray.',
labelPrinterHelper: 'ملصقات صغيرة (مثال 38×12 مم). يُوصى باستخدام QZ Tray للأحجام المخصصة.',
linuxWarning: 'الطابعات الحرارية عبر Tauri قد تواجه قيوداً على لينكس. يُنصح باستخدام QZ Tray للاستقرار.',
windowsInfo: 'ويندوز مدعوم بالكامل. يُوصى باستخدام QZ Tray لطباعة الملصقات.',
osVersion: 'إصدار نظام التشغيل',
```

---

## Step 7 — Remove Mocked System Info Comment

The comment `// System Info (Mocked for now as we don't have tauri-plugin-os yet)` is removed.

---

## File Change Summary

| # | File | Action |
|---|------|--------|
| 1 | `package.json` | Add `@tauri-apps/plugin-os` dep |
| 2 | `src-tauri/Cargo.toml` | Add `tauri-plugin-os`, `sysinfo` deps |
| 3 | `src-tauri/src/lib.rs` | Register plugin, add 2 new commands |
| 4 | `hooks/infrastructure/useDesktopSettings.ts` | **NEW** — custom hook |
| 5 | `hooks/index.ts` | Export `useDesktopSettings` |
| 6 | `services/infrastructure/printerService.ts` | Add `setPreferredInterface()` |
| 7 | `components/settings/DesktopSettings.tsx` | Refactor, add new UI sections |
| 8 | `i18n/translations.ts` | Add new translation keys (EN + AR) |

---

## Verification

- `npm run type-check` — no TS errors
- `npm run lint` — no lint errors
- `cargo build` — Rust compiles
- Preferred printer interface selector saves to localStorage
- Linux warning / Windows info banner shows correctly
- System info shows real OS, version, arch, RAM, app version
- Printer refresh, test print, and update check still work
