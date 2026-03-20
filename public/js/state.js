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