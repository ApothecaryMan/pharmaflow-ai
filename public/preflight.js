/**
 * PharmaFlow Pre-flight & Recovery Loader
 * Optimized to handle critical boot failures and clear IndexedDB on recovery safely.
 */
(function() {
  const CURRENT_VERSION = '2.020'; 
  const VERSION_KEY = 'pharma_storage_version';
  const SESSION_KEY = 'branch_pilot_session';
  const DB_NAME = 'pharmaflow_catalog';

  // --- 1. Version Check & Smart Cache Purge ---
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion && storedVersion !== CURRENT_VERSION) {
      const CACHE_PREFIXES = ['pharma_inventory', 'pharma_employees', 'pharmaflow_last_sync'];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && CACHE_PREFIXES.some(p => k.startsWith(p))) {
          localStorage.removeItem(k);
        }
      }
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    } else if (!storedVersion) {
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    }
  } catch (e) {}

  // --- 2. Theme & Direction (Prevent FOUC) ---
  try {
    const rawSession = localStorage.getItem(SESSION_KEY);
    const session = rawSession ? JSON.parse(rawSession) : null;
    const userId = session ? session.userId : null;
    const settingsKey = userId ? 'pharma_settings_' + userId : 'pharma_settings';
    const settings = JSON.parse(localStorage.getItem(settingsKey) || '{}');
    const darkMode = settings.darkMode || localStorage.getItem('pharma_darkMode') === 'true';
    const language = settings.language || localStorage.getItem('pharma_language') || 'AR';
    if (darkMode || !session) document.documentElement.classList.add('dark');
    document.documentElement.dir = language === 'AR' ? 'rtl' : 'ltr';
    document.documentElement.lang = language.toLowerCase();
  } catch (e) {}

  // --- 3. Silent Recovery System ---
  let hasBooted = false;
  
  function doHardReset() {
    // 4. Reset Version to force re-sync
    localStorage.removeItem(VERSION_KEY);
    // 5. Hard Reload
    window.location.reload(true);
  }

  function showRecoveryUI() {
    if (document.getElementById('recovery-ui')) return;
    const div = document.createElement('div');
    div.id = 'recovery-ui';
    div.style.cssText = 'position:fixed;bottom:20px;left:20px;right:20px;z-index:9999;background:#333;color:white;padding:14px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,0.5);font-family:sans-serif;font-size:14px;border:1px solid #444;';
    const msg = document.createElement('span');
    msg.innerHTML = '✨ واجهت مشكلة؟ اضغط للإصلاح (سيتم تحديث البيانات) / Issue? Click to Fix';
    const btn = document.createElement('button');
    btn.innerHTML = 'إصلاح / Fix';
    btn.style.cssText = 'background:#4f46e5;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:bold;';
    btn.onclick = function() {
      const warn = 'سيتم مسح الكاش وقاعدة البيانات. ستحتاج الصيدلية لإعادة تحميل قائمة الأدوية (قد يستغرق دقائق حسب سرعة الإنترنت). هل تود الاستمرار؟';
      if (confirm(warn)) {
        // 1. Unregister SWs
        if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(r => r.forEach(sw => sw.unregister()));
        // 2. Clear Caches
        if ('caches' in window) caches.keys().then(names => names.forEach(n => caches.delete(n)));
        
        // 3. Clear IndexedDB (With async handling to avoid race condition)
        try { 
          const req = window.indexedDB.deleteDatabase(DB_NAME);
          req.onsuccess = doHardReset;
          req.onerror = doHardReset;
          req.onblocked = doHardReset; // Also handle if DB is blocked
        } catch(e) {
          doHardReset();
        }
      }
    };
    div.appendChild(msg);
    div.appendChild(btn);
    document.body.appendChild(div);
  }

  window.addEventListener('error', function(e) {
    if (!hasBooted && e.message && (e.message.includes('ChunkLoadError') || e.message.includes('Loading chunk'))) {
      showRecoveryUI();
    }
  }, true);

  window.addEventListener('load', function() {
    const root = document.getElementById('root');
    if (!root) return;
    const checkTimeout = setTimeout(() => { if (!hasBooted) showRecoveryUI(); }, 10000);
    const observer = new MutationObserver(() => {
      if (root.innerHTML.length > 100) {
        hasBooted = true;
        clearTimeout(checkTimeout);
        observer.disconnect();
        const ui = document.getElementById('recovery-ui');
        if (ui) ui.remove();
      }
    });
    observer.observe(root, { childList: true, subtree: true });
  });
})();
