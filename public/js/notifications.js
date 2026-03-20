// notifications.js — CRM Piese Auto
// ════════════════════════════════════════════════════════════
// Browser Push Notifications + Setări

const VAPID_PUBLIC_KEY = 'CKJBwMvNGcbrPm2PK1ktmlxHezRmx3bDQ31TZA3QyK4pvUh4qenCglWyaZX73U_jRKQGk96gk5dpjbHaiAoq4A';

// ─── SERVICE WORKER SETUP ─────────────────────────────────
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch(e) {
    console.error('SW register error:', e);
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

async function subscribeToPush() {
  const reg = await registerServiceWorker();
  if (!reg) return null;

  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Salvează în Supabase
    const subJson = sub.toJSON();
    await api('push_subscriptions', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        user_email: currentUserEmail,
        endpoint:   subJson.endpoint,
        p256dh:     subJson.keys.p256dh,
        auth:       subJson.keys.auth,
      })
    });

    console.log('Push subscription saved ✓');
    return sub;
  } catch(e) {
    console.error('Push subscribe error:', e);
    return null;
  }
}

async function unsubscribeFromPush() {
  const reg = await navigator.serviceWorker?.getRegistration();
  const sub = await reg?.pushManager?.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    await api(`push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, {
      method: 'DELETE', headers: { 'Prefer': 'return=minimal' }
    });
  }
}

// ─── SEND NOTIFICATION ────────────────────────────────────
async function sendPushNotification(type, title, body, emails) {
  try {
    await fetch(`https://ddieqobpxejocfnbmfck.supabase.co/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken || ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({ type, payload: { title, body }, emails })
    });
  } catch(e) { console.warn('Push send error:', e.message); }
}

// ─── NOTIFICATION SETTINGS ────────────────────────────────
let _notifSettings = null;

async function loadNotifSettings() {
  if (!currentUserEmail) return;
  try {
    const rows = await api(`notification_settings?user_email=eq.${encodeURIComponent(currentUserEmail)}&select=*`);
    _notifSettings = rows?.[0] || {
      notif_factura_noua:  true,
      notif_sku_lipsa:     true,
      notif_sku_adaugat:   false,
      notif_ora_lipsa_sku: true,
    };
  } catch(e) { _notifSettings = null; }
}

async function saveNotifSettings(settings) {
  await api('notification_settings', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_email: currentUserEmail, ...settings })
  });
  _notifSettings = settings;
}

// ─── GET SUBSCRIBED EMAILS FOR EVENT ──────────────────────
async function getSubscribedEmails(eventType) {
  try {
    const rows = await api(`notification_settings?${eventType}=eq.true&select=user_email`);
    return rows.map(r => r.user_email);
  } catch(e) { return []; }
}

// ─── OPEN NOTIFICATION SETTINGS MODAL ────────────────────
async function openNotifSettings() {
  // Creează modal dacă nu există
  let modal = document.getElementById('modal-notif-settings');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-notif-settings';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:520px">
        <div class="modal-head">
          <h3>🔔 Setări notificări</h3>
          <button class="icon-btn" onclick="closeModal('modal-notif-settings')">✕</button>
        </div>
        <div class="modal-body" style="gap:0">
          <div id="notif-push-status" style="background:var(--s2);border-radius:var(--r-md);padding:12px 16px;margin-bottom:16px;font-size:13px">
            ⏳ Se verifică statusul notificărilor...
          </div>

          <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px">
            Primești notificări pentru:
          </div>

          <div style="display:flex;flex-direction:column;gap:10px">
            <label style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--s1);border-radius:var(--r-md);cursor:pointer">
              <div>
                <div style="font-weight:600;font-size:13px">🧾 Factură nouă în sistem</div>
                <div style="font-size:11px;color:var(--muted)">Când cineva uploadează o factură</div>
              </div>
              <input type="checkbox" id="notif-factura-noua" style="width:18px;height:18px;cursor:pointer"/>
            </label>
            <label style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--s1);border-radius:var(--r-md);cursor:pointer">
              <div>
                <div style="font-weight:600;font-size:13px">⚠️ Facturi cu SKU lipsă (orar)</div>
                <div style="font-size:11px;color:var(--muted)">Verificare automată la fiecare oră</div>
              </div>
              <input type="checkbox" id="notif-ora-lipsa-sku" style="width:18px;height:18px;cursor:pointer"/>
            </label>
            <label style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--s1);border-radius:var(--r-md);cursor:pointer">
              <div>
                <div style="font-weight:600;font-size:13px">✅ SKU adăugat la produs</div>
                <div style="font-size:11px;color:var(--muted)">Când gestionarul alocă un SKU</div>
              </div>
              <input type="checkbox" id="notif-sku-adaugat" style="width:18px;height:18px;cursor:pointer"/>
            </label>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" onclick="closeModal('modal-notif-settings')">Închide</button>
          <button class="btn btn-primary" onclick="saveNotifSettingsFromModal()">💾 Salvează</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', e => { if(e.target===modal) closeModal('modal-notif-settings'); });
    document.body.appendChild(modal);
  }

  await loadNotifSettings();

  // Populează checkboxuri
  document.getElementById('notif-factura-noua').checked  = _notifSettings?.notif_factura_noua  ?? true;
  document.getElementById('notif-ora-lipsa-sku').checked = _notifSettings?.notif_ora_lipsa_sku ?? true;
  document.getElementById('notif-sku-adaugat').checked   = _notifSettings?.notif_sku_adaugat   ?? false;

  // Check push permission
  const statusEl = document.getElementById('notif-push-status');
  const perm = Notification.permission;
  if (perm === 'granted') {
    statusEl.innerHTML = '✅ Notificările push sunt <strong>active</strong> pe acest dispozitiv.';
    statusEl.style.color = 'var(--green)';
  } else if (perm === 'denied') {
    statusEl.innerHTML = '❌ Notificările sunt <strong>blocate</strong>. Activează-le din setările browserului.';
    statusEl.style.color = 'var(--red)';
  } else {
    statusEl.innerHTML = `<button class="btn btn-primary btn-sm" onclick="enablePushNotifications()">🔔 Activează notificările push</button>`;
  }

  openModal('modal-notif-settings');
}

async function enablePushNotifications() {
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    await subscribeToPush();
    const statusEl = document.getElementById('notif-push-status');
    statusEl.innerHTML = '✅ Notificările push sunt <strong>active</strong>!';
    statusEl.style.color = 'var(--green)';
    toast('✅ Notificările push sunt activate!', 'success');
  } else {
    toast('Notificările au fost refuzate.', 'warn');
  }
}

async function saveNotifSettingsFromModal() {
  const settings = {
    notif_factura_noua:  document.getElementById('notif-factura-noua').checked,
    notif_ora_lipsa_sku: document.getElementById('notif-ora-lipsa-sku').checked,
    notif_sku_adaugat:   document.getElementById('notif-sku-adaugat').checked,
    notif_sku_lipsa:     true,
  };
  try {
    await saveNotifSettings(settings);
    // Dacă nu are subscription încă, încearcă să subscribie
    if (Notification.permission === 'granted') {
      await subscribeToPush();
    }
    toast('✅ Setări salvate!', 'success');
    closeModal('modal-notif-settings');
  } catch(e) { toast('Eroare: ' + e.message, 'error'); }
}

// ─── AUTO-SUBSCRIBE LA LOGIN ──────────────────────────────
async function initPushOnLogin() {
  if (!('serviceWorker' in navigator)) return;
  await registerServiceWorker();
  if (Notification.permission === 'granted') {
    await subscribeToPush();
  }
  await loadNotifSettings();
}
