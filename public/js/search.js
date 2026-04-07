// search.js — CRM Piese Auto
// ════════════════════════════════════════════════════════════
// Căutare globală — comenzi, clienți, produse, facturi

let _searchTimer = null;

function globalSearchDebounce(q) {
  clearTimeout(_searchTimer);
  if(!q || q.length < 2) {
    closeGlobalSearch();
    return;
  }
  _searchTimer = setTimeout(() => runGlobalSearch(q), 300);
}

function openGlobalSearch() {
  const q = document.getElementById('global-search-input')?.value?.trim();
  if(q && q.length >= 2) runGlobalSearch(q);
}

function closeGlobalSearch() {
  const el = document.getElementById('global-search-results');
  if(el) el.style.display = 'none';
}

async function runGlobalSearch(q) {
  const resultsEl = document.getElementById('global-search-results');
  if(!resultsEl) return;
  resultsEl.style.display = 'block';
  resultsEl.innerHTML = '<div style="padding:12px;color:var(--muted);font-size:13px"><span class="spinner"></span> Se caută...</div>';

  try {
    const enc = encodeURIComponent(q);

    // Parallel searches
    const [comenzi, clienti, produse, facturi] = await Promise.all([
      // Comenzi - după client sau cod unic
      api(`dashboard_comenzi?or=(client_nume.ilike.*${enc}*,cod_comanda_unic.ilike.*${enc}*)&select=id,nr_comanda,cod_comanda_unic,client_nume,status_general,total_plata&limit=5`).catch(()=>[]),
      // Clienți
      api(`clienti?or=(nume.ilike.*${enc}*,telefon.ilike.*${enc}*,email.ilike.*${enc}*)&select=id,nume,telefon&limit=5`).catch(()=>[]),
      // Produse - după cod sau descriere
      api(`produse_comandate?or=(cod_aftermarket.ilike.*${enc}*,descriere.ilike.*${enc}*,sku.ilike.*${enc}*)&select=id,cod_aftermarket,descriere,sku,comanda_id,status_produs&limit=5`).catch(()=>[]),
      // Facturi
      api(`facturi?nr_factura=ilike.*${enc}*&select=id,nr_factura,furnizor,status&limit=3`).catch(()=>[]),
    ]);

    const sections = [];

    if(comenzi.length) {
      sections.push(`
        <div class="gs-section">
          <div class="gs-label">📋 Comenzi</div>
          ${comenzi.map(o => `
            <div class="gs-item" onclick="loadDetail('${o.id}', allOrders.find(x=>x.id==='${o.id}') || {}); closeGlobalSearch(); document.getElementById('global-search-input').value=''">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span class="gs-title">${escHtml(o.cod_comanda_unic||fmtNr(o.nr_comanda))}</span>
                <span style="font-size:11px;color:var(--muted)">${fmtRON(o.total_plata)} RON</span>
              </div>
              <div class="gs-sub">${escHtml(o.client_nume||'—')}</div>
            </div>
          `).join('')}
        </div>
      `);
    }

    if(clienti.length) {
      sections.push(`
        <div class="gs-section">
          <div class="gs-label">👤 Clienți</div>
          ${clienti.map(c => `
            <div class="gs-item" onclick="navigate('clienti'); setTimeout(()=>loadClientDetail('${c.id}'),300); closeGlobalSearch(); document.getElementById('global-search-input').value=''">
              <div class="gs-title">${escHtml(c.nume)}</div>
              <div class="gs-sub">${escHtml(c.telefon||'—')}</div>
            </div>
          `).join('')}
        </div>
      `);
    }

    if(produse.length) {
      sections.push(`
        <div class="gs-section">
          <div class="gs-label">🔧 Produse</div>
          ${produse.map(p => `
            <div class="gs-item" onclick="${p.comanda_id ? `loadDetail('${p.comanda_id}', allOrders.find(x=>x.id==='${p.comanda_id}') || {}); closeGlobalSearch()` : `navigate('produse'); closeGlobalSearch()`}; document.getElementById('global-search-input').value=''">
              <div style="display:flex;justify-content:space-between">
                <span class="gs-title font-mono">${escHtml(p.cod_aftermarket)}</span>
                <span class="badge b-${p.status_produs}" style="font-size:10px">${p.status_produs}</span>
              </div>
              <div class="gs-sub">${escHtml(p.descriere||'')} ${p.sku ? `· SKU: ${escHtml(p.sku)}` : ''}</div>
            </div>
          `).join('')}
        </div>
      `);
    }

    if(facturi.length) {
      sections.push(`
        <div class="gs-section">
          <div class="gs-label">🧾 Facturi</div>
          ${facturi.map(f => `
            <div class="gs-item" onclick="navigate('facturi'); setTimeout(()=>openFacturaWorkspace('${escHtml(f.nr_factura)}'),400); closeGlobalSearch(); document.getElementById('global-search-input').value=''">
              <div class="gs-title font-mono">${escHtml(f.nr_factura)}</div>
              <div class="gs-sub">${escHtml(f.furnizor||'—')}</div>
            </div>
          `).join('')}
        </div>
      `);
    }

    if(!sections.length) {
      resultsEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--muted)">
        Niciun rezultat pentru "<strong>${escHtml(q)}</strong>"
      </div>`;
      return;
    }

    resultsEl.innerHTML = `
      <div style="padding:8px 12px;border-bottom:1px solid var(--border);font-size:11px;color:var(--muted);font-weight:600">
        Rezultate pentru "<strong style="color:var(--text)">${escHtml(q)}</strong>"
      </div>
      ${sections.join('')}
    `;

  } catch(e) {
    resultsEl.innerHTML = `<div style="padding:12px;color:var(--red);font-size:12px">Eroare: ${e.message}</div>`;
  }
}

// Close on outside click
document.addEventListener('click', e => {
  if(!e.target.closest('#global-search-input') && !e.target.closest('#global-search-results')) {
    closeGlobalSearch();
  }
});

// Close on Escape
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') {
    closeGlobalSearch();
    document.getElementById('global-search-input')?.blur();
  }
});
