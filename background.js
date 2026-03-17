/**
 * background.js — CRM Piese Auto
 * Service Worker: gestionează sesiunea și mesaje
 */

'use strict';

const SB  = 'https://ddieqobpxejocfnbmfck.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkaWVxb2JweGVqb2NmbmJtZmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTMyOTksImV4cCI6MjA4OTMyOTI5OX0.YYEf7zJ_nbuq19FVhbPcZ377KJAY8slNL6JneHmNqYA';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[CRM Auto] Extensie instalată/actualizată.');
});

// Verifică și reîmprospătează sesiunea la nevoie
async function refreshSessionIfNeeded() {
  return new Promise(resolve => {
    chrome.storage.local.get(['crm_session'], async data => {
      const sess = data.crm_session;
      if (!sess?.refresh_token) { resolve(null); return; }

      const expiresAt = new Date(sess.expires_at * 1000);
      const now       = new Date();
      const minsLeft  = (expiresAt - now) / 60000;

      // Reîmprospătează dacă expiră în mai puțin de 10 minute
      if (minsLeft > 10) { resolve(sess.access_token); return; }

      try {
        const res = await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`, {
          method:  'POST',
          headers: { 'apikey': KEY, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ refresh_token: sess.refresh_token }),
        });
        if (!res.ok) { resolve(null); return; }
        const newSess = await res.json();
        chrome.storage.local.set({ crm_session: newSess });
        resolve(newSess.access_token);
      } catch {
        resolve(sess.access_token); // folosește ce avem
      }
    });
  });
}

// Handler mesaje de la content.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === 'GET_TOKEN') {
    refreshSessionIfNeeded().then(token => sendResponse({ token }));
    return true; // async
  }

  if (msg.type === 'GET_CART') {
    chrome.storage.local.get('crm_cart', data => {
      sendResponse({ cart: data.crm_cart || [] });
    });
    return true;
  }

  if (msg.type === 'GET_USER') {
    chrome.storage.local.get('crm_user', data => {
      sendResponse({ user: data.crm_user || null });
    });
    return true;
  }

  if (msg.type === 'IS_LOGGED_IN') {
    chrome.storage.local.get('crm_session', data => {
      const sess     = data.crm_session;
      const loggedIn = !!(sess?.access_token && new Date(sess.expires_at * 1000) > new Date());
      sendResponse({ loggedIn });
    });
    return true;
  }
});
