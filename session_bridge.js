/**
 * session_bridge.js
 * Rulează pe piesenoicrm.netlify.app
 * Citește sesiunea din localStorage și o sincronizează în chrome.storage
 * → Extensia pe e-cat folosește automat același token, fără login separat
 */

'use strict';

function syncSessionToExtension() {
  try {
    const sessRaw = localStorage.getItem('crm_session');
    const userRaw = localStorage.getItem('crm_user');
    if (!sessRaw) return;

    const sess = JSON.parse(sessRaw);
    const user = userRaw ? JSON.parse(userRaw) : null;

    // Trimite la background.js care salvează în chrome.storage
    chrome.runtime.sendMessage({
      type:    'SYNC_SESSION',
      session: sess,
      user:    user,
    });
  } catch (e) {
    console.warn('[CRM Bridge] Sync failed:', e.message);
  }
}

// Sync imediat la încărcarea paginii
syncSessionToExtension();

// Sync din nou când localStorage se schimbă (login/logout)
window.addEventListener('storage', e => {
  if (e.key === 'crm_session') syncSessionToExtension();
});
