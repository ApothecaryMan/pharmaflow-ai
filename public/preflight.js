/**
 * PharmaFlow Pre-flight Loader
 * Keeps lightweight boot-time version, theme, and direction setup.
 */
(() => {
  const CURRENT_VERSION = '2.053';
  const VERSION_KEY = 'pharma_storage_version';
  const SESSION_KEY = 'branch_pilot_session';

  // --- 1. Version Check & Smart Cache Purge ---
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion && storedVersion !== CURRENT_VERSION) {
      const CACHE_PREFIXES = ['pharma_inventory', 'pharma_employees', 'pharmaflow_last_sync'];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
          localStorage.removeItem(key);
        }
      }
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    } else if (!storedVersion) {
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    }
  } catch (_error) {}

  // --- 2. Theme & Direction (Prevent FOUC) ---
  try {
    const rawSession = localStorage.getItem(SESSION_KEY);
    const session = rawSession ? JSON.parse(rawSession) : null;
    const userId = session ? session.userId : null;
    const settingsKey = userId ? `pharma_settings_${userId}` : 'pharma_settings';
    const settings = JSON.parse(localStorage.getItem(settingsKey) || '{}');
    const darkMode = settings.darkMode || localStorage.getItem('pharma_darkMode') === 'true';
    const language = settings.language || localStorage.getItem('pharma_language') || 'AR';
    if (darkMode || !session) document.documentElement.classList.add('dark');
    document.documentElement.dir = language === 'AR' ? 'rtl' : 'ltr';
    document.documentElement.lang = language.toLowerCase();
  } catch (_error) {}
})();
