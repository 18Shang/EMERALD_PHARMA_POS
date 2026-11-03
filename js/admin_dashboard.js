document.addEventListener('DOMContentLoaded', function() {
    fetchData();
});

// --- NAVIGATION & UI LOGIC ---

/**
 * Toggles sidebar submenus (Categories, Products, etc.)
 */
function toggleMenu(menuId) {
    const submenu = document.getElementById(`${menuId}-sub`);
    const arrow = submenu.previousElementSibling.querySelector('.arrow');
    
    // Toggle Display
    const isOpen = submenu.style.display === "block";
    submenu.style.display = isOpen ? "none" : "block";
    
    // Rotate Arrow
    if (isOpen) {
        arrow.classList.remove('rotate');
    } else {
        arrow.classList.add('rotate');
    }
}

/**
 * Toggles user profile dropdown
 */
function toggleDropdown() {
    const dropdown = document.getElementById('profile-dropdown');
    dropdown.classList.toggle('show');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const wrap = document.getElementById('user-profile-wrap');
    const dropdown = document.getElementById('profile-dropdown');
    if (wrap && dropdown && !wrap.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// Logout with confirmation
function confirmLogout(e) {
    e.preventDefault();
    document.getElementById('profile-dropdown').classList.remove('show');

    // Show confirm overlay
    const overlay = document.createElement('div');
    overlay.id = 'logout-overlay';
    overlay.innerHTML = `
        <div class="logout-dialog">
            <div class="logout-dialog-icon"><i class="material-icons">logout</i></div>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out?</p>
            <div class="logout-dialog-actions">
                <button class="logout-btn-cancel" onclick="document.getElementById('logout-overlay').remove()">Cancel</button>
                <button class="logout-btn-confirm" onclick="doLogout()">Yes, Logout</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

function doLogout() {
    // Redirect to login page — adjust path if needed
    window.location.href = '../login.php';
}

/**
 * Simulates page loading
 */
function loadPage(page) {
    console.log(`Navigating to: ${page}`);
    document.getElementById('page-title').innerText = page.replace('_', ' ').toUpperCase();
    
    // If navigating away from dashboard, you might hide dynamic-content 
    // and show a different container.
}

// --- DATA FETCHING ---

/**
 * Fetches data from the PHP API
 */
async function fetchData() {
    try {
        // Replace with your actual API endpoint path
        const response = await fetch('../api/dashboard.php'); 
        const data = await response.json();

        // Update Stat Cards
        document.getElementById('total-sales').innerText = `₱${parseFloat(data.total_sales).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.getElementById('low-stock-count').innerText = data.low_stock;
        document.getElementById('expiry-count').innerText = data.expiry;
        document.getElementById('product-count').innerText = data.total_products;

        // Populate Transaction Table
        const tbody = document.querySelector('#transaction-table tbody');
        tbody.innerHTML = data.transactions.map(t => `
            <tr>
                <td>${t.receipt_no}</td>
                <td>${t.customer_name || 'Walk-in'}</td>
                <td>${t.sale_date}</td>
                <td title="${t.medicines}">${t.medicines.substring(0, 20)}...</td>
                <td>₱${parseFloat(t.total).toFixed(2)}</td>
                <td>${t.payment_type}</td>
            </tr>
        `).join('');

        // Populate Alert Lists
        populateList('low-stock-list', data.low_stock_list);
        populateList('expiry-list', data.expiry_list);

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
    }
}

/**
 * Helper to populate alert boxes
 */
function populateList(elementId, items) {
    const container = document.getElementById(elementId);
    if (items.length === 0) {
        container.innerHTML = '<p class="alert-item">No alerts found</p>';
        return;
    }
    
    container.innerHTML = items.map(item => `
        <div class="alert-item">
            <span>${item.name}</span>
            <span class="color-red"><b>${item.info}</b></span>
        </div>
    `).join('');
}

// ══════════════════════════════════════


// ══════════════════════════════════════
//  CATEGORY — API ENDPOINTS
// ══════════════════════════════════════
const API = {
    list:        '../api/category_list.php',
    add:         '../api/category_add.php',
    update:      '../api/category_update.php',
    archive:     '../api/category_archive.php',
    archiveList: '../api/category_archive_list.php',
    restore:     '../api/category_restore.php'
};

// ══════════════════════════════════════
//  CATEGORY — ROUTER PATCH
// ══════════════════════════════════════
const _origLoadPage = loadPage;
loadPage = function(page) {
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(el => {
        if (el.getAttribute('onclick') && el.getAttribute('onclick').includes(`'${page}'`)) {
            el.classList.add('active');
        }
    });

    if (page === 'category') {
        document.getElementById('page-title').innerText = 'Category';
        // Hide the entire top-bar on category page
        document.getElementById('top-bar').style.display = 'none';
        document.getElementById('dynamic-content').style.paddingTop = '30px';
        document.getElementById('dynamic-content').innerHTML = categoryPageHTML();
        attachTabListeners();
        fetchCategories();          // load active tab by default
    } else if (page === 'dashboard') {
        document.getElementById('page-title').innerText = 'Dashboard';
        // Restore top-bar on dashboard
        document.getElementById('top-bar').style.display = '';
        document.getElementById('dynamic-content').style.paddingTop = '';
        document.getElementById('dynamic-content').innerHTML = dashboardPageHTML();
        fetchData();
        // Wire up View All buttons after HTML is injected
        setTimeout(() => {
            const btns = document.querySelectorAll('.btn-view');
            if (btns[0]) btns[0].onclick = () => loadPage('low_stock');
            if (btns[1]) btns[1].onclick = () => loadPage('expiry_report');
        }, 50);
    } else {
        _origLoadPage(page);
    }
};

// ══════════════════════════════════════
//  DASHBOARD HTML TEMPLATE
// ══════════════════════════════════════
function dashboardPageHTML() {
    return `
    <div class="stat-grid">
        <div class="stat-card">
            <i class="material-icons color-green">payments</i>
            <p>Total Sales</p>
            <h2 id="total-sales">₱0.00</h2>
        </div>
        <div class="stat-card">
            <i class="material-icons color-orange">warning</i>
            <p>Low Stock</p>
            <h2 id="low-stock-count">0</h2>
        </div>
        <div class="stat-card">
            <i class="material-icons color-red">timer</i>
            <p>Expiry</p>
            <h2 id="expiry-count">0</h2>
        </div>
        <div class="stat-card">
            <i class="material-icons color-green">inventory_2</i>
            <p>Products</p>
            <h2 id="product-count">0</h2>
        </div>
    </div>
    <div class="table-card">
        <h3>Recent Transactions</h3>
        <div class="table-responsive">
            <table id="transaction-table">
                <thead>
                    <tr>
                        <th>Receipt</th><th>Customer</th><th>Date</th>
                        <th>Items</th><th>Total</th><th>Method</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
    <div class="alert-grid">
        <div class="alert-box">
            <h3>Low Stock Alert</h3>
            <div id="low-stock-list" class="alert-list"></div>
            <button class="btn-view">View All</button>
        </div>
        <div class="alert-box">
            <h3>Expiry Alert</h3>
            <div id="expiry-list" class="alert-list"></div>
            <button class="btn-view">View All</button>
        </div>
    </div>`;
}

// ══════════════════════════════════════
//  CATEGORY PAGE HTML (tabs: Active | Archived)
// ══════════════════════════════════════
function categoryPageHTML() {
    return `
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

    <!-- ── ITEMS PANEL (slide-in) ── -->
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
}

// ── OPEN / CLOSE ITEMS PANEL ──
let _panelCatId = null;
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
        // Use dedicated items endpoint that filters by parent_id server-side
        const res  = await fetch(`../api/category_items.php?parent_id=${catId}&t=${Date.now()}`);
        const data = await res.json();

        // Accept both array and {items:[...]} shaped responses
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
                    ${(item.description) ? `<div style="font-size:0.78rem;color:#a0aec0;margin-top:2px">${esc(item.description)}</div>` : ''}
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
        console.error('[loadPanelItems error]', err);
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
        const res  = await fetch(API.update, { method: 'POST', body: fd });
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
    // Temporarily hide the panel overlay so it doesn't block the modal
    const overlay = document.getElementById('cat-items-overlay');
    if (overlay) overlay.style.display = 'none';
    openAddSubModal(_panelCatId, _panelCatName);
}

// Override closeModal to restore the panel after modal closes
const _origCloseModal = closeModal;
closeModal = function() {
    _origCloseModal();
    // If a panel was open before, restore it
    if (_panelCatId) {
        const overlay = document.getElementById('cat-items-overlay');
        if (overlay) overlay.style.display = '';
    }
};

function openEditItemModal(id, name, desc, status, parentId) {
    // Temporarily hide the panel overlay so modal is fully visible
    const overlay = document.getElementById('cat-items-overlay');
    if (overlay) overlay.style.display = 'none';
    openEditModal(id, name, desc, status, parentId);
}

async function archiveItemFromPanel(id, name) {
    if (!confirm(`Archive item "${name}"?`)) return;
    try {
        const res  = await fetch(API.archive, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`"${name}" archived.`);
            loadPanelItems(_panelCatId);
            fetchCategories(); // refresh count badges
        } else {
            showToast(data.message || 'Archive failed.', 'error');
        }
    } catch(e) { showToast('Network error.', 'error'); }
}

// ── TAB SWITCHING ──
let currentTab = 'active';

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.cat-tab[data-tab="${tab}"]`).classList.add('active');

    // Hide Add button on archived tab
    const addBtn = document.getElementById('btn-add-cat');
    if (addBtn) addBtn.style.display = tab === 'archived' ? 'none' : 'flex';

    if (tab === 'active') {
        fetchCategories();
    } else {
        fetchArchivedCategories();
    }
}

function attachTabListeners() {
    currentTab = 'active';
}

// ══════════════════════════════════════
//  FETCH — ACTIVE CATEGORIES
// ══════════════════════════════════════
async function fetchCategories() {
    setTableLoading();
    try {
        const res  = await fetch(API.list);
        const data = await res.json();
        // category_list.php returns all rows; filter only non-archived
        const active = data.filter(c => !c.archived || c.archived == 0);
        renderCategoryTable(active);
    } catch (err) {
        setTableError('Failed to load categories.');
        console.error(err);
    }
}

// ══════════════════════════════════════
//  FETCH — ARCHIVED CATEGORIES
// ══════════════════════════════════════
async function fetchArchivedCategories() {
    setTableLoading();
    try {
        const res  = await fetch(API.archiveList);
        const data = await res.json();
        renderArchivedTable(data);
    } catch (err) {
        setTableError('Failed to load archived categories.');
        console.error(err);
    }
}

// ══════════════════════════════════════
//  RENDER — ACTIVE TABLE
// ══════════════════════════════════════
function renderCategoryTable(data) {
    const wrap = document.getElementById('cat-table-wrap');
    if (!wrap) return;

    if (!data || data.length === 0) {
        wrap.innerHTML = `
            <div class="empty-state">
                <i class="material-icons">category</i>
                <p>No categories yet. Click "Add Category" to get started.</p>
            </div>`;
        return;
    }

    // Only top-level categories (no parent) are shown here as containers
    const parents  = data.filter(c => !c.parent_id || c.parent_id == 0 || c.parent_id === '');
    const children = data.filter(c => c.parent_id && c.parent_id != 0 && c.parent_id !== '');

    let rows = '';
    parents.forEach((cat, i) => {
        const subs = children.filter(c => String(c.parent_id) === String(cat.category_id));
        const availCount = subs.filter(s => s.status === 'Available').length;
        const unavailCount = subs.filter(s => s.status !== 'Available').length;

        rows += `
        <tr style="background:#fff;">
            <td style="color:#a0aec0;font-weight:600">${String(i + 1).padStart(2, '0')}</td>
            <td>
                <div style="font-weight:700;color:#0A2E1F;font-size:0.95rem;">${esc(cat.category_name)}</div>
                ${cat.description ? `<div style="font-size:0.78rem;color:#a0aec0;margin-top:2px">${esc(cat.description)}</div>` : ''}
            </td>
            <td>
                ${subs.length === 0
                    ? `<span style="color:#cbd5e0;font-size:0.8rem;font-style:italic">No items yet</span>`
                    : `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                        ${availCount > 0 ? `<span style="background:#e6f9ef;color:#1baa5d;font-size:0.72rem;font-weight:700;padding:3px 9px;border-radius:12px;">
                            ● ${availCount} Available</span>` : ''}
                        ${unavailCount > 0 ? `<span style="background:#fff0f0;color:#e53e3e;font-size:0.72rem;font-weight:700;padding:3px 9px;border-radius:12px;">
                            ● ${unavailCount} Not Available</span>` : ''}
                       </div>`
                }
            </td>
            <td>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button onclick="openCatItemsPanel(${cat.category_id}, '${escAttr(cat.category_name)}')"
                        style="background:#0A2E1F;color:#fff;border:none;border-radius:8px;
                        padding:7px 14px;font-size:0.8rem;font-weight:700;cursor:pointer;
                        display:inline-flex;align-items:center;gap:5px;white-space:nowrap;">
                        <i class="material-icons" style="font-size:14px">list</i>
                        View List
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
            <thead>
                <tr>
                    <th>#</th>
                    <th>Category Name</th>
                    <th>Items Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// ══════════════════════════════════════
//  RENDER — ARCHIVED TABLE
// ══════════════════════════════════════
function renderArchivedTable(data) {
    const wrap = document.getElementById('cat-table-wrap');
    if (!wrap) return;

    if (!data || data.length === 0) {
        wrap.innerHTML = `
            <div class="empty-state">
                <i class="material-icons">inventory</i>
                <p>No archived categories.</p>
            </div>`;
        return;
    }

    wrap.innerHTML = `
        <table id="category-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Category Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((cat, i) => `
                <tr>
                    <td style="color:#a0aec0;font-weight:600">${String(i + 1).padStart(2, '0')}</td>
                    <td style="font-weight:600">${esc(cat.category_name)}</td>
                    <td style="color:#718096">${esc(cat.description || '—')}</td>
                    <td>
                        <span class="status-badge badge-unavailable">
                            Archived
                        </span>
                    </td>
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

// ══════════════════════════════════════
//  ADD CATEGORY  →  category_add.php
// ══════════════════════════════════════
async function handleCategorySubmit(e) {
    e.preventDefault();
    const id       = document.getElementById('edit-cat-id').value;
    const name     = document.getElementById('cat-name').value.trim();
    const desc     = document.getElementById('cat-description').value.trim();
    const statEl   = document.getElementById('cat-status');
    const stat     = statEl ? statEl.value : 'Available';
    const parentId = (document.getElementById('cat-parent-id')?.value) || '0';
    const isItem   = parentId && parentId !== '0'; // true = saving an item inside a category

    const saveBtn = document.querySelector('.save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        if (id) {
            // ── UPDATE ──
            const fd = new FormData();
            fd.append('id', id);
            fd.append('name', name);
            fd.append('description', desc);
            if (isItem) fd.append('status', stat);
            if (isItem) fd.append('parent_id', parentId);

            const res  = await fetch(API.update, { method: 'POST', body: fd });
            const data = await res.json();

            if (data.success) {
                showToast(isItem ? 'Item updated!' : 'Category updated!');
                closeModal();
                if (isItem && _panelCatId) {
                    loadPanelItems(_panelCatId); // refresh panel list
                }
                fetchCategories(); // refresh main table counts
            } else {
                showToast(data.message || 'Update failed.', 'error');
            }

        } else {
            // ── ADD ──
            const fd = new FormData();
            fd.append('name', name);
            fd.append('description', desc);
            if (isItem) fd.append('status', stat);
            if (isItem) fd.append('parent_id', parentId);

            const res  = await fetch(API.add, { method: 'POST', body: fd });
            const data = await res.json();

            if (data.success) {
                showToast(isItem ? 'Item added!' : 'Category added!');
                closeModal();
                if (isItem && _panelCatId) {
                    loadPanelItems(_panelCatId); // reload panel so new item appears
                }
                fetchCategories(); // refresh main table
            } else {
                showToast(data.message || 'Failed to save.', 'error');
            }
        }
    } catch (err) {
        showToast('Network error. Please try again.', 'error');
        console.error(err);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = id
            ? (isItem ? 'Update Item' : 'Update Category')
            : (isItem ? 'Save Item'   : 'Save Category');
    }
}

// ══════════════════════════════════════
//  ARCHIVE  →  category_archive.php
// ══════════════════════════════════════
async function archiveCategory(id, name) {
    // Block archiving if the category has any Available child items (products)
    try {
        const checkRes  = await fetch(`../api/category_items.php?parent_id=${id}&t=${Date.now()}`);
        const checkData = await checkRes.json();
        const items = Array.isArray(checkData) ? checkData : (checkData.items || []);
        const hasAvailable = items.some(item => item.status === 'Available');
        if (hasAvailable) {
            showToast(`Cannot archive "${name}" — it still has Available products. Mark all products as Unavailable first.`, 'error');
            return;
        }
    } catch (err) {
        showToast('Could not verify product status. Try again.', 'error');
        return;
    }

    if (!confirm(`Archive "${name}"? It can be restored later.`)) return;
    try {
        const res  = await fetch(API.archive, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`"${name}" archived.`);
            fetchCategories();
        } else {
            showToast(data.message || 'Archive failed.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
        console.error(err);
    }
}

// ══════════════════════════════════════
//  RESTORE  →  category_restore.php
// ══════════════════════════════════════
async function restoreCategory(id, name) {
    if (!confirm(`Restore "${name}"?`)) return;
    try {
        const res  = await fetch(API.restore, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`"${name}" restored!`);
            fetchArchivedCategories();
        } else {
            showToast(data.message || 'Restore failed.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
        console.error(err);
    }
}

// ══════════════════════════════════════
//  MODAL — OPEN / CLOSE
// ══════════════════════════════════════
function openModal() {
    document.getElementById('modalTitle').textContent   = 'Add Category';
    document.querySelector('.save-btn').textContent     = 'Save Category';
    document.getElementById('edit-cat-id').value        = '';
    document.getElementById('categoryForm').reset();
    // Categories are containers — no status
    const statusRow = document.getElementById('cat-status-row');
    if (statusRow) statusRow.style.display = 'none';
    const parentRow = document.getElementById('cat-parent-row');
    if (parentRow) parentRow.style.display = 'none';
    const pField = document.getElementById('cat-parent-id');
    if (pField) pField.value = '0';
    document.getElementById('categoryModal').classList.add('show');
}

function openEditModal(id, name, description, status, parentId) {
    document.getElementById('modalTitle').textContent   = parentId ? 'Edit Item' : 'Edit Category';
    document.querySelector('.save-btn').textContent     = parentId ? 'Update Item' : 'Update Category';
    document.getElementById('edit-cat-id').value        = id;
    document.getElementById('cat-name').value           = name;
    document.getElementById('cat-description').value    = description;
    const pField = document.getElementById('cat-parent-id');
    if (pField) pField.value = parentId || 0;
    // Show status only for items (have a parent)
    const statusRow = document.getElementById('cat-status-row');
    if (statusRow) statusRow.style.display = parentId ? '' : 'none';
    if (parentId && document.getElementById('cat-status')) {
        document.getElementById('cat-status').value = status || 'Available';
    }
    // Show parent label for items
    const parentRow = document.getElementById('cat-parent-row');
    if (parentRow) parentRow.style.display = 'none'; // no need to show when editing
    document.getElementById('categoryModal').classList.add('show');
}

function openAddSubModal(parentId, parentName) {
    document.getElementById('modalTitle').textContent   = `Add Item to "${parentName}"`;
    document.querySelector('.save-btn').textContent     = 'Save Item';
    document.getElementById('edit-cat-id').value        = '';
    document.getElementById('categoryForm').reset();
    const pField = document.getElementById('cat-parent-id');
    if (pField) pField.value = parentId;
    // Items have status
    const statusRow = document.getElementById('cat-status-row');
    if (statusRow) statusRow.style.display = '';
    document.getElementById('cat-status').value = 'Available';
    // Show parent label
    const parentRow = document.getElementById('cat-parent-row');
    if (parentRow) {
        parentRow.style.display = '';
        const lbl = document.getElementById('cat-parent-label');
        if (lbl) lbl.textContent = parentName;
    }
    document.getElementById('categoryModal').classList.add('show');
}

function closeModal() {
    document.getElementById('categoryModal').classList.remove('show');
    document.getElementById('categoryForm').reset();
    document.getElementById('edit-cat-id').value = '';
}

// Close on backdrop click
document.addEventListener('DOMContentLoaded', function () {
    const overlay = document.getElementById('categoryModal');
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });
    }
});

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════
function setTableLoading() {
    const wrap = document.getElementById('cat-table-wrap');
    if (wrap) wrap.innerHTML = `<div class="cat-loading"><i class="material-icons spin">autorenew</i> Loading...</div>`;
}

function setTableError(msg) {
    const wrap = document.getElementById('cat-table-wrap');
    if (wrap) wrap.innerHTML = `<div class="empty-state"><i class="material-icons">error_outline</i><p>${msg}</p></div>`;
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    const icon  = toast.querySelector('.material-icons');
    document.getElementById('toast-msg').textContent = msg;
    icon.textContent = type === 'error' ? 'error_outline' : 'check_circle';
    toast.style.borderLeftColor = type === 'error' ? '#e53e3e' : '#1B8F3C';
    icon.style.color            = type === 'error' ? '#e53e3e' : '#1B8F3C';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

function esc(str) {
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;');
}

function escAttr(str) {
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g,  "\\'")
        .replace(/"/g,  '&quot;');
}


// ══════════════════════════════════════
//  PRODUCT — API ENDPOINTS
// ══════════════════════════════════════
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
    aiScan:      '../api/ai_scan_product.php'
};

// ══════════════════════════════════════
//  PRODUCT — ROUTER PATCH
// ══════════════════════════════════════
const _origLoadPage2 = loadPage;
loadPage = function(page) {
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(el => {
        if (el.getAttribute('onclick') && el.getAttribute('onclick').includes(`'${page}'`)) {
            el.classList.add('active');
        }
    });

    if (page === 'products') {
        document.getElementById('page-title').innerText = 'Products';
        document.getElementById('top-bar').style.display = 'none';
        document.getElementById('dynamic-content').style.paddingTop = '30px';
        document.getElementById('dynamic-content').innerHTML = productPageHTML();
        fetchProducts();
    } else {
        _origLoadPage2(page);
    }
};

// ══════════════════════════════════════
//  PRODUCT PAGE HTML (tabs: Active | Archived)
// ══════════════════════════════════════
function productPageHTML() {
    return `
    <div class="rpt-header">
        <div>
            <h2 class="rpt-title"><i class="material-icons">medication</i> Product Management</h2>
            <p class="rpt-subtitle">Manage inventory products, stock, and expiry</p>
        </div>
        <button class="btn-add-product" onclick="openProductModal()" id="btn-add-prod">
            <i class="material-icons">add</i> Add Product
        </button>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap;">
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

    <div class="prod-table-card">
        <div id="prod-table-wrap">
            <div class="cat-loading"><i class="material-icons spin">autorenew</i> Loading...</div>
        </div>
    </div>`;
}

let currentProdTab  = 'active';
let _allActiveProds = [];   // store for search filtering


function switchProdTab(tab) {
    currentProdTab = tab;
    document.querySelectorAll('[data-ptab]').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-ptab="${tab}"]`).classList.add('active');
    const addBtn = document.getElementById('btn-add-prod');
    if (addBtn) addBtn.style.display = tab === 'archived' ? 'none' : 'flex';
    tab === 'active' ? fetchProducts() : fetchArchivedProducts();
}

// ══════════════════════════════════════
//  FETCH PRODUCTS
// ══════════════════════════════════════
async function fetchProducts() {
    setProdLoading();
    try {
        const res  = await fetch(PROD_API.list);
        const data = await res.json();
        // Debug: log image values from DB so you can see exact filenames
        if (data.length > 0) {
            console.log('[Products] First product image field:', data[0].image);
            console.log('[Products] Full first product:', data[0]);
        }
        _allActiveProds = data;
        renderProductTable(data);
    } catch (err) {
        setProdError('Failed to load products.');
    }
}

async function fetchArchivedProducts() {
    setProdLoading();
    try {
        const res  = await fetch(PROD_API.archiveList);
        const data = await res.json();
        renderArchivedProductTable(data);
    } catch (err) {
        setProdError('Failed to load archived products.');
    }
}

// ── Image path helper ────────────────────────────────────────
// Uploads folder: emerald_system/api/uploads/
// Dashboard:      emerald_system/admin/admin_dashboard.php
// Correct path:   ../api/uploads/filename.jpg
function prodImgSrc(filename) {
    if (!filename) return '';
    // If already has a path prefix, use as-is
    if (filename.startsWith('http') || filename.startsWith('/')) return filename;
    // Strip any accidental leading path (e.g. "uploads/file.jpg" -> "file.jpg")
    const bare = filename.replace(/^.*[\/\\]/, '');
    return '../api/uploads/' + bare;
}

function prodImgTag(filename) {
    if (!filename) return `<div class="prod-thumb-placeholder"><i class="material-icons">medication</i></div>`;
    const src = prodImgSrc(filename);
    console.log('[Image] filename:', filename, '-> src:', src); // debug
    return `<img src="${src}" class="prod-thumb" alt=""
        onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='inline-flex';"
    ><div class="prod-thumb-placeholder" style="display:none"><i class="material-icons">medication</i></div>`;
}

// ══════════════════════════════════════
//  RENDER — ACTIVE PRODUCT TABLE
// ══════════════════════════════════════
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

                    // ── Expiry logic ──────────────────────────
                    // If no expiry saved, auto-display as 1 year from today (read-only label)
                    let resolvedExpiry = p.expiry_date;
                    if (!resolvedExpiry || resolvedExpiry === '0000-00-00' || resolvedExpiry === '') {
                        const autoExp = new Date();
                        autoExp.setFullYear(autoExp.getFullYear() + 1);
                        const ay = autoExp.getFullYear();
                        const am = String(autoExp.getMonth() + 1).padStart(2, '0');
                        const ad = String(autoExp.getDate()).padStart(2, '0');
                        resolvedExpiry = `${ay}-${am}-${ad}`;
                    }
                    let expiryDisplay = resolvedExpiry;
                    let expiryStyle   = 'color:#38a169;font-weight:600';
                    {
                        const expDate  = new Date(resolvedExpiry);
                        expDate.setHours(0,0,0,0);
                        const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                        if (diffDays < 0) {
                            expiryStyle = 'color:#e53e3e;font-weight:700'; // expired — red
                        } else if (diffDays <= 30) {
                            expiryStyle = 'color:#dd6b20;font-weight:700'; // expiring soon — orange
                        } else {
                            expiryStyle = 'color:#38a169;font-weight:600'; // good — green
                        }
                    }

                    // ── Status logic ─────────────────────────
                    // Expired OR qty = 0  →  Unavailable (stays in Active list, no auto-archive)
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

                    const brandDisplay = p.brand_name ? `<span style="color:#718096;font-size:0.82rem">${esc(p.brand_name)}</span>` : '<span style="color:#cbd5e0">—</span>';

                    return `
                    <tr>
                        <td style="color:#a0aec0;font-weight:600">${String(i+1).padStart(2,'0')}</td>
                        <td>${imgEl}</td>
                        <td style="font-weight:600">${esc(p.name)}</td>
                        <td>${brandDisplay}</td>
                        <td style="color:#718096">${esc(p.category_name || p.category || '—')}</td>
                        <td style="font-family:monospace;font-size:0.82rem">${esc(p.batch_no || '—')}</td>
                        <td>${esc(String(p.quantity))}</td>
                        <td style="font-weight:600">₱${parseFloat(p.price||0).toFixed(2)}</td>
                        <td style="font-size:0.85rem;${expiryStyle}">${esc(expiryDisplay)}</td>
                        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                        <td>
                            <div class="action-btns">
                                <button class="btn-action edit" title="Edit" onclick="openEditProductModal(${p.id})">
                                    <i class="material-icons">edit</i>
                                </button>
                                <button class="btn-action del" title="Archive" onclick="archiveProduct(${p.id}, '${escAttr(p.name)}')">
                                    <i class="material-icons">archive</i>
                                </button>
                            </div>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

// ══════════════════════════════════════
//  RENDER — ARCHIVED PRODUCT TABLE
// ══════════════════════════════════════
function renderArchivedProductTable(data) {
    const wrap = document.getElementById('prod-table-wrap');
    if (!wrap) return;
    if (!data || data.length === 0) {
        wrap.innerHTML = `<div class="empty-state"><i class="material-icons">inventory</i><p>No archived products.</p></div>`;
        return;
    }
    wrap.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>#</th><th>Image</th><th>Product Name</th>
                    <th>Batch No.</th><th>Qty</th><th>Expiry</th><th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((p, i) => {
                    const imgEl = p.image
                        ? prodImgTag(p.image)
                        : `<div class="prod-thumb-placeholder"><i class="material-icons">medication</i></div>`;
                    return `
                    <tr>
                        <td style="color:#a0aec0;font-weight:600">${String(i+1).padStart(2,'0')}</td>
                        <td>${imgEl}</td>
                        <td style="font-weight:600">${esc(p.name)}</td>
                        <td style="font-family:monospace;font-size:0.82rem">${esc(p.batch_no || '—')}</td>
                        <td>${esc(String(p.quantity))}</td>
                        <td>${esc(p.expiry_date || 'No expiry')}</td>
                        <td>
                            <button class="btn-action restore" title="Restore" onclick="restoreProduct(${p.id}, '${escAttr(p.name)}')">
                                <i class="material-icons">restore</i>
                            </button>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

// ══════════════════════════════════════
//  OPEN PRODUCT MODAL (Add)
// ══════════════════════════════════════
let _prodDropdownsLoaded = false;

async function openProductModal() {
    // Reset form
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    document.getElementById('prod-save-btn').innerHTML = '<i class="material-icons">save</i> Save Product';
    document.getElementById('prod-edit-id').value = '';   // ALWAYS clear edit ID
    document.getElementById('productForm').reset();
    document.getElementById('imgPreview').style.display = 'none';
    document.getElementById('imgPlaceholderIcon').style.display = '';
    document.getElementById('imgPlaceholderText').style.display = '';
    document.getElementById('ai-scan-box').style.display = 'none';
    document.getElementById('ai-scanning').style.display = 'none';
    document.getElementById('prod-batch').value = '';

    // FIX: Auto-set expiry to 1 year from today AFTER reset() clears it
    const defaultExpiry = new Date();
    defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
    const yyyy = defaultExpiry.getFullYear();
    const mm   = String(defaultExpiry.getMonth() + 1).padStart(2, '0');
    const dd   = String(defaultExpiry.getDate()).padStart(2, '0');
    document.getElementById('prod-expiry').value = yyyy + '-' + mm + '-' + dd;

    // Reset price_per_pack to editable state
    const packEl = document.getElementById('prod-price');
    if (packEl) {
        packEl.readOnly = false;
        packEl.style.background = '';
        packEl.style.cursor = '';
        packEl.title = '';
        packEl.value = '';
    }

    // Set preset dropdown to '1y'
    const presetEl = document.getElementById('prod-expiry-preset');
    if (presetEl) presetEl.value = '1y';

    document.getElementById('productModal').classList.add('show');
    await loadProductDropdowns();
}

async function openEditProductModal(id) {
    await openProductModal();
    // Fetch single product details
    try {
        const res  = await fetch(PROD_API.list);
        const data = await res.json();
        const p = data.find(x => x.id === id);
        if (!p) return;

        document.getElementById('productModalTitle').textContent = 'Edit Product';
        document.getElementById('prod-save-btn').innerHTML = '<i class="material-icons">save</i> Update Product';
        document.getElementById('prod-edit-id').value = p.id;
        document.getElementById('prod-name').value = p.name || '';
        document.getElementById('prod-brand').value = p.brand_name || '';
        document.getElementById('prod-batch').value = p.batch_no || '';
        document.getElementById('prod-quantity').value = p.quantity || '';
        document.getElementById('prod-qty-per-pack').value    = p.qty_per_pack || '1';
        // price = per-item price; price_per_pack = full pack price
        // If price_per_pack is missing, calculate it
        const qtyPP      = parseInt(p.qty_per_pack || 1);
        const priceItem  = parseFloat(p.price || 0);
        const pricePack  = parseFloat(p.price_per_pack || 0) || parseFloat((priceItem * qtyPP).toFixed(2));
        document.getElementById('prod-price-per-item').value  = priceItem > 0 ? priceItem.toFixed(2) : '';
        document.getElementById('prod-price').value           = pricePack > 0 ? pricePack.toFixed(2) : '';
        // Lock price_per_pack as readonly when editing - it was already saved
        const packElEdit = document.getElementById('prod-price');
        if (packElEdit && priceItem > 0) {
            packElEdit.readOnly = true;
            packElEdit.style.background = '#f0f4f8';
            packElEdit.style.cursor = 'not-allowed';
            packElEdit.title = 'Auto-calculated: price per item × qty per pack';
        }
        document.getElementById('prod-expiry').value          = p.expiry_date || '';
        const presetEl2 = document.getElementById('prod-expiry-preset');
        if (presetEl2) presetEl2.value = p.expiry_date ? 'custom' : '1y';
        document.getElementById('prod-unit-value').value    = p.unit_value || '';
        document.getElementById('prod-description').value   = p.description || '';

        if (p.category_id) document.getElementById('prod-category').value = p.category_id;
        if (p.unit_id)     document.getElementById('prod-unit').value = p.unit_id;
        if (p.measurement_unit_id) document.getElementById('prod-measure-unit').value = p.measurement_unit_id;
        if (p.supplier_id) {
            const supSel = document.getElementById('prod-supplier');
            if (supSel) supSel.value = p.supplier_id;
        }

        if (p.image) {
            document.getElementById('imgPreview').src = prodImgSrc(p.image);
            document.getElementById('imgPreview').style.display = 'block';
            document.getElementById('imgPlaceholderIcon').style.display = 'none';
            document.getElementById('imgPlaceholderText').style.display = 'none';
        }
    } catch(e) { console.error(e); }
}

function closeProductModal() {
    _imageValidated = false;
    _imageRequired  = false;
    document.getElementById('productModal').classList.remove('show');
    document.getElementById('productForm').reset();
    document.getElementById('prod-edit-id').value = '';  // FIX: always clear on close
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    document.getElementById('prod-save-btn').innerHTML = '<i class="material-icons">save</i> Save Product';
    document.getElementById('imgPreview').style.display = 'none';
    document.getElementById('imgPlaceholderIcon').style.display = '';
    document.getElementById('imgPlaceholderText').style.display = '';
    document.getElementById('ai-scan-box').style.display = 'none';
    document.getElementById('ai-scanning').style.display = 'none';
    document.getElementById('prod-description').value = '';
    document.getElementById('prod-brand').value = '';
}

document.addEventListener('DOMContentLoaded', function () {
    const po = document.getElementById('productModal');
    if (po) po.addEventListener('click', e => { if (e.target === po) closeProductModal(); });
});

// ══════════════════════════════════════
//  LOAD DROPDOWNS
// ══════════════════════════════════════
async function loadProductDropdowns() {
    try {
        // Load core dropdowns first — these must succeed
        const [catRes, unitRes, muRes] = await Promise.all([
            fetch(PROD_API.categories),
            fetch(PROD_API.units),
            fetch(PROD_API.measureUnits)
        ]);
        const [cats, units, mus] = await Promise.all([
            catRes.json(), unitRes.json(), muRes.json()
        ]);

        // ── Categories ──
        const catSel = document.getElementById('prod-category');
        catSel.innerHTML = '<option value="">Select category...</option>';
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

        // ── Packaging units ──
        const unitSel = document.getElementById('prod-unit');
        unitSel.innerHTML = '<option value="">Select packaging...</option>';
        units.forEach(u => {
            unitSel.innerHTML += `<option value="${u.unit_id}">${esc(u.unit_name)}</option>`;
        });

        // ── Measurement units ──
        const muSel = document.getElementById('prod-measure-unit');
        if (muSel) {
            muSel.innerHTML = '<option value="">Select unit...</option>';
            mus.forEach(m => {
                muSel.innerHTML += `<option value="${m.unit_id}">${esc(m.unit_name)}${m.abbreviation ? ' (' + m.abbreviation + ')' : ''}</option>`;
            });
        }
    } catch(e) { console.error('Dropdown load error:', e); }

    // ── Suppliers — separate try/catch so it never breaks other dropdowns ──
    try {
        const supSel = document.getElementById('prod-supplier');
        if (!supSel) return;
        supSel.innerHTML = '<option value="">-- No supplier --</option>';
        const supRes  = await fetch(PROD_API.suppliers + '?t=' + Date.now());
        const supData = await supRes.json();
        // supplier_list.php returns { suppliers: [...] } or plain array
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

// ══════════════════════════════════════
//  AUTO PRICE CALC
//  price_per_pack = price_per_item × qty_per_pack
// ══════════════════════════════════════
function recalcPrice() {
    const perItem = parseFloat(document.getElementById('prod-price-per-item').value) || 0;
    const qty     = parseInt(document.getElementById('prod-qty-per-pack').value) || 1;
    const perPack = parseFloat((perItem * qty).toFixed(2));
    const packEl  = document.getElementById('prod-price');
    if (perItem > 0) {
        packEl.value    = perPack.toFixed(2);
        packEl.readOnly = true;
        packEl.style.background = '#f0f4f8';
        packEl.style.cursor     = 'not-allowed';
        packEl.title            = 'Auto-calculated: price per item × qty per pack';
    } else {
        packEl.readOnly = false;
        packEl.style.background = '';
        packEl.style.cursor     = '';
        packEl.title            = '';
    }
}


// ══════════════════════════════════════
//  IMAGE UPLOAD + OCR TEXT SCAN
//  Uses Tesseract.js (runs in browser)
//  No API key or server needed
// ══════════════════════════════════════

// Load Tesseract.js once from CDN
(function loadTesseract() {
    if (document.getElementById('tesseract-script')) return;
    const s = document.createElement('script');
    s.id  = 'tesseract-script';
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js';
    document.head.appendChild(s);
})();

// Tracks whether the currently selected image passed medicine validation
let _imageValidated = false;   // true = passed, false = not yet validated or failed
let _imageRequired  = false;   // set true when a new file is picked

async function handleImageUpload(input) {
    const file = input.files[0];
    if (!file) return;

    // ── Step 1: Show scanning indicator immediately ──
    _imageValidated = false;  // reset until validated
    _imageRequired  = true;   // a file was picked
    document.getElementById('ai-scanning').style.display = 'flex';
    document.getElementById('ai-scan-box').style.display = 'none';
    document.getElementById('imgPreview').style.display = 'none';
    document.getElementById('imgPlaceholderIcon').style.display = '';
    document.getElementById('imgPlaceholderText').style.display = '';

    // ── Step 2: Validate image is medicine-related via server ──
    try {
        const checkFd = new FormData();
        checkFd.append('image', file);

        const checkRes  = await fetch('../api/validate_medicine_image.php', { method: 'POST', body: checkFd });
        const checkData = await checkRes.json();

        if (!checkData.success) {
            // Reject — not a medicine image
            document.getElementById('ai-scanning').style.display = 'none';
            document.getElementById('ai-scan-box').style.display = 'block';
            document.getElementById('ai-scan-result').innerHTML =
                `<span style="color:#e53e3e;font-weight:700">⚠ Invalid image.</span> ${checkData.message || 'Please upload a medicine or pharmaceutical product image only.'}`;
            input.value = '';
            showToast('Only medicine or pharmaceutical images are allowed.', 'error');
            return;
        }

        // Show warning if no AI key but allowed through
        if (checkData.warning) {
            console.warn(checkData.warning);
        }

        // ── Step 3: Valid — show preview ──
        _imageValidated = true;  // mark as validated
        const previewUrl = URL.createObjectURL(file);
        document.getElementById('imgPreview').src = previewUrl;
        document.getElementById('imgPreview').style.display = 'block';
        document.getElementById('imgPlaceholderIcon').style.display = 'none';
        document.getElementById('imgPlaceholderText').style.display = 'none';

    } catch(aiErr) {
        // If server check fails, still show preview (don't block on network issues)
        _imageValidated = true;  // allow through on server error
        console.warn('Image validation check failed, skipping:', aiErr);
        const previewUrl = URL.createObjectURL(file);
        document.getElementById('imgPreview').src = previewUrl;
        document.getElementById('imgPreview').style.display = 'block';
        document.getElementById('imgPlaceholderIcon').style.display = 'none';
        document.getElementById('imgPlaceholderText').style.display = 'none';
    }

    // ── Step 4: Run OCR (Tesseract) to auto-fill fields ──
    try {
        // Wait for Tesseract to load (max 8 seconds)
        let waited = 0;
        while (typeof Tesseract === 'undefined' && waited < 8000) {
            await new Promise(r => setTimeout(r, 200));
            waited += 200;
        }
        if (typeof Tesseract === 'undefined') throw new Error('OCR library not loaded');

        // Run OCR
        const result = await Tesseract.recognize(file, 'eng', { logger: () => {} });
        const rawText = result.data.text || '';

        document.getElementById('ai-scanning').style.display = 'none';

        const parsed = parseMedicineText(rawText);

        document.getElementById('ai-scan-box').style.display = 'block';

        if (parsed.name) {
            document.getElementById('ai-scan-result').innerHTML = `
                <strong>Detected:</strong> ${esc(parsed.name)}<br>
                ${parsed.dosage ? `<strong>Dosage:</strong> ${esc(parsed.dosage)}<br>` : ''}
                ${parsed.form   ? `<strong>Form:</strong>   ${esc(parsed.form)}<br>`   : ''}
            `;
            // Auto-fill product name if empty
            if (!document.getElementById('prod-name').value) {
                document.getElementById('prod-name').value = parsed.name;
            }
            // Auto-fill unit value numeric part
            if (parsed.dosageNum && !document.getElementById('prod-unit-value').value) {
                document.getElementById('prod-unit-value').value = parsed.dosageNum;
            }
        } else {
            document.getElementById('ai-scan-result').innerHTML =
                `<em>Text found but could not extract medicine name. Please fill in manually.</em>`;
        }

    } catch(e) {
        document.getElementById('ai-scanning').style.display = 'none';
        document.getElementById('ai-scan-box').style.display = 'block';
        document.getElementById('ai-scan-result').innerHTML =
            `<em>Could not read image text. Please fill in manually.</em>`;
        console.error('OCR error:', e);
    }
}

// ── Parse OCR raw text to extract medicine name, dosage, form ─
function parseMedicineText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    const result = { name: '', dosage: '', dosageNum: '', form: '' };

    const dosageRegex  = /(\d+\.?\d*)\s*(mg|mcg|g\b|ml|iu|%|mg\/ml|mg\/5ml)/i;
    const formKeywords = [
        'tablet','tablets','capsule','capsules','syrup','suspension',
        'drops','injection','cream','ointment','gel','film-coated',
        'effervescent','solution','powder','sachet','patch','inhaler'
    ];

    // Words that are NEVER a medicine name
    const skipWords = [
        'lot','batch','exp','expiry','mfg','manufactured','store',
        'keep','below','room','temperature','contains','each',
        'warning','caution','prescription','only','see',
        'insert','leaflet','dosage','direction','read','label',
        'distributed','imported','registered','fortified',
        'antibacterial','antibiotics','analgesic','antihistamine',
        'extra strength','extra-strength','extra fort',
        'film coated','film-coated','coated tablet',
        'for oral use','for oral','oral use',
        'keep out','out of reach','reach of children',
        'see package','package insert','consult'
    ];

    // Known real drug/medicine name patterns (single word or brand+generic)
    // These are scored highest
    const knownDrugs = [
        'aspirin','paracetamol','ibuprofen','amoxicillin','amoxicilina',
        'amoxil','augmentin','biogesic','neozep','solmux','bioflu',
        'cetirizine','loratadine','mefenamic','metformin','amlodipine',
        'omeprazole','losartan','atorvastatin','simvastatin','metoprolol',
        'salbutamol','azithromycin','ciprofloxacin','doxycycline',
        'cotrimoxazole','clindamycin','erythromycin','tetracycline',
        'zolmitriptan','tramadol','diclofenac','naproxen','celecoxib',
        'ranitidine','famotidine','lansoprazole','pantoprazole',
        'prednisolone','dexamethasone','betamethasone','hydrocortisone',
        'insulin','glimepiride','glipizide','gliclazide',
        'vitamin','ascorbic','ferrous','calcium','zinc',
        'loperamide','domperidone','metoclopramide','ondansetron',
        'fluconazole','clotrimazole','ketoconazole','miconazole',
        'acyclovir','oseltamivir','chlorphenamine','diphenhydramine',
        'hyoscine','buscopan','maalox','kremil','antacid'
    ];

    let nameCandidates = [];

    for (const line of lines) {
        const lower = line.toLowerCase();

        // Hard skip — noise lines
        if (/^\d[\d\s\/\-\.]+$/.test(line)) continue;
        if (line.length < 3 || line.length > 70) continue;
        if (skipWords.some(w => lower === w || lower.startsWith(w + ' '))) continue;

        // Extract dosage
        const dm = line.match(dosageRegex);
        if (dm && !result.dosage) {
            result.dosage    = dm[0];
            result.dosageNum = dm[1];
        }

        // Extract form
        const ff = formKeywords.find(f => lower.includes(f));
        if (ff && !result.form) {
            result.form = ff.charAt(0).toUpperCase() + ff.slice(1);
        }

        // Score this line as a name candidate
        if (/^[A-Za-z]/.test(line)) {
            let score = 0;

            // +10 if it matches a known drug name
            if (knownDrugs.some(d => lower.includes(d))) score += 10;

            // +5 if line contains dosage (e.g. "Aspirin 500mg")
            if (dosageRegex.test(line)) score += 5;

            // +3 if it's ALL CAPS or Title Case (usually the brand/generic name on box)
            if (/^[A-Z][A-Z\s]+$/.test(line) && line.length <= 20) score += 3;
            if (/^[A-Z][a-z]/.test(line)) score += 2;

            // -5 if line contains skip words
            if (skipWords.some(w => lower.includes(w))) score -= 5;

            // -3 if line is very long (likely a description sentence)
            if (line.length > 30) score -= 3;

            // -2 if contains lowercase connecting words (likely a sentence)
            if (/\b(and|the|for|with|of|is|in|on|at|to|by|from)\b/i.test(line)) score -= 2;

            nameCandidates.push({ line, score });
        }
    }

    // Sort by score descending, pick the best
    nameCandidates.sort((a, b) => b.score - a.score);

    let bestName = '';
    if (nameCandidates.length > 0) {
        bestName = nameCandidates[0].line;
        // Append dosage if not already included
        if (result.dosage && !bestName.match(dosageRegex)) {
            bestName += ' ' + result.dosage;
        }
    }

    result.name = bestName;
    return result;
}

//  BATCH CODE GENERATOR
//  Format: BATCH-YYYYMMDD-XXXXX (random)
// ══════════════════════════════════════
function generateBatchCode() {
    const date   = new Date();
    const ymd    = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
    const rand   = Math.random().toString(36).substring(2,7).toUpperCase();
    return `BATCH-${ymd}-${rand}`;
}

// ══════════════════════════════════════
//  SUBMIT — ADD / UPDATE PRODUCT
// ══════════════════════════════════════
async function handleProductSubmit(e) {
    e.preventDefault();

    // Block save if a new image was picked but failed medicine validation
    if (_imageRequired && !_imageValidated) {
        showToast('The uploaded image is not a valid medicine image. Please upload a medicine photo.', 'error');
        return;
    }

    // FIX: Validate expiry date is set before saving
    const expiryVal = document.getElementById('prod-expiry').value;
    if (!expiryVal) {
        showToast('Please select an expiry date.', 'error');
        return;
    }

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
    fd.append('description',          document.getElementById('prod-description').value.trim());

    // Auto-generate batch code on new product
    const batchVal = editId
        ? document.getElementById('prod-batch').value
        : generateBatchCode();
    fd.append('batch_no', batchVal);

    if (editId) fd.append('id', editId);

    // Attach image file if selected
    const imgInput = document.getElementById('prod-image-input');
    if (imgInput.files[0]) fd.append('image', imgInput.files[0]);

    const endpoint = editId ? PROD_API.update : PROD_API.add;

    try {
        const res  = await fetch(endpoint, { method: 'POST', body: fd });
        const data = await res.json();

        if (data.success) {
            showToast(editId ? 'Product updated!' : 'Product added!');
            closeProductModal();
            // FIX: Ensure edit ID is fully cleared so next open is always "Add"
            document.getElementById('prod-edit-id').value = '';
            fetchProducts();
            _prodDropdownsLoaded = false; // reload dropdowns next open
        } else {
            showToast(data.message || 'Failed to save product.', 'error');
        }
    } catch(err) {
        showToast('Network error. Try again.', 'error');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = editId
            ? '<i class="material-icons">save</i> Update Product'
            : '<i class="material-icons">save</i> Save Product';
    }
}

// ══════════════════════════════════════
//  ARCHIVE PRODUCT
// ══════════════════════════════════════
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
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) { showToast(`"${name}" archived.`); fetchProducts(); }
        else showToast(data.message || 'Archive failed.', 'error');
    } catch(e) { showToast('Network error.', 'error'); }
}

// ══════════════════════════════════════
//  RESTORE PRODUCT
// ══════════════════════════════════════
async function restoreProduct(id, name) {
    if (!confirm(`Restore "${name}"?`)) return;
    try {
        const res  = await fetch(PROD_API.restore, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) { showToast(`"${name}" restored!`); fetchArchivedProducts(); }
        else showToast(data.message || 'Restore failed.', 'error');
    } catch(e) { showToast('Network error.', 'error'); }
}

function setProdLoading() {
    const w = document.getElementById('prod-table-wrap');
    if (w) w.innerHTML = `<div class="cat-loading"><i class="material-icons spin">autorenew</i> Loading...</div>`;
}
function setProdError(msg) {
    const w = document.getElementById('prod-table-wrap');
    if (w) w.innerHTML = `<div class="empty-state"><i class="material-icons">error_outline</i><p>${msg}</p></div>`;
}

// ══════════════════════════════════════
//  REPORTS — API ENDPOINTS
// ══════════════════════════════════════
const REPORT_API = {
    sales:    '../api/sales_report.php',
    lowStock: '../api/low_stock_report.php',
    expiry:   '../api/expiry_report.php',
    dispose:  '../api/dispose_product.php',
    lowStockSubmit: '../api/low_stock_submit.php',
};

// ══════════════════════════════════════
//  REPORTS — ROUTER PATCH
// ══════════════════════════════════════
const _origLoadPage3 = loadPage;
loadPage = function(page) {
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(el => {
        if (el.getAttribute('onclick') && el.getAttribute('onclick').includes(`'${page}'`)) {
            el.classList.add('active');
        }
    });

    if (page === 'sales_report') {
        document.getElementById('page-title').innerText = 'Sales Report';
        document.getElementById('top-bar').style.display = 'none';
        document.getElementById('dynamic-content').style.paddingTop = '30px';
        document.getElementById('dynamic-content').innerHTML = salesReportHTML();
        fetchSalesReport();
    } else if (page === 'low_stock') {
        document.getElementById('page-title').innerText = 'Low Stock';
        document.getElementById('top-bar').style.display = 'none';
        document.getElementById('dynamic-content').style.paddingTop = '30px';
        document.getElementById('dynamic-content').innerHTML = lowStockHTML();
        fetchLowStock();
    } else if (page === 'suppliers') {
        document.getElementById('page-title').innerText = 'Suppliers';
        document.getElementById('top-bar').style.display = 'none';
        document.getElementById('dynamic-content').style.paddingTop = '30px';
        document.getElementById('dynamic-content').innerHTML = suppliersHTML();
        _currentSupTab = 'active'; // always start on Active tab
        fetchSuppliers();
    } else if (page === 'expiry_report') {
        document.getElementById('page-title').innerText = 'Expiry Report';
        document.getElementById('top-bar').style.display = 'none';
        document.getElementById('dynamic-content').style.paddingTop = '30px';
        document.getElementById('dynamic-content').innerHTML = expiryReportHTML();
        fetchExpiryReport();
    } else {
        _origLoadPage3(page);
    }
};

// ══════════════════════════════════════════════════════
//  SALES REPORT PAGE
// ══════════════════════════════════════════════════════
function salesReportHTML() {
    return `
    <div class="rpt-header">
        <div>
            <h2 class="rpt-title"><i class="material-icons">point_of_sale</i> Sales Report</h2>
            <p class="rpt-subtitle">Transaction history from cashier sales</p>
        </div>
        <div class="rpt-actions">
            <div class="rpt-filter-group">
                <label>From</label>x
                <input type="date" id="sales-from" onchange="fetchSalesReport()">
                <label>To</label>
                <input type="date" id="sales-to" onchange="fetchSalesReport()">
                <button class="rpt-btn rpt-btn-clear" onclick="clearSalesFilter()">
                    <i class="material-icons">clear</i> Clear
                </button>
            </div>
            <button class="rpt-btn rpt-btn-print" onclick="printSalesReport()">
                <i class="material-icons">print</i> Print
            </button>
        </div>
    </div>

    <div class="rpt-summary-row" id="sales-summary">
        <div class="rpt-summary-card">
            <span class="rpt-sum-label">Total Sales</span>
            <span class="rpt-sum-val green" id="sum-total">₱0.00</span>
        </div>
        <div class="rpt-summary-card">
            <span class="rpt-sum-label">Transactions</span>
            <span class="rpt-sum-val" id="sum-count">0</span>
        </div>
        <div class="rpt-summary-card">
            <span class="rpt-sum-label">Top Cashier</span>
            <span class="rpt-sum-val blue" id="sum-cashier">—</span>
        </div>
    </div>

    <div class="rpt-table-wrap" id="sales-table-wrap">
        <div class="cat-loading"><i class="material-icons spin">autorenew</i> Loading sales...</div>
    </div>`;
}

async function fetchSalesReport() {
    const from = document.getElementById('sales-from')?.value || '';
    const to   = document.getElementById('sales-to')?.value || '';
    const wrap = document.getElementById('sales-table-wrap');
    if (!wrap) return;

    wrap.innerHTML = `<div class="cat-loading"><i class="material-icons spin">autorenew</i> Loading...</div>`;

    try {
        let url = REPORT_API.sales;
        const params = [];
        if (from) params.push(`from=${from}&start_date=${from}`);
        if (to)   params.push(`to=${to}&end_date=${to}`);
        if (params.length) url += '?' + params.join('&');

        const res  = await fetch(url);
        const json = await res.json();

        // Support both: array response and wrapped {transactions:[]} response
        const data = Array.isArray(json) ? json : (json.transactions || []);

        if (!data.length) {
            wrap.innerHTML = `<div class="empty-state"><i class="material-icons">receipt_long</i><p>No sales records found.</p></div>`;
            document.getElementById('sum-total').textContent  = '₱0.00';
            document.getElementById('sum-count').textContent  = '0';
            document.getElementById('sum-cashier').textContent= '—';
            return;
        }

        // Summary
        const total = data.reduce((s, r) => s + parseFloat(r.total || 0), 0);
        document.getElementById('sum-total').textContent  = `₱${total.toLocaleString('en-PH', {minimumFractionDigits:2})}`;
        document.getElementById('sum-count').textContent  = data.length;
        const cashierMap = {};
        data.forEach(r => { cashierMap[r.cashier||'Cashier'] = (cashierMap[r.cashier||'Cashier']||0) + parseFloat(r.total||0); });
        const topCashier = Object.entries(cashierMap).sort((a,b)=>b[1]-a[1])[0];
        document.getElementById('sum-cashier').textContent = topCashier ? topCashier[0] : 'Cashier';

        wrap.innerHTML = `
        <table class="rpt-table" id="sales-data-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Receipt No.</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((r, i) => `
                <tr>
                    <td>${i+1}</td>
                    <td><span class="rpt-badge rpt-badge-blue">${esc(r.receipt_no||'—')}</span></td>
                    <td>${esc(r.customer_name || 'Walk-in')}</td>
                    <td class="rpt-items-cell" title="${esc(r.medicines||'')}">
                        ${esc((r.medicines||'').substring(0,35))}${(r.medicines||'').length>35?'…':''}
                    </td>
                    <td><strong>₱${parseFloat(r.total||0).toFixed(2)}</strong></td>
                    <td><span class="rpt-badge rpt-badge-green">${esc(r.payment_type||'Cash')}</span></td>
                    <td>${esc(r.sale_date||'—')}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    } catch(e) {
        wrap.innerHTML = `<div class="empty-state"><i class="material-icons">error_outline</i><p>Failed to load sales data.</p></div>`;
    }
}

// Auto-apply URL params when opened from cashier "Submit to Admin" button
(function initSalesReportFromURL() {
    const params = new URLSearchParams(window.location.search);
    const page   = params.get('page');
    const from   = params.get('from');
    const to     = params.get('to');
    if (page === 'sales_report') {
        // Wait for DOM then navigate + set dates
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                loadPage('sales_report');
                if (from) { const el = document.getElementById('sales-from'); if(el) el.value = from; }
                if (to)   { const el = document.getElementById('sales-to');   if(el) el.value = to;   }
                if (from || to) fetchSalesReport();
            }, 500);
        });
    }
})();

function clearSalesFilter() {
    document.getElementById('sales-from').value = '';
    document.getElementById('sales-to').value   = '';
    fetchSalesReport();
}

function printSalesReport() {
    const table = document.getElementById('sales-data-table');
    if (!table) return;
    const from = document.getElementById('sales-from')?.value || 'All dates';
    const to   = document.getElementById('sales-to')?.value   || '';
    const win  = window.open('', '_blank');
    win.document.write(`
        <html><head><title>Sales Report</title>
        <style>
            body { font-family: Segoe UI, sans-serif; padding: 30px; }
            h2 { color: #0F3D2E; } p { color: #666; margin-bottom: 16px; }
            table { width:100%; border-collapse:collapse; font-size:13px; }
            th { background:#0F3D2E; color:#fff; padding:8px 10px; text-align:left; }
            td { padding:7px 10px; border-bottom:1px solid #eee; }
            tr:nth-child(even) td { background:#f9f9f9; }
            .footer { margin-top:30px; font-size:11px; color:#999; }
        </style></head><body>
        <h2>EMERALD 24/7 PHARMACY — Sales Report</h2>
        <p>Period: ${from}${to ? ' to ' + to : ''} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</p>
        ${table.outerHTML}
        <div class="footer">Printed by Admin Dashboard</div>
        </body></html>`);
    win.document.close();
    win.print();
}

// ══════════════════════════════════════════════════════
//  LOW STOCK REPORT PAGE
// ══════════════════════════════════════════════════════
function lowStockHTML() {
    return `
    <div class="rpt-header">
        <div>
            <h2 class="rpt-title"><i class="material-icons">inventory</i> Low Stock Report</h2>
            <p class="rpt-subtitle">Products below minimum stock threshold</p>
        </div>
        <div class="rpt-actions">
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
                        style="flex:1;padding:13px;border:2px solid #e2e8f0;border-radius:10px;background:#fff;font-weight:600;cursor:pointer;color:#718096;font-size:0.9rem;">
                        Cancel
                    </button>
                    <button onclick="confirmRestock()" id="restock-confirm-btn"
                        style="flex:2;padding:13px;border:none;border-radius:10px;background:#1baa5d;color:#fff;font-weight:700;cursor:pointer;font-size:0.95rem;display:flex;align-items:center;justify-content:center;gap:6px;">
                        <i class="material-icons" style="font-size:16px">add_circle</i> Confirm Restock
                    </button>
                </div>
            </div>
        </div>
        <div class="rpt-table-wrap" id="ls-table-wrap">
        <div class="cat-loading"><i class="material-icons spin">autorenew</i> Loading...</div>
    </div>
`;
}

async function fetchLowStock() {
    const wrap = document.getElementById('ls-table-wrap');
    if (!wrap) return;

    try {
        const res  = await fetch(REPORT_API.lowStock + '?t=' + Date.now());
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            document.getElementById('ls-count').textContent    = 0;
            document.getElementById('ls-critical').textContent = 0;
            document.getElementById('ls-categories').textContent = 0;
            wrap.innerHTML = `<div class="empty-state"><i class="material-icons">check_circle</i><p>All products are sufficiently stocked!</p></div>`;
            return;
        }

        const critical   = data.filter(p => parseInt(p.quantity) <= 5).length;
        const categories = [...new Set(data.map(p => p.category_name))].length;
        document.getElementById('ls-count').textContent      = data.length;
        document.getElementById('ls-critical').textContent   = critical;
        document.getElementById('ls-categories').textContent = categories;

        // Store data globally for restock modal
        window._lowStockData = data;

        wrap.innerHTML = `
        <table class="rpt-table" id="ls-data-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Batch No.</th>
                    <th>Qty Remaining</th>
                    <th>Unit</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((p, i) => {
                    const qty    = parseInt(p.quantity);
                    const status = qty <= 5 ? 'Critical' : qty <= 10 ? 'Low Stock' : 'Low Stock';
                    const cls    = qty <= 5 ? 'rpt-badge-red' : qty <= 10 ? 'rpt-badge-orange' : 'rpt-badge-orange';
                    const btnClr = qty <= 5 ? '#e53e3e' : '#dd6b20';
                    return `<tr>
                        <td>${i+1}</td>
                        <td><strong>${esc(p.name||'—')}</strong>${p.brand_name ? '<br><span style="font-size:0.78rem;color:#a0aec0">'+esc(p.brand_name)+'</span>' : ''}</td>
                        <td>${esc(p.category_name||'—')}</td>
                        <td style="font-family:monospace;font-size:0.82rem">${esc(p.batch_no||'—')}</td>
                        <td><strong style="color:${qty<=5?'#e53e3e':'inherit'}">${qty}</strong></td>
                        <td>${esc(p.unit||'—')}</td>
                        <td><span class="rpt-badge ${cls}">${status}</span></td>
                        <td>
                            <button onclick="openRestockModal(${p.id},'${escAttr(p.name)}',${qty},'${escAttr(p.expiry_date||'')}')"
                                style="background:${btnClr};color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:0.8rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;">
                                <i class="material-icons" style="font-size:14px">add_circle</i> Restock
                            </button>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    } catch(e) {
        wrap.innerHTML = `<div class="empty-state"><i class="material-icons">error_outline</i><p>Failed to load low stock data.</p></div>`;
    }
}


// ══════════════════════════════════════
//  RESTOCK MODAL
// ══════════════════════════════════════
let _restockProductId = null;
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
    const modal = document.getElementById('restockModal');
    modal.style.display = 'flex';
}

function closeRestockModal() {
    document.getElementById('restockModal').style.display = 'none';
    _restockProductId = null;
}

async function confirmRestock() {
    const addQty = parseInt(document.getElementById('restock-add-qty').value) || 0;
    if (addQty <= 0) { showToast('Please enter a valid quantity.', 'error'); return; }

    const btn = document.getElementById('restock-confirm-btn');
    btn.disabled  = true;
    btn.innerHTML = '<i class="material-icons" style="font-size:15px;vertical-align:middle">autorenew</i> Restocking...';

    const newExpiry = document.getElementById('restock-expiry').value;
    if (!newExpiry) { showToast('Please enter the new expiry date.', 'error'); return; }

    try {
        const fd = new FormData();
        fd.append('id',          _restockProductId);
        fd.append('add_qty',     addQty);
        fd.append('expiry_date', newExpiry);

        const res  = await fetch('../api/restock_product.php', { method: 'POST', body: fd });
        const data = await res.json();

        if (data.success) {
            showToast(`✅ Restocked! New qty: ${data.new_qty}`);
            closeRestockModal();
            fetchLowStock(); // refresh table
        } else {
            showToast(data.message || 'Restock failed.', 'error');
        }
    } catch(e) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        btn.disabled  = false;
        btn.innerHTML = '<i class="material-icons" style="font-size:15px;vertical-align:middle">add_circle</i> Confirm Restock';
    }
}

// ══════════════════════════════════════
//  PRODUCT SEARCH FILTER
// ══════════════════════════════════════
function filterProducts(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
        renderProductTable(_allActiveProds);
        return;
    }
    const filtered = _allActiveProds.filter(p =>
        (p.name          || '').toLowerCase().includes(q) ||
        (p.brand_name    || '').toLowerCase().includes(q) ||
        (p.category      || '').toLowerCase().includes(q) ||
        (p.category_name || '').toLowerCase().includes(q) ||
        (p.batch_no      || '').toLowerCase().includes(q)
    );
    renderProductTable(filtered);
}

function printLowStock() {
    if (!window._lowStockData || window._lowStockData.length === 0) {
        showToast('No low stock items to print.', 'error');
        return;
    }
    const data      = window._lowStockData;
    const critical  = data.filter(p => parseInt(p.quantity) <= 5).length;
    const low       = data.filter(p => parseInt(p.quantity) > 5 && parseInt(p.quantity) <= 10).length;
    const warning   = data.filter(p => parseInt(p.quantity) > 10).length;

    const rows = data.map((p, i) => {
        const qty    = parseInt(p.quantity);
        const status = qty <= 5 ? 'CRITICAL' : qty <= 10 ? 'LOW' : 'WARNING';
        const clr    = qty <= 5 ? '#c53030'  : qty <= 10 ? '#c05621' : '#b7791f';
        return `<tr>
            <td>${i+1}</td>
            <td><strong>${p.name||'—'}</strong>${p.brand_name ? '<br><span style="font-size:10px;color:#888">'+p.brand_name+'</span>' : ''}</td>
            <td>${p.category_name||'—'}</td>
            <td style="font-family:monospace;font-size:11px">${p.batch_no||'—'}</td>
            <td style="color:${clr};font-weight:700;font-size:14px">${qty}</td>
            <td>${p.unit||'—'}</td>
            <td>₱${parseFloat(p.price_per_pack||0).toFixed(2)}</td>
            <td style="color:${clr};font-weight:700">${status}</td>
        </tr>`;
    }).join('');

    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>Low Stock Report</title>
        <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: Segoe UI, sans-serif; padding: 36px; color:#222; }
            .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; }
            .pharmacy-name { font-size:22px; font-weight:800; color:#0F3D2E; }
            .report-title  { font-size:14px; font-weight:700; color:#c05621; margin-top:4px; }
            .meta { font-size:11px; color:#666; margin:10px 0 20px; padding-bottom:10px; border-bottom:2px solid #0F3D2E; }
            table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:20px; }
            thead th { background:#0F3D2E; color:#fff; padding:9px 10px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
            tbody td { padding:8px 10px; border-bottom:1px solid #eee; vertical-align:middle; }
            tbody tr:nth-child(even) td { background:#fafafa; }
            .summary-grid { display:flex; gap:24px; margin-bottom:8px; }
            .sum-box { border:1.5px solid #e2e8f0; border-radius:8px; padding:10px 18px; min-width:110px; text-align:center; }
            .sum-val { font-size:22px; font-weight:800; }
            .sum-lbl { font-size:10px; color:#666; text-transform:uppercase; letter-spacing:.04em; margin-top:2px; }
            .footer { margin-top:40px; display:flex; justify-content:space-between; align-items:flex-end; }
            .sig-block { text-align:center; }
            .sig-line  { border-top:1.5px solid #222; width:220px; margin:0 auto 4px; }
            .sig-label { font-size:11px; color:#555; }
            .generated { font-size:10px; color:#999; }
            @media print { body { padding:20px; } }
        </style></head><body>

        <div class="header">
            <div>
                <div class="pharmacy-name">EMERALD 24/7 PHARMACY</div>
                <div class="report-title">OFFICIAL LOW STOCK REPORT</div>
            </div>
        </div>
        <div class="meta">
            Generated: <strong>${new Date().toLocaleString()}</strong>
            &nbsp;|&nbsp; Threshold: <strong>≤ 20 units</strong>
            &nbsp;|&nbsp; Total Items: <strong>${data.length}</strong>
        </div>

        <table style="margin-top:16px">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Batch No.</th>
                    <th>Qty Remaining</th>
                    <th>Unit</th>
                    <th>Price/Pack</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>

        <div class="footer">
            <div class="generated">Printed by Admin Dashboard &nbsp;|&nbsp; Emerald 24/7 Pharmacy</div>
            <div class="sig-block">
                <div class="sig-line"></div>
                <div class="sig-label">Authorized Pharmacist</div>
            </div>
        </div>

        </body></html>`);
    win.document.close();
    win.print();
}

// ══════════════════════════════════════════════════════
//  EXPIRY REPORT PAGE
// ══════════════════════════════════════════════════════
function expiryReportHTML() {
    return `
    <div class="rpt-header">
        <div>
            <h2 class="rpt-title"><i class="material-icons">event_busy</i> Expiry Report</h2>
            <p class="rpt-subtitle">Expired products ready for disposal</p>
        </div>
        <div class="rpt-actions">
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
        <div class="cat-loading"><i class="material-icons spin">autorenew</i> Loading...</div>
    </div>`;
}

let _expiryData = [];

async function fetchExpiryReport() {
    const wrap = document.getElementById('exp-table-wrap');
    const date = document.getElementById('exp-date')?.value || '';
    if (!wrap) return;

    wrap.innerHTML = `<div class="cat-loading"><i class="material-icons spin">autorenew</i> Loading...</div>`;

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
        document.getElementById('exp-value').textContent = `₱${totalVal.toLocaleString('en-PH', {minimumFractionDigits:2})}`;

        wrap.innerHTML = `
        <table class="rpt-table" id="exp-data-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Product Name</th>
                    <th>Batch No.</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Price/Pack</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${_expiryData.map((p, i) => `
                <tr id="exp-row-${p.id}">
                    <td>${i+1}</td>
                    <td><strong>${esc(p.name||'—')}</strong></td>
                    <td>${esc(p.batch_no||'—')}</td>
                    <td>${esc(p.category||p.category_name||'—')}</td>
                    <td>${esc(String(p.quantity||'0'))}</td>
                    <td>₱${parseFloat(p.price||0).toFixed(2)}</td>
                    <td><span class="rpt-badge rpt-badge-red">${esc(p.expiry_date||'—')}</span></td>
                    <td><span class="rpt-badge rpt-badge-red">EXPIRED</span></td>
                    <td>
                        <button class="rpt-btn-dispose" onclick="disposeProduct(${p.id}, '${esc(p.name||'')}')">
                            <i class="material-icons">delete_forever</i> Dispose
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
        <p class="exp-dispose-note"><i class="material-icons">info</i> Disposing a product will permanently archive it and mark it as disposed.</p>`;
    } catch(e) {
        wrap.innerHTML = `<div class="empty-state"><i class="material-icons">error_outline</i><p>Failed to load expiry data.</p></div>`;
    }
}

async function disposeProduct(id, name) {
    if (!confirm(`Dispose "${name}"?\nThis will permanently archive this expired product.`)) return;

    try {
        const res  = await fetch(REPORT_API.dispose, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`"${name}" has been disposed.`);
            // Remove row from table
            const row = document.getElementById(`exp-row-${id}`);
            if (row) row.remove();
            // Update count
            const remaining = document.querySelectorAll('[id^="exp-row-"]').length;
            document.getElementById('exp-count').textContent = remaining;
        } else {
            showToast(data.message || 'Dispose failed.', 'error');
        }
    } catch(e) {
        showToast('Network error.', 'error');
    }
}

function clearExpiryFilter() {
    document.getElementById('exp-date').value = '';
    fetchExpiryReport();
}

function printExpiryReport() {
    if (!_expiryData || _expiryData.length === 0) {
        showToast('No expired items to print.', 'error');
        return;
    }
    const date = document.getElementById('exp-date')?.value || 'All dates';
    const totalQty = _expiryData.reduce((s,p) => s + parseInt(p.quantity||0), 0);
    const totalVal = _expiryData.reduce((s,p) => s + (parseFloat(p.price||0) * parseInt(p.quantity||0)), 0);

    // Build clean table rows from data (no Action column)
    const rows = _expiryData.map((p, i) => `
        <tr>
            <td>${i+1}</td>
            <td><strong>${p.name||'—'}</strong></td>
            <td>${p.batch_no||'—'}</td>
            <td>${p.category||p.category_name||'—'}</td>
            <td>${p.quantity||0}</td>
            <td>₱${parseFloat(p.price||0).toFixed(2)}</td>
            <td>${p.expiry_date||'—'}</td>
            <td style="color:#c53030;font-weight:bold">EXPIRED</td>
        </tr>`).join('');

    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>Expiry Report</title>
        <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: Segoe UI, sans-serif; padding: 36px; color:#222; }
            .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; }
            .pharmacy-name { font-size:22px; font-weight:800; color:#0F3D2E; }
            .report-title  { font-size:14px; font-weight:700; color:#c53030; margin-top:4px; }
            .meta { font-size:11px; color:#666; margin: 10px 0 20px; padding-bottom:10px; border-bottom:2px solid #0F3D2E; }
            table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:24px; }
            thead th { background:#0F3D2E; color:#fff; padding:9px 10px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
            tbody td { padding:8px 10px; border-bottom:1px solid #eee; vertical-align:middle; }
            tbody tr:nth-child(even) td { background:#fafafa; }
            .summary { font-size:12px; color:#444; margin-bottom:6px; }
            .footer { margin-top:40px; display:flex; justify-content:space-between; align-items:flex-end; }
            .sig-block { text-align:center; }
            .sig-line  { border-top:1.5px solid #222; width:220px; margin:0 auto 4px; }
            .sig-label { font-size:11px; color:#555; }
            .generated { font-size:10px; color:#999; }
        </style></head><body>
        <div class="header">
            <div>
                <div class="pharmacy-name">EMERALD 24/7 PHARMACY</div>
                <div class="report-title">OFFICIAL EXPIRED ITEMS REPORT</div>
            </div>
        </div>
        <div class="meta">
            Period: <strong>${date}</strong> &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}
        </div>
        <table>
            <thead>
                <tr>
                    <th>#</th><th>Product Name</th><th>Batch No.</th><th>Category</th>
                    <th>Qty</th><th>Price/Pack</th><th>Expiry Date</th><th>Status</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        <div class="summary">
            Total Expired Items: <strong>${_expiryData.length}</strong> &nbsp;|&nbsp;
            Total Qty to Dispose: <strong>${totalQty}</strong> &nbsp;|&nbsp;
            Est. Value Lost: <strong>₱${totalVal.toLocaleString('en-PH',{minimumFractionDigits:2})}</strong>
        </div>
        <div class="summary" style="color:#c53030">Disposition: Disposal Required</div>
        <div class="footer">
            <div class="generated">Printed by Admin Dashboard</div>
            <div class="sig-block">
                <div class="sig-line"></div>
                <div class="sig-label">Authorized Pharmacist</div>
            </div>
        </div>
        </body></html>`);
    win.document.close();
    win.print();
}

// ══════════════════════════════════════
//  CHANGE PASSWORD
// ══════════════════════════════════════
function openChangePasswordModal(e) {
    if (e) e.preventDefault();
    document.getElementById('profile-dropdown').classList.remove('show');
    document.getElementById('changePwdForm').reset();
    document.getElementById('pwd-strength-fill').style.width  = '0';
    document.getElementById('pwd-strength-fill').style.background = '';
    document.getElementById('pwd-strength-label').textContent = '';
    document.getElementById('pwd-match-msg').textContent      = '';
    document.getElementById('changePwdModal').style.display = 'flex';
}

function closeChangePwdModal(e) {
    if (e && e.target !== document.getElementById('changePwdModal')) return;
    document.getElementById('changePwdModal').style.display = 'none';
}

function togglePwd(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon  = btn.querySelector('.material-icons');
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility_off';
    } else {
        input.type = 'password';
        icon.textContent = 'visibility';
    }
}

function checkPwdStrength(val) {
    const fill  = document.getElementById('pwd-strength-fill');
    const label = document.getElementById('pwd-strength-label');
    let score = 0;
    if (val.length >= 8)              score++;
    if (/[A-Z]/.test(val))            score++;
    if (/[0-9]/.test(val))            score++;
    if (/[^A-Za-z0-9]/.test(val))     score++;

    const levels = [
        { w: '25%', color: '#e53e3e', text: 'Weak' },
        { w: '50%', color: '#dd6b20', text: 'Fair' },
        { w: '75%', color: '#d69e2e', text: 'Good' },
        { w: '100%',color: '#38a169', text: 'Strong' },
    ];
    const level = levels[score - 1] || { w: '0', color: '', text: '' };
    fill.style.width      = level.w;
    fill.style.background = level.color;
    label.textContent     = level.text;
    label.style.color     = level.color;
}

async function handleChangePwd(e) {
    e.preventDefault();
    const current = document.getElementById('pwd-current').value;
    const newPwd  = document.getElementById('pwd-new').value;
    const confirm = document.getElementById('pwd-confirm').value;
    const matchMsg = document.getElementById('pwd-match-msg');
    const btn     = document.getElementById('pwd-save-btn');

    if (newPwd !== confirm) {
        matchMsg.textContent = '⚠ Passwords do not match.';
        matchMsg.style.color = '#c53030';
        return;
    }
    matchMsg.textContent = '';

    btn.disabled = true;
    btn.innerHTML = '<i class="material-icons spin">autorenew</i> Updating...';

    try {
        const res  = await fetch('../api/change_password.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_password: current, new_password: newPwd })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Password updated successfully!');
            document.getElementById('changePwdModal').style.display = 'none';
        } else {
            showToast(data.message || 'Failed to update password.', 'error');
        }
    } catch(err) {
        showToast('Network error. Please try again.', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="material-icons">lock_reset</i> Update Password';
}

// ══════════════════════════════════════════════════════
//  SUPPLIERS PAGE
// ══════════════════════════════════════════════════════

function suppliersHTML() {
    return `
    <div style="max-width:1100px;margin:0 auto;padding:0 20px 40px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <div>
                <h2 style="margin:0;color:#0A2E1F;font-size:1.6rem;font-weight:800">
                    <i class="material-icons" style="vertical-align:middle;margin-right:8px;color:#1baa5d">local_shipping</i>Suppliers
                </h2>
                <p style="margin:4px 0 0;color:#718096;font-size:0.88rem">Manage product suppliers. Products without a supplier are marked Unavailable.</p>
            </div>
            <button onclick="openSupplierModal()" style="background:#1baa5d;color:#fff;border:none;border-radius:10px;padding:11px 22px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:0.9rem;">
                <i class="material-icons" style="font-size:18px">add</i> Add Supplier
            </button>
        </div>

        <!-- Summary cards -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;" id="supplier-summary">
            <div style="background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                <p style="margin:0 0 6px;color:#718096;font-size:0.78rem;text-transform:uppercase;letter-spacing:.5px">Total Suppliers</p>
                <h2 style="margin:0;color:#0A2E1F;font-size:2rem;font-weight:800" id="sup-total">0</h2>
            </div>
            <div style="background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                <p style="margin:0 0 6px;color:#718096;font-size:0.78rem;text-transform:uppercase;letter-spacing:.5px">Products Supplied</p>
                <h2 style="margin:0;color:#1baa5d;font-size:2rem;font-weight:800" id="sup-products">0</h2>
            </div>
            <div style="background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                <p style="margin:0 0 6px;color:#718096;font-size:0.78rem;text-transform:uppercase;letter-spacing:.5px">Unsupplied (Unavailable)</p>
                <h2 style="margin:0;color:#e53e3e;font-size:2rem;font-weight:800" id="sup-unsupplied">0</h2>
            </div>
        </div>

        <!-- Active / Archived tabs -->
        <div style="display:flex;gap:8px;margin-bottom:20px;">
            <button id="sup-tab-active" onclick="switchSupTab('active')"
                style="display:flex;align-items:center;gap:6px;padding:9px 20px;border-radius:10px;font-weight:700;font-size:0.88rem;cursor:pointer;border:2px solid #1baa5d;background:#1baa5d;color:#fff;">
                <i class="material-icons" style="font-size:16px">list</i> Active
            </button>
            <button id="sup-tab-archived" onclick="switchSupTab('archived')"
                style="display:flex;align-items:center;gap:6px;padding:9px 20px;border-radius:10px;font-weight:700;font-size:0.88rem;cursor:pointer;border:2px solid #e2e8f0;background:#fff;color:#718096;">
                <i class="material-icons" style="font-size:16px">archive</i> Archived
            </button>
        </div>

        <!-- Table -->
        <div style="background:#fff;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,0.06);overflow:hidden;">
            <div id="supplier-table-wrap" style="padding:20px;">
                <div style="text-align:center;padding:40px;color:#a0aec0;">
                    <i class="material-icons" style="font-size:48px">hourglass_top</i>
                    <p>Loading suppliers...</p>
                </div>
            </div>
        </div>

        <!-- Products availability section -->
        <div style="background:#fff;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,0.06);margin-top:24px;">
            <div style="padding:20px 24px;border-bottom:1px solid #f0f4f8;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <h3 style="margin:0;color:#0A2E1F;font-size:1rem;font-weight:700">Product Availability by Supplier</h3>
                    <p style="margin:4px 0 0;color:#718096;font-size:0.82rem"></p>
                </div>
                <button onclick="fetchProductAvailability()" style="background:#f0f4f8;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-weight:600;color:#0A2E1F;font-size:0.82rem;display:flex;align-items:center;gap:6px;">
                    <i class="material-icons" style="font-size:15px">refresh</i> Refresh
                </button>
            </div>
            <div id="product-availability-wrap" style="padding:20px;">
                <p style="color:#a0aec0;text-align:center">Click Refresh to load product availability.</p>
            </div>
        </div>
    </div>

    <!-- Supplier Modal -->
    <div id="supplierModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;align-items:center;justify-content:center;">
        <div style="background:#fff;border-radius:18px;padding:28px 32px 32px;width:500px;max-width:95vw;box-shadow:0 24px 64px rgba(0,0,0,0.22);max-height:92vh;overflow-y:auto;box-sizing:border-box;">

            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="background:#e6f9ef;border-radius:10px;padding:8px;display:flex;"><i class="material-icons" style="color:#1baa5d;font-size:22px">local_shipping</i></span>
                    <h3 style="margin:0;color:#0A2E1F;font-size:1.1rem;font-weight:800" id="sup-modal-title">Add Supplier</h3>
                </div>
                <button onclick="closeSupplierModal()" style="background:#f0f4f8;border:none;cursor:pointer;color:#718096;font-size:18px;border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">&times;</button>
            </div>

            <input type="hidden" id="sup-edit-id">

            <!-- Row 1: Supplier Name + Contact Person -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                <div>
                    <label style="display:block;font-size:0.75rem;font-weight:700;color:#0A2E1F;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Supplier Name *</label>
                    <input type="text" id="sup-name" placeholder="e.g. PhilMed Distributors"
                        style="width:100%;padding:11px 13px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;box-sizing:border-box;outline:none;font-family:inherit;"
                        onfocus="if(!this.readOnly)this.style.borderColor='#1baa5d'" onblur="this.style.borderColor='#e2e8f0'">
                </div>
                <div>
                    <label style="display:block;font-size:0.75rem;font-weight:700;color:#0A2E1F;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Contact Person</label>
                    <input type="text" id="sup-contact" placeholder="e.g. Juan Dela Cruz"
                        style="width:100%;padding:11px 13px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;box-sizing:border-box;outline:none;font-family:inherit;"
                        onfocus="this.style.borderColor='#1baa5d'" onblur="this.style.borderColor='#e2e8f0'">
                </div>
            </div>

            <!-- Row 2: Phone + Email -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                <div>
                    <label style="display:block;font-size:0.75rem;font-weight:700;color:#0A2E1F;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Phone</label>
                    <input type="text" id="sup-phone" placeholder="09XX-XXX-XXXX"
                        style="width:100%;padding:11px 13px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;box-sizing:border-box;outline:none;font-family:inherit;"
                        onfocus="this.style.borderColor='#1baa5d'" onblur="this.style.borderColor='#e2e8f0'">
                </div>
                <div>
                    <label style="display:block;font-size:0.75rem;font-weight:700;color:#0A2E1F;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Email</label>
                    <input type="email" id="sup-email" placeholder="supplier@email.com"
                        style="width:100%;padding:11px 13px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;box-sizing:border-box;outline:none;font-family:inherit;"
                        onfocus="this.style.borderColor='#1baa5d'" onblur="this.style.borderColor='#e2e8f0'">
                </div>
            </div>

            <!-- Row 3: Address full width -->
            <div style="margin-bottom:18px;">
                <label style="display:block;font-size:0.75rem;font-weight:700;color:#0A2E1F;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Address</label>
                <textarea id="sup-address" placeholder="Full address..." rows="2"
                    style="width:100%;padding:11px 13px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;box-sizing:border-box;outline:none;font-family:inherit;resize:vertical;"
                    onfocus="this.style.borderColor='#1baa5d'" onblur="this.style.borderColor='#e2e8f0'"></textarea>
            </div>

            <!-- Buttons -->
            <div style="display:flex;gap:12px;">
                <button onclick="closeSupplierModal()"
                    style="flex:1;padding:13px;border:2px solid #e2e8f0;border-radius:10px;background:#fff;font-weight:600;cursor:pointer;color:#718096;font-size:0.9rem;font-family:inherit;">
                    Cancel
                </button>
                <button onclick="saveSupplier()" id="sup-save-btn"
                    style="flex:2;padding:13px;border:none;border-radius:10px;background:#1baa5d;color:#fff;font-weight:700;cursor:pointer;font-size:0.92rem;display:flex;align-items:center;justify-content:center;gap:6px;font-family:inherit;">
                    <i class="material-icons" style="font-size:16px">save</i> Save Supplier
                </button>
            </div>
        </div>
    </div>`;
}

let _allProducts = [];
let _suppliers   = [];

async function fetchSuppliers() {
    try {
        const res  = await fetch('../api/supplier_list.php?t=' + Date.now());
        const data = await res.json();
        _suppliers = data.suppliers || [];
        const unsupplied = data.unsupplied || 0;

        document.getElementById('sup-total').textContent      = _suppliers.length;
        document.getElementById('sup-products').textContent   = data.supplied_count || 0;
        document.getElementById('sup-unsupplied').textContent = unsupplied;

        renderSupplierTable(_suppliers);
    } catch(e) {
        document.getElementById('supplier-table-wrap').innerHTML =
            `<p style="color:#e53e3e;text-align:center">Failed to load suppliers.</p>`;
    }
}

function renderSupplierTable(list) {
    const wrap = document.getElementById('supplier-table-wrap');
    if (!list || list.length === 0) {
        wrap.innerHTML = `<div style="text-align:center;padding:40px;color:#a0aec0;">
            <i class="material-icons" style="font-size:48px">local_shipping</i>
            <p>No suppliers yet. Add your first supplier.</p></div>`;
        return;
    }
    wrap.innerHTML = `
    <table style="width:100%;border-collapse:collapse;">
        <thead>
            <tr style="border-bottom:2px solid #f0f4f8;">
                <th style="${thS()}">#</th>
                <th style="${thS()}">Supplier Name</th>
                <th style="${thS()}">Contact Person</th>
                <th style="${thS()}">Phone</th>
                <th style="${thS()}">Email</th>
                <th style="${thS()}">Products</th>
                <th style="${thS()}">Actions</th>
            </tr>
        </thead>
        <tbody>
            ${list.map((s, i) => `
            <tr style="border-bottom:1px solid #f0f4f8;">
                <td style="${tdS()};color:#a0aec0;font-weight:600">${String(i+1).padStart(2,'0')}</td>
                <td style="${tdS()};font-weight:700;color:#0A2E1F">${esc(s.supplier_name)}</td>
                <td style="${tdS()};color:#718096">${esc(s.contact_person||'—')}</td>
                <td style="${tdS()};color:#718096">${esc(s.phone||'—')}</td>
                <td style="${tdS()};color:#718096">${esc(s.email||'—')}</td>
                <td style="${tdS()}">
                    <span style="background:#e6f9ef;color:#1baa5d;border-radius:20px;padding:3px 10px;font-size:0.8rem;font-weight:700">
                        ${s.product_count||0} products
                    </span>
                </td>
                <td style="${tdS()}">
                    <div style="display:flex;gap:6px;">
                        <button onclick="openEditSupplier(${s.supplier_id})"
                            style="background:#e6f9ef;color:#1baa5d;border:none;border-radius:7px;padding:6px 10px;cursor:pointer;font-weight:600;font-size:0.8rem;">
                            <i class="material-icons" style="font-size:14px;vertical-align:middle">edit</i>
                        </button>
                        <button onclick="archiveSupplier(${s.supplier_id},'${escAttr(s.supplier_name)}')"
                            style="background:#fff8e6;color:#dd6b20;border:none;border-radius:7px;padding:6px 10px;cursor:pointer;font-weight:600;font-size:0.8rem;">
                            <i class="material-icons" style="font-size:14px;vertical-align:middle">archive</i>
                        </button>
                    </div>
                </td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

function thS() { return 'padding:10px 14px;text-align:left;font-size:0.75rem;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:.5px'; }
function tdS() { return 'padding:12px 14px;font-size:0.88rem'; }

// ── SUPPLIER TABS ──
let _currentSupTab = 'active';

function switchSupTab(tab) {
    _currentSupTab = tab;
    const activeBtn   = document.getElementById('sup-tab-active');
    const archivedBtn = document.getElementById('sup-tab-archived');
    const addBtn      = document.querySelector('[onclick="openSupplierModal()"]');
    if (!activeBtn || !archivedBtn) return;

    if (tab === 'active') {
        activeBtn.style.background   = '#1baa5d';
        activeBtn.style.color        = '#fff';
        activeBtn.style.borderColor  = '#1baa5d';
        archivedBtn.style.background = '#fff';
        archivedBtn.style.color      = '#718096';
        archivedBtn.style.borderColor= '#e2e8f0';
        if (addBtn) addBtn.style.display = 'flex';
        fetchSuppliers();
    } else {
        archivedBtn.style.background = '#1baa5d';
        archivedBtn.style.color      = '#fff';
        archivedBtn.style.borderColor= '#1baa5d';
        activeBtn.style.background   = '#fff';
        activeBtn.style.color        = '#718096';
        activeBtn.style.borderColor  = '#e2e8f0';
        if (addBtn) addBtn.style.display = 'none';
        fetchArchivedSuppliers();
    }
}

async function fetchArchivedSuppliers() {
    const wrap = document.getElementById('supplier-table-wrap');
    wrap.innerHTML = '<div style="text-align:center;padding:40px;color:#a0aec0;"><i class="material-icons spin">autorenew</i></div>';
    try {
        const res  = await fetch('../api/supplier_archive_list.php?t=' + Date.now());
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        renderArchivedSupplierTable(Array.isArray(data) ? data : (data.suppliers || []));
    } catch(e) {
        wrap.innerHTML = `<div style="text-align:center;padding:40px;color:#a0aec0;">
            <i class="material-icons" style="font-size:36px;display:block;margin-bottom:8px">archive</i>
            <p>No archived suppliers found.</p>
            <p style="font-size:0.78rem;margin-top:4px;">Make sure supplier_archive_list.php is in your /api/ folder and the suppliers table has an <b>archived</b> column.</p>
        </div>`;
    }
}

function renderArchivedSupplierTable(list) {
    const wrap = document.getElementById('supplier-table-wrap');
    if (!list || list.length === 0) {
        wrap.innerHTML = `<div style="text-align:center;padding:40px;color:#a0aec0;">
            <i class="material-icons" style="font-size:48px">archive</i>
            <p>No archived suppliers.</p></div>`;
        return;
    }
    wrap.innerHTML = `
    <table style="width:100%;border-collapse:collapse;">
        <thead>
            <tr style="border-bottom:2px solid #f0f4f8;">
                <th style="${thS()}">#</th>
                <th style="${thS()}">Supplier Name</th>
                <th style="${thS()}">Contact Person</th>
                <th style="${thS()}">Phone</th>
                <th style="${thS()}">Actions</th>
            </tr>
        </thead>
        <tbody>
            ${list.map((s, i) => `
            <tr style="border-bottom:1px solid #f0f4f8;background:#fffbf5;">
                <td style="${tdS()};color:#a0aec0;font-weight:600">${String(i+1).padStart(2,'0')}</td>
                <td style="${tdS()};font-weight:700;color:#718096">${esc(s.supplier_name)}</td>
                <td style="${tdS()};color:#a0aec0">${esc(s.contact_person||'—')}</td>
                <td style="${tdS()};color:#a0aec0">${esc(s.phone||'—')}</td>
                <td style="${tdS()}">
                    <button onclick="restoreSupplier(${s.supplier_id},'${escAttr(s.supplier_name)}')"
                        style="background:#e6f9ef;color:#1baa5d;border:none;border-radius:7px;padding:6px 12px;cursor:pointer;font-weight:700;font-size:0.8rem;display:flex;align-items:center;gap:4px;">
                        <i class="material-icons" style="font-size:14px">restore</i> Restore
                    </button>
                </td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

async function restoreSupplier(id, name) {
    if (!confirm(`Restore supplier "${name}"?`)) return;
    try {
        const fd = new FormData(); fd.append('id', id);
        const res  = await fetch('../api/supplier_restore.php', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) { showToast(`"${name}" restored!`); fetchArchivedSuppliers(); }
        else showToast(data.message || 'Failed.', 'error');
    } catch(e) { showToast('Network error.', 'error'); }
}

async function fetchProductAvailability() {
    const wrap = document.getElementById('product-availability-wrap');
    wrap.innerHTML = '<p style="color:#a0aec0;text-align:center">Loading...</p>';
    try {
        const res  = await fetch('../api/product_availability.php?t=' + Date.now());
        const data = await res.json();
        if (!data.length) { wrap.innerHTML = '<p style="color:#a0aec0;text-align:center">No products found.</p>'; return; }

        wrap.innerHTML = `
        <table style="width:100%;border-collapse:collapse;">
            <thead>
                <tr style="border-bottom:2px solid #f0f4f8;">
                    <th style="${thS()}">#</th>
                    <th style="${thS()}">Product</th>
                    <th style="${thS()}">Supplier</th>
                    <th style="${thS()}">Availability</th>
                    <th style="${thS()}">Action</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((p, i) => {
                    const hasSupplier = p.supplier_name && p.supplier_name !== '';
                    const avail = hasSupplier ? 'Available' : 'Unavailable';
                    const aClr  = hasSupplier ? '#1baa5d' : '#e53e3e';
                    const aBg   = hasSupplier ? '#e6f9ef'  : '#fff5f5';
                    return `<tr style="border-bottom:1px solid #f0f4f8;">
                        <td style="${tdS()};color:#a0aec0">${i+1}</td>
                        <td style="${tdS()};font-weight:700;color:#0A2E1F">
                            ${esc(p.name)}
                            ${p.brand_name ? `<br><span style="font-size:0.78rem;color:#a0aec0">${esc(p.brand_name)}</span>` : ''}
                        </td>
                        <td style="${tdS()};color:#718096">
                            ${hasSupplier
                                ? `<span style="color:#1baa5d;font-weight:600">${esc(p.supplier_name)}</span>`
                                : `<span style="color:#e53e3e">⚠ No supplier assigned</span>`}
                        </td>
                        <td style="${tdS()}">
                            <span style="background:${aBg};color:${aClr};border-radius:20px;padding:4px 12px;font-size:0.8rem;font-weight:700">
                                ${avail}
                            </span>
                        </td>
                        <td style="${tdS()}">
                            ${!hasSupplier ? `
                            <button onclick="quickAssignSupplier(${p.id},'${escAttr(p.name)}')"
                                style="background:#0A2E1F;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:0.78rem;font-weight:700;cursor:pointer;">
                                Assign Supplier
                            </button>` : `
                            <button onclick="quickAssignSupplier(${p.id},'${escAttr(p.name)}')"
                                style="background:#f0f4f8;color:#718096;border:none;border-radius:8px;padding:6px 12px;font-size:0.78rem;font-weight:600;cursor:pointer;">
                                Change
                            </button>`}
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    } catch(e) {
        wrap.innerHTML = '<p style="color:#e53e3e;text-align:center">Failed to load.</p>';
    }
}

function openSupplierModal() {
    document.getElementById('sup-edit-id').value = '';
    document.getElementById('sup-modal-title').textContent = 'Add Supplier';
    const nameEl = document.getElementById('sup-name');
    nameEl.value    = '';
    nameEl.readOnly = false;
    nameEl.style.background = '';
    nameEl.style.cursor     = '';
    nameEl.style.color      = '';
    document.getElementById('sup-contact').value = '';
    document.getElementById('sup-phone').value   = '';
    document.getElementById('sup-email').value   = '';
    document.getElementById('sup-address').value = '';
    document.getElementById('supplierModal').style.display = 'flex';
}

function openEditSupplier(id) {
    const s = _suppliers.find(x => x.supplier_id == id);
    if (!s) return;
    document.getElementById('sup-edit-id').value           = s.supplier_id;
    document.getElementById('sup-modal-title').textContent = 'Edit Supplier';
    // Supplier name is read-only when editing
    const nameEl = document.getElementById('sup-name');
    nameEl.value    = s.supplier_name || '';
    nameEl.readOnly = true;
    nameEl.style.background = '#f0f4f8';
    nameEl.style.cursor     = 'not-allowed';
    nameEl.style.color      = '#718096';
    document.getElementById('sup-contact').value = s.contact_person || '';
    document.getElementById('sup-phone').value   = s.phone          || '';
    document.getElementById('sup-email').value   = s.email          || '';
    document.getElementById('sup-address').value = s.address        || '';
    document.getElementById('supplierModal').style.display = 'flex';
}

function closeSupplierModal() {
    document.getElementById('supplierModal').style.display = 'none';
}

async function saveSupplier() {
    const name = document.getElementById('sup-name').value.trim();
    if (!name) { showToast('Supplier name is required.', 'error'); return; }

    const editId = document.getElementById('sup-edit-id').value;
    const fd     = new FormData();

    fd.append('supplier_name',  name);
    fd.append('contact_person', document.getElementById('sup-contact').value.trim());
    fd.append('phone',          document.getElementById('sup-phone').value.trim());
    fd.append('email',          document.getElementById('sup-email').value.trim());
    fd.append('address',        document.getElementById('sup-address').value.trim());
    if (editId) fd.append('id', editId);

    const btn = document.getElementById('sup-save-btn');
    btn.disabled = true; btn.innerHTML = 'Saving...';

    try {
        const url = editId ? '../api/supplier_update.php' : '../api/supplier_add.php';
        const res  = await fetch(url, { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
            showToast(editId ? 'Supplier updated!' : 'Supplier added!');
            closeSupplierModal();
            fetchSuppliers();
        } else {
            showToast(data.message || 'Failed to save.', 'error');
        }
    } catch(e) {
        showToast('Network error.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="material-icons" style="font-size:15px;vertical-align:middle">save</i> Save Supplier';
    }
}

async function archiveSupplier(id, name) {
    // Block archiving if the supplier has Available products
    try {
        const checkRes  = await fetch(`../api/supplier_list.php?t=${Date.now()}`);
        const checkData = await checkRes.json();
        const suppliers = Array.isArray(checkData) ? checkData : (checkData.suppliers || []);
        const supplier  = suppliers.find(s => String(s.supplier_id) === String(id));
        if (supplier && parseInt(supplier.product_count || supplier.products || 0) > 0) {
            // Further check: fetch products to see if any are Available
            const prodRes  = await fetch('../api/product_list.php');
            const prodData = await prodRes.json();
            const hasAvailable = prodData.some(p => String(p.supplier_id) === String(id) && p.status !== 'Unavailable');
            if (hasAvailable) {
                showToast(`Cannot archive "${name}" — it still has Available products. Remove or reassign those products first.`, 'error');
                return;
            }
        }
    } catch (err) {
        // If check fails, still allow with warning
        console.warn('Supplier availability check failed:', err);
    }

    if (!confirm(`Archive supplier "${name}"?\n\nProducts linked to this supplier will be marked Unavailable. You can restore the supplier later.`)) return;
    try {
        const fd = new FormData();
        fd.append('id', id);
        const res  = await fetch('../api/supplier_archive.php', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) { showToast(`"${name}" archived.`); fetchSuppliers(); }
        else showToast(data.message || 'Failed.', 'error');
    } catch(e) { showToast('Network error.', 'error'); }
}

async function quickAssignSupplier(productId, productName) {
    if (!_suppliers.length) {
        showToast('No suppliers yet. Add a supplier first.', 'error'); return;
    }
    const options = _suppliers.map(s => `<option value="${s.supplier_id}">${esc(s.supplier_name)}</option>`).join('');
    const html = `<div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;" id="quickAssignOverlay">
        <div style="background:#fff;border-radius:16px;padding:28px;width:360px;max-width:94vw;">
            <h3 style="margin:0 0 6px;color:#0A2E1F">Assign Supplier</h3>
            <p style="margin:0 0 16px;color:#718096;font-size:0.85rem">${esc(productName)}</p>
            <label style="font-size:0.8rem;font-weight:700;color:#0A2E1F;text-transform:uppercase;">Select Supplier</label>
            <select id="quickSupSelect" style="width:100%;margin:8px 0 20px;padding:11px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.95rem;background:#fff;">
                <option value="">-- Remove Supplier (set Unavailable) --</option>
                ${options}
            </select>
            <div style="display:flex;gap:10px;">
                <button onclick="document.getElementById('quickAssignOverlay').remove()"
                    style="flex:1;padding:12px;border:2px solid #e2e8f0;border-radius:10px;background:#fff;font-weight:600;cursor:pointer;color:#718096;">Cancel</button>
                <button onclick="confirmQuickAssign(${productId})"
                    style="flex:2;padding:12px;border:none;border-radius:10px;background:#1baa5d;color:#fff;font-weight:700;cursor:pointer;">Confirm</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

async function confirmQuickAssign(productId) {
    const supplierId = document.getElementById('quickSupSelect').value;
    document.getElementById('quickAssignOverlay').remove();
    try {
        const fd = new FormData();
        fd.append('product_id',  productId);
        fd.append('supplier_id', supplierId);
        const res  = await fetch('../api/assign_supplier.php', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
            showToast(supplierId ? 'Supplier assigned! Product is now Available.' : 'Supplier removed. Product marked Unavailable.');
            fetchProductAvailability();
            fetchSuppliers();
        } else showToast(data.message || 'Failed.', 'error');
    } catch(e) { showToast('Network error.', 'error'); }
}
// ══════════════════════════════════════
//  EXPIRY DATE PRESET
// ══════════════════════════════════════
function setExpiryFromPreset(val) {
    const input = document.getElementById('prod-expiry');
    if (!input) return;

    // 'custom' = user wants to type their own date, leave field as-is
    if (val === 'custom' || val === '') return;

    const expiry = new Date();

    if (val === '6m') {
        expiry.setMonth(expiry.getMonth() + 6);
    } else if (val.endsWith('y')) {
        // FIX: parseInt('2y') returns 2 correctly, but be explicit
        expiry.setFullYear(expiry.getFullYear() + parseInt(val, 10));
    }

    // FIX: Use manual formatting instead of toISOString() to avoid timezone shifts
    const yyyy = expiry.getFullYear();
    const mm   = String(expiry.getMonth() + 1).padStart(2, '0');
    const dd   = String(expiry.getDate()).padStart(2, '0');
    input.value = yyyy + '-' + mm + '-' + dd;
}