/* ============================================================
   Emerald Pharmacy — Staff Dashboard JS
   Location: js/staff_dashboard.js
   ============================================================ */

// ── API endpoints — same as admin ────────────────────────────
const API_BASE = '../api/';
const PROD_API = {
    list:        '../api/product_list.php',
    add:         '../api/product_add.php',
    update:      '../api/product_update.php',
    archive:     '../api/product_archive.php',
    archiveList: '../api/product_archive_list.php',
    restore:     '../api/product_restore.php',
    categories:  '../api/category_list.php',
    units:       '../api/unit_list.php',
    measureUnits:'../api/measurement_unit_list.php',
    suppliers:   '../api/supplier_list.php',
};

let currentTab      = 'dashboard';
let _allActiveProds = [];
let _currentProdTab = 'active';

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    fetchStaffInfo();
    loadPage('dashboard');
    pollOrdersBadge();
    setInterval(pollOrdersBadge, 10000);

    document.addEventListener('click', (e) => {
        const dd = document.getElementById('profile-dropdown');
        if (dd && dd.classList.contains('show') && !e.target.closest('.user-profile'))
            dd.classList.remove('show');
    });
});

function updateDate() {
    const el = document.getElementById('topbar-date');
    if (el) el.textContent = new Date().toLocaleDateString('en-PH', {
        weekday:'short', year:'numeric', month:'short', day:'numeric'
    });
}

async function fetchStaffInfo() {
    try {
        const res  = await fetch('../api/get_cashier_info.php');
        const data = await res.json();
        if (data.username) {
            document.getElementById('staff-username').textContent   = data.username;
            document.getElementById('dropdown-username').textContent = data.username;
        }
    } catch(e) {}
}

// ── Navigation ────────────────────────────────────────────────
function loadPage(page) {
    currentTab = page;
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    const nav = document.getElementById(`nav-${page}`);
    if (nav) nav.classList.add('active');

    const topBar    = document.getElementById('top-bar');
    const dateEl    = document.getElementById('topbar-date');
    const refreshEl = document.querySelector('.refresh-btn');
    const userEl    = document.getElementById('user-profile-wrap');
    const titleEl   = document.getElementById('page-title');

    const noTopBar = ['inventory', 'category', 'products', 'low_stock', 'expiry_report'];
    if (noTopBar.includes(page)) {
        if (topBar) topBar.style.display = 'none';
    } else {
        if (topBar)    topBar.style.display    = '';
        const isDash = page === 'dashboard';
        if (dateEl)    dateEl.style.display    = isDash ? '' : 'none';
        if (refreshEl) refreshEl.style.display = isDash ? '' : 'none';
        if (userEl)    userEl.style.display    = isDash ? '' : 'none';
        if (titleEl)   titleEl.textContent     = isDash ? 'Overview' : page;
    }

    if      (page === 'dashboard')     fetchDashboard();
    else if (page === 'inventory')     renderInventoryPage();
    else if (page === 'category')      renderCategoryPage();
    else if (page === 'products')      renderProductsPage();
    else if (page === 'low_stock')     renderLowStockPage();
    else if (page === 'expiry_report') renderExpiryPage();
}

function refreshPage() { loadPage(currentTab); }

// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════
async function fetchDashboard() {
    setLoading();
    try {
        const res  = await fetch(PROD_API.list);
        const data = await res.json();
        _allActiveProds = data || [];
        renderDashboard(data);
    } catch(e) {
        document.getElementById('dynamic-content').innerHTML =
            `<div class="empty-state"><i class="material-icons">wifi_off</i><p>Cannot connect to server.</p></div>`;
    }
}

function renderDashboard(products) {
    const active  = products.filter(p => p.status !== 'Expired');
    const low     = products.filter(p => p.status === 'Low Stock');
    const expired = products.filter(p => p.status === 'Expired');
    const display = active.slice(0, 10);

    const today = new Date(); today.setHours(0,0,0,0);

    const rows = display.map(p => {
        const imgEl = prodImgTag(p.image);

        let expiryStyle = 'color:#38a169;font-weight:600';
        if (p.expiry_date && p.expiry_date !== '0000-00-00') {
            const exp  = new Date(p.expiry_date); exp.setHours(0,0,0,0);
            const diff = Math.ceil((exp - today) / 86400000);
            if (diff < 0)   expiryStyle = 'color:#e53e3e;font-weight:700';
            else if (diff <= 30) expiryStyle = 'color:#dd6b20;font-weight:700';
        }

        let statusLabel = 'Available', statusClass = 'badge-available';
        if (p.expiry_date && p.expiry_date !== '0000-00-00') {
            const exp = new Date(p.expiry_date); exp.setHours(0,0,0,0);
            if (exp < today) { statusLabel = 'Expired'; statusClass = 'badge-expired'; }
        }

        return `<tr>
            <td>${imgEl}</td>
            <td style="font-weight:600">${esc(p.name||'')}</td>
            <td style="color:${p.status==='Low Stock'?'#e53e3e':'var(--text-dark)'}">${p.quantity}</td>
            <td style="color:var(--text-muted)">${esc(p.unit||'-')}</td>
            <td style="font-size:0.85rem;${expiryStyle}">${esc(p.expiry_date||'N/A')}</td>
            <td style="color:var(--accent-green);font-weight:700">₱${parseFloat(p.price||0).toFixed(2)}</td>
            <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        </tr>`;
    }).join('');

    document.getElementById('dynamic-content').innerHTML = `
        <div class="stat-grid">
            <div class="stat-card">
                <div class="stat-icon stat-icon-blue"><i class="material-icons">medication</i></div>
                <div><div class="stat-label">Active Items</div><div class="stat-val">${active.length}</div></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon stat-icon-orange"><i class="material-icons">warning_amber</i></div>
                <div><div class="stat-label">Low Stock</div><div class="stat-val">${low.length}</div></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon stat-icon-red"><i class="material-icons">dangerous</i></div>
                <div><div class="stat-label">Expired</div><div class="stat-val">${expired.length}</div></div>
            </div>
        </div>
        <div class="section-label">
            <i class="material-icons">list_alt</i> Quick Inventory List
        </div>
        <div class="table-card">
            <div class="table-responsive">
                <table>
                    <thead><tr>
                        <th>Image</th><th>Product Name</th><th>Quantity</th>
                        <th>Unit</th><th>Expiration</th><th>Price</th><th>Status</th>
                    </tr></thead>
                    <tbody>${rows || `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">No products found.</td></tr>`}</tbody>
                </table>
            </div>
        </div>`;
}

// ══════════════════════════════════════════════════════════════
//  INVENTORY PAGE
// ══════════════════════════════════════════════════════════════
function renderInventoryPage() {
    _currentProdTab = 'active';
    document.getElementById('dynamic-content').innerHTML = `
        <div style="padding:32px 32px 0 32px">
            <h2 class="rpt-title"><i class="material-icons">inventory_2</i> Inventory</h2>
            <p class="rpt-subtitle" style="margin-bottom:24px">Manage your products and stock</p>
        </div>
        <div class="inv-toolbar">
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
                <div class="prod-tabs">
                    <button class="prod-tab-btn active" data-ptab="active" onclick="switchProdTab('active')">
                        <i class="material-icons">check_circle</i> Active
                    </button>
                    <button class="prod-tab-btn" data-ptab="archived" onclick="switchProdTab('archived')">
                        <i class="material-icons">archive</i> Archived
                    </button>
                </div>
                <div class="inv-search-wrap">
                    <i class="material-icons">search</i>
                    <input type="text" id="inv-search" placeholder="Search product, brand, category..."
                           oninput="invSearchFilter(this.value)">
                </div>
            </div>
            <button class="btn-add-prod" id="btn-add-prod" onclick="openProductModal()">
                <i class="material-icons">add</i> Add Product
            </button>
        </div>
        <div id="prod-table-wrap">
            <div class="loading-state"><i class="material-icons spin">autorenew</i><span>Loading...</span></div>
        </div>`;
    fetchProducts();
}

function switchProdTab(tab) {
    _currentProdTab = tab;
    document.querySelectorAll('[data-ptab]').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-ptab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    const addBtn = document.getElementById('btn-add-prod');
    if (addBtn) addBtn.style.display = tab === 'archived' ? 'none' : 'flex';
    tab === 'active' ? fetchProducts() : fetchArchivedProducts();
}

async function fetchProducts() {
    setProdLoading();
    try {
        const res  = await fetch(PROD_API.list);
        const data = await res.json();
        _allActiveProds = data;
        renderProductTable(data);
    } catch(e) { setProdError('Failed to load products.'); }
}

async function fetchArchivedProducts() {
    setProdLoading();
    try {
        const res  = await fetch(PROD_API.archiveList);
        const data = await res.json();
        renderArchivedProductTable(data);
    } catch(e) { setProdError('Failed to load archived products.'); }
}

function invSearchFilter(q) { filterProducts(q); }

function filterProducts(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) { renderProductTable(_allActiveProds); return; }
    const filtered = _allActiveProds.filter(p =>
        (p.name          || '').toLowerCase().includes(q) ||
        (p.brand_name    || '').toLowerCase().includes(q) ||
        (p.category      || '').toLowerCase().includes(q) ||
        (p.category_name || '').toLowerCase().includes(q) ||
        (p.batch_no      || '').toLowerCase().includes(q)
    );
    renderProductTable(filtered);
}

// ── Image helpers — same as admin ────────────────────────────
function prodImgSrc(filename) {
    if (!filename) return '';
    if (filename.startsWith('http') || filename.startsWith('/')) return filename;
    const bare = filename.replace(/^.*[\/\\]/, '');
    return '../api/uploads/' + bare;
}

function prodImgTag(filename) {
    if (!filename) return `<div class="prod-thumb-placeholder"><i class="material-icons">medication</i></div>`;
    const src = prodImgSrc(filename);
    return `<img src="${src}" class="prod-thumb" alt=""
        onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='inline-flex';"
    ><div class="prod-thumb-placeholder" style="display:none"><i class="material-icons">medication</i></div>`;
}

// ── Render active table — identical to admin ──────────────────
function renderProductTable(data) {
    const wrap = document.getElementById('prod-table-wrap');
    if (!wrap) return;
    if (!data || data.length === 0) {
        wrap.innerHTML = `<div class="empty-state"><i class="material-icons">medication</i><p>No products yet. Click "Add Product" to get started.</p></div>`;
        return;
    }
    const today = new Date(); today.setHours(0,0,0,0);
    wrap.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Image</th>
                    <th>Product Name</th>
                    <th>Brand</th>
                    <th>Category</th>
                    <th>Batch No.</th>
                    <th>Qty</th>
                    <th>Price / Pack</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((p, i) => {
                    const imgEl = p.image
                        ? prodImgTag(p.image)
                        : `<div class="prod-thumb-placeholder"><i class="material-icons">medication</i></div>`;

                    let resolvedExpiry = p.expiry_date;
                    if (!resolvedExpiry || resolvedExpiry === '0000-00-00' || resolvedExpiry === '') {
                        const autoExp = new Date();
                        autoExp.setFullYear(autoExp.getFullYear() + 1);
                        resolvedExpiry = autoExp.getFullYear() + '-' +
                            String(autoExp.getMonth()+1).padStart(2,'0') + '-' +
                            String(autoExp.getDate()).padStart(2,'0');
                    }
                    let expiryStyle = 'color:#38a169;font-weight:600';
                    {
                        const expDate  = new Date(resolvedExpiry); expDate.setHours(0,0,0,0);
                        const diffDays = Math.ceil((expDate - today) / 86400000);
                        if      (diffDays < 0)   expiryStyle = 'color:#e53e3e;font-weight:700';
                        else if (diffDays <= 30) expiryStyle = 'color:#dd6b20;font-weight:700';
                        else                    expiryStyle = 'color:#38a169;font-weight:600';
                    }

                    let statusLabel, statusClass;
                    const qty = parseInt(p.quantity) || 0;
                    {
                        const expDate = new Date(resolvedExpiry); expDate.setHours(0,0,0,0);
                        if (expDate < today || qty === 0) {
                            statusLabel = 'Unavailable'; statusClass = 'badge-unavailable';
                        } else {
                            statusLabel = 'Available';   statusClass = 'badge-available';
                        }
                    }

                    const brandDisplay = p.brand_name
                        ? `<span style="color:#718096;font-size:0.82rem">${esc(p.brand_name)}</span>`
                        : '<span style="color:#cbd5e0">—</span>';

                    return `
                    <tr>
                        <td style="color:#a0aec0;font-weight:600">${String(i+1).padStart(2,'0')}</td>
                        <td>${imgEl}</td>
                        <td style="font-weight:600">${esc(p.name)}</td>
                        <td>${brandDisplay}</td>
                        <td style="color:#718096">${esc(p.category_name||p.category||'—')}</td>
                        <td style="font-family:monospace;font-size:0.82rem">${esc(p.batch_no||'—')}</td>
                        <td>${esc(String(p.quantity))}</td>
                        <td style="font-weight:600">₱${parseFloat(p.price||0).toFixed(2)}</td>
                        <td style="font-size:0.85rem;${expiryStyle}">${esc(resolvedExpiry)}</td>
                        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                        <td>
                            <div class="action-btns">
                                <button class="btn-action edit" title="Edit" onclick="openEditProductModal(${p.id})">
                                    <i class="material-icons">edit</i>
                                </button>
                                <button class="btn-action del" title="Archive" onclick="archiveProduct(${p.id},'${escAttr(p.name)}')">
                                    <i class="material-icons">archive</i>
                                </button>
                            </div>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

function renderArchivedProductTable(data) {
    const wrap = document.getElementById('prod-table-wrap');
    if (!wrap) return;
    if (!data || data.length === 0) {
        wrap.innerHTML = `<div class="empty-state"><i class="material-icons">inventory</i><p>No archived products.</p></div>`;
        return;
    }
    wrap.innerHTML = `
        <div class="table-card">
        <div class="table-responsive">
        <table>
            <thead><tr>
                <th>#</th><th>Image</th><th>Product Name</th>
                <th>Batch No.</th><th>Qty</th><th>Expiry</th><th>Actions</th>
            </tr></thead>
            <tbody>
                ${data.map((p,i) => `<tr>
                    <td style="color:#a0aec0;font-weight:600">${String(i+1).padStart(2,'0')}</td>
                    <td>${prodImgTag(p.image)}</td>
                    <td style="font-weight:600">${esc(p.name)}</td>
                    <td style="font-family:monospace;font-size:0.82rem">${esc(p.batch_no||'—')}</td>
                    <td>${esc(String(p.quantity))}</td>
                    <td>${esc(p.expiry_date||'No expiry')}</td>
                    <td>
                        <button class="btn-action restore" title="Restore" onclick="restoreProduct(${p.id},'${escAttr(p.name)}')">
                            <i class="material-icons">restore</i>
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
        </div>
        </div>`;
}

// ══════════════════════════════════════════════════════════════
//  CATEGORY PAGE  (mirrors admin exactly)
// ══════════════════════════════════════════════════════════════
const CAT_API = {
    list:        '../api/category_list.php',
    add:         '../api/category_add.php',
    update:      '../api/category_update.php',
    archive:     '../api/category_archive.php',
    archiveList: '../api/category_archive_list.php',
    restore:     '../api/category_restore.php',
};

function renderCategoryPage() {
    document.getElementById('dynamic-content').innerHTML = `
    <div class="rpt-header">
        <div>
            <h2 class="rpt-title"><i class="material-icons">category</i> Category Management</h2>
            <p class="rpt-subtitle">Manage product categories and their items</p>
        </div>
        <button class="btn-add-category" onclick="openModal()" id="btn-add-cat">
            <i class="material-icons">add</i> Add Category
        </button>
    </div>

    <div class="cat-tabs">
        <button class="cat-tab active" data-tab="active" onclick="switchTab('active')">
            <i class="material-icons">list</i> Active
        </button>
        <button class="cat-tab" data-tab="archived" onclick="switchTab('archived')">
            <i class="material-icons">archive</i> Archived
        </button>
    </div>

    <div class="category-table-card">
        <div id="cat-table-wrap">
            <div class="cat-loading"><i class="material-icons spin">autorenew</i> Loading...</div>
        </div>
    </div>

    <!-- ITEMS PANEL (slide-in) -->
    <div id="cat-items-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:8000;"
        onclick="closeCatItemsPanel(event)">
        <div id="cat-items-panel" style="
            position:absolute;right:0;top:0;bottom:0;width:480px;max-width:96vw;
            background:#fff;box-shadow:-8px 0 40px rgba(0,0,0,0.18);
            display:flex;flex-direction:column;overflow:hidden;">
            <div style="padding:22px 24px 16px;border-bottom:1px solid #f0f4f8;
                display:flex;align-items:center;justify-content:space-between;background:#0A2E1F;">
                <div>
                    <div style="font-size:0.72rem;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Category</div>
                    <div id="panel-cat-name" style="font-size:1.15rem;font-weight:800;color:#fff;"></div>
                </div>
                <button onclick="closeCatItemsPanel()"
                    style="background:rgba(255,255,255,0.12);border:none;color:#fff;cursor:pointer;
                    border-radius:8px;width:36px;height:36px;font-size:20px;display:flex;align-items:center;justify-content:center;">
                    &times;
                </button>
            </div>
            <div style="padding:16px 24px 12px;border-bottom:1px solid #f0f4f8;display:flex;align-items:center;justify-content:space-between;">
                <span id="panel-item-count" style="font-size:0.82rem;color:#718096;font-weight:600;"></span>
                <button id="panel-add-item-btn" onclick="openAddItemFromPanel()"
                    style="background:#1baa5d;color:#fff;border:none;border-radius:8px;
                    padding:8px 16px;font-size:0.82rem;font-weight:700;cursor:pointer;
                    display:inline-flex;align-items:center;gap:5px;">
                    <i class="material-icons" style="font-size:15px">add</i> Add Item
                </button>
            </div>
            <div id="panel-items-list" style="flex:1;overflow-y:auto;padding:8px 0;"></div>
        </div>
    </div>`;

    fetchCategories();
}

// ── PANEL ──
let _panelCatId   = null;
let _panelCatName = '';

function openCatItemsPanel(catId, catName) {
    _panelCatId   = catId;
    _panelCatName = catName;
    document.getElementById('panel-cat-name').textContent = catName;
    document.getElementById('cat-items-overlay').style.display = '';
    loadPanelItems(catId);
}

function closeCatItemsPanel(e) {
    if (e && e.target !== document.getElementById('cat-items-overlay')) return;
    document.getElementById('cat-items-overlay').style.display = 'none';
    _panelCatId = null;
}

async function loadPanelItems(catId) {
    const list    = document.getElementById('panel-items-list');
    const countEl = document.getElementById('panel-item-count');
    list.innerHTML = `<div style="text-align:center;padding:32px;color:#a0aec0;">
        <i class="material-icons spin" style="font-size:28px">autorenew</i></div>`;
    try {
        const res   = await fetch(`../api/category_items.php?parent_id=${catId}&t=${Date.now()}`);
        const data  = await res.json();
        const items = Array.isArray(data) ? data : (data.items || []);
        countEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
        if (items.length === 0) {
            list.innerHTML = `<div style="text-align:center;padding:40px 24px;color:#a0aec0;">
                <i class="material-icons" style="font-size:36px;display:block;margin-bottom:10px">inbox</i>
                No items yet. Click "Add Item" to get started.</div>`;
            return;
        }
        list.innerHTML = items.map(item => `
            <div style="display:flex;align-items:center;justify-content:space-between;
                padding:12px 24px;border-bottom:1px solid #f7f7f7;gap:12px;">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;color:#0A2E1F;font-size:0.93rem;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                        ${esc(item.category_name || item.name || '')}
                    </div>
                    ${item.description ? `<div style="font-size:0.78rem;color:#a0aec0;margin-top:2px">${esc(item.description)}</div>` : ''}
                </div>
                <span style="flex-shrink:0;padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;
                    background:${item.status === 'Available' ? '#e6f9ef' : '#fff0f0'};
                    color:${item.status === 'Available' ? '#1baa5d' : '#e53e3e'};">
                    ${item.status === 'Available' ? '● Available' : '● Not Available'}
                </span>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                    <button title="Toggle Status"
                        onclick="toggleItemStatus(${item.category_id || item.id}, '${escAttr(item.category_name || item.name || '')}', '${escAttr(item.status)}')"
                        style="background:#f0f4f8;border:none;border-radius:7px;width:30px;height:30px;
                        cursor:pointer;display:flex;align-items:center;justify-content:center;color:#718096;">
                        <i class="material-icons" style="font-size:15px">swap_horiz</i>
                    </button>
                    <button title="Edit"
                        onclick="openEditItemModal(${item.category_id || item.id}, '${escAttr(item.category_name || item.name || '')}', '${escAttr(item.description || '')}', '${escAttr(item.status)}', ${catId})"
                        style="background:#e6f9ef;border:none;border-radius:7px;width:30px;height:30px;
                        cursor:pointer;display:flex;align-items:center;justify-content:center;color:#1baa5d;">
                        <i class="material-icons" style="font-size:15px">edit</i>
                    </button>
                    <button title="Archive Item"
                        onclick="archiveItemFromPanel(${item.category_id || item.id}, '${escAttr(item.category_name || item.name || '')}')"
                        style="background:#fff0f0;border:none;border-radius:7px;width:30px;height:30px;
                        cursor:pointer;display:flex;align-items:center;justify-content:center;color:#e53e3e;">
                        <i class="material-icons" style="font-size:15px">archive</i>
                    </button>
                </div>
            </div>`).join('');
    } catch(err) {
        list.innerHTML = `<div style="text-align:center;padding:32px;color:#e53e3e;">Failed to load items.</div>`;
    }
}

async function toggleItemStatus(id, name, currentStatus) {
    const newStatus = currentStatus === 'Available' ? 'Not Available' : 'Available';
    const fd = new FormData();
    fd.append('id', id);
    fd.append('name', name);
    fd.append('status', newStatus);
    try {
        const res  = await fetch(CAT_API.update, { method:'POST', body:fd });
        const data = await res.json();
        if (data.success) {
            showToast(`"${name}" is now ${newStatus}.`);
            loadPanelItems(_panelCatId);
        } else {
            showToast(data.message || 'Failed to update.', 'error');
        }
    } catch(e) { showToast('Network error.', 'error'); }
}

function openAddItemFromPanel() {
    if (!_panelCatId) return;
    const overlay = document.getElementById('cat-items-overlay');
    if (overlay) overlay.style.display = 'none';
    openAddSubModal(_panelCatId, _panelCatName);
}

// Override closeModal so panel restores after modal closes
const _origCloseModal = typeof closeModal === 'function' ? closeModal : null;
function closeModal() {
    document.getElementById('categoryModal').classList.remove('show');
    document.getElementById('categoryForm').reset();
    document.getElementById('edit-cat-id').value = '';
    if (_panelCatId) {
        const overlay = document.getElementById('cat-items-overlay');
        if (overlay) overlay.style.display = '';
    }
}

function openEditItemModal(id, name, desc, status, parentId) {
    const overlay = document.getElementById('cat-items-overlay');
    if (overlay) overlay.style.display = 'none';
    openEditModal(id, name, desc, status, parentId);
}

async function archiveItemFromPanel(id, name) {
    if (!confirm(`Archive item "${name}"?`)) return;
    try {
        const res  = await fetch(CAT_API.archive, {
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id})
        });
        const data = await res.json();
        if (data.success) {
            showToast(`"${name}" archived.`);
            loadPanelItems(_panelCatId);
            fetchCategories();
        } else {
            showToast(data.message || 'Archive failed.', 'error');
        }
    } catch(e) { showToast('Network error.', 'error'); }
}

// ── TABS ──
let _catCurrentTab = 'active';

function switchTab(tab) {
    _catCurrentTab = tab;
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.cat-tab[data-tab="${tab}"]`).classList.add('active');
    const addBtn = document.getElementById('btn-add-cat');
    if (addBtn) addBtn.style.display = tab === 'archived' ? 'none' : 'flex';
    tab === 'active' ? fetchCategories() : fetchArchivedCategories();
}

// ── FETCH ──
async function fetchCategories() {
    setTableLoading();
    try {
        const res  = await fetch(CAT_API.list);
        const data = await res.json();
        const active = data.filter(c => !c.archived || c.archived == 0);
        renderCategoryTable(active);
    } catch(err) { setTableError('Failed to load categories.'); }
}

async function fetchArchivedCategories() {
    setTableLoading();
    try {
        const res  = await fetch(CAT_API.archiveList);
        const data = await res.json();
        renderArchivedTable(data);
    } catch(err) { setTableError('Failed to load archived categories.'); }
}

// ── RENDER ACTIVE ──
function renderCategoryTable(data) {
    const wrap = document.getElementById('cat-table-wrap');
    if (!wrap) return;
    if (!data || data.length === 0) {
        wrap.innerHTML = `<div class="empty-state"><i class="material-icons">category</i><p>No categories yet. Click "Add Category" to get started.</p></div>`;
        return;
    }
    const parents  = data.filter(c => !c.parent_id || c.parent_id == 0 || c.parent_id === '');
    const children = data.filter(c => c.parent_id && c.parent_id != 0 && c.parent_id !== '');
    let rows = '';
    parents.forEach((cat, i) => {
        const subs        = children.filter(c => String(c.parent_id) === String(cat.category_id));
        const availCount  = subs.filter(s => s.status === 'Available').length;
        const unavailCount = subs.filter(s => s.status !== 'Available').length;
        rows += `
        <tr style="background:#fff;">
            <td style="color:#a0aec0;font-weight:600">${String(i+1).padStart(2,'0')}</td>
            <td>
                <div style="font-weight:700;color:#0A2E1F;font-size:0.95rem;">${esc(cat.category_name)}</div>
                ${cat.description ? `<div style="font-size:0.78rem;color:#a0aec0;margin-top:2px">${esc(cat.description)}</div>` : ''}
            </td>
            <td>
                ${subs.length === 0
                    ? `<span style="color:#cbd5e0;font-size:0.8rem;font-style:italic">No items yet</span>`
                    : `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                        ${availCount > 0 ? `<span style="background:#e6f9ef;color:#1baa5d;font-size:0.72rem;font-weight:700;padding:3px 9px;border-radius:12px;">● ${availCount} Available</span>` : ''}
                        ${unavailCount > 0 ? `<span style="background:#fff0f0;color:#e53e3e;font-size:0.72rem;font-weight:700;padding:3px 9px;border-radius:12px;">● ${unavailCount} Not Available</span>` : ''}
                       </div>`
                }
            </td>
            <td>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button onclick="openCatItemsPanel(${cat.category_id}, '${escAttr(cat.category_name)}')"
                        style="background:#0A2E1F;color:#fff;border:none;border-radius:8px;
                        padding:7px 14px;font-size:0.8rem;font-weight:700;cursor:pointer;
                        display:inline-flex;align-items:center;gap:5px;white-space:nowrap;">
                        <i class="material-icons" style="font-size:14px">list</i> View List
                    </button>
                    <button class="btn-action edit" title="Edit Category"
                        onclick="openEditModal(${cat.category_id}, '${escAttr(cat.category_name)}', '${escAttr(cat.description || '')}', '', 0)">
                        <i class="material-icons">edit</i>
                    </button>
                    <button class="btn-action del" title="Archive Category"
                        onclick="archiveCategory(${cat.category_id}, '${escAttr(cat.category_name)}')">
                        <i class="material-icons">archive</i>
                    </button>
                </div>
            </td>
        </tr>`;
    });
    wrap.innerHTML = `
        <table id="category-table">
            <thead><tr>
                <th>#</th><th>Category Name</th><th>Items Status</th><th>Actions</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// ── RENDER ARCHIVED ──
function renderArchivedTable(data) {
    const wrap = document.getElementById('cat-table-wrap');
    if (!wrap) return;
    if (!data || data.length === 0) {
        wrap.innerHTML = `<div class="empty-state"><i class="material-icons">inventory</i><p>No archived categories.</p></div>`;
        return;
    }
    wrap.innerHTML = `
        <table id="category-table">
            <thead><tr>
                <th>#</th><th>Category Name</th><th>Description</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
                ${data.map((cat, i) => `
                <tr>
                    <td style="color:#a0aec0;font-weight:600">${String(i+1).padStart(2,'0')}</td>
                    <td style="font-weight:600">${esc(cat.category_name)}</td>
                    <td style="color:#718096">${esc(cat.description||'—')}</td>
                    <td><span class="status-badge badge-unavailable">Archived</span></td>
                    <td>
                        <button class="btn-action restore" title="Restore"
                            onclick="restoreCategory(${cat.category_id}, '${escAttr(cat.category_name)}')">
                            <i class="material-icons">restore</i>
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

// ── SUBMIT ──
async function handleCategorySubmit(e) {
    e.preventDefault();
    const id       = document.getElementById('edit-cat-id').value;
    const name     = document.getElementById('cat-name').value.trim();
    const desc     = document.getElementById('cat-description').value.trim();
    const statEl   = document.getElementById('cat-status');
    const stat     = statEl ? statEl.value : 'Available';
    const parentId = (document.getElementById('cat-parent-id')?.value) || '0';
    const isItem   = parentId && parentId !== '0';
    const saveBtn  = document.querySelector('.save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    try {
        const fd = new FormData();
        if (id) fd.append('id', id);
        fd.append('name', name);
        fd.append('description', desc);
        if (isItem) fd.append('status', stat);
        if (isItem) fd.append('parent_id', parentId);
        const url  = id ? CAT_API.update : CAT_API.add;
        const res  = await fetch(url, { method:'POST', body:fd });
        const data = await res.json();
        if (data.success) {
            showToast(id ? (isItem ? 'Item updated!' : 'Category updated!') : (isItem ? 'Item added!' : 'Category added!'));
            closeModal();
            if (isItem && _panelCatId) loadPanelItems(_panelCatId);
            fetchCategories();
        } else {
            showToast(data.message || 'Failed to save.', 'error');
        }
    } catch(err) { showToast('Network error.', 'error'); }
    finally {
        saveBtn.disabled = false;
        saveBtn.textContent = id ? (isItem ? 'Update Item' : 'Update Category') : (isItem ? 'Save Item' : 'Save Category');
    }
}

// ── ARCHIVE / RESTORE ──
async function archiveCategory(id, name) {
    try {
        const checkRes  = await fetch(`../api/category_items.php?parent_id=${id}&t=${Date.now()}`);
        const checkData = await checkRes.json();
        const items = Array.isArray(checkData) ? checkData : (checkData.items || []);
        if (items.some(item => item.status === 'Available')) {
            showToast(`Cannot archive "${name}" — it still has Available products.`, 'error');
            return;
        }
    } catch(err) { showToast('Could not verify product status.', 'error'); return; }
    if (!confirm(`Archive "${name}"? It can be restored later.`)) return;
    try {
        const res  = await fetch(CAT_API.archive, {
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id})
        });
        const data = await res.json();
        if (data.success) { showToast(`"${name}" archived.`); fetchCategories(); }
        else showToast(data.message || 'Archive failed.', 'error');
    } catch(err) { showToast('Network error.', 'error'); }
}

async function restoreCategory(id, name) {
    if (!confirm(`Restore "${name}"?`)) return;
    try {
        const res  = await fetch(CAT_API.restore, {
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id})
        });
        const data = await res.json();
        if (data.success) { showToast(`"${name}" restored!`); fetchArchivedCategories(); }
        else showToast(data.message || 'Restore failed.', 'error');
    } catch(err) { showToast('Network error.', 'error'); }
}

// ── MODAL HELPERS ──
function openModal() {
    document.getElementById('modalTitle').textContent = 'Add Category';
    document.querySelector('.save-btn').textContent   = 'Save Category';
    document.getElementById('edit-cat-id').value      = '';
    document.getElementById('categoryForm').reset();
    const statusRow = document.getElementById('cat-status-row');
    if (statusRow) statusRow.style.display = 'none';
    const parentRow = document.getElementById('cat-parent-row');
    if (parentRow) parentRow.style.display = 'none';
    const pField = document.getElementById('cat-parent-id');
    if (pField) pField.value = '0';
    document.getElementById('categoryModal').classList.add('show');
}

function openEditModal(id, name, description, status, parentId) {
    document.getElementById('modalTitle').textContent = parentId ? 'Edit Item' : 'Edit Category';
    document.querySelector('.save-btn').textContent   = parentId ? 'Update Item' : 'Update Category';
    document.getElementById('edit-cat-id').value      = id;
    document.getElementById('cat-name').value         = name;
    document.getElementById('cat-description').value  = description;
    const pField = document.getElementById('cat-parent-id');
    if (pField) pField.value = parentId || 0;
    const statusRow = document.getElementById('cat-status-row');
    if (statusRow) statusRow.style.display = parentId ? '' : 'none';
    if (parentId && document.getElementById('cat-status'))
        document.getElementById('cat-status').value = status || 'Available';
    const parentRow = document.getElementById('cat-parent-row');
    if (parentRow) parentRow.style.display = 'none';
    document.getElementById('categoryModal').classList.add('show');
}

function openAddSubModal(parentId, parentName) {
    document.getElementById('modalTitle').textContent = `Add Item to "${parentName}"`;
    document.querySelector('.save-btn').textContent   = 'Save Item';
    document.getElementById('edit-cat-id').value      = '';
    document.getElementById('categoryForm').reset();
    const pField = document.getElementById('cat-parent-id');
    if (pField) pField.value = parentId;
    const statusRow = document.getElementById('cat-status-row');
    if (statusRow) statusRow.style.display = '';
    document.getElementById('cat-status').value = 'Available';
    const parentRow = document.getElementById('cat-parent-row');
    if (parentRow) {
        parentRow.style.display = '';
        const lbl = document.getElementById('cat-parent-label');
        if (lbl) lbl.textContent = parentName;
    }
    document.getElementById('categoryModal').classList.add('show');
}

document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('categoryModal');
    if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
});

function setTableLoading() {
    const wrap = document.getElementById('cat-table-wrap');
    if (wrap) wrap.innerHTML = `<div class="cat-loading"><i class="material-icons spin">autorenew</i> Loading...</div>`;
}

function setTableError(msg) {
    const wrap = document.getElementById('cat-table-wrap');
    if (wrap) wrap.innerHTML = `<div class="empty-state"><i class="material-icons">error_outline</i><p>${msg}</p></div>`;
}

// ══════════════════════════════════════════════════════════════
//  PRODUCTS PAGE — mirrors admin exactly
// ══════════════════════════════════════════════════════════════
function renderProductsPage() {
    _currentProdTab = 'active';
    document.getElementById('dynamic-content').innerHTML = `
    <div class="rpt-header">
        <div>
            <h2 class="rpt-title"><i class="material-icons">medication</i> Product Management</h2>
            <p class="rpt-subtitle">Manage inventory products, stock, and expiry</p>
        </div>
        <button class="btn-add-product" onclick="openProductModal()" id="btn-add-prod">
            <i class="material-icons">add</i> Add Product
        </button>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap;padding:0 30px;">
        <div class="cat-tabs" style="margin-bottom:0">
            <button class="cat-tab active" data-ptab="active" onclick="switchProdTab('active')">
                <i class="material-icons">inventory_2</i> Active
            </button>
            <button class="cat-tab" data-ptab="archived" onclick="switchProdTab('archived')">
                <i class="material-icons">archive</i> Archived
            </button>
        </div>
        <div style="position:relative;flex:1;max-width:320px;min-width:200px;">
            <i class="material-icons" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#a0aec0;font-size:18px;pointer-events:none;">search</i>
            <input type="text" id="prod-search" placeholder="Search product, brand, category..."
                oninput="filterProducts(this.value)"
                style="width:100%;padding:10px 14px 10px 38px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.88rem;outline:none;font-family:inherit;background:#fff;color:#0A2E1F;"
                onfocus="this.style.borderColor='#1baa5d'" onblur="this.style.borderColor='#e2e8f0'">
        </div>
    </div>

    <div class="prod-table-card" style="margin:0 30px 30px;">
        <div id="prod-table-wrap">
            <div class="cat-loading"><i class="material-icons spin">autorenew</i> Loading...</div>
        </div>
    </div>`;
    fetchProducts();
}

// ══════════════════════════════════════════════════════════════
//  PRODUCT MODAL — same as admin
// ══════════════════════════════════════════════════════════════
async function openProductModal() {
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    document.getElementById('prod-save-btn').innerHTML = '<i class="material-icons">save</i> Save Product';
    document.getElementById('prod-edit-id').value = '';
    document.getElementById('productForm').reset();
    document.getElementById('imgPreview').style.display   = 'none';
    document.getElementById('imgPlaceholderIcon').style.display = '';
    document.getElementById('imgPlaceholderText').style.display = '';
    document.getElementById('ai-scan-box').style.display  = 'none';
    document.getElementById('ai-scanning').style.display  = 'none';
    document.getElementById('prod-batch').value = '';

    const defaultExpiry = new Date();
    defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
    document.getElementById('prod-expiry').value = defaultExpiry.toISOString().split('T')[0];
    const presetEl = document.getElementById('prod-expiry-preset');
    if (presetEl) presetEl.value = '1y';

    document.getElementById('productModal').classList.add('show');
    await loadProductDropdowns();
}

async function openEditProductModal(id) {
    await openProductModal();
    try {
        const res  = await fetch(PROD_API.list);
        const data = await res.json();
        const p    = data.find(x => x.id === id);
        if (!p) return;

        document.getElementById('productModalTitle').textContent = 'Edit Product';
        document.getElementById('prod-save-btn').innerHTML = '<i class="material-icons">save</i> Update Product';
        document.getElementById('prod-edit-id').value          = p.id;
        document.getElementById('prod-name').value             = p.name || '';
        document.getElementById('prod-brand').value            = p.brand_name || '';
        document.getElementById('prod-batch').value            = p.batch_no || '';
        document.getElementById('prod-quantity').value         = p.quantity || '';
        document.getElementById('prod-price').value            = p.price_per_pack || p.price || '';
        document.getElementById('prod-price-per-item').value   = p.price || '';
        document.getElementById('prod-qty-per-pack').value     = p.qty_per_pack || '1';
        document.getElementById('prod-expiry').value           = p.expiry_date || '';
        document.getElementById('prod-unit-value').value       = p.unit_value || '';
        document.getElementById('prod-description').value      = p.description || '';
        if (p.category_id)         document.getElementById('prod-category').value     = p.category_id;
        if (p.unit_id)             document.getElementById('prod-unit').value         = p.unit_id;
        if (p.measurement_unit_id) document.getElementById('prod-measure-unit').value = p.measurement_unit_id;
        if (p.supplier_id) {
            const supSel = document.getElementById('prod-supplier');
            if (supSel) supSel.value = p.supplier_id;
        }
        if (p.image) {
            document.getElementById('imgPreview').src = prodImgSrc(p.image);
            document.getElementById('imgPreview').style.display   = 'block';
            document.getElementById('imgPlaceholderIcon').style.display = 'none';
            document.getElementById('imgPlaceholderText').style.display = 'none';
        }
    } catch(e) { console.error(e); }
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('show');
    document.getElementById('productForm').reset();
    document.getElementById('imgPreview').style.display   = 'none';
    document.getElementById('imgPlaceholderIcon').style.display = '';
    document.getElementById('imgPlaceholderText').style.display = '';
    document.getElementById('ai-scan-box').style.display  = 'none';
    document.getElementById('ai-scanning').style.display  = 'none';
    document.getElementById('prod-description').value = '';
    document.getElementById('prod-brand').value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const po = document.getElementById('productModal');
    if (po) po.addEventListener('click', e => { if (e.target === po) closeProductModal(); });
});

async function loadProductDropdowns() {
    try {
        const [catRes, unitRes, muRes] = await Promise.all([
            fetch(PROD_API.categories), fetch(PROD_API.units), fetch(PROD_API.measureUnits)
        ]);
        const [cats, units, mus] = await Promise.all([catRes.json(), unitRes.json(), muRes.json()]);
        const catSel  = document.getElementById('prod-category');
        const unitSel = document.getElementById('prod-unit');
        const muSel   = document.getElementById('prod-measure-unit');
        catSel.innerHTML  = '<option value="">Select category...</option>';
        unitSel.innerHTML = '<option value="">Select packaging...</option>';
        if (muSel) muSel.innerHTML = '<option value="">Select unit...</option>';
        const activeCats = cats.filter(c => !c.archived || c.archived == 0);
        const parents  = activeCats.filter(c => !c.parent_id || c.parent_id == 0 || c.parent_id === '');
        const children = activeCats.filter(c => c.parent_id && c.parent_id != 0 && c.parent_id !== '');
        parents.forEach(p => {
            const subs = children.filter(c => String(c.parent_id) === String(p.category_id));
            if (subs.length > 0) {
                const grp = document.createElement('optgroup');
                grp.label = p.category_name;
                subs.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.category_id;
                    opt.textContent = s.category_name;
                    grp.appendChild(opt);
                });
                catSel.appendChild(grp);
            } else {
                const opt = document.createElement('option');
                opt.value = p.category_id;
                opt.textContent = p.category_name;
                catSel.appendChild(opt);
            }
        });
        children.filter(c => !parents.find(p => String(p.category_id) === String(c.parent_id)))
            .forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.category_id;
                opt.textContent = c.category_name;
                catSel.appendChild(opt);
            });
        units.forEach(u => {
            unitSel.innerHTML += `<option value="${u.unit_id}">${esc(u.unit_name)}</option>`;
        });
        if (muSel) mus.forEach(m => {
            muSel.innerHTML += `<option value="${m.unit_id}">${esc(m.unit_name)}${m.abbreviation?' ('+m.abbreviation+')':''}</option>`;
        });
    } catch(e) { console.error('Dropdown load error:', e); }

    // ── Suppliers — separate try/catch so it never breaks other dropdowns ──
    try {
        const supSel = document.getElementById('prod-supplier');
        if (!supSel) return;
        supSel.innerHTML = '<option value="">-- No supplier --</option>';
        const supRes  = await fetch(PROD_API.suppliers + '?t=' + Date.now());
        const supData = await supRes.json();
        const suppliers = Array.isArray(supData) ? supData : (supData.suppliers || []);
        suppliers.forEach(s => {
            const opt = document.createElement('option');
            opt.value       = s.supplier_id;
            opt.textContent = s.supplier_name;
            supSel.appendChild(opt);
        });
    } catch(e) {
        console.warn('Supplier dropdown failed to load:', e);
        const supSel = document.getElementById('prod-supplier');
        if (supSel) supSel.innerHTML = '<option value="">Suppliers unavailable</option>';
    }
}

function recalcPrice() {
    const perItem    = parseFloat(document.getElementById('prod-price-per-item').value) || 0;
    const qtyPerPack = parseInt(document.getElementById('prod-qty-per-pack').value) || 0;
    if (perItem > 0 && qtyPerPack > 0)
        document.getElementById('prod-price').value = (perItem * qtyPerPack).toFixed(2);
}

function setExpiryFromPreset(val) {
    if (!val || val === 'custom') return;
    const d = new Date();
    if (val === '6m') d.setMonth(d.getMonth() + 6);
    else d.setFullYear(d.getFullYear() + parseInt(val));
    document.getElementById('prod-expiry').value = d.toISOString().split('T')[0];
}

function generateBatchCode() {
    const date = new Date();
    const ymd  = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
    const rand = Math.random().toString(36).substring(2,7).toUpperCase();
    return `BATCH-${ymd}-${rand}`;
}

// ── Image Upload + OCR (Tesseract) — same as admin ────────────
(function loadTesseract() {
    if (document.getElementById('tesseract-script')) return;
    const s = document.createElement('script');
    s.id  = 'tesseract-script';
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js';
    document.head.appendChild(s);
})();

async function handleImageUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('imgPreview').src = e.target.result;
        document.getElementById('imgPreview').style.display   = 'block';
        document.getElementById('imgPlaceholderIcon').style.display = 'none';
        document.getElementById('imgPlaceholderText').style.display = 'none';
    };
    reader.readAsDataURL(file);
    document.getElementById('ai-scanning').style.display = 'flex';
    document.getElementById('ai-scan-box').style.display = 'none';
    try {
        let waited = 0;
        while (typeof Tesseract === 'undefined' && waited < 8000) {
            await new Promise(r => setTimeout(r, 200)); waited += 200;
        }
        if (typeof Tesseract === 'undefined') throw new Error('OCR not loaded');
        const result  = await Tesseract.recognize(file, 'eng', { logger: () => {} });
        const rawText = result.data.text || '';
        document.getElementById('ai-scanning').style.display = 'none';
        document.getElementById('ai-scan-box').style.display = 'block';
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
        const name  = lines[0] || '';
        document.getElementById('ai-scan-result').innerHTML = name
            ? `<strong>Detected:</strong> ${esc(name)}`
            : `<em>Could not extract name. Please fill in manually.</em>`;
        if (name && !document.getElementById('prod-name').value)
            document.getElementById('prod-name').value = name;
    } catch(e) {
        document.getElementById('ai-scanning').style.display = 'none';
        document.getElementById('ai-scan-box').style.display = 'block';
        document.getElementById('ai-scan-result').innerHTML = `<em>Could not read image text.</em>`;
    }
}

// ── Submit product ────────────────────────────────────────────
async function handleProductSubmit(e) {
    e.preventDefault();
    const btn    = document.getElementById('prod-save-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="material-icons spin">autorenew</i> Saving...';

    const editId = document.getElementById('prod-edit-id').value;
    const fd     = new FormData();
    fd.append('name',                document.getElementById('prod-name').value.trim());
    fd.append('brand_name',          document.getElementById('prod-brand').value.trim());
    fd.append('category_id',         document.getElementById('prod-category').value);
    fd.append('supplier_id',         document.getElementById('prod-supplier')?.value || '');
    fd.append('unit_id',             document.getElementById('prod-unit').value);
    fd.append('measurement_unit_id', document.getElementById('prod-measure-unit').value);
    fd.append('unit_value',          document.getElementById('prod-unit-value').value);
    fd.append('quantity',            document.getElementById('prod-quantity').value);
    fd.append('price',               document.getElementById('prod-price').value);
    fd.append('price_per_item',      document.getElementById('prod-price-per-item').value || '0');
    fd.append('qty_per_pack',        document.getElementById('prod-qty-per-pack').value || '1');
    fd.append('expiry_date',         document.getElementById('prod-expiry').value);
    fd.append('description',         document.getElementById('prod-description').value.trim());
    fd.append('batch_no', editId ? document.getElementById('prod-batch').value : generateBatchCode());
    if (editId) fd.append('id', editId);
    const imgInput = document.getElementById('prod-image-input');
    if (imgInput.files[0]) fd.append('image', imgInput.files[0]);

    const endpoint = editId ? PROD_API.update : PROD_API.add;
    try {
        const res  = await fetch(endpoint, { method:'POST', body:fd });
        const data = await res.json();
        if (data.success) {
            showToast(editId ? 'Product updated!' : 'Product added!');
            closeProductModal();
            fetchProducts();
        } else {
            showToast(data.message || 'Failed to save product.', 'error');
        }
    } catch(err) {
        showToast('Network error. Try again.', 'error');
    } finally {
        btn.disabled  = false;
        btn.innerHTML = editId
            ? '<i class="material-icons">save</i> Update Product'
            : '<i class="material-icons">save</i> Save Product';
    }
}

async function archiveProduct(id, name) {
    // Block archiving if product is still Available (qty > 0 and not expired)
    const prod = _allActiveProds.find(p => p.id == id);
    if (prod) {
        const today = new Date(); today.setHours(0,0,0,0);
        const qty = parseInt(prod.quantity) || 0;
        let resolvedExpiry = prod.expiry_date;
        if (!resolvedExpiry || resolvedExpiry === '0000-00-00' || resolvedExpiry === '') {
            const autoExp = new Date();
            autoExp.setFullYear(autoExp.getFullYear() + 1);
            resolvedExpiry = autoExp.getFullYear() + '-' +
                String(autoExp.getMonth()+1).padStart(2,'0') + '-' +
                String(autoExp.getDate()).padStart(2,'0');
        }
        const expDate = new Date(resolvedExpiry); expDate.setHours(0,0,0,0);
        if (qty > 0 && expDate >= today) {
            showToast(`Cannot archive "${name}" — product is still Available. Set quantity to 0 or wait until it expires first.`, 'error');
            return;
        }
    }
    if (!confirm(`Archive "${name}"? It can be restored later.`)) return;
    try {
        const res  = await fetch(PROD_API.archive, {
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id})
        });
        const data = await res.json();
        if (data.success) { showToast(`"${name}" archived.`); fetchProducts(); }
        else showToast(data.message || 'Archive failed.', 'error');
    } catch(e) { showToast('Network error.', 'error'); }
}

async function restoreProduct(id, name) {
    if (!confirm(`Restore "${name}"?`)) return;
    try {
        const res  = await fetch(PROD_API.restore, {
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id})
        });
        const data = await res.json();
        if (data.success) { showToast(`"${name}" restored!`); fetchArchivedProducts(); }
        else showToast(data.message || 'Restore failed.', 'error');
    } catch(e) { showToast('Network error.', 'error'); }
}

// ══════════════════════════════════════════════════════════════
//  USER DROPDOWN / CHANGE PASSWORD / LOGOUT
// ══════════════════════════════════════════════════════════════
function toggleDropdown() {
    document.getElementById('profile-dropdown').classList.toggle('show');
}

function openChangePasswordModal(e) {
    if (e) e.preventDefault();
    document.getElementById('profile-dropdown').classList.remove('show');
    const modal = document.getElementById('changePwdModal');
    modal.style.display = 'flex';
}

function closeChangePwdModal(e) {
    if (e && e.target !== document.getElementById('changePwdModal')) return;
    document.getElementById('changePwdModal').style.display = 'none';
    document.getElementById('changePwdForm').reset();
    document.getElementById('pwd-strength-fill').style.width = '0';
    const strengthLabel = document.getElementById('pwd-strength-label') || document.getElementById('pwd-strength-text');
    if (strengthLabel) strengthLabel.textContent = '';
    document.getElementById('pwd-match-msg').textContent = '';
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
    btn.innerHTML = '<i class="material-icons spin" style="font-size:17px">autorenew</i> Updating...';
    try {
        const res  = await fetch('../api/change_password.php', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ current_password:current, new_password:newPwd })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('changePwdModal').style.display = 'none';
            showToast('Password updated successfully!');
        } else showToast(data.message || 'Failed.', 'error');
    } catch(err) { showToast('Connection error.', 'error'); }
    finally {
        btn.disabled  = false;
        btn.innerHTML = '<i class="material-icons" style="font-size:17px">lock_reset</i> Update Password';
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
    const label = document.getElementById('pwd-strength-text') || document.getElementById('pwd-strength-label');
    let s = 0;
    if (val.length >= 8)          s++;
    if (/[A-Z]/.test(val))        s++;
    if (/[0-9]/.test(val))        s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    const cfg = [{w:'0%',c:'',t:''},{w:'25%',c:'#e53e3e',t:'Weak'},{w:'50%',c:'#dd6b20',t:'Fair'},{w:'75%',c:'#d69e2e',t:'Good'},{w:'100%',c:'#1baa5d',t:'Strong'}][s];
    fill.style.width = cfg.w; fill.style.background = cfg.c;
    label.textContent = cfg.t; label.style.color = cfg.c;
}

function confirmLogout(e) {
    if (e) e.preventDefault();
    document.getElementById('profile-dropdown').classList.remove('show');
    const existing = document.getElementById('logout-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'logout-overlay';
    overlay.innerHTML = `
        <div class="logout-dialog">
            <div class="logout-dialog-icon"><i class="material-icons">logout</i></div>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out?</p>
            <div class="logout-dialog-actions">
                <button class="logout-btn-cancel" onclick="document.getElementById('logout-overlay').remove()">Cancel</button>
                <button class="logout-btn-confirm" onclick="window.location.href='../index.php'">Yes, Logout</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

// ══════════════════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════════════════
function setLoading() {
    document.getElementById('dynamic-content').innerHTML =
        `<div class="loading-state"><i class="material-icons spin">autorenew</i><span>Loading...</span></div>`;
}

function setProdLoading() {
    const w = document.getElementById('prod-table-wrap');
    if (w) w.innerHTML = `<div class="loading-state"><i class="material-icons spin">autorenew</i><span>Loading...</span></div>`;
}

function setProdError(msg) {
    const w = document.getElementById('prod-table-wrap');
    if (w) w.innerHTML = `<div class="empty-state"><i class="material-icons">wifi_off</i><p>${msg}</p></div>`;
}

function showToast(msg, type='success') {
    const toast = document.getElementById('toast');
    const icon  = toast.querySelector('.material-icons');
    document.getElementById('toast-msg').textContent = msg;
    icon.textContent = type === 'error' ? 'error' : 'check_circle';
    toast.classList.toggle('error', type === 'error');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
    return String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════════════
//  CUSTOMER ORDERS PAGE
// ══════════════════════════════════════════════════════════════
let ordersData   = [];
let ordersFilter = 'Pending';

async function pollOrdersBadge() {
    try {
        const res  = await fetch('../api/get_orders.php?status=Pending');
        const data = await res.json();
        const cnt  = Array.isArray(data) ? data.length : 0;
        const b    = document.getElementById('orders-badge');
        if (b) { b.textContent = cnt; b.style.display = cnt > 0 ? '' : 'none'; }
    } catch(e) {}
}

function renderOrdersPage() {
    ordersFilter = 'Pending'; // always reset to Pending when navigating to this page
    document.getElementById('dynamic-content').innerHTML = `
        <div class="orders-toolbar">
            <div class="orders-filter-btns">
                <button class="orders-filter-btn active" id="of-Pending"   onclick="ordersFilterChanged('Pending')">
                    <i class="material-icons">hourglass_top</i> Pending
                </button>
                <button class="orders-filter-btn" id="of-Completed" onclick="ordersFilterChanged('Completed')">
                    <i class="material-icons">check_circle</i> Completed
                </button>
                <button class="orders-filter-btn" id="of-Cancelled" onclick="ordersFilterChanged('Cancelled')">
                    <i class="material-icons">cancel</i> Cancelled
                </button>
                <button class="orders-filter-btn" id="of-all"       onclick="ordersFilterChanged('all')">
                    <i class="material-icons">list</i> All
                </button>
            </div>
            <button class="btn-refresh-orders" onclick="fetchOrders()">
                <i class="material-icons">refresh</i> Refresh
            </button>
        </div>
        <div id="orders-area">
            <div class="loading-state">
                <i class="material-icons spin">autorenew</i>
                <span>Loading orders...</span>
            </div>
        </div>`;
    fetchOrders();
}

async function fetchOrders() {
    const area = document.getElementById('orders-area');
    if (area) area.innerHTML = `<div class="loading-state"><i class="material-icons spin">autorenew</i><span>Loading orders...</span></div>`;
    try {
        const url  = ordersFilter === 'all' ? '../api/get_orders.php' : `../api/get_orders.php?status=${ordersFilter}`;
        const res  = await fetch(url);
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch(e) {
            if (area) area.innerHTML = `<div class="empty-state"><i class="material-icons">error</i><p>Server error in get_orders.php.</p></div>`;
            return;
        }
        ordersData = Array.isArray(data) ? data : [];
        renderOrders();
        pollOrdersBadge();
    } catch(e) {
        if (area) area.innerHTML = `<div class="empty-state"><i class="material-icons">wifi_off</i><p>Cannot load orders. Make sure api/get_orders.php exists.</p></div>`;
    }
}

function ordersFilterChanged(filter) {
    ordersFilter = filter;
    document.querySelectorAll('.orders-filter-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`of-${filter}`);
    if (btn) btn.classList.add('active');
    fetchOrders();
}

function renderOrders() {
    const area = document.getElementById('orders-area');
    if (!area) return;

    if (!ordersData.length) {
        area.innerHTML = `<div class="empty-state">
            <i class="material-icons">receipt_long</i>
            <p>No ${ordersFilter === 'all' ? '' : ordersFilter.toLowerCase() + ' '}orders found.</p>
        </div>`;
        return;
    }

    const cards = ordersData.map(o => {
        const isPending   = o.status === 'Pending';
        const isCompleted = o.status === 'Completed';
        const isCancelled = o.status === 'Cancelled';

        const statusBadge = isPending
            ? `<span class="order-badge badge-pending"><i class="material-icons">hourglass_top</i> Pending</span>`
            : isCompleted
            ? `<span class="order-badge badge-completed"><i class="material-icons">check_circle</i> Completed</span>`
            : `<span class="order-badge badge-cancelled"><i class="material-icons">cancel</i> Cancelled</span>`;

        // items may come back as an array OR as a raw medicines string (e.g. "1x Zolmitriptan")
        // Normalise to an array of display strings in both cases
        let itemsArr = [];
        if (Array.isArray(o.items) && o.items.length) {
            itemsArr = o.items;
        } else if (o.medicines && typeof o.medicines === 'string') {
            // Parse "qty|name|price;qty|name|price" or plain "1x Zolmitriptan" format
            itemsArr = o.medicines.split(';').map(seg => {
                seg = seg.trim();
                const parts = seg.split('|');
                if (parts.length >= 2) return `${parts[0].trim()}x ${parts[1].trim()}`;
                return seg;
            }).filter(Boolean);
        } else if (typeof o.items === 'string' && o.items.trim()) {
            itemsArr = [o.items.trim()];
        }

        const itemsList = itemsArr.length
            ? itemsArr.map(i => `<div class="order-item-row"><i class="material-icons">medication</i>${escO(i)}</div>`).join('')
            : `<div class="order-item-row" style="color:var(--text-muted)">No items recorded</div>`;

        // proof_image path: support both relative uploads/ and api/ prefixes
        const proofSrc = o.proof_image
            ? (o.proof_image.startsWith('http') || o.proof_image.startsWith('../')
                ? o.proof_image
                : `../api/${escO(o.proof_image)}`)
            : '';

        const proofEl = proofSrc
            ? `<div class="order-proof-wrap">
                   <div class="order-proof-label"><i class="material-icons">image</i> Payment Proof</div>
                   <img src="${proofSrc}" class="order-proof-img"
                        onclick="openProofZoom('${proofSrc}')"
                        onerror="this.parentElement.style.display='none'" alt="Proof">
               </div>`
            : '';

        const actionBtns = isPending ? `
            <div class="order-actions">
                <button class="btn-order-complete" onclick="updateOrderStatus(${o.id},'Completed')">
                    <i class="material-icons">check_circle</i> Mark as Completed
                </button>
                <button class="btn-order-cancel" onclick="updateOrderStatus(${o.id},'Cancelled')">
                    <i class="material-icons">cancel</i> Cancel
                </button>
            </div>` : '';

        // API may return order_date OR sale_date depending on the query
        const orderDate = o.order_date || o.sale_date || o.created_at || '';

        return `
            <div class="order-card ${isPending ? 'order-card-pending' : ''}">
                <div class="order-card-header">
                    <div class="order-id-wrap">
                        <span class="order-id">#${o.id}</span>
                        ${statusBadge}
                    </div>
                    <span class="order-date"><i class="material-icons">schedule</i>${escO(orderDate)}</span>
                </div>
                <div class="order-card-body">
                    <div class="order-customer">
                        <i class="material-icons">person</i>
                        <div>
                            <div class="order-customer-name">${escO(o.customer_name)}</div>
                            ${o.customer_email ? `<div class="order-customer-email">${escO(o.customer_email)}</div>` : ''}
                        </div>
                    </div>
                    <div class="order-items-section">
                        <div class="order-items-label">Items Ordered</div>
                        <div class="order-items-list">${itemsList}</div>
                    </div>
                    ${proofEl}
                </div>
                <div class="order-card-footer">
                    <div class="order-total">
                        <span class="order-total-label">Total</span>
                        <span class="order-total-val">₱${escO(o.total)}</span>
                    </div>
                    ${actionBtns}
                </div>
            </div>`;
    }).join('');

    area.innerHTML = `<div class="orders-grid">${cards}</div>`;
}

async function updateOrderStatus(id, status) {
    const label = status === 'Completed' ? 'complete' : 'cancel';
    if (!confirm(`Are you sure you want to ${label} Order #${id}?`)) return;

    try {
        const res  = await fetch('../api/get_orders.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id, status })
        });
        const data = await res.json();
        if (data.success) {
            showToast(status === 'Completed' ? `✅ Order #${id} completed!` : `Order #${id} cancelled.`);
            fetchOrders();
        } else {
            showToast(data.message || 'Update failed.', 'error');
        }
    } catch(e) { showToast('Connection error.', 'error'); }
}

// Proof image zoom
function openProofZoom(src) {
    const existing = document.getElementById('proof-zoom-overlay');
    if (existing) existing.remove();
    const ov = document.createElement('div');
    ov.id = 'proof-zoom-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:5000;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
    ov.innerHTML = `
        <button onclick="document.getElementById('proof-zoom-overlay').remove()"
            style="position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.12);border:none;border-radius:50%;width:44px;height:44px;color:#fff;font-size:1.5rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">
            ×
        </button>
        <img src="${src}" style="max-width:92vw;max-height:92vh;object-fit:contain;border-radius:8px;">`;
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
}

function escO(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════════════
//  REPORT API ENDPOINTS (same as admin)
// ══════════════════════════════════════════════════════════════
const REPORT_API = {
    lowStock: '../api/low_stock_report.php',
    expiry:   '../api/expiry_report.php',
    dispose:  '../api/dispose_product.php',
};

// ══════════════════════════════════════════════════════════════
//  LOW STOCK REPORT
// ══════════════════════════════════════════════════════════════
function renderLowStockPage() {
    document.getElementById('dynamic-content').innerHTML = `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:32px 32px 20px 32px;">
            <div>
                <h2 class="rpt-title"><i class="material-icons">inventory</i> Low Stock Report</h2>
                <p class="rpt-subtitle">Products below minimum stock threshold</p>
            </div>
            <div>
                <button class="rpt-btn rpt-btn-print" onclick="printLowStock()">
                    <i class="material-icons">print</i> Print
                </button>
            </div>
        </div>
        <div class="rpt-summary-row">
            <div class="rpt-summary-card">
                <span class="rpt-sum-label">Low Stock Items</span>
                <span class="rpt-sum-val red" id="ls-count">0</span>
            </div>
            <div class="rpt-summary-card">
                <span class="rpt-sum-label">Critical (≤5)</span>
                <span class="rpt-sum-val red" id="ls-critical">0</span>
            </div>
            <div class="rpt-summary-card">
                <span class="rpt-sum-label">Categories Affected</span>
                <span class="rpt-sum-val" id="ls-categories">0</span>
            </div>
        </div>

        <!-- Restock Modal -->
        <div id="restockModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:18px;padding:32px;width:400px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                    <span style="background:#e6f9ef;border-radius:50%;padding:10px;display:flex;"><i class="material-icons" style="color:#1baa5d;font-size:26px">inventory</i></span>
                    <div>
                        <h3 style="margin:0;color:#0A2E1F;font-size:1.1rem">Restock Product</h3>
                        <p style="margin:0;color:#718096;font-size:0.85rem" id="restock-product-name"></p>
                    </div>
                </div>
                <div style="background:#fff5f5;border-radius:10px;padding:14px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;border:1px solid #fed7d7;">
                    <span style="color:#718096;font-size:0.85rem">⚠ Current Stock</span>
                    <strong id="restock-current-qty" style="color:#e53e3e;font-size:1.3rem">0</strong>
                </div>
                <label style="font-size:0.8rem;font-weight:700;color:#0A2E1F;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">Add Quantity</label>
                <input type="number" id="restock-add-qty" min="1" value="10" placeholder="e.g. 50"
                    style="width:100%;padding:13px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:1.05rem;box-sizing:border-box;outline:none;margin-bottom:8px;"
                    onfocus="this.style.borderColor='#1baa5d'" onblur="this.style.borderColor='#e2e8f0'">
                <p style="color:#718096;font-size:0.82rem;margin:0 0 16px">
                    New total will be: <strong id="restock-new-total" style="color:#1baa5d;font-size:1rem">10</strong> units
                </p>
                <label style="font-size:0.8rem;font-weight:700;color:#0A2E1F;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px">New Expiry Date <span style="color:#e53e3e">*</span></label>
                <input type="date" id="restock-expiry"
                    style="width:100%;padding:13px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.95rem;box-sizing:border-box;outline:none;margin-bottom:6px;"
                    onfocus="this.style.borderColor='#1baa5d'" onblur="this.style.borderColor='#e2e8f0'">
                <p style="color:#718096;font-size:0.78rem;margin:0 0 20px">
                    <i class="material-icons" style="font-size:13px;vertical-align:middle;color:#dd6b20">info</i>
                    Update expiry date for the restocked batch
                </p>
                <div style="display:flex;gap:10px;">
                    <button onclick="closeRestockModal()"
                        style="flex:1;padding:13px;border:2px solid #e2e8f0;border-radius:10px;background:#fff;font-weight:600;cursor:pointer;color:#718096;font-size:0.9rem;font-family:inherit;">
                        Cancel
                    </button>
                    <button onclick="confirmRestock()" id="restock-confirm-btn"
                        style="flex:2;padding:13px;border:none;border-radius:10px;background:#1baa5d;color:#fff;font-weight:700;cursor:pointer;font-size:0.95rem;display:flex;align-items:center;justify-content:center;gap:6px;font-family:inherit;">
                        <i class="material-icons" style="font-size:16px">add_circle</i> Confirm Restock
                    </button>
                </div>
            </div>
        </div>

        <div class="rpt-table-wrap" id="ls-table-wrap">
            <div class="loading-state"><i class="material-icons spin">autorenew</i><span>Loading...</span></div>
        </div>`;
    fetchLowStock();
}

async function fetchLowStock() {
    const wrap = document.getElementById('ls-table-wrap');
    if (!wrap) return;
    try {
        const res  = await fetch(REPORT_API.lowStock + '?t=' + Date.now());
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
            document.getElementById('ls-count').textContent      = 0;
            document.getElementById('ls-critical').textContent   = 0;
            document.getElementById('ls-categories').textContent = 0;
            wrap.innerHTML = `<div class="empty-state"><i class="material-icons">check_circle</i><p>All products are sufficiently stocked!</p></div>`;
            return;
        }
        const critical   = data.filter(p => parseInt(p.quantity) <= 5).length;
        const categories = [...new Set(data.map(p => p.category_name))].length;
        document.getElementById('ls-count').textContent      = data.length;
        document.getElementById('ls-critical').textContent   = critical;
        document.getElementById('ls-categories').textContent = categories;
        window._lowStockData = data;

        wrap.innerHTML = `
        <table class="rpt-table" id="ls-data-table">
            <thead><tr>
                <th>#</th><th>Product Name</th><th>Category</th>
                <th>Batch No.</th><th>Qty Remaining</th><th>Unit</th><th>Status</th><th>Action</th>
            </tr></thead>
            <tbody>
                ${data.map((p, i) => {
                    const qty    = parseInt(p.quantity);
                    const status = qty <= 5 ? 'Critical' : qty <= 10 ? 'Low Stock' : 'Low Stock';
                    const cls    = qty <= 5 ? 'rpt-badge-red' : qty <= 10 ? 'rpt-badge-orange' : 'rpt-badge-orange';
                    const btnClr = qty <= 5 ? '#e53e3e' : '#dd6b20';
                    return `<tr>
                        <td>${i+1}</td>
                        <td><strong>${esc(p.name||'—')}</strong>${p.brand_name?'<br><span style="font-size:0.78rem;color:#a0aec0">'+esc(p.brand_name)+'</span>':''}</td>
                        <td>${esc(p.category_name||'—')}</td>
                        <td style="font-family:monospace;font-size:0.82rem">${esc(p.batch_no||'—')}</td>
                        <td><strong style="color:${qty<=5?'#e53e3e':'inherit'}">${qty}</strong></td>
                        <td>${esc(p.unit||'—')}</td>
                        <td><span class="rpt-badge ${cls}">${status}</span></td>
                        <td>
                            <button onclick="openRestockModal(${p.id},'${escAttr(p.name)}',${qty},'${escAttr(p.expiry_date||'')}')"
                                style="background:${btnClr};color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:0.8rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-family:inherit;">
                                <i class="material-icons" style="font-size:14px">add_circle</i> Restock
                            </button>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    } catch(e) {
        wrap.innerHTML = `<div class="empty-state"><i class="material-icons">wifi_off</i><p>Failed to load low stock data.</p></div>`;
    }
}

// ── Restock Modal ─────────────────────────────────────────────
let _restockProductId  = null;
let _restockCurrentQty = 0;

function openRestockModal(id, name, currentQty, currentExpiry) {
    _restockProductId  = id;
    _restockCurrentQty = currentQty;
    document.getElementById('restock-product-name').textContent = name;
    document.getElementById('restock-current-qty').textContent  = currentQty;
    const addInput = document.getElementById('restock-add-qty');
    addInput.value = 10;
    document.getElementById('restock-new-total').textContent = currentQty + 10;
    addInput.oninput = () => {
        const add = parseInt(addInput.value) || 0;
        document.getElementById('restock-new-total').textContent = currentQty + add;
    };
    // Pre-fill expiry with the existing date or default to 1 year from today
    const expiryInput = document.getElementById('restock-expiry');
    if (currentExpiry && currentExpiry !== '0000-00-00' && currentExpiry !== '') {
        expiryInput.value = currentExpiry;
    } else {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        expiryInput.value = d.getFullYear() + '-' +
            String(d.getMonth()+1).padStart(2,'0') + '-' +
            String(d.getDate()).padStart(2,'0');
    }
    document.getElementById('restockModal').style.display = 'flex';
}

function closeRestockModal() {
    document.getElementById('restockModal').style.display = 'none';
    _restockProductId = null;
}

async function confirmRestock() {
    const addQty = parseInt(document.getElementById('restock-add-qty').value) || 0;
    if (addQty <= 0) { showToast('Please enter a valid quantity.', 'error'); return; }

    const newExpiry = document.getElementById('restock-expiry').value;
    if (!newExpiry) { showToast('Please enter the new expiry date.', 'error'); return; }

    const btn = document.getElementById('restock-confirm-btn');
    btn.disabled  = true;
    btn.innerHTML = '<i class="material-icons" style="font-size:15px">autorenew</i> Restocking...';
    try {
        const fd = new FormData();
        fd.append('id',          _restockProductId);
        fd.append('add_qty',     addQty);
        fd.append('expiry_date', newExpiry);
        const res  = await fetch('../api/restock_product.php', { method:'POST', body:fd });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ Restocked! New qty: ${data.new_qty}`);
            closeRestockModal();
            fetchLowStock();
        } else {
            showToast(data.message || 'Restock failed.', 'error');
        }
    } catch(e) { showToast('Network error.', 'error'); }
    finally {
        btn.disabled  = false;
        btn.innerHTML = '<i class="material-icons" style="font-size:15px">add_circle</i> Confirm Restock';
    }
}

function printLowStock() {
    if (!window._lowStockData || window._lowStockData.length === 0) {
        showToast('No low stock items to print.', 'error'); return;
    }
    const data = window._lowStockData;
    const rows = data.map((p, i) => {
        const qty = parseInt(p.quantity);
        const status = qty <= 5 ? 'CRITICAL' : qty <= 10 ? 'LOW' : 'WARNING';
        const clr    = qty <= 5 ? '#c53030' : qty <= 10 ? '#c05621' : '#b7791f';
        return `<tr>
            <td>${i+1}</td>
            <td><strong>${p.name||'—'}</strong>${p.brand_name?'<br><small style="color:#888">'+p.brand_name+'</small>':''}</td>
            <td>${p.category_name||'—'}</td>
            <td style="font-family:monospace;font-size:11px">${p.batch_no||'—'}</td>
            <td style="color:${clr};font-weight:700;font-size:14px">${qty}</td>
            <td>${p.unit||'—'}</td>
            <td style="color:${clr};font-weight:700">${status}</td>
        </tr>`;
    }).join('');
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Low Stock Report</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Segoe UI,sans-serif;padding:36px;color:#222}
    .pharmacy-name{font-size:22px;font-weight:800;color:#0F3D2E}.report-title{font-size:14px;font-weight:700;color:#c05621;margin-top:4px}
    .meta{font-size:11px;color:#666;margin:10px 0 20px;padding-bottom:10px;border-bottom:2px solid #0F3D2E}
    table{width:100%;border-collapse:collapse;font-size:12px}
    thead th{background:#0F3D2E;color:#fff;padding:9px 10px;text-align:left;font-size:11px;text-transform:uppercase}
    tbody td{padding:8px 10px;border-bottom:1px solid #eee}tbody tr:nth-child(even) td{background:#fafafa}
    .footer{margin-top:40px;display:flex;justify-content:space-between}
    .sig-line{border-top:1.5px solid #222;width:220px;margin:0 auto 4px}.sig-label{font-size:11px;color:#555;text-align:center}
    @media print{body{padding:20px}}</style></head><body>
    <div class="pharmacy-name">EMERALD 24/7 PHARMACY</div>
    <div class="report-title">OFFICIAL LOW STOCK REPORT</div>
    <div class="meta">Generated: <strong>${new Date().toLocaleString()}</strong> &nbsp;|&nbsp; Total Items: <strong>${data.length}</strong></div>
    <table><thead><tr><th>#</th><th>Product Name</th><th>Category</th><th>Batch No.</th><th>Qty</th><th>Unit</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="footer"><small>Printed by Staff Dashboard — Emerald 24/7 Pharmacy</small>
    <div><div class="sig-line"></div><div class="sig-label">Authorized Staff</div></div></div>
    </body></html>`);
    win.document.close(); win.print();
}

// ══════════════════════════════════════════════════════════════
//  EXPIRY REPORT
// ══════════════════════════════════════════════════════════════
let _expiryData = [];

function renderExpiryPage() {
    document.getElementById('dynamic-content').innerHTML = `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:32px 32px 20px 32px;">
            <div>
                <h2 class="rpt-title"><i class="material-icons">event_busy</i> Expiry Report</h2>
                <p class="rpt-subtitle">Expired products ready for disposal</p>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
                <div class="rpt-filter-group">
                    <label>Filter by date</label>
                    <input type="date" id="exp-date" onchange="fetchExpiryReport()">
                    <button class="rpt-btn rpt-btn-clear" onclick="clearExpiryFilter()">
                        <i class="material-icons">clear</i> Clear
                    </button>
                </div>
                <button class="rpt-btn rpt-btn-print" onclick="printExpiryReport()">
                    <i class="material-icons">print</i> Print
                </button>
            </div>
        </div>
        <div class="rpt-summary-row">
            <div class="rpt-summary-card">
                <span class="rpt-sum-label">Expired Items</span>
                <span class="rpt-sum-val red" id="exp-count">0</span>
            </div>
            <div class="rpt-summary-card">
                <span class="rpt-sum-label">Total Qty to Dispose</span>
                <span class="rpt-sum-val red" id="exp-qty">0</span>
            </div>
            <div class="rpt-summary-card">
                <span class="rpt-sum-label">Est. Value Lost</span>
                <span class="rpt-sum-val" id="exp-value">₱0.00</span>
            </div>
        </div>
        <div class="rpt-table-wrap" id="exp-table-wrap">
            <div class="loading-state"><i class="material-icons spin">autorenew</i><span>Loading...</span></div>
        </div>`;
    fetchExpiryReport();
}

async function fetchExpiryReport() {
    const wrap = document.getElementById('exp-table-wrap');
    const date = document.getElementById('exp-date')?.value || '';
    if (!wrap) return;
    wrap.innerHTML = `<div class="loading-state"><i class="material-icons spin">autorenew</i><span>Loading...</span></div>`;
    try {
        let url = REPORT_API.expiry;
        if (date) url += `?date=${date}`;
        const res  = await fetch(url);
        const data = await res.json();
        _expiryData = Array.isArray(data) ? data.filter(p => (p.status||'').toLowerCase() === 'expired') : [];
        if (_expiryData.length === 0) {
            document.getElementById('exp-count').textContent = 0;
            document.getElementById('exp-qty').textContent   = 0;
            document.getElementById('exp-value').textContent = '₱0.00';
            wrap.innerHTML = `<div class="empty-state"><i class="material-icons">check_circle</i><p>No expired products found.</p></div>`;
            return;
        }
        const totalQty = _expiryData.reduce((s,p) => s + parseInt(p.quantity||0), 0);
        const totalVal = _expiryData.reduce((s,p) => s + (parseFloat(p.price||0) * parseInt(p.quantity||0)), 0);
        document.getElementById('exp-count').textContent = _expiryData.length;
        document.getElementById('exp-qty').textContent   = totalQty;
        document.getElementById('exp-value').textContent = `₱${totalVal.toLocaleString('en-PH',{minimumFractionDigits:2})}`;

        wrap.innerHTML = `
        <table class="rpt-table" id="exp-data-table">
            <thead><tr>
                <th>#</th><th>Product Name</th><th>Batch No.</th><th>Category</th>
                <th>Qty</th><th>Price/Pack</th><th>Expiry Date</th><th>Status</th><th>Action</th>
            </tr></thead>
            <tbody>
                ${_expiryData.map((p, i) => `
                <tr id="exp-row-${p.id}">
                    <td>${i+1}</td>
                    <td><strong>${esc(p.name||'—')}</strong></td>
                    <td style="font-family:monospace;font-size:0.82rem">${esc(p.batch_no||'—')}</td>
                    <td>${esc(p.category||p.category_name||'—')}</td>
                    <td>${esc(String(p.quantity||0))}</td>
                    <td>₱${parseFloat(p.price||0).toFixed(2)}</td>
                    <td><span class="rpt-badge rpt-badge-red">${esc(p.expiry_date||'—')}</span></td>
                    <td><span class="rpt-badge rpt-badge-red">EXPIRED</span></td>
                    <td>
                        <button class="rpt-btn-dispose" onclick="disposeProduct(${p.id},'${escAttr(p.name||'')}')">
                            <i class="material-icons">delete_forever</i> Dispose
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
        <p class="exp-dispose-note"><i class="material-icons">info</i> Disposing a product will permanently archive it and mark it as disposed.</p>`;
    } catch(e) {
        wrap.innerHTML = `<div class="empty-state"><i class="material-icons">wifi_off</i><p>Failed to load expiry data.</p></div>`;
    }
}

async function disposeProduct(id, name) {
    if (!confirm(`Dispose "${name}"?\nThis will permanently archive this expired product.`)) return;
    try {
        const res  = await fetch(REPORT_API.dispose, {
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id})
        });
        const data = await res.json();
        if (data.success) {
            showToast(`"${name}" has been disposed.`);
            const row = document.getElementById(`exp-row-${id}`);
            if (row) row.remove();
            const remaining = document.querySelectorAll('[id^="exp-row-"]').length;
            document.getElementById('exp-count').textContent = remaining;
        } else {
            showToast(data.message || 'Dispose failed.', 'error');
        }
    } catch(e) { showToast('Network error.', 'error'); }
}

function clearExpiryFilter() {
    document.getElementById('exp-date').value = '';
    fetchExpiryReport();
}

function printExpiryReport() {
    if (!_expiryData || _expiryData.length === 0) {
        showToast('No expired items to print.', 'error'); return;
    }
    const totalQty = _expiryData.reduce((s,p) => s + parseInt(p.quantity||0), 0);
    const totalVal = _expiryData.reduce((s,p) => s + (parseFloat(p.price||0)*parseInt(p.quantity||0)), 0);
    const rows = _expiryData.map((p, i) => `<tr>
        <td>${i+1}</td><td><strong>${p.name||'—'}</strong></td>
        <td>${p.batch_no||'—'}</td><td>${p.category||p.category_name||'—'}</td>
        <td>${p.quantity||0}</td><td>₱${parseFloat(p.price||0).toFixed(2)}</td>
        <td>${p.expiry_date||'—'}</td><td style="color:#c53030;font-weight:bold">EXPIRED</td>
    </tr>`).join('');
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Expiry Report</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Segoe UI,sans-serif;padding:36px;color:#222}
    .pharmacy-name{font-size:22px;font-weight:800;color:#0F3D2E}.report-title{font-size:14px;font-weight:700;color:#c53030;margin-top:4px}
    .meta{font-size:11px;color:#666;margin:10px 0 20px;padding-bottom:10px;border-bottom:2px solid #0F3D2E}
    table{width:100%;border-collapse:collapse;font-size:12px}
    thead th{background:#0F3D2E;color:#fff;padding:9px 10px;text-align:left;font-size:11px;text-transform:uppercase}
    tbody td{padding:8px 10px;border-bottom:1px solid #eee}tbody tr:nth-child(even) td{background:#fafafa}
    .summary{font-size:12px;margin-bottom:16px;color:#444}
    .footer{margin-top:40px;display:flex;justify-content:space-between}
    .sig-line{border-top:1.5px solid #222;width:220px;margin:0 auto 4px}.sig-label{font-size:11px;color:#555;text-align:center}
    @media print{body{padding:20px}}</style></head><body>
    <div class="pharmacy-name">EMERALD 24/7 PHARMACY</div>
    <div class="report-title">OFFICIAL EXPIRY REPORT</div>
    <div class="meta">Generated: <strong>${new Date().toLocaleString()}</strong> &nbsp;|&nbsp; Expired Items: <strong>${_expiryData.length}</strong></div>
    <div class="summary">Total Qty to Dispose: <strong>${totalQty}</strong> &nbsp;|&nbsp; Est. Value Lost: <strong>₱${totalVal.toLocaleString('en-PH',{minimumFractionDigits:2})}</strong></div>
    <table><thead><tr><th>#</th><th>Product</th><th>Batch</th><th>Category</th><th>Qty</th><th>Price</th><th>Expiry Date</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="footer"><small>Printed by Staff Dashboard — Emerald 24/7 Pharmacy</small>
    <div><div class="sig-line"></div><div class="sig-label">Authorized Staff</div></div></div>
    </body></html>`);
    win.document.close(); win.print();
}