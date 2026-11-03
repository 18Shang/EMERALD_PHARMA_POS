<?php
// ============================================================
//  Emerald Pharmacy — Cashier Dashboard
//  Location: cashier/cashier_dashboard.php
//
//  Folder structure (mirrors admin):
//    cashier/
//      cashier_dashboard.php   ← this file
//    css/
//      cashier_dashboard.css
//    js/
//      cashier_dashboard.js
//    api/
//      cashier_dashboard.php   ← your cashier_dashboard_api.php
//      process_order.php
//      sales_report.php
//      change_password.php
// ============================================================
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cashier — Emerald Pharmacy</title>
    <link rel="stylesheet" href="../css/cashier_dashboard.css">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</head>
<body>

<div class="dashboard-container">

    <!-- ════════════════════════════════════════════
         SIDEBAR  (identical structure to admin)
    ════════════════════════════════════════════ -->
    <aside class="sidebar">
        <div class="sidebar-header">
            <img src="../assets/logo.png" alt="Logo" class="logo">
            <span class="brand-name">Cashier</span>
        </div>

        <nav class="sidebar-nav">

            <div class="menu-item active" id="nav-dashboard" onclick="loadPage('dashboard')">
                <i class="material-icons">dashboard</i>
                <span>Dashboard</span>
                <span class="nav-badge" id="pending-badge" style="display:none">0</span>
            </div>

            <div class="nav-section-label">Transactions</div>

            <div class="menu-item" id="nav-sales" onclick="loadPage('sales')">
                <i class="material-icons">shopping_cart</i>
                <span>Sales (POS)</span>
            </div>

            <div class="nav-section-label">Reports</div>

            <div class="menu-item" id="nav-report" onclick="loadPage('report')">
                <i class="material-icons">bar_chart</i>
                <span>Sales Report</span>
            </div>

            <div class="menu-item" id="nav-stock" onclick="loadPage('stock')">
                <i class="material-icons">inventory_2</i>
                <span>View Stock</span>
            </div>

        </nav>
    </aside><!-- /sidebar -->


    <!-- ════════════════════════════════════════════
         MAIN CONTENT  (identical structure to admin)
    ════════════════════════════════════════════ -->
    <main class="main-content">

        <!-- Top Bar -->
        <header class="top-bar" id="top-bar">
            <h1 id="page-title">Dashboard</h1>
            <div class="header-actions">
                <span id="topbar-date" style="font-size:0.85rem;color:var(--text-muted)"></span>
                <button class="icon-btn" id="topbar-refresh" onclick="refreshDashboard()" title="Refresh">
                    <i class="material-icons">refresh</i>
                </button>
                <!-- User Profile Dropdown -->
                <div class="user-profile" id="user-profile-wrap">
                    <div class="user-avatar" onclick="toggleDropdown()">
                        <i class="material-icons">account_circle</i>
                        <span class="user-avatar-name" id="cashier-username">Cashier</span>
                        <i class="material-icons avatar-chevron">expand_more</i>
                    </div>
                    <div id="profile-dropdown" class="dropdown-content">
                        <div class="dropdown-header">
                            <i class="material-icons">badge</i>
                            <div>
                                <span class="dropdown-username" id="dropdown-username">Cashier</span>
                                <span class="dropdown-role">Cashier</span>
                            </div>
                        </div>
                        <div class="dropdown-divider"></div>
                        <a href="#" class="dropdown-item" onclick="openChangePasswordModal(event)">
                            <i class="material-icons">lock</i> Change Password
                        </a>
                        <div class="dropdown-divider"></div>
                        <a href="#" class="dropdown-item dropdown-logout" onclick="confirmLogout(event)">
                            <i class="material-icons">logout</i> Logout
                        </a>
                    </div>
                </div>

            </div>
        </header>

        <!-- Dynamic Content (populated by JS) -->
        <div id="dynamic-content">
            <div class="loading-state">
                <i class="material-icons spin">autorenew</i>
                <span>Loading...</span>
            </div>
        </div>

    </main><!-- /main-content -->

</div><!-- /dashboard-container -->


<!-- ════════════════════════════════════════════
     PROCESS ORDER MODAL (dark checkout card)
════════════════════════════════════════════ -->
<div class="modal-overlay" id="processModal">
    <div class="process-modal-card">

        <div class="process-modal-header">
            <button class="modal-back-btn" onclick="closeProcessModal()">
                <i class="material-icons">arrow_back</i>
            </button>
            <h2>Checkout</h2>
            <div style="width:36px"></div><!-- centering spacer -->
        </div>

        <div class="process-modal-body" id="process-modal-body">
            <div class="loading-state">
                <i class="material-icons spin">autorenew</i>
            </div>
        </div>

        <div class="process-modal-footer" id="process-modal-footer" style="display:none">
            <div class="modal-total-row">
                <span class="modal-total-label">Total</span>
                <span class="modal-total-val" id="modal-total-val">₱0.00</span>
            </div>
            <button class="btn-confirm" id="btn-confirm" onclick="confirmOrder()">
                <i class="material-icons">check_circle</i> CONFIRM
            </button>
        </div>

    </div>
</div>


<!-- ════════════════════════════════════════════
     RECEIPT MODAL
════════════════════════════════════════════ -->
<div class="modal-overlay" id="receiptModal">
    <div class="receipt-modal-card">

        <div class="receipt-header">
            <h2>EMERALD 24/7 PHARMACY</h2>
            <p>Barra, Opol, Mis Or.</p>
        </div>

        <div class="receipt-body">
            <div id="receipt-info"></div>
            <div class="receipt-divider"></div>
            <div id="receipt-items"></div>
            <div class="receipt-divider"></div>
            <div class="receipt-total-row">
                <span>TOTAL</span>
                <span id="receipt-total">₱0.00</span>
            </div>
        </div>

        <div class="receipt-footer">
            <p>Thank you for choosing Emerald!</p>
            <div class="receipt-actions">
                <button class="btn-close-receipt" onclick="closeReceiptAndRefresh()">Close</button>
                <button class="btn-print-receipt" onclick="printReceipt()">
                    <i class="material-icons">print</i> Print
                </button>
            </div>
        </div>

    </div>
</div>


<!-- ════════════════════════════════════════════
     IMAGE ZOOM OVERLAY
════════════════════════════════════════════ -->
<div class="zoom-overlay" id="zoomOverlay" onclick="closeZoom()">
    <button class="zoom-close-btn" onclick="closeZoom()">
        <i class="material-icons">close</i>
    </button>
    <img id="zoom-img" src="" alt="Proof Image">
</div>


<!-- ════════════════════════════════════════════
     CHANGE PASSWORD MODAL  (identical to admin)
════════════════════════════════════════════ -->
<div class="modal-overlay" id="changePwdModal">
    <div style="background:#fff;border-radius:16px;padding:36px 40px 32px;
                max-width:520px;width:92%;position:relative;box-shadow:0 24px 64px rgba(0,0,0,0.22)">

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px">
            <div style="display:flex;align-items:center;gap:14px">
                <span style="background:#e6f9ef;border-radius:12px;padding:10px;display:flex;align-items:center">
                    <i class="material-icons" style="color:#1B8F3C;font-size:26px">lock</i>
                </span>
                <h2 style="font-size:1.25rem;font-weight:700;color:#1a202c;margin:0">Change Password</h2>
            </div>
            <button onclick="closeChangePwdModal()"
                style="width:36px;height:36px;border:1px solid #e2e8f0;background:#fff;border-radius:8px;
                       cursor:pointer;display:flex;align-items:center;justify-content:center;
                       color:#64748b;flex-shrink:0;transition:all 0.2s;padding:0"
                onmouseover="this.style.background='#f8fafc';this.style.borderColor='#cbd5e1'"
                onmouseout="this.style.background='#fff';this.style.borderColor='#e2e8f0'">
                <i class="material-icons" style="font-size:18px">close</i>
            </button>
        </div>

        <form id="changePwdForm" onsubmit="handleChangePwd(event)" autocomplete="off">

            <!-- Current Password -->
            <div style="margin-bottom:20px">
                <label style="display:block;font-size:0.7rem;font-weight:700;letter-spacing:0.08em;
                              color:#64748b;text-transform:uppercase;margin-bottom:8px">
                    Current Password
                </label>
                <div style="position:relative">
                    <input type="password" id="pwd-current" placeholder="Enter current password" required
                        style="width:100%;padding:13px 46px 13px 14px;border:1.5px solid #e2e8f0;
                               border-radius:10px;font-size:0.95rem;font-family:inherit;
                               outline:none;box-sizing:border-box;transition:border-color 0.2s;color:#1a202c"
                        onfocus="this.style.borderColor='#1B8F3C'"
                        onblur="this.style.borderColor='#e2e8f0'">
                    <button type="button" onclick="togglePwd('pwd-current',this)"
                        style="position:absolute;right:12px;top:50%;transform:translateY(-50%);
                               border:none;background:none;cursor:pointer;padding:0;
                               display:flex;align-items:center;color:#94a3b8">
                        <i class="material-icons" style="font-size:20px">visibility</i>
                    </button>
                </div>
            </div>

            <!-- New Password -->
            <div style="margin-bottom:8px">
                <label style="display:block;font-size:0.7rem;font-weight:700;letter-spacing:0.08em;
                              color:#64748b;text-transform:uppercase;margin-bottom:8px">
                    New Password
                </label>
                <div style="position:relative">
                    <input type="password" id="pwd-new" placeholder="At least 8 characters"
                           required minlength="8" oninput="checkPwdStrength(this.value)"
                        style="width:100%;padding:13px 46px 13px 14px;border:1.5px solid #e2e8f0;
                               border-radius:10px;font-size:0.95rem;font-family:inherit;
                               outline:none;box-sizing:border-box;transition:border-color 0.2s;color:#1a202c"
                        onfocus="this.style.borderColor='#1B8F3C'"
                        onblur="this.style.borderColor='#e2e8f0'">
                    <button type="button" onclick="togglePwd('pwd-new',this)"
                        style="position:absolute;right:12px;top:50%;transform:translateY(-50%);
                               border:none;background:none;cursor:pointer;padding:0;
                               display:flex;align-items:center;color:#94a3b8">
                        <i class="material-icons" style="font-size:20px">visibility</i>
                    </button>
                </div>
                <div class="pwd-strength-bar" style="margin-top:8px">
                    <div id="pwd-strength-fill"></div>
                </div>
                <span id="pwd-strength-text" class="pwd-strength-text"></span>
            </div>

            <!-- Confirm New Password -->
            <div style="margin-bottom:28px">
                <label style="display:block;font-size:0.7rem;font-weight:700;letter-spacing:0.08em;
                              color:#64748b;text-transform:uppercase;margin-bottom:8px">
                    Confirm New Password
                </label>
                <div style="position:relative">
                    <input type="password" id="pwd-confirm" placeholder="Re-enter new password"
                           required oninput="checkPwdMatch()"
                        style="width:100%;padding:13px 46px 13px 14px;border:1.5px solid #e2e8f0;
                               border-radius:10px;font-size:0.95rem;font-family:inherit;
                               outline:none;box-sizing:border-box;transition:border-color 0.2s;color:#1a202c"
                        onfocus="this.style.borderColor='#1B8F3C'"
                        onblur="this.style.borderColor='#e2e8f0'">
                    <button type="button" onclick="togglePwd('pwd-confirm',this)"
                        style="position:absolute;right:12px;top:50%;transform:translateY(-50%);
                               border:none;background:none;cursor:pointer;padding:0;
                               display:flex;align-items:center;color:#94a3b8">
                        <i class="material-icons" style="font-size:20px">visibility</i>
                    </button>
                </div>
                <span id="pwd-match-msg" class="pwd-match-msg"></span>
            </div>

            <!-- Buttons -->
            <div style="display:flex;gap:14px">
                <button type="button" onclick="closeChangePwdModal()"
                    style="flex:1;padding:14px;border:1.5px solid #e2e8f0;border-radius:10px;
                           background:#fff;font-weight:600;cursor:pointer;color:#64748b;
                           font-size:0.95rem;font-family:inherit;transition:all 0.2s"
                    onmouseover="this.style.borderColor='#94a3b8';this.style.color='#334155'"
                    onmouseout="this.style.borderColor='#e2e8f0';this.style.color='#64748b'">
                    Cancel
                </button>
                <button type="submit" id="pwd-save-btn"
                    style="flex:2;padding:14px;border:none;border-radius:10px;
                           background:#1B8F3C;color:#fff;font-weight:700;cursor:pointer;
                           font-size:0.95rem;display:flex;align-items:center;justify-content:center;
                           gap:8px;font-family:inherit;transition:opacity 0.2s">
                    <i class="material-icons" style="font-size:18px">lock_reset</i> Update Password
                </button>
            </div>

        </form>
    </div>
</div>


<!-- ════════════════════════════════════════════
     TOAST  (identical to admin)
════════════════════════════════════════════ -->
<div class="toast" id="toast">
    <i class="material-icons">check_circle</i>
    <span id="toast-msg">Done!</span>
</div>

<!-- Hidden print area -->
<div id="print-area" style="display:none"></div>


<!-- ════════════════════════════════════════════
     JS  (cache-busted, same as admin)
════════════════════════════════════════════ -->
<script src="../js/cashier_dashboard.js?v=<?php echo time(); ?>"></script>

<!-- ════ POS PACK BUTTON FIX — overrides posRenderGrid after JS loads ════ -->
<script>
window.addEventListener('load', function() {
    // Override posRenderGrid to always show both Per Piece and Per Pack buttons
    if (typeof posRenderGrid !== 'undefined') {
        posRenderGrid = function(products) {
            const grid = document.getElementById('pos-grid');
            if (!grid) return;
            if (!products.length) {
                grid.innerHTML = '<div class="empty-state"><i class="material-icons">medication</i><p>No products found.</p></div>';
                return;
            }
            grid.innerHTML = products.map(function(p) {
                const qtyPerPack    = parseInt(p.qty_per_pack || 1);
                const rawPrice      = parseFloat(p.price || 0);
                const rawPackPrice  = parseFloat(p.price_per_pack || 0);
                const pricePerPiece = rawPrice > 0 ? rawPrice
                                    : (rawPackPrice > 0 && qtyPerPack > 1 ? parseFloat((rawPackPrice / qtyPerPack).toFixed(2)) : rawPackPrice);
                const pricePerPack2 = rawPackPrice > 0 ? rawPackPrice
                                    : (rawPrice > 0 && qtyPerPack > 1 ? parseFloat((rawPrice * qtyPerPack).toFixed(2)) : rawPrice);
                const stock      = parseInt(p.quantity || 0);
                const imgSrc     = p.image ? prodImgSrc(p.image) : '';
                const img        = imgSrc ? '<img src="' + escHtml(imgSrc) + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'" alt="">' : '';
                const outOfStock = stock <= 0;
                const canSplit   = qtyPerPack > 1;
                const packUnit   = (p.unit || 'Pack').trim();
                const packBtnHtml = canSplit
                    ? '<button class="pos-add-pack" onclick="posAddToCartMode(' + p.id + ',\'pack\')" style="display:flex;align-items:center;gap:6px;width:100%;padding:7px 10px;border:none;border-radius:8px;background:#ebf8ff;color:#2b6cb0;font-size:0.76rem;font-weight:700;cursor:pointer;">'
                    + '<i class="material-icons" style="font-size:0.95rem">inventory_2</i>'
                    + 'Per ' + escHtml(packUnit) + ' (' + qtyPerPack + 'pcs) \u20b1' + pricePerPack2.toFixed(2)
                    + '</button>'
                    : '';
                return '<div class="pos-product-card ' + (outOfStock ? 'out-of-stock' : '') + '" id="pos-card-' + p.id + '" style="overflow:visible;display:flex;flex-direction:column;">'
                    + '<div class="pos-product-img" style="border-radius:12px 12px 0 0;overflow:hidden;" onclick="' + (outOfStock ? '' : 'posAddToCartMode(' + p.id + ',\'piece\')') + '">'
                    + img
                    + '<i class="material-icons" style="display:' + (imgSrc ? 'none' : 'block') + '">medication</i>'
                    + '</div>'
                    + '<div class="pos-product-info">'
                    + '<div class="pos-product-name">' + escHtml(p.name) + '</div>'
                    + '<div class="pos-product-unit">' + escHtml((p.unit_value||'') + ' ' + packUnit) + '</div>'
                    + (outOfStock ? '<div class="pos-product-stock-warn">Out of Stock</div>' : '<div class="pos-product-stock">Stock: ' + stock + '</div>')
                    + (outOfStock ? '' :
                        '<div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;">'
                        + '<button class="pos-add-piece" onclick="posAddToCartMode(' + p.id + ',\'piece\')" style="display:flex;align-items:center;gap:6px;width:100%;padding:7px 10px;border:none;border-radius:8px;background:#e6f9ef;color:#1B8F3C;font-size:0.76rem;font-weight:700;cursor:pointer;">'
                        + '<i class="material-icons" style="font-size:0.95rem">add</i>'
                        + 'Per Piece \u20b1' + pricePerPiece.toFixed(2)
                        + '</button>'
                        + packBtnHtml
                        + '</div>')
                    + '</div>'
                    + '</div>';
            }).join('');
        };

        // Also override posAddToCartMode for correct pricing
        posAddToCartMode = function(productId, mode) {
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
            const cartId    = p.id + '-' + mode;
            const packUnit  = (p.unit || 'Pack').trim();
            const label     = isPack ? 'Per ' + packUnit + ' (' + qtyPerPack + 'pcs)' : 'Per Piece';
            const idx = posCart.findIndex(x => x.cartId === cartId);
            if (idx >= 0) {
                if (posCart[idx].qty >= stock) { showToast('No more stock available.', true); return; }
                posCart[idx].qty++;
            } else {
                if (stock <= 0) { showToast(p.name + ' is out of stock.', true); return; }
                posCart.push({ id: p.id, cartId, name: p.name, price: unitPrice, qty: 1, label, image: p.image || '' });
            }
            posRenderCart();
            showToast(p.name + ' (' + label + ') added');
        };
    }
});
</script>

</body>
</html>