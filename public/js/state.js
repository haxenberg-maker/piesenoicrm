// state.js — CRM Piese Auto
// ════════════════════════════════════════════════════════════
// State global — variabile partajate între module

// Auth
let accessToken = null;
let currentUserRole  = null;
let currentUserEmail = null;
let currentUserId    = null;

// Data caches
let allOrders    = [];
let allClients   = [];
let allLogs      = [];
let allUsers     = [];
let _facturiDb   = [];
let invoiceProducts = [];
let _produseCacheByOrder = null;
let _produseFetchedForSearch = false;

// Edit state
let currentOrderId  = null;
let currentClientId = null;
let editOrderId     = null;
let editClientId    = null;
let editUserId      = null;
let newOrderProducts = [];

// Modal state
let _atoComandaId    = null;
let _atoCodUnic      = null;
let _atoNrProduse    = 0;
let _plataComandaId  = null;
let _returProdId     = null;

// Invoice state
let _invSearchTimer;
let _invCodUnicTimer;

// Google Drive
let _gdriveToken     = null;
let _gdriveLoaded    = false;
let _pendingUploadNr = null;

// Misc
let autosaveTimers   = {};

// Formatters & helpers
const fmtNr   = n => n ? `CMD-${String(n).padStart(4,'0')}` : '—';
const fmtDate = d => new Date(d).toLocaleDateString('ro-RO');
const fmtRON  = v => (+v||0).toFixed(2);
const calcRest  = o => o.tip_plata==='achitat_integral' ? 0 : Math.max(0, (+o.total_plata||0)-(+o.avans_achitat||0));
const isAchitat = o => o.tip_plata==='achitat_integral' || calcRest(o)<=0;
const escHtml   = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');