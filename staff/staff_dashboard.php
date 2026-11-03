<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff — Emerald Pharmacy</title>
    <link rel="stylesheet" href="../css/staff_dashboard.css">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</head>
<body>
<div class="dashboard-container">

    <!-- ═══════════ SIDEBAR ═══════════ -->
    <aside class="sidebar">
        <div class="sidebar-header">
            <img src="../assets/logo.png" alt="Logo" class="logo"
                 onerror="this.style.display='none';document.getElementById('logo-fb').style.display='flex'">
            <div class="logo-fallback" id="logo-fb" style="display:none">
                <i class="material-icons">local_pharmacy</i>
            </div>
            <span class="brand-name">STAFF</span>
        </div>
        <nav class="sidebar-nav">
            <div class="menu-item active" id="nav-dashboard" onclick="loadPage('dashboard')">
                <i class="material-icons">dashboard</i>
                <span>Dashboard</span>
            </div>

            <div class="nav-section-label">Inventory</div>

            <div class="menu-item" id="nav-category" onclick="loadPage('category')">
                <i class="material-icons">category</i>
                <span>Category</span>
            </div>

            <div class="menu-item" id="nav-products" onclick="loadPage('products')">
                <i class="material-icons">medication</i>
                <span>Products</span>
            </div>

            <div class="nav-section-label">Reports</div>

            <div class="menu-item" id="nav-low_stock" onclick="loadPage('low_stock')">
                <i class="material-icons">inventory</i>
                <span>Low Stock</span>
            </div>
            <div class="menu-item" id="nav-expiry_report" onclick="loadPage('expiry_report')">
                <i class="material-icons">event_busy</i>
                <span>Expiry Report</span>
            </div>
        </nav>
    </aside>

    <!-- ═══════════ MAIN ═══════════ -->
    <main class="main-content">
        <header class="top-bar" id="top-bar">
            <h1 id="page-title">Overview</h1>
            <div class="header-actions">
                <span id="topbar-date"></span>
                <button class="icon-btn refresh-btn" onclick="refreshPage()" title="Refresh">
                    <i class="material-icons">refresh</i>
                </button>
                <div class="user-profile" id="user-profile-wrap">
                    <div class="user-avatar" onclick="toggleDropdown()">
                        <i class="material-icons">account_circle</i>
                        <span class="user-avatar-name" id="staff-username">Staff</span>
                        <i class="material-icons avatar-chevron">expand_more</i>
                    </div>
                    <div id="profile-dropdown" class="dropdown-content">
                        <div class="dropdown-header">
                            <i class="material-icons">badge</i>
                            <div>
                                <span class="dropdown-username" id="dropdown-username">Staff</span>
                                <span class="dropdown-role">Staff</span>
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
        <div id="dynamic-content">
            <div class="loading-state">
                <i class="material-icons spin">autorenew</i>
                <span>Loading...</span>
            </div>
        </div>
    </main>
</div>

<!-- ═══════════ CATEGORY MODAL ═══════════ -->
<div class="modal-overlay" id="categoryModal">
    <div class="modal-card">
        <div class="modal-header">
            <h2 id="modalTitle">Add Category</h2>
            <button class="modal-close-btn" onclick="closeModal()">
                <i class="material-icons">close</i>
            </button>
        </div>
        <form id="categoryForm" onsubmit="handleCategorySubmit(event)">
            <input type="hidden" id="edit-cat-id" value="">
            <input type="hidden" id="cat-parent-id" value="0">
            <!-- Parent label (shown when adding item to a category) -->
            <div class="form-group" id="cat-parent-row" style="display:none;">
                <label>Category</label>
                <div style="padding:10px 12px;background:#e6f9ef;border-radius:8px;font-weight:600;color:#0A2E1F;font-size:0.9rem;">
                    <i class="material-icons" style="font-size:15px;vertical-align:middle;color:#1baa5d;">subdirectory_arrow_right</i>
                    <span id="cat-parent-label"></span>
                </div>
            </div>
            <div class="form-group">
                <label id="cat-name-label">Category Name</label>
                <input type="text" id="cat-name" name="name" required placeholder="Enter name">
            </div>
            <div class="form-group">
                <label>Description</label>
                <input type="text" id="cat-description" name="description" placeholder="Enter description">
            </div>
            <!-- Status: only shown for items (sub-categories), hidden for parent categories -->
            <div class="form-group" id="cat-status-row" style="display:none;">
                <label>Status</label>
                <select id="cat-status" name="status">
                    <option value="Available">Available</option>
                    <option value="Not Available">Not Available</option>
                </select>
            </div>
            <button type="submit" class="save-btn">Save Category</button>
        </form>
    </div>
</div>

<!-- ═══════════ PRODUCT MODAL (mirrors admin exactly) ═══════════ -->
<div class="modal-overlay" id="productModal">
    <div class="modal-card modal-card-wide">
        <div class="modal-header">
            <h2 id="productModalTitle">Add New Product</h2>
            <button class="modal-close-btn" onclick="closeProductModal()">
                <i class="material-icons">close</i>
            </button>
        </div>
        <form id="productForm" onsubmit="handleProductSubmit(event)">
            <input type="hidden" id="prod-edit-id" value="">

            <div class="prod-form-layout">
                <!-- Left: Image -->
                <div class="prod-image-col">
                    <label class="prod-img-label">PRODUCT IMAGE</label>
                    <div class="prod-img-dropzone" id="imgDropzone"
                         onclick="document.getElementById('prod-image-input').click()">
                        <i class="material-icons" id="imgPlaceholderIcon">add_photo_alternate</i>
                        <span id="imgPlaceholderText">Click to upload</span>
                        <img id="imgPreview" src="" alt="" style="display:none;">
                    </div>
                    <input type="file" id="prod-image-input" accept="image/*"
                           style="display:none" onchange="handleImageUpload(this)">
                    <div id="ai-scan-box" style="display:none" class="ai-scan-box">
                        <div class="ai-scan-header">
                            <i class="material-icons">document_scanner</i>
                            <span>Image Scan</span>
                        </div>
                        <div id="ai-scan-result" class="ai-scan-result"></div>
                    </div>
                    <div id="ai-scanning" style="display:none" class="ai-scanning">
                        <i class="material-icons spin">autorenew</i> Reading image text...
                    </div>
                </div>

                <!-- Right: Fields -->
                <div class="prod-fields-col">
                    <div class="prod-form-row">
                        <div class="form-group">
                            <label>Product Name</label>
                            <input type="text" id="prod-name" required placeholder="e.g. Amoxicillin">
                        </div>
                        <div class="form-group">
                            <label>Brand Name</label>
                            <input type="text" id="prod-brand" placeholder="e.g. Biogesic, Bayer, Ponstan">
                        </div>
                    </div>

                    <div class="prod-form-row">
                        <div class="form-group">
                            <label>Category</label>
                            <select id="prod-category" required>
                                <option value="">Select category...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Supplier</label>
                            <select id="prod-supplier">
                                <option value="">Select supplier...</option>
                            </select>
                        </div>
                    </div>

                    <div class="prod-form-row">
                        <div class="form-group">
                            <label>Packaging (Unit)</label>
                            <select id="prod-unit" required onchange="recalcPrice()">
                                <option value="">Select packaging...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Measurement Unit</label>
                            <select id="prod-measure-unit" required>
                                <option value="">Select unit...</option>
                            </select>
                        </div>
                    </div>

                    <div class="prod-form-row">
                        <div class="form-group">
                            <label>Value per item (e.g. 500mg)</label>
                            <input type="number" id="prod-unit-value" placeholder="500" min="0" step="any">
                        </div>
                        <div class="form-group">
                            <label>Qty per pack / box</label>
                            <input type="number" id="prod-qty-per-pack" placeholder="e.g. 10" min="1" oninput="recalcPrice()" onchange="recalcPrice()">
                        </div>
                    </div>

                    <div class="prod-form-row">
                        <div class="form-group">
                            <label>Total Quantity (packs)</label>
                            <input type="number" id="prod-quantity" required placeholder="e.g. 50" min="1">
                        </div>
                        <div class="form-group">
                            <label>Price per item (₱)</label>
                            <input type="number" id="prod-price-per-item" placeholder="e.g. 5.00" min="0" step="0.01" oninput="recalcPrice()" onchange="recalcPrice()">
                        </div>
                    </div>

                    <div class="prod-form-row">
                        <div class="form-group">
                            <label>Price per pack (₱) <span class="auto-tag">auto</span></label>
                            <input type="number" id="prod-price" required placeholder="auto-calculated" min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Batch No. <span class="auto-tag">auto-generated</span></label>
                            <input type="text" id="prod-batch" readonly placeholder="Will be generated on save">
                        </div>
                    </div>

                    <div class="prod-form-row">
                        <div class="form-group full-width">
                            <label>Expiry Date <span class="auto-tag">auto-set</span></label>
                            <div style="display:flex;gap:10px;align-items:flex-start;">
                                <select id="prod-expiry-preset" onchange="setExpiryFromPreset(this.value)"
                                    style="flex:1;padding:10px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.88rem;background:#fff;color:#0A2E1F;font-family:inherit;cursor:pointer;"
                                    onfocus="this.style.borderColor='#1baa5d'" onblur="this.style.borderColor='#e2e8f0'">
                                    <option value="">-- Select duration --</option>
                                    <option value="6m">6 Months</option>
                                    <option value="1y">1 Year</option>
                                    <option value="2y">2 Years</option>
                                    <option value="3y">3 Years</option>
                                    <option value="4y">4 Years</option>
                                    <option value="5y">5 Years</option>
                                    <option value="custom">Custom date...</option>
                                </select>
                                <input type="date" id="prod-expiry" required
                                    style="flex:1;padding:10px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.88rem;box-sizing:border-box;"
                                    onfocus="this.style.borderColor='#1baa5d'" onblur="this.style.borderColor='#e2e8f0'">
                            </div>
                        </div>
                    </div>

                    <div class="prod-form-row">
                        <div class="form-group full-width">
                            <label>Description</label>
                            <textarea id="prod-description" rows="3" placeholder="e.g. For the relief of mild to moderate pain, fever and inflammation..."></textarea>
                        </div>
                    </div>
                </div>
            </div>

            <div class="prod-form-actions">
                <button type="button" class="btn-cancel-prod" onclick="closeProductModal()">Cancel</button>
                <button type="submit" class="save-btn prod-save-btn" id="prod-save-btn">
                    <i class="material-icons">save</i> Save Product
                </button>
            </div>
        </form>
    </div>
</div>

<!-- ═══════════ CHANGE PASSWORD MODAL ═══════════ -->
<div id="changePwdModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;" onclick="closeChangePwdModal(event)">
    <div style="background:#fff;border-radius:18px;width:440px;max-width:94vw;box-shadow:0 24px 64px rgba(0,0,0,0.22);overflow:hidden;" onclick="event.stopPropagation()">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:22px 28px 18px;border-bottom:1px solid #f0f4f8;">
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="background:#e6f9ef;border-radius:10px;padding:8px;display:flex;">
                    <i class="material-icons" style="color:#1baa5d;font-size:22px">lock</i>
                </span>
                <h3 style="margin:0;color:#0A2E1F;font-size:1.1rem;font-weight:800">Change Password</h3>
            </div>
            <button onclick="closeChangePwdModal()"
                style="background:#f0f4f8;border:none;cursor:pointer;color:#718096;border-radius:8px;width:34px;height:34px;font-size:20px;display:flex;align-items:center;justify-content:center;">
                &times;
            </button>
        </div>
        <form id="changePwdForm" onsubmit="handleChangePwd(event)" autocomplete="off">
            <div style="padding:24px 28px;display:flex;flex-direction:column;gap:18px;">
                <div>
                    <label style="display:block;font-size:0.75rem;font-weight:700;color:#0A2E1F;text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px;">Current Password</label>
                    <div style="position:relative;">
                        <input type="password" id="pwd-current" placeholder="Enter current password" required
                            style="width:100%;padding:12px 44px 12px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.92rem;box-sizing:border-box;outline:none;font-family:inherit;"
                            onfocus="this.style.borderColor='#1baa5d'" onblur="this.style.borderColor='#e2e8f0'">
                        <button type="button" onclick="togglePwd('pwd-current',this)"
                            style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#a0aec0;display:flex;align-items:center;">
                            <i class="material-icons" style="font-size:20px">visibility</i>
                        </button>
                    </div>
                </div>
                <div>
                    <label style="display:block;font-size:0.75rem;font-weight:700;color:#0A2E1F;text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px;">New Password</label>
                    <div style="position:relative;">
                        <input type="password" id="pwd-new" placeholder="At least 8 characters" required minlength="8" oninput="checkPwdStrength(this.value)"
                            style="width:100%;padding:12px 44px 12px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.92rem;box-sizing:border-box;outline:none;font-family:inherit;"
                            onfocus="this.style.borderColor='#1baa5d'" onblur="this.style.borderColor='#e2e8f0'">
                        <button type="button" onclick="togglePwd('pwd-new',this)"
                            style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#a0aec0;display:flex;align-items:center;">
                            <i class="material-icons" style="font-size:20px">visibility</i>
                        </button>
                    </div>
                    <div style="height:5px;background:#e2e8f0;border-radius:4px;margin-top:8px;overflow:hidden;">
                        <div id="pwd-strength-fill" style="height:100%;width:0;border-radius:4px;transition:width .3s,background .3s;"></div>
                    </div>
                    <span id="pwd-strength-text" style="font-size:0.75rem;color:#718096;margin-top:4px;display:block;"></span>
                </div>
                <div>
                    <label style="display:block;font-size:0.75rem;font-weight:700;color:#0A2E1F;text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px;">Confirm New Password</label>
                    <div style="position:relative;">
                        <input type="password" id="pwd-confirm" placeholder="Re-enter new password" required
                            style="width:100%;padding:12px 44px 12px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.92rem;box-sizing:border-box;outline:none;font-family:inherit;"
                            onfocus="this.style.borderColor='#1baa5d'" onblur="this.style.borderColor='#e2e8f0'">
                        <button type="button" onclick="togglePwd('pwd-confirm',this)"
                            style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#a0aec0;display:flex;align-items:center;">
                            <i class="material-icons" style="font-size:20px">visibility</i>
                        </button>
                    </div>
                    <span id="pwd-match-msg" style="font-size:0.78rem;margin-top:4px;display:block;"></span>
                </div>
            </div>
            <div style="display:flex;gap:12px;padding:0 28px 28px;">
                <button type="button" onclick="closeChangePwdModal()"
                    style="flex:1;padding:13px;border:2px solid #e2e8f0;border-radius:10px;background:#fff;font-weight:600;cursor:pointer;color:#718096;font-size:0.9rem;font-family:inherit;">
                    Cancel
                </button>
                <button type="submit" id="pwd-save-btn"
                    style="flex:2;padding:13px;border:none;border-radius:10px;background:#1baa5d;color:#fff;font-weight:700;cursor:pointer;font-size:0.92rem;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;">
                    <i class="material-icons" style="font-size:17px">lock_reset</i> Update Password
                </button>
            </div>
        </form>
    </div>
</div>

<!-- ═══════════ TOAST ═══════════ -->
<div class="toast" id="toast">
    <i class="material-icons">check_circle</i>
    <span id="toast-msg">Saved!</span>
</div>

<script src="../js/staff_dashboard.js"></script>
</body>
</html>