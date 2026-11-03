/* ============================================================
   Emerald Pharmacy — Cashier Dashboard JS
   Location: js/cashier_dashboard.js
   ============================================================ */

const API = (file) => `../api/${file}`;

// ── State ────────────────────────────────────────────────────
let currentTab     = 'dashboard';
let dashboardData  = { pending_orders: [], transactions: [] };
let currentOrder   = null;
let isProcessing   = false;
let reportData     = [];
let reportStart    = todayStr();
let reportEnd      = todayStr();

// Auto-refresh — polls silently every 8 seconds
let autoRefreshTimer  = null;
const AUTO_REFRESH_MS = 8000;
let lastPendingCount  = 0; // track to detect new incoming orders

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    fetchData();
    startAutoRefresh();

    document.addEventListener('click', (e) => {
        const dd = document.getElementById('profile-dropdown');
        if (dd && dd.classList.contains('show') && !e.target.closest('.user-profile')) {
            dd.classList.remove('show');
        }
    });
});

function updateDate() {
    const el = document.getElementById('topbar-date');
    if (el) el.textContent = new Date().toLocaleDateString('en-PH', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
}

// ============================================================
//  AUTO-REFRESH
//  - Runs every 8 seconds silently in the background
//  - Only updates the parts that changed (no full page wipe)
//  - Pauses while a modal is open so it doesn't interrupt the cashier
// ============================================================
function startAutoRefresh() {
    stopAutoRefresh();
    autoRefreshTimer = setInterval(() => {
        if (currentTab === 'dashboard' && !currentOrder) {
            silentRefresh();
        }
    }, AUTO_REFRESH_MS);
}

function stopAutoRefresh() {
    if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
}

async function silentRefresh() {
    try {
        const res  = await fetch(API('cashier_dashboard_api.php'));
        const data = await res.json();
        dashboardData = data;

        const pending = data.pending_orders || [];
        const txns    = data.transactions   || [];

        // ── Detect new orders → notify cashier ──────────────
        if (pending.length > lastPendingCount && lastPendingCount >= 0) {
            const newCount = pending.length - lastPendingCount;
            flashPendingBadge();
            showToast(`🔔 ${newCount} new order${newCount > 1 ? 's' : ''} arrived!`);
        }
        lastPendingCount = pending.length;

        // ── Update sidebar badge ─────────────────────────────
        updatePendingBadge(pending.length);

        // ── Patch stat numbers in-place (no flicker) ────────
        patchStat('stat-pending', pending.length);
        const totalSales = txns.reduce((s, t) => s + parseFloat(t.total || 0), 0);
        patchStat('stat-sales', '₱' + totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2 }));
        patchStat('stat-txns', txns.length);

        // ── Patch pending orders table only ──────────────────
        const pendingWrap = document.getElementById('pending-wrap');
        if (pendingWrap) pendingWrap.innerHTML = buildPendingTableInner(pending);

        // ── Patch transactions table only ────────────────────
        const txnWrap = document.getElementById('txn-tbody-wrap');
        if (txnWrap) txnWrap.innerHTML = buildTransactionsTableInner(txns);

    } catch (e) { /* silent — don't show errors on background polls */ }
}

function patchStat(id, val) {
    const el = document.getElementById(id);
    if (el && el.textContent !== String(val)) el.textContent = val;
}

function flashPendingBadge() {
    const b = document.getElementById('pending-badge');
    if (!b) return;
    b.classList.remove('badge-flash');
    void b.offsetWidth; // force reflow to restart animation
    b.classList.add('badge-flash');
    setTimeout(() => b.classList.remove('badge-flash'), 2000);
}

// ============================================================
//  NAVIGATION
// ============================================================
function loadPage(page) {
    currentTab = page;

    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    const nav = document.getElementById(`nav-${page}`);
    if (nav) nav.classList.add('active');

    const titles = { dashboard: 'Dashboard', sales: 'Point of Sale', report: 'Sales Report', stock: 'View Stock' };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[page] || page;

    // On POS: hide entire top-bar and remove main-content padding
    const topBar   = document.getElementById('top-bar');
    const mainEl   = document.querySelector('.main-content');
    const dateEl    = document.getElementById('topbar-date');
    const refreshEl = document.getElementById('topbar-refresh');
    const userEl    = document.getElementById('user-profile-wrap');

    if (page === 'sales') {
        if (topBar) topBar.style.display = 'none';
        if (mainEl) mainEl.style.padding = '0';
    } else {
        if (topBar) topBar.style.display = '';
        if (mainEl) mainEl.style.padding = '';
        if (dateEl)    dateEl.style.display    = page === 'dashboard' ? '' : 'none';
        if (refreshEl) refreshEl.style.display = page === 'dashboard' ? '' : 'none';
        if (userEl)    userEl.style.display    = page === 'dashboard' ? '' : 'none';
    }

    if      (page === 'dashboard') fetchData();
    else if (page === 'sales')     renderSalesPage();
    else if (page === 'report')    renderReportPage();
    else if (page === 'stock')     renderStockPage();
}

// ============================================================
//  FULL FETCH — used on page load and manual refresh button
// ============================================================
async function fetchData() {
    setLoading();
    try {
        const res  = await fetch(API('cashier_dashboard_api.php'));
        const data = await res.json();
        dashboardData    = data;
        lastPendingCount = (data.pending_orders || []).length;
        renderDashboard(data);
        updatePendingBadge(lastPendingCount);
    } catch (e) {
        document.getElementById('dynamic-content').innerHTML = `
            <div class="empty-state">
                <i class="material-icons">wifi_off</i>
                <p>Cannot connect to server. Please check your connection.</p>
            </div>`;
    }
}

function setLoading() {
    document.getElementById('dynamic-content').innerHTML = `
        <div class="loading-state">
            <i class="material-icons spin">autorenew</i>
            <span>Loading...</span>
        </div>`;
}

function updatePendingBadge(count) {
    const b = document.getElementById('pending-badge');
    if (!b) return;
    b.textContent   = count;
    b.style.display = count > 0 ? '' : 'none';
}

// ============================================================
//  RENDER FULL DASHBOARD
// ============================================================
function renderDashboard(data) {
    const pending    = data.pending_orders || [];
    const txns       = data.transactions   || [];
    const totalSales = txns.reduce((s, t) => s + parseFloat(t.total || 0), 0);

    document.getElementById('dynamic-content').innerHTML = `

        <div class="stat-grid">
            <div class="stat-card">
                <i class="material-icons color-orange">pending_actions</i>
                <p>Pending Orders</p>
                <h2 id="stat-pending">${pending.length}</h2>
            </div>
            <div class="stat-card">
                <i class="material-icons color-green">payments</i>
                <p>Total Sales (Today)</p>
                <h2 id="stat-sales">₱${totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</h2>
            </div>
            <div class="stat-card">
                <i class="material-icons color-blue">swap_horiz</i>
                <p>Transactions</p>
                <h2 id="stat-txns">${txns.length}</h2>
            </div>
        </div>

        <div class="table-card">
            <h3 style="display:flex;align-items:center;gap:10px">
                Pending Orders
                <span style="font-size:0.72rem;color:var(--accent-green);font-weight:500;margin-left:auto;display:flex;align-items:center;gap:4px">
                    <i class="material-icons spin" style="font-size:0.9rem">autorenew</i> Live
                </span>
            </h3>
            <div class="table-responsive" id="pending-wrap">
                ${buildPendingTableInner(pending)}
            </div>
        </div>

        <div class="table-card">
            <h3>Recent Transactions</h3>
            <div class="table-responsive" id="txn-tbody-wrap">
                ${buildTransactionsTableInner(txns)}
            </div>
        </div>`;
}

// ── Pending Orders inner HTML (patchable without full reload) ─
function buildPendingTableInner(orders) {
    if (!orders.length) {
        return `<div class="empty-state">
                    <i class="material-icons">event_available</i>
                    <p>No pending orders right now.</p>
                </div>`;
    }

    const rows = orders.map(o => {
        const method      = o.payment_type || 'Cash';
        const methodBadge = method.toUpperCase() === 'GCASH'
            ? `<span class="badge badge-gcash">GCash</span>`
            : `<span class="badge badge-cash">Cash</span>`;
        return `
        <tr id="order-row-${escHtml(String(o.id))}">
            <td><strong>${escHtml(o.customer_name || 'Walk-in')}</strong></td>
            <td>${methodBadge}</td>
            <td>${escHtml(formatMedicines(o.medicines))}</td>
            <td><strong>₱${parseFloat(o.total || 0).toFixed(2)}</strong></td>
            <td>
                <button class="btn-process" onclick='openProcessModal(${JSON.stringify(JSON.stringify(o))})'>
                    <i class="material-icons">bolt</i> Process
                </button>
            </td>
        </tr>`;
    }).join('');

    return `<table>
        <thead>
            <tr>
                <th>Customer</th>
                <th>Method</th>
                <th>Medicines</th>
                <th>Total</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody id="pending-tbody">${rows}</tbody>
    </table>`;
}

// ── Transactions inner HTML (patchable) ──────────────────────
function buildTransactionsTableInner(txns) {
    if (!txns.length) {
        return `<div class="empty-state">
                    <i class="material-icons">receipt</i>
                    <p>No recent transactions.</p>
                </div>`;
    }

    const rows = txns.map(t => {
        const method      = t.payment_type || 'Cash';
        const methodBadge = method.toUpperCase() === 'GCASH'
            ? `<span class="badge badge-gcash">GCash</span>`
            : `<span class="badge badge-cash">Cash</span>`;
        const status      = t.status || 'Completed';
        const statusBadge = `<span class="badge badge-${status.toLowerCase()}">${escHtml(status)}</span>`;

        return `<tr>
            <td style="color:var(--text-muted)">${escHtml(t.receipt_no || 'N/A')}</td>
            <td><strong>${escHtml(t.customer_name || 'Walk-in')}</strong></td>
            <td style="color:var(--text-muted)">${escHtml(t.sale_date || '')}</td>
            <td>${escHtml(formatMedicines(t.medicines))}</td>
            <td><strong>₱${parseFloat(t.total || 0).toFixed(2)}</strong></td>
            <td>${methodBadge}</td>
            <td>${statusBadge}</td>
        </tr>`;
    }).join('');

    return `<table>
        <thead>
            <tr>
                <th>Receipt</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Medicines</th>
                <th>Total</th>
                <th>Method</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>`;
}

// ============================================================
//  PROCESS ORDER MODAL
// ============================================================
function openProcessModal(orderJson) {
    currentOrder = JSON.parse(orderJson);
    document.getElementById('process-modal-footer').style.display = 'none';
    document.getElementById('process-modal-body').innerHTML = `
        <div class="loading-state">
            <i class="material-icons spin">autorenew</i>
            <span style="color:rgba(255,255,255,0.5)">Loading order details...</span>
        </div>`;
    showModal('processModal');
    fetchOrderDetail(currentOrder.id);
}

function closeProcessModal() {
    closeModal('processModal');
    currentOrder = null;
    isProcessing = false;
    const btn = document.getElementById('btn-confirm');
    if (btn) { btn.innerHTML = `<i class="material-icons">check_circle</i> CONFIRM`; btn.disabled = false; }
}

async function fetchOrderDetail(orderId) {
    try {
        const res  = await fetch(API('process_order.php'), {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ order_id: orderId })
        });
        const data = await res.json();
        if (data.success) {
            // Use all fields from process_order.php
            currentOrder.medicines    = data.medicines;
            currentOrder.sale_date    = data.sale_date    || currentOrder.sale_date;
            currentOrder.receipt_no   = data.receipt_no   || currentOrder.receipt_no;
            currentOrder.payment_type = data.payment_type || currentOrder.payment_type;
            currentOrder.customer_name= data.customer_name|| currentOrder.customer_name;
            currentOrder.total        = data.total        || currentOrder.total;
            // No proof_image — prescription removed from cashier modal
        }
    } catch (e) { /* use data from pending list as fallback */ }
    renderModalBody();
}

function renderModalBody() {
    const o         = currentOrder;
    const meds      = parseMedicines(o.medicines);
    const method    = o.payment_type  || 'Cash';
    const receiptNo = o.receipt_no    || '—';
    const dateStr   = o.sale_date     || new Date().toLocaleString('en-PH');
    const customer  = o.customer_name || 'Walk-in';
    const isGCash   = method.toUpperCase() === 'GCASH';

    // Items list — matches customer "My Orders" receipt style
    const medsHtml = meds.length
        ? meds.map(m => `
            <div class="mo-item-row">
                <span class="mo-item-qty">${escHtml(String(m.qty))}x</span>
                <span class="mo-item-name">${escHtml(m.name)}</span>
                <span class="mo-item-price">₱${parseFloat(m.price || 0).toFixed(2)}</span>
            </div>`).join('')
        : `<p style="color:var(--text-muted);font-size:0.85rem;margin:8px 0">No item details available.</p>`;

    // Render receipt-style modal (no prescription image)
    document.getElementById('process-modal-body').innerHTML = `
        <div class="mo-receipt-header">
            <div class="mo-pharmacy-name">EMERALD PHARMACY 24/7</div>
            <div class="mo-receipt-date">${escHtml(dateStr)}</div>
            <div class="mo-receipt-no">Receipt: ${escHtml(receiptNo)}</div>
        </div>
        <div class="mo-body">
            <div class="mo-status-row">
                <span class="mo-status-badge mo-status-pending">
                    <i class="material-icons" style="font-size:0.9rem">hourglass_top</i>
                    PENDING
                </span>
            </div>
            <div class="mo-info-block">
                <div class="mo-info-row">
                    <span class="mo-info-label">
                        <i class="material-icons" style="font-size:0.95rem">person</i> Customer
                    </span>
                    <span class="mo-info-val">${escHtml(customer)}</span>
                </div>
            </div>
            <div class="mo-divider"></div>
            <div class="mo-section-title">Items Ordered</div>
            <div class="mo-items">${medsHtml}</div>
            <div class="mo-divider"></div>
            <div class="mo-total-row">
                <span class="mo-total-label">TOTAL</span>
                <span class="mo-total-val">₱${parseFloat(o.total || 0).toFixed(2)}</span>
            </div>
            <div class="mo-payment-row">
                <i class="material-icons mo-pay-icon ${isGCash ? 'gcash' : 'cash'}">
                    ${isGCash ? 'phone_android' : 'payments'}
                </i>
                <span class="mo-pay-label ${isGCash ? 'gcash' : 'cash'}">Paid via ${escHtml(method)}</span>
            </div>
        </div>`;

    document.getElementById('modal-total-val').textContent = `₱${parseFloat(o.total || 0).toFixed(2)}`;
    document.getElementById('process-modal-footer').style.display = '';
}

// ── Confirm Order ─────────────────────────────────────────────
async function confirmOrder() {
    if (isProcessing || !currentOrder) return;
    isProcessing = true;

    const btn = document.getElementById('btn-confirm');
    btn.innerHTML = `<div class="btn-spinner"></div> Processing...`;
    btn.disabled  = true;

    try {
        const res  = await fetch(API('cashier_dashboard_api.php'), {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ order_id: currentOrder.id })
        });
        const data = await res.json();

        if (data.success) {
            currentOrder.receipt_no = data.receipt_no || currentOrder.receipt_no;

            // 1. Close process modal
            closeModal('processModal');

            // 2. Instantly remove the row — no page reload
            removeOrderFromTable(currentOrder.id);

            // 3. Show receipt
            buildReceiptModal(currentOrder);
            showModal('receiptModal');

            // 4. Update stats silently in background
            silentRefresh();

            isProcessing = false;

        } else {
            showToast(data.message || 'Failed to process order.', true);
            btn.innerHTML = `<i class="material-icons">check_circle</i> CONFIRM`;
            btn.disabled  = false;
            isProcessing  = false;
        }
    } catch (e) {
        showToast('Connection error. Please try again.', true);
        btn.innerHTML = `<i class="material-icons">check_circle</i> CONFIRM`;
        btn.disabled  = false;
        isProcessing  = false;
    }
}

// Remove the processed order row with a smooth animation
function removeOrderFromTable(orderId) {
    const row = document.getElementById(`order-row-${orderId}`);
    if (!row) return;
    row.style.transition = 'opacity 0.3s, transform 0.3s';
    row.style.opacity    = '0';
    row.style.transform  = 'translateX(20px)';
    setTimeout(() => {
        row.remove();
        const tbody = document.getElementById('pending-tbody');
        if (tbody && tbody.children.length === 0) {
            const wrap = document.getElementById('pending-wrap');
            if (wrap) wrap.innerHTML = `
                <div class="empty-state">
                    <i class="material-icons">event_available</i>
                    <p>No pending orders right now.</p>
                </div>`;
        }
    }, 320);
}

// ============================================================
//  RECEIPT MODAL
// ============================================================
function buildReceiptModal(order) {
    const meds      = parseMedicines(order.medicines);
    const receiptNo = order.receipt_no || `REC-${Date.now()}`;
    const dateStr   = new Date().toLocaleString('en-PH');
    const method    = order.payment_type || ((!order.customer_name || order.customer_name === 'Walk-in') ? 'Cash' : 'GCash');
    const total     = parseFloat(order.total || 0).toFixed(2);

    document.getElementById('receipt-info').innerHTML = `
        <div class="receipt-info-row"><span class="k">Receipt No.</span><span class="v">${escHtml(receiptNo)}</span></div>
        <div class="receipt-info-row"><span class="k">Order ID</span><span class="v">#${escHtml(String(order.id))}</span></div>
        <div class="receipt-info-row"><span class="k">Customer</span><span class="v">${escHtml(order.customer_name || 'Walk-in')}</span></div>
        <div class="receipt-info-row"><span class="k">Date</span><span class="v">${escHtml(dateStr)}</span></div>
        <div class="receipt-info-row"><span class="k">Payment</span><span class="v">${escHtml(method)}</span></div>`;

    document.getElementById('receipt-items').innerHTML = meds.length
        ? meds.map(m => `
            <div class="receipt-item-row">
                <span class="receipt-item-name">${escHtml(m.name)}</span>
                <span class="receipt-item-qty">x${escHtml(String(m.qty))}</span>
                <span class="receipt-item-price">₱${parseFloat(m.price || 0).toFixed(2)}</span>
            </div>`).join('')
        : `<div style="font-size:0.85rem;color:var(--text-muted)">—</div>`;

    document.getElementById('receipt-total').textContent = `₱${total}`;
    // Store full HTML for new-window printing (suppresses browser date/title headers)
    const printHtml = buildPrintHTML(order, meds, receiptNo, dateStr, method, total);
    document.getElementById('print-area').setAttribute('data-html', printHtml);
}

// Close receipt — cashier stays on dashboard, next order is already visible
function closeReceiptAndRefresh() {
    closeModal('receiptModal');
    showToast('✅ Order confirmed! Ready for the next one.');
    silentRefresh();
}

function printReceipt() {
    const html = document.getElementById('print-area').getAttribute('data-html') || '';
    if (!html) { showToast('Nothing to print.', true); return; }
    const win = window.open('', '_blank', 'width=420,height=700,toolbar=0,menubar=0,scrollbars=1');
    win.document.open();
    win.document.write(html);
    win.document.close();
    // Wait for content + image to load before printing
    win.onload = function() {
        setTimeout(() => { win.focus(); win.print(); }, 250);
    };
    // Fallback if onload doesn't fire
    setTimeout(() => { try { win.focus(); win.print(); } catch(e){} }, 800);
}

function buildPrintHTML(order, meds, receiptNo, dateStr, method, total) {
    const rows = meds.map(m =>
        `<tr>
            <td class="item-name">${escHtml(m.name)}</td>
            <td class="item-qty">x${escHtml(String(m.qty))}</td>
            <td class="item-price">&#8369;${parseFloat(m.price || 0).toFixed(2)}</td>
        </tr>`
    ).join('');

    // Logo path — same as sidebar logo
    const logoSrc = '../assets/logo.png';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Receipt</title>
<style>
  /* ── Remove browser date/title headers completely ── */
  @page {
    size: 80mm auto;
    margin: 0;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 10pt;
    color: #000;
    width: 76mm;
    margin: 6mm auto;
    padding: 0;
  }

  /* Header */
  .header {
    text-align: center;
    padding-bottom: 8px;
    border-bottom: 2px solid #0F3D2E;
    margin-bottom: 10px;
  }
  .logo {
    width: 52px;
    height: 52px;
    object-fit: contain;
    display: block;
    margin: 0 auto 6px;
  }
  .logo-fallback {
    width: 52px; height: 52px;
    background: #0F3D2E; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 6px; color: #fff;
    font-size: 22px; font-weight: bold;
  }
  .pharmacy-name {
    font-size: 13pt;
    font-weight: 800;
    color: #0F3D2E;
    letter-spacing: 0.5px;
  }
  .pharmacy-addr {
    font-size: 8pt;
    color: #555;
    margin-top: 2px;
  }
  .receipt-title {
    font-size: 10pt;
    font-weight: 700;
    color: #0F3D2E;
    margin-top: 6px;
    letter-spacing: 1px;
  }

  /* Info block */
  .info-block { margin-bottom: 10px; }
  .info-row {
    display: flex;
    justify-content: space-between;
    font-size: 9pt;
    padding: 2px 0;
    color: #333;
  }
  .info-row .label { color: #666; }
  .info-row .value { font-weight: 600; text-align: right; max-width: 60%; word-break: break-word; }

  /* Dividers */
  .divider      { border: none; border-top: 1px solid #ccc; margin: 8px 0; }
  .divider-dash { border: none; border-top: 1px dashed #999; margin: 8px 0; }

  /* Items table */
  .items-section { margin-bottom: 6px; }
  .items-title {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #0F3D2E;
    margin-bottom: 6px;
  }
  table { width: 100%; border-collapse: collapse; }
  thead th {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #666;
    padding: 3px 2px;
    border-bottom: 1px solid #ccc;
  }
  thead th:nth-child(2) { text-align: center; }
  thead th:nth-child(3) { text-align: right; }
  .item-name  { padding: 5px 2px; font-size: 9.5pt; vertical-align: top; }
  .item-qty   { padding: 5px 2px; text-align: center; font-size: 9.5pt; color: #555; }
  .item-price { padding: 5px 2px; text-align: right; font-size: 9.5pt; font-weight: 600; }
  tbody tr { border-bottom: 1px dotted #eee; }
  tbody tr:last-child { border-bottom: none; }

  /* Total */
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0 4px;
  }
  .total-label { font-size: 12pt; font-weight: 800; color: #0F3D2E; }
  .total-val   { font-size: 14pt; font-weight: 800; color: #0F3D2E; }

  /* Payment */
  .payment-row {
    font-size: 9pt;
    color: #555;
    padding: 3px 0;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  /* Footer */
  .footer {
    text-align: center;
    font-size: 8.5pt;
    color: #777;
    font-style: italic;
    margin-top: 14px;
    padding-top: 8px;
    border-top: 1px solid #ddd;
  }
</style>
</head>
<body>

  <div class="header">
    <img class="logo" src="${logoSrc}" alt="Logo"
         onerror="this.style.display='none';document.getElementById('logo-fb').style.display='flex'">
    <div class="logo-fallback" id="logo-fb" style="display:none">E</div>
    <div class="pharmacy-name">EMERALD 24/7 PHARMACY</div>
    <div class="pharmacy-addr">Barra, Opol, Mis Or.</div>
    <div class="receipt-title">&#x2022; OFFICIAL RECEIPT &#x2022;</div>
  </div>

  <div class="info-block">
    <div class="info-row">
      <span class="label">Receipt No.</span>
      <span class="value">${escHtml(receiptNo)}</span>
    </div>
    <div class="info-row">
      <span class="label">Customer</span>
      <span class="value">${escHtml(order.customer_name || 'Walk-in')}</span>
    </div>
    <div class="info-row">
      <span class="label">Date</span>
      <span class="value">${escHtml(dateStr)}</span>
    </div>
  </div>

  <hr class="divider">

  <div class="items-section">
    <div class="items-title">Items Ordered</div>
    <table>
      <thead>
        <tr>
          <th style="text-align:left">Item</th>
          <th>Qty</th>
          <th style="text-align:right">Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <hr class="divider-dash">

  <div class="total-row">
    <span class="total-label">TOTAL</span>
    <span class="total-val">&#8369;${escHtml(total)}</span>
  </div>

  <div class="payment-row">
    &#9632; Paid via ${escHtml(method)}
  </div>

  <div class="footer">
    Thank you for choosing Emerald!<br>
    Please come again. &#128149;
  </div>

</body>
</html>`;
}

// ============================================================
//  SALES PAGE (POS placeholder)
// ============================================================
// ============================================================
//  POS STATE
// ============================================================
let posProducts  = [];
let posCart      = [];
let posSearch    = '';

function renderSalesPage() {
    document.getElementById('dynamic-content').innerHTML = `
        <div class="pos-wrap">
            <!-- LEFT: Products -->
            <div class="pos-left">
                <div class="pos-search-wrap">
                    <i class="material-icons">search</i>
                    <input type="text" id="pos-search" placeholder="Search medicine..."
                           oninput="posFilterProducts(this.value)">
                </div>
                <div class="pos-grid" id="pos-grid">
                    <div class="loading-state"><i class="material-icons spin">autorenew</i><span>Loading products...</span></div>
                </div>
            </div>
            <!-- RIGHT: Cart -->
            <div class="pos-right">
                <div class="pos-cart-title">ORDER DETAILS</div>
                <div class="pos-cart-list" id="pos-cart-list">
                    <div class="pos-cart-empty"><i class="material-icons">shopping_cart</i><span>No items added</span></div>
                </div>
                <div class="pos-cart-footer">
                    <div class="pos-total-row">
                        <span class="pos-total-label">Total Due</span>
                        <span class="pos-total-val" id="pos-total">₱0.00</span>
                    </div>
                    <div class="pos-input-row">
                        <label class="pos-input-label">Cash Received</label>
                        <div class="pos-cash-wrap">
                            <span class="pos-peso">₱</span>
                            <input type="number" id="pos-cash" min="0" step="0.01"
                                   placeholder="0.00" oninput="posUpdateChange()">
                        </div>
                    </div>
                    <div class="pos-change-row">
                        <span>Change</span>
                        <span id="pos-change">₱0.00</span>
                    </div>
                    <button class="pos-pay-btn" id="pos-pay-btn" onclick="posProcessPayment()" disabled>
                        <i class="material-icons">point_of_sale</i>
                        PROCESS PAYMENT
                    </button>
                </div>
            </div>
        </div>`;
    posFetchProducts();
}

async function posFetchProducts() {
    try {
        const res  = await fetch(API('get_pos_products.php'));
        posProducts = await res.json();
        posSearch = '';
        document.getElementById('pos-search').value = '';
        posRenderGrid(posProducts);
    } catch(e) {
        document.getElementById('pos-grid').innerHTML =
            `<div class="empty-state"><i class="material-icons">wifi_off</i><p>Failed to load products.</p></div>`;
    }
}

function posFilterProducts(q) {
    posSearch = q.toLowerCase();
    const filtered = posProducts.filter(p => p.name.toLowerCase().includes(posSearch));
    posRenderGrid(filtered);
}

// ── Image helper — same logic as admin_dashboard.js ──────────
function prodImgSrc(filename) {
    if (!filename) return '';
    // Strip full path/URL, keep only the bare filename
    const bare = String(filename).replace(/^.*[\/\\]/, '').replace(/^.*uploads\//, '');
    return '../api/uploads/' + bare;
}

function posRenderGrid(products) {
    const grid = document.getElementById('pos-grid');
    if (!grid) return;
    if (!products.length) {
        grid.innerHTML = `<div class="empty-state"><i class="material-icons">medication</i><p>No products found.</p></div>`;
        return;
    }
    grid.innerHTML = products.map(p => {
        const qtyPerPack    = parseInt(p.qty_per_pack || 1);
        const rawPrice      = parseFloat(p.price || 0);
        const rawPackPrice  = parseFloat(p.price_per_pack || 0);
        // Always derive both prices regardless of which DB field is populated
        const pricePerPiece = rawPrice > 0 ? rawPrice
                            : (rawPackPrice > 0 && qtyPerPack > 1 ? parseFloat((rawPackPrice / qtyPerPack).toFixed(2)) : rawPackPrice);
        const pricePerPack  = rawPackPrice > 0 ? rawPackPrice
                            : (rawPrice > 0 && qtyPerPack > 1 ? parseFloat((rawPrice * qtyPerPack).toFixed(2)) : rawPrice);
        const stock      = parseInt(p.quantity || 0);
        const imgSrc     = p.image ? prodImgSrc(p.image) : '';
        const img        = imgSrc ? `<img src="${escHtml(imgSrc)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="">` : '';
        const outOfStock = stock <= 0;
        const canSplit   = qtyPerPack > 1;
        const packUnit   = (p.unit || 'Pack').trim();

        return `
        <div class="pos-product-card ${outOfStock ? 'out-of-stock' : ''}" id="pos-card-${p.id}"
             style="overflow:visible;display:flex;flex-direction:column;">
            <div class="pos-product-img"
                 style="border-radius:12px 12px 0 0;overflow:hidden;"
                 onclick="${outOfStock ? '' : `posAddToCartMode(${p.id},'piece')`}">
                ${img}
                <i class="material-icons" style="display:${imgSrc ? 'none' : 'block'}">medication</i>
            </div>
            <div class="pos-product-info">
                <div class="pos-product-name">${escHtml(p.name)}</div>
                <div class="pos-product-unit">${escHtml((p.unit_value||'') + ' ' + packUnit)}</div>
                ${outOfStock
                    ? `<div class="pos-product-stock-warn">Out of Stock</div>`
                    : `<div class="pos-product-stock">Stock: ${stock}</div>`}
                ${outOfStock ? '' : `
                <div class="pos-add-btns" style="display:flex;flex-direction:column;gap:6px;margin-top:10px;">
                    <button class="pos-add-piece" onclick="posAddToCartMode(${p.id},'piece')">
                        <i class="material-icons">add</i>
                        Per Piece &#8369;${pricePerPiece.toFixed(2)}
                    </button>
                    ${canSplit ? `
                    <button class="pos-add-pack" onclick="posAddToCartMode(${p.id},'pack')">
                        <i class="material-icons">inventory_2</i>
                        Per ${packUnit} (${qtyPerPack}pcs) &#8369;${pricePerPack.toFixed(2)}
                    </button>` : ''}
                </div>`}
            </div>
        </div>`;
    }).join('');
}

function posAddToCartMode(productId, mode) {
    const p = posProducts.find(x => x.id == productId);
    if (!p) return;
    const stock        = parseInt(p.quantity || 0);
    const qtyPerPack   = parseInt(p.qty_per_pack || 1);
    const rawPrice     = parseFloat(p.price || 0);
    const rawPackPrice = parseFloat(p.price_per_pack || 0);
    const pricePerPiece = rawPrice > 0 ? rawPrice
                        : (rawPackPrice > 0 && qtyPerPack > 1 ? parseFloat((rawPackPrice / qtyPerPack).toFixed(2)) : rawPackPrice);
    const pricePerPack  = rawPackPrice > 0 ? rawPackPrice
                        : (rawPrice > 0 && qtyPerPack > 1 ? parseFloat((rawPrice * qtyPerPack).toFixed(2)) : rawPrice);
    const isPack    = (mode === 'pack');
    const unitPrice = isPack ? pricePerPack : pricePerPiece;
    const cartId    = `${p.id}-${mode}`;
    const packUnit  = (p.unit || 'Pack').trim();
    const label     = isPack ? `Per ${packUnit} (${qtyPerPack}pcs)` : 'Per Piece';

    const idx = posCart.findIndex(x => x.cartId === cartId);
    if (idx >= 0) {
        if (posCart[idx].qty >= stock) { showToast('No more stock available.', true); return; }
        posCart[idx].qty++;
    } else {
        if (stock <= 0) { showToast(`${p.name} is out of stock.`, true); return; }
        posCart.push({
            id: p.id, cartId, name: p.name,
            price: unitPrice, qty: 1,
            label, image: p.image || ''
        });
    }
    posRenderCart();
    showToast(`${p.name} (${label}) added`);
}

// posAddToCart replaced by posAddToCartMode above

function posRemoveFromCart(idx) {
    posCart.splice(idx, 1);
    posRenderCart();
}

function posChangeQty(idx, delta) {
    posCart[idx].qty += delta;
    if (posCart[idx].qty <= 0) posCart.splice(idx, 1);
    posRenderCart();
}

function posRenderCart() {
    const list   = document.getElementById('pos-cart-list');
    const totalEl= document.getElementById('pos-total');
    const payBtn = document.getElementById('pos-pay-btn');
    if (!list) return;

    const total = posCart.reduce((s,i) => s + i.price * i.qty, 0);

    if (!posCart.length) {
        list.innerHTML = `<div class="pos-cart-empty"><i class="material-icons">shopping_cart</i><span>No items added</span></div>`;
    } else {
        list.innerHTML = posCart.map((item, i) => `
            <div class="pos-cart-item">
                <div class="pos-cart-item-info">
                    <div class="pos-cart-item-name">${escHtml(item.name)}</div>
                    <div class="pos-cart-item-price">₱${item.price.toFixed(2)} / ${escHtml(item.label||'pc')}</div>
                </div>
                <div class="pos-cart-item-controls">
                    <button onclick="posChangeQty(${i},-1)"><i class="material-icons">remove</i></button>
                    <span>${item.qty}</span>
                    <button onclick="posChangeQty(${i},1)"><i class="material-icons">add</i></button>
                </div>
                <div class="pos-cart-item-subtotal">₱${(item.price * item.qty).toFixed(2)}</div>
                <button class="pos-cart-item-del" onclick="posRemoveFromCart(${i})">
                    <i class="material-icons">delete_outline</i>
                </button>
            </div>`).join('');
    }

    if (totalEl) totalEl.textContent = `₱${total.toFixed(2)}`;
    if (payBtn)  payBtn.disabled = posCart.length === 0;
    posUpdateChange();
}

function posUpdateChange() {
    const cashEl   = document.getElementById('pos-cash');
    const changeEl = document.getElementById('pos-change');
    if (!cashEl || !changeEl) return;
    const total  = posCart.reduce((s,i) => s + i.price * i.qty, 0);
    const cash   = parseFloat(cashEl.value) || 0;
    const change = cash - total;
    changeEl.textContent  = `₱${Math.max(0, change).toFixed(2)}`;
    changeEl.style.color  = change >= 0 ? 'var(--accent-green)' : 'var(--danger)';
}

async function posProcessPayment() {
    const total    = posCart.reduce((s,i) => s + i.price * i.qty, 0);
    const cashEl   = document.getElementById('pos-cash');
    const cash     = parseFloat(cashEl?.value) || 0;

    if (posCart.length === 0) return;
    if (cash < total) { showToast('Cash received is less than total.', true); return; }

    const btn = document.getElementById('pos-pay-btn');
    btn.disabled  = true;
    btn.innerHTML = `<div class="btn-spinner"></div> Processing...`;

    try {
        const res  = await fetch(API('save_transaction.php'), {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                total:           total,
                amount_received: cash,
                change:          cash - total,
                cart:            posCart
            })
        });
        const data = await res.json();

        if (data.success) {
            const receiptNo = data.receipt_no || '';
            posOpenReceipt(receiptNo, total, cash, cash - total);
            posCart = [];
            if (cashEl) cashEl.value = '';
            posRenderCart();
            posFetchProducts(); // refresh stock
        } else {
            showToast(data.message || 'Transaction failed.', true);
        }
    } catch(e) {
        showToast('Connection error.', true);
    } finally {
        const b = document.getElementById('pos-pay-btn');
        if (b) { b.disabled = false; b.innerHTML = `<i class="material-icons">point_of_sale</i> PROCESS PAYMENT`; }
    }
}

function posOpenReceipt(receiptNo, total, received, change) {
    const dateStr  = new Date().toLocaleString('en-PH');
    const rows     = posCart.map(item => `
        <tr>
            <td>${item.qty}</td>
            <td>${escHtml(item.name)}</td>
            <td style="text-align:right">&#8369;${(item.price * item.qty).toFixed(2)}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html><html><head>
        <meta charset="UTF-8"><title>Receipt</title>
        <style>
            @page { size: 80mm auto; margin: 0; }
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family:'Segoe UI',sans-serif; font-size:10pt; width:76mm; margin:6mm auto; }
            .center { text-align:center; }
            .logo { width:52px; height:52px; object-fit:contain; display:block; margin:0 auto 4px; }
            .name { font-size:13pt; font-weight:800; color:#0F3D2E; }
            .addr { font-size:8pt; color:#555; margin-top:2px; }
            .title{ font-size:10pt; font-weight:700; color:#0F3D2E; margin-top:6px; }
            hr    { border:none; border-top:1px solid #ccc; margin:8px 0; }
            .info { display:flex; justify-content:space-between; font-size:9pt; padding:2px 0; }
            .info .l{ color:#666; } .info .r{ font-weight:600; }
            table { width:100%; border-collapse:collapse; margin:4px 0; }
            th    { font-size:8pt; font-weight:700; text-transform:uppercase; color:#666; padding:3px 2px; border-bottom:1px solid #ccc; }
            th:nth-child(3){ text-align:right; }
            td    { padding:5px 2px; font-size:9.5pt; }
            td:nth-child(3){ text-align:right; font-weight:600; }
            .total-row { display:flex; justify-content:space-between; padding:8px 0 4px; }
            .total-label{ font-size:12pt; font-weight:800; color:#0F3D2E; }
            .total-val  { font-size:14pt; font-weight:800; color:#0F3D2E; }
            .change-row { display:flex; justify-content:space-between; font-size:10pt; color:#555; padding:2px 0 8px; }
            .footer { text-align:center; font-size:8.5pt; color:#777; font-style:italic; margin-top:14px; padding-top:8px; border-top:1px solid #ddd; }
        </style>
    </head><body>
        <div class="center">
            <img class="logo" src="../assets/logo.png" onerror="this.style.display='none'" alt="">
            <div class="name">EMERALD 24/7 PHARMACY</div>
            <div class="addr">Barra, Opol, Mis Or.</div>
            <div class="title">&#x2022; OFFICIAL RECEIPT &#x2022;</div>
        </div>
        <hr>
        <div class="info"><span class="l">Receipt No.</span><span class="r">${escHtml(receiptNo)}</span></div>
        <div class="info"><span class="l">Date</span><span class="r">${escHtml(dateStr)}</span></div>
        <div class="info"><span class="l">Cashier</span><span class="r">Walk-in</span></div>
        <hr>
        <table>
            <thead><tr><th>QTY</th><th>ITEM</th><th>PRICE</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <hr style="border-style:dashed">
        <div class="total-row"><span class="total-label">TOTAL</span><span class="total-val">&#8369;${total.toFixed(2)}</span></div>
        <div class="change-row"><span>Cash Received</span><span>&#8369;${received.toFixed(2)}</span></div>
        <div class="change-row"><span>Change</span><span style="color:#1B8F3C;font-weight:700">&#8369;${change.toFixed(2)}</span></div>
        <div class="footer">Thank you for choosing Emerald!<br>Please come again. &#128149;</div>
    </body></html>`;

    const win = window.open('', '_blank', 'width=420,height=700,toolbar=0,menubar=0');
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => setTimeout(() => { win.focus(); win.print(); }, 250);
    setTimeout(() => { try { win.focus(); win.print(); } catch(e){} }, 800);
}

// ============================================================
//  REPORT PAGE
// ============================================================
function renderReportPage() {
    document.getElementById('dynamic-content').innerHTML = `
        <div class="filter-bar">
            <div class="date-group">
                <label class="date-label">FROM</label>
                <div class="date-input-wrap">
                    <i class="material-icons">calendar_today</i>
                    <input type="date" id="inp-start" value="${reportStart}"
                           onchange="dateChanged('start',this.value)">
                </div>
            </div>
            <div class="filter-sep"></div>
            <div class="date-group">
                <label class="date-label">TO</label>
                <div class="date-input-wrap">
                    <i class="material-icons">calendar_today</i>
                    <input type="date" id="inp-end" value="${reportEnd}"
                           onchange="dateChanged('end',this.value)">
                </div>
            </div>
            <div class="filter-spacer"></div>
            <button class="btn-submit-admin" id="btn-submit-admin" onclick="submitReportToAdmin()" disabled>
                <i class="material-icons">send</i> Submit to Admin
            </button>
            <button class="btn-pdf" id="btn-print-pdf" onclick="printReportPDF()" disabled>
                <i class="material-icons">picture_as_pdf</i> Print PDF
            </button>
        </div>
        <div id="report-table-area">
            <div class="loading-state"><i class="material-icons spin">autorenew</i><span>Loading report...</span></div>
        </div>`;
    fetchReportData();
}

function dateChanged(which, val) {
    if (which === 'start') {
        reportStart = val;
        const el = document.getElementById('lbl-start');
        if (el) el.textContent = fmtDate(val);
    } else {
        reportEnd = val;
        const el = document.getElementById('lbl-end');
        if (el) el.textContent = fmtDate(val);
    }
    fetchReportData();
}

async function fetchReportData() {
    const area = document.getElementById('report-table-area');
    if (!area) return;
    area.innerHTML = `<div class="loading-state"><i class="material-icons spin">autorenew</i><span>Loading...</span></div>`;
    try {
        const res  = await fetch(API(`sales_report.php?start_date=${reportStart}&end_date=${reportEnd}`));
        const data = await res.json();
        reportData = data.transactions || [];
        renderReportTable(reportData);
        const btn = document.getElementById('btn-print-pdf');
        if (btn) btn.disabled = reportData.length === 0;
        const submitBtn = document.getElementById('btn-submit-admin');
        if (submitBtn) submitBtn.disabled = reportData.length === 0;
    } catch (e) {
        area.innerHTML = `<div class="empty-state"><i class="material-icons">wifi_off</i><p>Cannot load report data.</p></div>`;
    }
}

function renderReportTable(txns) {
    const area = document.getElementById('report-table-area');
    if (!area) return;
    if (!txns.length) {
        area.innerHTML = `<div class="empty-state"><i class="material-icons">event_busy</i><p>No sales recorded for this date range.</p></div>`;
        return;
    }
    const totalSum = txns.reduce((s, t) => s + parseFloat(t.total || 0), 0);
    const rows = txns.map(t => {
        const isGCash = (t.payment_type || '').toUpperCase() === 'GCASH';
        const badge   = isGCash ? `<span class="rpt-badge rpt-badge-blue">GCash</span>`
                                : `<span class="rpt-badge" style="background:#f3f4f6;color:#374151">Cash</span>`;
        return `<tr>
            <td style="font-size:0.82rem">${escHtml(t.receipt_no || 'N/A')}</td>
            <td><strong>${escHtml(t.customer_name || 'Walk-in')}</strong></td>
            <td style="color:var(--text-muted);font-size:0.85rem">${escHtml(t.sale_date || '')}</td>
            <td><strong>₱${parseFloat(t.total || 0).toFixed(2)}</strong></td>
            <td>${badge}</td>
        </tr>`;
    }).join('');
    area.innerHTML = `
        <div class="rpt-table-wrap">
            <table class="rpt-table">
                <thead><tr><th>Receipt No.</th><th>Customer</th><th>Date</th><th>Total</th><th>Method</th></tr></thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="3">TOTAL FOR PERIOD</td>
                        <td>₱${totalSum.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>`;
}


// ============================================================
//  SUBMIT REPORT TO ADMIN
//  POSTs the report data to the API so admin can see it
// ============================================================
async function submitReportToAdmin() {
    if (!reportData.length) return;

    const btn = document.getElementById('btn-submit-admin');
    if (btn) { btn.disabled = true; btn.innerHTML = `<div class="btn-spinner"></div> Submitting...`; }

    try {
        const res  = await fetch(API('submit_report.php'), {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                start_date: reportStart,
                end_date:   reportEnd,
                transactions: reportData
            })
        });
        const data = await res.json();
        if (data.success) {
            showToast('✅ Report submitted to Admin successfully!');
        } else {
            showToast(data.message || 'Failed to submit report.', true);
        }
    } catch (e) {
        showToast('Connection error. Could not submit report.', true);
    } finally {
        const b = document.getElementById('btn-submit-admin');
        if (b) { b.disabled = reportData.length === 0; b.innerHTML = `<i class="material-icons">send</i> Submit to Admin`; }
    }
}
function printReportPDF() {
    if (!reportData.length) return;
    const totalSum = reportData.reduce((s, t) => s + parseFloat(t.total || 0), 0);
    const rows = reportData.map(t => `
        <tr>
            <td>${escHtml(t.receipt_no || 'N/A')}</td>
            <td>${escHtml(t.customer_name || 'Walk-in')}</td>
            <td>${escHtml(t.sale_date || '')}</td>
            <td style="text-align:right">₱${parseFloat(t.total || 0).toFixed(2)}</td>
            <td>${escHtml(t.payment_type || 'Cash')}</td>
        </tr>`).join('');
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head>
        <title>Sales Report — Emerald Pharmacy</title>
        <style>
            body{font-family:'Segoe UI',sans-serif;padding:40px;font-size:12pt;color:#2d3748}
            h1{font-size:16pt;color:#0F3D2E;margin-bottom:4px}
            p{color:#718096;margin-bottom:20px;font-size:10pt}
            table{width:100%;border-collapse:collapse}
            th{background:#0F3D2E;color:#fff;padding:10px 14px;text-align:left;font-size:10pt}
            td{padding:9px 14px;border-bottom:1px solid #eee;font-size:10pt}
            tfoot td{font-weight:700;background:#f4f7f6;border-top:2px solid #e2e8f0}
        </style>
    </head><body>
        <h1>Emerald 24/7 Pharmacy — Sales Report</h1>
        <p>Period: ${fmtDate(reportStart)} &mdash; ${fmtDate(reportEnd)}</p>
        <table>
            <thead><tr><th>Receipt</th><th>Customer</th><th>Date</th><th>Total</th><th>Method</th></tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr><td colspan="3">TOTAL</td><td style="text-align:right">₱${totalSum.toFixed(2)}</td><td></td></tr></tfoot>
        </table>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
}

// ============================================================
//  USER DROPDOWN
// ============================================================
function toggleDropdown() {
    document.getElementById('profile-dropdown').classList.toggle('show');
}

// ============================================================
//  LOGOUT
// ============================================================
function confirmLogout(e) {
    if (e) e.preventDefault();
    const dd = document.getElementById('profile-dropdown');
    if (dd) dd.classList.remove('show');
    const existing = document.getElementById('logout-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'logout-overlay';
    overlay.innerHTML = `
        <div class="logout-dialog">
            <div class="logout-dialog-icon"><i class="material-icons">logout</i></div>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out of the cashier portal?</p>
            <div class="logout-dialog-actions">
                <button class="logout-btn-cancel" onclick="document.getElementById('logout-overlay').remove()">Cancel</button>
                <button class="logout-btn-confirm" onclick="window.location.href='../index.php'">Yes, Logout</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

// ============================================================
//  CHANGE PASSWORD
// ============================================================
function openChangePasswordModal(e) {
    if (e) e.preventDefault();
    const dd = document.getElementById('profile-dropdown');
    if (dd) dd.classList.remove('show');
    showModal('changePwdModal');
}

function closeChangePwdModal() {
    closeModal('changePwdModal');
    document.getElementById('changePwdForm').reset();
    document.getElementById('pwd-strength-fill').style.width    = '0';
    document.getElementById('pwd-strength-fill').style.background = '';
    document.getElementById('pwd-strength-text').textContent    = '';
    document.getElementById('pwd-match-msg').textContent        = '';
}

async function handleChangePwd(e) {
    e.preventDefault();
    const current = document.getElementById('pwd-current').value;
    const newPwd  = document.getElementById('pwd-new').value;
    const confirm = document.getElementById('pwd-confirm').value;
    if (newPwd !== confirm) {
        document.getElementById('pwd-match-msg').textContent = '✗ Passwords do not match.';
        document.getElementById('pwd-match-msg').style.color = '#c53030';
        return;
    }
    const btn = document.getElementById('pwd-save-btn');
    btn.disabled = true;
    btn.innerHTML = `<i class="material-icons spin" style="font-size:17px">autorenew</i> Updating...`;
    try {
        const res  = await fetch(API('change_password.php'), {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_password: current, new_password: newPwd })
        });
        const data = await res.json();
        if (data.success) { closeChangePwdModal(); showToast('Password updated successfully!'); }
        else showToast(data.message || 'Failed to update password.', true);
    } catch (err) {
        showToast('Connection error.', true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="material-icons" style="font-size:17px">lock_reset</i> Update Password`;
    }
}

function togglePwd(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon  = btn.querySelector('.material-icons');
    if (input.type === 'password') { input.type = 'text';     icon.textContent = 'visibility_off'; }
    else                           { input.type = 'password'; icon.textContent = 'visibility'; }
}

function checkPwdStrength(val) {
    const fill  = document.getElementById('pwd-strength-fill');
    const label = document.getElementById('pwd-strength-text');
    let s = 0;
    if (val.length >= 8)          s++;
    if (/[A-Z]/.test(val))        s++;
    if (/[0-9]/.test(val))        s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    const cfg = [
        { w:'0%',   c:'',        t:'' },
        { w:'25%',  c:'#e53e3e', t:'Weak' },
        { w:'50%',  c:'#dd6b20', t:'Fair' },
        { w:'75%',  c:'#d69e2e', t:'Good' },
        { w:'100%', c:'#1B8F3C', t:'Strong' },
    ][s];
    fill.style.width = cfg.w; fill.style.background = cfg.c;
    label.textContent = cfg.t; label.style.color = cfg.c;
}

function checkPwdMatch() {
    const newPwd  = document.getElementById('pwd-new').value;
    const confirm = document.getElementById('pwd-confirm').value;
    const msg     = document.getElementById('pwd-match-msg');
    if (!confirm) { msg.textContent = ''; return; }
    if (newPwd === confirm) { msg.textContent = '✓ Passwords match';      msg.style.color = '#1B8F3C'; }
    else                    { msg.textContent = '✗ Passwords do not match'; msg.style.color = '#c53030'; }
}

// ============================================================
//  ZOOM IMAGE
// ============================================================
function zoomImage(src) { document.getElementById('zoom-img').src = src; document.getElementById('zoomOverlay').classList.add('show'); }
function closeZoom()    { document.getElementById('zoomOverlay').classList.remove('show'); }

// ============================================================
//  MODAL HELPERS
// ============================================================
function showModal(id)  { document.getElementById(id).classList.add('show');    }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// ============================================================
//  TOAST
// ============================================================
function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    const icon  = toast.querySelector('.material-icons');
    document.getElementById('toast-msg').textContent = msg;
    icon.textContent = isError ? 'error' : 'check_circle';
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

// ============================================================
//  UTILITY
// ============================================================
function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtDate(str) {
    if (!str) return '';
    return new Date(str + 'T00:00:00').toLocaleDateString('en-PH', { month:'short', day:'2-digit', year:'numeric' });
}

/**
 * formatMedicines — display in tables
 * Input: "2x Biogesic, 1x Neozep"  (from cashier_dashboard_api.php)
 * Matches Dart _formatAndCombineMedicines() — splits on ", " or "\n"
 */
function formatMedicines(raw) {
    if (!raw) return '';
    const combined = {};
    for (const item of String(raw).split(/,\s+|\n/)) {
        const s = item.trim();
        if (!s) continue;
        const m = s.match(/^(\d+)x\s+(.*)/);
        if (m) { combined[m[2].trim()] = (combined[m[2].trim()] || 0) + parseInt(m[1]); }
        else   { combined[s]           = (combined[s]           || 0) + 1; }
    }
    return Object.entries(combined).map(([k,v]) => `${v}x ${k}`).join('\n');
}

/**
 * parseMedicines — for receipt / modal items
 * Input: "qty|name|price;qty|name|price"  (from process_order.php)
 * Matches Dart process_order.dart — splits on ";" then "|"
 */
function parseMedicines(raw) {
    if (!raw) return [];
    return String(raw).split(';').filter(s => s.trim()).map(item => {
        const parts = item.split('|');
        if (parts.length >= 3) return { qty: parts[0].trim(), name: parts[1].trim(), price: parts[2].trim() };
        const m = item.trim().match(/^(\d+)x\s+(.*)/);
        if (m) return { qty: m[1], name: m[2].trim(), price: '0' };
        return { qty: '1', name: item.trim(), price: '0' };
    });
}
// ============================================================
//  STOCK PAGE
// ============================================================
let stockData   = [];
let stockSearch = '';
let stockFilter = 'all';

function renderStockPage() {
    document.getElementById('dynamic-content').innerHTML = `
        <div class="stock-toolbar">
            <div class="stock-search-wrap">
                <i class="material-icons">search</i>
                <input type="text" id="stock-search"
                       placeholder="Search product, brand or category..."
                       oninput="stockSearchChanged(this.value)">
            </div>
            <div class="stock-filter-btns">
                <button class="stock-filter-btn active" id="sf-all" onclick="stockFilterChanged('all')">All</button>
                <button class="stock-filter-btn" id="sf-low" onclick="stockFilterChanged('low')">
                    <i class="material-icons">warning</i> Low Stock
                </button>
                <button class="stock-filter-btn" id="sf-out" onclick="stockFilterChanged('out')">
                    <i class="material-icons">remove_shopping_cart</i> Out of Stock
                </button>
            </div>
        </div>
        <div id="stock-table-area">
            <div class="loading-state">
                <i class="material-icons spin">autorenew</i>
                <span>Loading stock...</span>
            </div>
        </div>`;
    fetchStockData();
}

async function fetchStockData() {
    const area = document.getElementById('stock-table-area');
    try {
        const res  = await fetch(API('get_stock.php'));
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); }
        catch(e) {
            if (area) area.innerHTML = `<div class="empty-state">
                <i class="material-icons">error</i>
                <p>Server error. Check api/get_stock.php.</p></div>`;
            return;
        }
        stockData = Array.isArray(data) ? data : [];
        renderStockTable();
    } catch(e) {
        if (area) area.innerHTML = `<div class="empty-state">
            <i class="material-icons">wifi_off</i>
            <p>Cannot reach get_stock.php. Make sure it is in api/ folder.</p></div>`;
    }
}

function stockSearchChanged(val) {
    stockSearch = val.toLowerCase();
    renderStockTable();
}

function stockFilterChanged(filter) {
    stockFilter = filter;
    document.querySelectorAll('.stock-filter-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('sf-' + filter);
    if (btn) btn.classList.add('active');
    renderStockTable();
}

// Called from inline onerror on stock thumbnails
function stockImgErr(el) {
    el.style.display = 'none';
    const ph = document.createElement('div');
    ph.className = 'stock-thumb-placeholder';
    ph.innerHTML = '<i class="material-icons">medication</i>';
    el.parentNode.insertBefore(ph, el.nextSibling);
}

function renderStockTable() {
    const area = document.getElementById('stock-table-area');
    if (!area) return;

    let filtered = stockData;
    if (stockSearch) {
        filtered = filtered.filter(p =>
            (p.name     || '').toLowerCase().includes(stockSearch) ||
            (p.category || '').toLowerCase().includes(stockSearch) ||
            (p.brand    || '').toLowerCase().includes(stockSearch)
        );
    }
    if (stockFilter === 'low') filtered = filtered.filter(p => parseInt(p.quantity) > 0 && parseInt(p.quantity) <= 10);
    if (stockFilter === 'out') filtered = filtered.filter(p => parseInt(p.quantity) <= 0);

    if (!filtered.length) {
        area.innerHTML = `<div class="empty-state">
            <i class="material-icons">inventory</i>
            <p>No products found.</p></div>`;
        return;
    }

    const total  = stockData.length;
    const outCnt = stockData.filter(p => parseInt(p.quantity) <= 0).length;
    const lowCnt = stockData.filter(p => parseInt(p.quantity) > 0 && parseInt(p.quantity) <= 10).length;
    const okCnt  = total - outCnt - lowCnt;

    const rows = filtered.map((p, i) => {
        const qty    = parseInt(p.quantity || 0);
        const isOut  = qty <= 0;
        const isLow  = qty > 0 && qty <= 10;
        const imgSrc = p.image ? prodImgSrc(p.image) : '';

        // ── Use a wrapper div so the fallback icon sits cleanly ──
        const imgEl = imgSrc
            ? `<div class="stock-img-wrap">
                   <img src="${escHtml(imgSrc)}" class="stock-thumb"
                        onerror="stockImgErr(this)" alt="">
               </div>`
            : `<div class="stock-img-wrap">
                   <div class="stock-thumb-placeholder">
                       <i class="material-icons">medication</i>
                   </div>
               </div>`;

        const badge = isOut
            ? `<span class="stock-badge stock-out">Out of Stock</span>`
            : isLow
            ? `<span class="stock-badge stock-low"><i class="material-icons">warning</i> Low</span>`
            : `<span class="stock-badge stock-ok"><i class="material-icons">check_circle</i> Available</span>`;

        return `<tr>
            <td style="color:var(--text-muted);font-size:0.8rem">${String(i+1).padStart(2,'0')}</td>
            <td>${imgEl}</td>
            <td>
                <div class="stock-product-name">${escHtml(p.name || '')}</div>
                <div class="stock-product-brand">${escHtml(p.brand || '')}</div>
            </td>
            <td style="color:var(--text-muted)">${escHtml(p.category || '—')}</td>
            <td><span class="stock-qty ${isOut ? 'qty-out' : isLow ? 'qty-low' : 'qty-ok'}">${qty}</span></td>
            <td>₱${parseFloat(p.price || 0).toFixed(2)}</td>
            <td style="color:var(--text-muted);font-size:0.82rem">${escHtml(p.expiry_date || '—')}</td>
            <td>${badge}</td>
        </tr>`;
    }).join('');

    area.innerHTML = `
        <div class="stock-summary-row">
            <div class="stock-summary-card">
                <i class="material-icons" style="color:#3182ce">inventory_2</i>
                <div>
                    <div class="stock-summary-val">${total}</div>
                    <div class="stock-summary-label">Total Products</div>
                </div>
            </div>
            <div class="stock-summary-card">
                <i class="material-icons" style="color:var(--accent-green)">check_circle</i>
                <div>
                    <div class="stock-summary-val" style="color:var(--accent-green)">${okCnt}</div>
                    <div class="stock-summary-label">Available</div>
                </div>
            </div>
            <div class="stock-summary-card">
                <i class="material-icons" style="color:var(--warning)">warning</i>
                <div>
                    <div class="stock-summary-val" style="color:var(--warning)">${lowCnt}</div>
                    <div class="stock-summary-label">Low Stock</div>
                </div>
            </div>
            <div class="stock-summary-card">
                <i class="material-icons" style="color:var(--danger)">remove_shopping_cart</i>
                <div>
                    <div class="stock-summary-val" style="color:var(--danger)">${outCnt}</div>
                    <div class="stock-summary-label">Out of Stock</div>
                </div>
            </div>
        </div>
        <div class="rpt-table-wrap">
            <table class="rpt-table">
                <thead>
                    <tr>
                        <th>#</th><th>Image</th><th>Product</th><th>Category</th>
                        <th>Qty</th><th>Price</th><th>Expiry</th><th>Status</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}