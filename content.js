/**
 * content.js — CRM Piese Auto v2
 * Injectat pe ro.e-cat.intercars.eu și site-uri similare
 */

'use strict';

// ─── CONFIGURARE ─────────────────────────────────────────────
const SUPABASE_URL  = 'https://ddieqobpxejocfnbmfck.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkaWVxb2JweGVqb2NmbmJtZmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTMyOTksImV4cCI6MjA4OTMyOTI5OX0.YYEf7zJ_nbuq19FVhbPcZ377KJAY8slNL6JneHmNqYA';
const STORAGE_KEY   = 'crm_cart';

// ─── MAPARE FURNIZORI ─────────────────────────────────────────
const FURNIZORI_MAP = {
  'ro.e-cat.intercars.eu': 'Intercars',
  'www.autobrand.ro':      'Autobrand',
  'www.autodoc.ro':        'Autodoc',
  'www.pieces-auto.ro':    'Pieces Auto',
};

function detectFurnizor() {
  return FURNIZORI_MAP[window.location.hostname] || window.location.hostname;
}

// ─── STATE ───────────────────────────────────────────────────
let clientCart = [];

// ─── SUPABASE HELPERS ─────────────────────────────────────────
const supabase = {
  async req(path, opts = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...opts,
      headers: {
        'apikey':        SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type':  'application/json',
        'Prefer':        opts.prefer || 'return=representation',
        ...opts.headers,
      },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  },
  get:   (t, q = '') => supabase.req(`${t}?${q}`),
  post:  (t, b)      => supabase.req(t, { method: 'POST',  body: JSON.stringify(b) }),
  patch: (t, q, b)   => supabase.req(`${t}?${q}`, { method: 'PATCH', body: JSON.stringify(b) }),
};

// ─── SCRAPING COȘ e-cat ──────────────────────────────────────
function scrapeCart() {
  const rows = document.querySelectorAll('tr.cartlist__item');
  const products = [];

  if (rows.length === 0) {
    console.warn('[CRM Auto] scrapeCart: 0 rânduri tr.cartlist__item');
    return products;
  }

  rows.forEach((row, idx) => {
    const codEl = row.querySelector('a[data-id]');
    const cod   = codEl?.dataset?.id?.trim();
    if (!cod) { console.warn(`[CRM Auto] Rând ${idx}: fără cod`); return; }

    const descriere   = row.querySelector('.productname--cartlist')?.innerText?.trim() || '—';
    const descTehnica = row.querySelector('.producttechnicaldesc--cartlist')?.innerText?.trim() || '';
    const pretEls     = row.querySelectorAll('.js-quantity__amount--new');
    const pretRaw     = pretEls[2]?.innerText?.trim() || pretEls[0]?.innerText?.trim() || '0';
    const pret        = parseFloat(pretRaw.replace(/\./g, '').replace(',', '.')) || 0;
    const cantEl      = row.querySelector('.js-quantity-input, .js-item-quantity, input.quantitycontrol__input');
    const cantitate   = parseInt(cantEl?.value) || 1;

    products.push({ cod_aftermarket: cod, descriere, producator: descTehnica || '—', pret_achizitie: pret, cantitate, adaos_procent: 0 });
  });

  return products;
}

// ─── FLOATING WIDGET ─────────────────────────────────────────
function buildWidget() {
  if (document.getElementById('crm-widget')) return;
  const furnizor = detectFurnizor();
  const w = document.createElement('div');
  w.id = 'crm-widget';
  w.innerHTML = `
    <div id="crm-widget-header">
      <span id="crm-logo">🔧 CRM Auto</span>
      <span id="crm-badge">0</span>
    </div>
    <div id="crm-widget-supplier">📦 ${furnizor}</div>
    <div id="crm-widget-body">
      <button id="crm-btn-scan">📋 Scanează coșul</button>
      <button id="crm-btn-open" disabled>✅ Finalizează comanda</button>
      <button id="crm-btn-clear">🗑️ Golește</button>
    </div>
  `;
  document.body.appendChild(w);
  document.getElementById('crm-btn-scan').addEventListener('click', handleScan);
  document.getElementById('crm-btn-open').addEventListener('click', openModal);
  document.getElementById('crm-btn-clear').addEventListener('click', clearCart);
}

function updateBadge() {
  const b = document.getElementById('crm-badge');
  if (b) b.textContent = clientCart.length;
  const btn = document.getElementById('crm-btn-open');
  if (btn) btn.disabled = clientCart.length === 0;
}

function handleScan() {
  const found = scrapeCart();
  if (found.length === 0) { showToast('Nu s-au găsit produse. Verifică că ești pe /ro/cart.', 'warn'); return; }
  const existing = new Set(clientCart.map(p => p.cod_aftermarket));
  const noi = found.filter(p => !existing.has(p.cod_aftermarket));
  clientCart.push(...noi);
  saveCart();
  updateBadge();
  showToast(
    noi.length > 0
      ? `${noi.length} produs(e) adăugate. Total: ${clientCart.length}`
      : 'Toate produsele sunt deja în coș.',
    noi.length > 0 ? 'success' : 'info'
  );
}

function clearCart() {
  clientCart = [];
  saveCart();
  updateBadge();
  showToast('Coș CRM golit.', 'info');
}

function saveCart() { chrome.storage.local.set({ [STORAGE_KEY]: clientCart }); }
function loadCart() {
  chrome.storage.local.get(STORAGE_KEY, d => {
    clientCart = d[STORAGE_KEY] || [];
    updateBadge();
  });
}

// ─── MODAL ───────────────────────────────────────────────────
function openModal() {
  if (document.getElementById('crm-modal-overlay')) return;
  const furnizor = detectFurnizor();

  const overlay = document.createElement('div');
  overlay.id = 'crm-modal-overlay';
  overlay.innerHTML = `
    <div id="crm-modal">
      <header id="crm-modal-header">
        <div style="display:flex;align-items:center;gap:12px">
          <h2>🛒 Finalizare Comandă</h2>
          <span class="crm-supplier-tag">📦 ${furnizor}</span>
        </div>
        <button id="crm-modal-close">✕</button>
      </header>

      <section id="crm-modal-products">
        <div class="crm-section-header">
          <h3>Produse (<span id="crm-prod-count">${clientCart.length}</span>)</h3>
          <div class="crm-adaos-global-row">
            <label for="crm-adaos-global">Adaos global:</label>
            <div class="crm-adaos-wrap">
              <input type="number" id="crm-adaos-global" value="0" min="0" max="999" step="0.5"/>
              <span>%</span>
            </div>
            <button id="crm-adaos-apply">Aplică la toate</button>
          </div>
        </div>

        <div class="crm-table-wrap">
          <table id="crm-products-table">
            <thead>
              <tr>
                <th>Cod</th>
                <th>Descriere</th>
                <th>Preț acq.</th>
                <th>Adaos %</th>
                <th>Preț vânzare</th>
                <th>Cant.</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="crm-products-body"></tbody>
          </table>
        </div>

        <div id="crm-totals-row">
          <div class="crm-total-item">
            <span class="crm-total-label">Total achiziție</span>
            <span class="crm-total-value"><span id="crm-total-acq">0.00</span> RON</span>
          </div>
          <div class="crm-total-item">
            <span class="crm-total-label">Total vânzare</span>
            <span class="crm-total-value crm-highlight"><span id="crm-total-vanzare">0.00</span> RON</span>
          </div>
          <div class="crm-total-item">
            <span class="crm-total-label">Profit estimat</span>
            <span class="crm-total-value crm-green"><span id="crm-profit">0.00</span> RON</span>
          </div>
        </div>
      </section>

      <section id="crm-modal-client">
        <h3>Client</h3>
        <div class="crm-field-row" style="position:relative">
          <input type="text" id="crm-client-search" placeholder="Caută client după nume..." autocomplete="off"/>
          <ul id="crm-client-suggestions"></ul>
        </div>
        <div class="crm-field-row" id="crm-new-client-row" style="display:none">
          <input type="text" id="crm-new-client-name" placeholder="Nume client nou"/>
          <input type="text" id="crm-new-client-phone" placeholder="Telefon"/>
          <button id="crm-btn-add-client">+ Adaugă</button>
        </div>
        <div id="crm-selected-client"></div>
      </section>

      <section id="crm-modal-payment">
        <h3>Plată</h3>
        <div class="crm-field-row">
          <label><input type="radio" name="plata" value="avans" checked/> Avans</label>
          <label><input type="radio" name="plata" value="achitat_integral"/> Achitat integral</label>
        </div>
        <div id="crm-avans-row" class="crm-field-row">
          <input type="number" id="crm-avans-input" placeholder="Sumă avans (RON)" min="0" step="0.01"/>
        </div>
      </section>

      <footer id="crm-modal-footer">
        <span id="crm-timestamp"></span>
        <button id="crm-btn-submit">💾 Plasează comanda</button>
      </footer>
    </div>
  `;
  document.body.appendChild(overlay);

  renderModalProducts();
  updateTotals();

  // Timestamp live
  const tsEl = document.getElementById('crm-timestamp');
  const tick = () => { tsEl.textContent = new Date().toLocaleString('ro-RO'); };
  tick();
  const tsInterval = setInterval(tick, 1000);

  // Adaos global
  document.getElementById('crm-adaos-apply').addEventListener('click', () => {
    const adaos = parseFloat(document.getElementById('crm-adaos-global').value) || 0;
    clientCart.forEach(p => { p.adaos_procent = adaos; });
    renderModalProducts();
    updateTotals();
  });

  // Toggle avans/integral
  overlay.querySelectorAll('input[name="plata"]').forEach(r =>
    r.addEventListener('change', () => {
      document.getElementById('crm-avans-row').style.display =
        r.value === 'avans' && r.checked ? 'flex' : 'none';
    })
  );

  document.getElementById('crm-client-search').addEventListener('input', debounce(searchClient, 300));

  document.getElementById('crm-modal-close').addEventListener('click', () => {
    clearInterval(tsInterval);
    overlay.remove();
  });

  document.getElementById('crm-btn-submit').addEventListener('click', submitOrder);
}

// ─── CALCUL PREȚ ─────────────────────────────────────────────
function calcVanzare(pretAcq, adaos) {
  return pretAcq * (1 + (adaos || 0) / 100);
}

function renderModalProducts() {
  const tbody = document.getElementById('crm-products-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  clientCart.forEach((p, i) => {
    const adaos   = p.adaos_procent ?? 0;
    const vanzare = calcVanzare(p.pret_achizitie, adaos);
    const total   = vanzare * p.cantitate;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="crm-cod">${p.cod_aftermarket}</td>
      <td style="max-width:180px;font-size:12px">${p.descriere}</td>
      <td><input class="crm-mini-input crm-price-input" type="number" value="${p.pret_achizitie}" min="0" step="0.01" data-idx="${i}"/></td>
      <td><input class="crm-mini-input crm-adaos-input" type="number" value="${adaos}" min="0" step="0.5" data-idx="${i}"/></td>
      <td class="crm-vanzare-cell crm-highlight">${vanzare.toFixed(2)}</td>
      <td><input class="crm-mini-input crm-qty-input" type="number" value="${p.cantitate}" min="1" data-idx="${i}" style="width:48px"/></td>
      <td class="crm-total-cell crm-green">${total.toFixed(2)}</td>
      <td><button class="crm-remove-btn" data-idx="${i}">✕</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.crm-price-input').forEach(el =>
    el.addEventListener('input', e => {
      clientCart[+e.target.dataset.idx].pret_achizitie = parseFloat(e.target.value) || 0;
      recalcRow(+e.target.dataset.idx); updateTotals();
    })
  );
  tbody.querySelectorAll('.crm-adaos-input').forEach(el =>
    el.addEventListener('input', e => {
      clientCart[+e.target.dataset.idx].adaos_procent = parseFloat(e.target.value) || 0;
      recalcRow(+e.target.dataset.idx); updateTotals();
    })
  );
  tbody.querySelectorAll('.crm-qty-input').forEach(el =>
    el.addEventListener('input', e => {
      clientCart[+e.target.dataset.idx].cantitate = parseInt(e.target.value) || 1;
      recalcRow(+e.target.dataset.idx); updateTotals();
    })
  );
  tbody.querySelectorAll('.crm-remove-btn').forEach(el =>
    el.addEventListener('click', e => {
      clientCart.splice(+e.target.dataset.idx, 1);
      renderModalProducts(); updateTotals(); updateBadge();
      const c = document.getElementById('crm-prod-count');
      if (c) c.textContent = clientCart.length;
    })
  );
}

function recalcRow(idx) {
  const tbody = document.getElementById('crm-products-body');
  if (!tbody) return;
  const row = tbody.rows[idx];
  if (!row) return;
  const p = clientCart[idx];
  const vanzare = calcVanzare(p.pret_achizitie, p.adaos_procent ?? 0);
  row.querySelector('.crm-vanzare-cell').textContent = vanzare.toFixed(2);
  row.querySelector('.crm-total-cell').textContent   = (vanzare * p.cantitate).toFixed(2);
}

function updateTotals() {
  const acq     = clientCart.reduce((s, p) => s + p.pret_achizitie * p.cantitate, 0);
  const vanzare = clientCart.reduce((s, p) => s + calcVanzare(p.pret_achizitie, p.adaos_procent ?? 0) * p.cantitate, 0);
  const profit  = vanzare - acq;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v.toFixed(2); };
  set('crm-total-acq',     acq);
  set('crm-total-vanzare', vanzare);
  set('crm-profit',        profit);
}

// ─── CĂUTARE CLIENT ──────────────────────────────────────────
let selectedClientId = null;

async function searchClient(e) {
  const q  = e.target.value.trim();
  const ul = document.getElementById('crm-client-suggestions');
  ul.innerHTML = '';
  document.getElementById('crm-new-client-row').style.display = 'none';
  if (q.length < 2) return;
  try {
    const results = await supabase.get('clienti', `select=id,nume,telefon&nume=ilike.*${encodeURIComponent(q)}*&limit=8`);
    if (results.length === 0) {
      const li = document.createElement('li');
      li.className = 'crm-suggestion-new';
      li.textContent = `+ Adaugă "${q}" ca client nou`;
      li.addEventListener('click', () => {
        ul.innerHTML = '';
        document.getElementById('crm-new-client-name').value = q;
        document.getElementById('crm-new-client-row').style.display = 'flex';
      });
      ul.appendChild(li);
    } else {
      results.forEach(c => {
        const li = document.createElement('li');
        li.textContent = `${c.nume}  •  ${c.telefon || '—'}`;
        li.addEventListener('click', () => { selectClient(c); ul.innerHTML = ''; });
        ul.appendChild(li);
      });
    }
  } catch (err) { showToast('Eroare căutare: ' + err.message, 'error'); }
}

function selectClient(c) {
  selectedClientId = c.id;
  document.getElementById('crm-client-search').value = c.nume;
  document.getElementById('crm-selected-client').innerHTML =
    `<span class="crm-tag">✔ ${c.nume} · ${c.telefon || '—'}</span>`;
}

document.addEventListener('click', async e => {
  if (e.target.id !== 'crm-btn-add-client') return;
  const nume    = document.getElementById('crm-new-client-name')?.value?.trim();
  const telefon = document.getElementById('crm-new-client-phone')?.value?.trim();
  if (!nume) { showToast('Introdu un nume!', 'warn'); return; }
  try {
    const [client] = await supabase.post('clienti', { nume, telefon });
    selectClient(client);
    document.getElementById('crm-new-client-row').style.display = 'none';
    showToast('Client adăugat!', 'success');
  } catch (err) { showToast('Eroare: ' + err.message, 'error'); }
});

// ─── PLASARE COMANDĂ ─────────────────────────────────────────
async function submitOrder() {
  if (!selectedClientId)       { showToast('Selectează un client!', 'warn'); return; }
  if (clientCart.length === 0) { showToast('Coșul e gol!', 'warn'); return; }

  const tipPlata     = document.querySelector('input[name="plata"]:checked')?.value || 'avans';
  const adaosGlobal  = parseFloat(document.getElementById('crm-adaos-global')?.value) || 0;
  const totalVanzare = clientCart.reduce((s, p) => s + calcVanzare(p.pret_achizitie, p.adaos_procent ?? adaosGlobal) * p.cantitate, 0);
  const avans        = tipPlata === 'achitat_integral' ? totalVanzare
                     : parseFloat(document.getElementById('crm-avans-input')?.value) || 0;

  const btn = document.getElementById('crm-btn-submit');
  btn.disabled = true; btn.textContent = '⏳ Se salvează...';

  try {
    const [comanda] = await supabase.post('comenzi', {
      client_id:     selectedClientId,
      tip_plata:     tipPlata,
      total_plata:   parseFloat(totalVanzare.toFixed(2)),
      avans_achitat: avans,
      adaos_procent: adaosGlobal,
      furnizor:      detectFurnizor(),
      furnizor_url:  window.location.href,
    });

    const produse = clientCart.map(p => ({
      comanda_id:      comanda.id,
      cod_aftermarket: p.cod_aftermarket,
      descriere:       p.descriere,
      producator:      p.producator,
      pret_achizitie:  p.pret_achizitie,
      pret_vanzare:    parseFloat(calcVanzare(p.pret_achizitie, p.adaos_procent ?? adaosGlobal).toFixed(2)),
      cantitate:       p.cantitate,
    }));
    await supabase.post('produse_comandate', produse);

    const nr = comanda.nr_comanda ? `CMD-${String(comanda.nr_comanda).padStart(4, '0')}` : '';
    showToast(`✅ Comanda ${nr} plasată! Total: ${totalVanzare.toFixed(2)} RON`, 'success');
    clearCart();
    document.getElementById('crm-modal-overlay')?.remove();
    selectedClientId = null;
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
    btn.disabled = false; btn.textContent = '💾 Plasează comanda';
  }
}

// ─── TOAST — apare mereu deasupra modalului ──────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('crm-modal-overlay') || document.body;
  const toast = document.createElement('div');
  toast.className = `crm-toast crm-toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('crm-toast-show'), 10);
  setTimeout(() => {
    toast.classList.remove('crm-toast-show');
    setTimeout(() => toast.remove(), 400);
  }, 3800);
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ─── INIT ─────────────────────────────────────────────────────
loadCart();
buildWidget();

if (window.location.pathname.includes('/cart') || window.location.pathname.includes('/cos')) {
  setTimeout(() => {
    const found = scrapeCart();
    if (found.length > 0) showToast(`${found.length} produse detectate. Apasă "Scanează".`, 'info');
  }, 1500);
}
