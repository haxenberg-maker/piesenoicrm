// main.js — CRM Piese Auto
// Entry point — importă toate modulele și rulează init

import './config.js';
import './state.js';
import './api.js';
import './auth.js';
import './ui.js';
import './orders.js';
import './clients.js';
import './products.js';
import './gdrive.js';
import './invoices.js';
import './delivery.js';
import './logs.js';
import './users.js';

// ════ INIT ════
// ════ INIT — verifică sesiune salvată ════
(async () => {
  // ── Handle Google OAuth callback (hash fragment) ──────────
  const hashParams = new URLSearchParams(window.location.hash.replace('#',''));
  const oauthAccessToken = hashParams.get('access_token');
  const oauthProviderToken = hashParams.get('provider_token'); // Google Drive token

  if(oauthAccessToken) {
    // Curăță URL-ul
    history.replaceState(null,'',window.location.pathname);
    // Salvează tokenul Supabase
    accessToken = oauthAccessToken;
    localStorage.setItem('crm_token', oauthAccessToken);
    const refreshToken = hashParams.get('refresh_token');
    if(refreshToken) localStorage.setItem('crm_refresh', refreshToken);

    // Salvează Google Drive token pentru upload
    if(oauthProviderToken) {
      _gdriveToken = oauthProviderToken;
      localStorage.setItem('crm_gdrive_token', oauthProviderToken);
      console.log('Google Drive token salvat ✓');
    }

    // Fetch user info
    try {
      const uRes = await fetch(`${SB}/auth/v1/user`, {
        headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${oauthAccessToken}` }
      });
      const uData = await uRes.json();
      const email = uData.email || '';
      const userId = uData.id || '';
      localStorage.setItem('crm_email', email);
      localStorage.setItem('crm_user_id', userId);
      currentUserId = userId;
      await showApp(email, userId);
      return;
    } catch(e) { console.error('OAuth user fetch:', e); }
  }

  // ── Restaurează Google Drive token din localStorage ───────
  const savedGdriveToken = localStorage.getItem('crm_gdrive_token');
  if(savedGdriveToken) _gdriveToken = savedGdriveToken;

  const savedToken = localStorage.getItem('crm_token');
  const savedEmail = localStorage.getItem('crm_email');

  if(savedToken) {
    accessToken = savedToken;
    // Încearcă să valideze tokenul
    try {
      const res = await fetch(`${SB}/rest/v1/comenzi?select=id&limit=1`, {
        headers: getHeaders()
      });
      if(res.ok) {
        // Token valid — arată aplicația direct
        currentUserId = localStorage.getItem('crm_user_id') || null;
        showApp(savedEmail || '', currentUserId);
      } else if(res.status === 401) {
        // Token expirat — încearcă refresh
        const ok = await refreshSession();
        if(ok) {
          currentUserId = localStorage.getItem('crm_user_id') || null;
          showApp(savedEmail || '', currentUserId);
        } else {
          document.getElementById('login-page').classList.add('visible');
          document.getElementById('app').style.display = 'none';
        }
      }
    } catch {
      document.getElementById('login-page').classList.add('visible');
      document.getElementById('app').style.display = 'none';
    }
  } else {
    // Nu există sesiune — arată login
    document.getElementById('login-page').classList.add('visible');
    document.getElementById('app').style.display = 'none';
  }
})();

setInterval(loadOrders, 90_000);
