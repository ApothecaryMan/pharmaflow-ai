/**
 * Platform Detection Utility
 *
 * Detects whether the app is running inside Tauri desktop shell
 * or as a regular web/PWA application. Used throughout the codebase
 * to conditionally enable/disable features per platform.
 */

/**
 * Returns true if the app is running inside Tauri desktop shell.
 * Uses the presence of Tauri internals in the window object.
 */
export const isTauri = (): boolean => {
  return '__TAURI_INTERNALS__' in window;
};

/**
 * Returns true if the app is running as a web/PWA (not inside Tauri).
 */
export const isWeb = (): boolean => !isTauri();
