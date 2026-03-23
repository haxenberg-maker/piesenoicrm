'use strict';

const SB  = 'https://ddieqobpxejocfnbmfck.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkaWVxb2JweGVqb2NmbmJtZmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTMyOTksImV4cCI6MjA4OTMyOTI5OX0.YYEf7zJ_nbuq19FVhbPcZ377KJAY8slNL6JneHmNqYA';

// ── HELPERS ───────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function setErr(msg) {
  const el = $('err-msg');
  el.textContent    = msg;
  el.style.display  = msg ? 'block' : 'none';
}

function setStatus(msg) {
  const el = $('status-bar');
  if (el) el.textContent = msg;
}

function isValid(sess) {
  return !!(sess?.access_token && new Date((sess.expires_at||0)*1000) > new Date());
}

// ── SCREENS ───────────────────────────────────────────────────
function showLogin() {
  $('screen-login').style.display = 'block';
  $('screen-app').style.display   = 'none';
}

function showApp(user, cart) {
  $('screen-login').style.display = 'none';
  $('screen-app').style.display   = 'block';
  const name = user?.name || user?.email || '—';
  $('u-name').textContent     = name;
  $('u-role').textContent     = user?.role === 'administrator' ? '⭐ Administrator' : '👤 User';
  $('av').textContent         = name[0].toUpperCase();
  $('cart-count').textContent = (cart||[]).length;
}

// ── INIT ─────────────────────────────────────────────────────
chrome.storage.local.get(['crm_session','crm_user','crm_cart'], d => {
  if (isValid(d.crm_session)) showApp(d.crm_user, d.crm_cart||[]);
  else                         showLogin();
});

// Reacționează la sync din session_bridge sau login manual
chrome.storage.onChanged.addListener(changes => {
  if (changes.crm_cart) {
    const el = $('cart-count');
    if (el) el.textContent = (changes.crm_cart.newValue||[]).length;
  }
  if (changes.crm_session) {
    const sess = changes.crm_session.newValue;
    if (isValid(sess)) {
      chrome.storage.local.get(['crm_user','crm_cart'], d => showApp(d.crm_user, d.crm_cart||[]));
    } else {
      showLogin();
    }
  }
});

// ── LOGIN ─────────────────────────────────────────────────────
async function doLogin() {
  const email = $('inp-email').value.trim();
  const pass  = $('inp-pass').value;
  if (!email || !pass) { setErr('Completează email și parola.'); return; }

  const btn = $('btn-login');
  btn.disabled    = true;
  btn.innerHTML   = '<span class="spinner"></span>Se autentifică...';
  setErr('');

  try {
    const r1 = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
      method:  'POST',
      headers: { 'apikey': KEY, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password: pass }),
    });
    const sess = await r1.json();
    if (!r1.ok) throw new Error(sess.error_description || sess.msg || 'Autentificare eșuată');

    // Fetch profil pentru rol + nume
    let name = email, role = 'user';
    try {
      const r2 = await fetch(`${SB}/rest/v1/user_profiles?select=name,role&limit=1`, {
        headers: { 'apikey': KEY, 'Authorization': `Bearer ${sess.access_token}` },
      });
      const p = await r2.json();
      if (p?.length) { name = p[0].name || email; role = p[0].role; }
    } catch {}

    const user = { id: sess.user?.id, email, name, role };
    chrome.storage.local.set({ crm_session: sess, crm_user: user }, () => {
      showApp(user, []);
    });

  } catch(e) {
    setErr(e.message);
    btn.disabled  = false;
    btn.textContent = 'Intră în cont';
  }
}

// ── LOGOUT ────────────────────────────────────────────────────
function doLogout() {
  chrome.storage.local.get('crm_session', d => {
    const token = d.crm_session?.access_token;
    if (token) {
      fetch(`${SB}/auth/v1/logout`, {
        method:  'POST',
        headers: { 'apikey': KEY, 'Authorization': `Bearer ${token}` },
      }).catch(()=>{});
    }
    chrome.storage.local.remove(['crm_session','crm_user'], showLogin);
  });
}

// ── DASHBOARD ─────────────────────────────────────────────────
function openDashboardTab(page) {
  chrome.tabs.create({ url: `https://piesenoicrm.netlify.app/${page}` });
  window.close();
}

// ── CLEAR CART ────────────────────────────────────────────────
function clearCart() {
  chrome.storage.local.remove('crm_cart', () => {
    $('cart-count').textContent = '0';
    setStatus('Coș golit ✓');
    setTimeout(() => setStatus('Activ pe e-cat.intercars.eu'), 2000);
  });
}

// ── EVENT LISTENERS (fără inline handlers) ────────────────────
document.addEventListener('DOMContentLoaded', () => {
  $('btn-open-dashboard').addEventListener('click', () => openDashboardTab('index.html'));
  $('btn-login').addEventListener('click', doLogin);
  $('btn-logout').addEventListener('click', doLogout);
  $('btn-dashboard').addEventListener('click', () => openDashboardTab('dashboard.html'));
  $('btn-clear-cart').addEventListener('click', clearCart);

  // Enter key pe inputs
  $('inp-email').addEventListener('keydown', e => { if(e.key==='Enter') $('inp-pass').focus(); });
  $('inp-pass').addEventListener('keydown',  e => { if(e.key==='Enter') doLogin(); });
});
