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

export const isWeb = (): boolean => !isTauri();

/**
 * Parses user agent and platform to return a human-readable device name.
 */
export const getDeviceName = (userAgent: string, platform: string): string => {
  if (!userAgent) return platform || 'Unknown Device';
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('iphone')) return 'iPhone';
  if (ua.includes('ipad')) return 'iPad';
  if (ua.includes('android')) {
    return 'Android';
  }
  
  if (ua.includes('windows')) {
    return 'Windows';
  }
  
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'Mac';
  if (ua.includes('linux') || ua.includes('x11')) return 'Linux';
  if (ua.includes('cros')) return 'Chrome OS';
  
  return platform || 'Unknown Device';
};

/**
 * Parses user agent to return a human-readable browser name.
 */
export const getBrowserName = (userAgent: string): string => {
  if (!userAgent) return '';
  const ua = userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome/')) return 'Chrome'; // Will also match Edge Chromium if we don't return early
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari';
  if (ua.includes('firefox/')) return 'Firefox';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  return '';
};

