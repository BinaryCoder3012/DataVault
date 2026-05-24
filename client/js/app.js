/**
 * DataVault - Main Application Script
 * Orchestrates frontend states, API interactions, dynamic rendering, and SQL Console executions.
 */

const API_BASE = '/api';

// Global UI State
const state = {
    currentTab: 'dashboard',
    filters: {
        search: '',
        categoryId: '',
        tagId: '',
        favoritesOnly: false
    },
    categories: [],
    tags: []
};

let securityChart = null;
let categoriesChart = null;

// ==========================================================================
// Initialization & Routing
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    loadDashboardData();
});

function initApp() {
    // Initialize Theme
    checkThemePreference();
    
    // Check hash for initial tab
    const hash = window.location.hash.replace('#', '');
    if (hash && ['dashboard', 'vault', 'categories', 'console'].includes(hash)) {
        switchTab(hash);
    } else {
        switchTab('dashboard');
    }
}

function setupEventListeners() {
    // 1. Sidebar Tab Switching
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.getAttribute('data-tab');
            window.location.hash = tab;
            switchTab(tab);
        });
    });

    // 2. Global Sync Button
    document.getElementById('btn-sync-db').addEventListener('click', () => {
        refreshCurrentTab();
        showToast('Database synchronization complete.', 'info');
    });

    // 3. Global Add Item Button
    document.getElementById('btn-global-add').addEventListener('click', () => {
        openItemModal();
    });

    // 4. Vault Filter Inputs
    document.getElementById('vault-search').addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        loadVaultItems();
    });

    document.getElementById('vault-filter-category').addEventListener('change', (e) => {
        state.filters.categoryId = e.target.value;
        loadVaultItems();
    });

    document.getElementById('vault-filter-tag').addEventListener('change', (e) => {
        state.filters.tagId = e.target.value;
        loadVaultItems();
    });

    document.getElementById('vault-filter-fav').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        state.filters.favoritesOnly = !state.filters.favoritesOnly;
        btn.classList.toggle('active', state.filters.favoritesOnly);
        loadVaultItems();
    });

    document.getElementById('btn-clear-filters').addEventListener('click', () => {
        state.filters.search = '';
        state.filters.categoryId = '';
        state.filters.tagId = '';
        state.filters.favoritesOnly = false;
        
        document.getElementById('vault-search').value = '';
        document.getElementById('vault-filter-category').value = '';
        document.getElementById('vault-filter-tag').value = '';
        document.getElementById('vault-filter-fav').classList.remove('active');
        
        loadVaultItems();
        showToast('Filters cleared', 'info');
    });

    // 5. Empty State Button Add Item
    document.querySelector('.btn-add-item-empty').addEventListener('click', () => {
        openItemModal();
    });

    // 6. Category CRUD Buttons
    document.getElementById('btn-create-category').addEventListener('click', () => {
        openCategoryModal();
    });

    // 7. SQL Console Runner
    document.getElementById('btn-console-run').addEventListener('click', executeConsoleQuery);
    document.getElementById('btn-console-clear').addEventListener('click', () => {
        document.getElementById('sql-editor').value = '';
        document.getElementById('sql-editor').focus();
    });

    // SQL Explorer Table clicks helper
    document.querySelectorAll('.schema-table-header').forEach(header => {
        header.addEventListener('click', () => {
            const table = header.getAttribute('data-table');
            const editor = document.getElementById('sql-editor');
            editor.value = `SELECT * FROM ${table} LIMIT 10;`;
            editor.focus();
        });
    });

    // 8. Modal Window Closures
    document.querySelectorAll('.modal-overlay .btn-close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            closeAllModals();
        });
    });

    // Close on overlay clicking
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) {
                closeAllModals();
            }
        });
    });

    // 9. Item Form Submission
    document.getElementById('form-item').addEventListener('submit', handleItemSubmit);

    // Modal password field handlers
    const passInput = document.getElementById('item-secret');
    passInput.addEventListener('input', (e) => {
        updatePasswordStrengthMeter(e.target.value);
    });

    document.getElementById('btn-modal-toggle-secret').addEventListener('click', () => {
        const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passInput.setAttribute('type', type);
        const icon = document.querySelector('#btn-modal-toggle-secret i');
        icon.className = type === 'password' ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    });

    document.getElementById('btn-modal-generate').addEventListener('click', () => {
        const generated = generateStrongPassword(16);
        passInput.value = generated;
        passInput.setAttribute('type', 'text');
        const icon = document.querySelector('#btn-modal-toggle-secret i');
        icon.className = 'fa-solid fa-eye';
        updatePasswordStrengthMeter(generated);
        showToast('Generated strong password key.', 'info');
    });

    // 10. Category Form Submission
    document.getElementById('form-category').addEventListener('submit', handleCategorySubmit);

    // 11. Theme Switcher Toggle Link
    document.getElementById('btn-theme-toggle').addEventListener('click', (e) => {
        e.preventDefault();
        toggleTheme();
    });
}

// Swaps active views
function switchTab(tabId) {
    state.currentTab = tabId;
    
    // Swap Active Link styling
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-tab') === tabId);
    });

    // Swap visible views
    document.querySelectorAll('.tab-view').forEach(view => {
        view.classList.toggle('active', view.getAttribute('id') === `view-${tabId}`);
    });

    // Update Header texts
    const titleEl = document.getElementById('current-view-title');
    const descEl = document.getElementById('current-view-desc');

    if (tabId === 'dashboard') {
        titleEl.textContent = 'Dashboard';
        descEl.textContent = 'Security insights and database metrics at a glance.';
        loadDashboardData();
    } else if (tabId === 'vault') {
        titleEl.textContent = 'Vault Credentials';
        descEl.textContent = 'Manage, edit, search and check relational record attributes.';
        loadVaultFilters();
        loadVaultItems();
    } else if (tabId === 'categories') {
        titleEl.textContent = 'Relational Categories';
        descEl.textContent = 'Manage data segmentation entities with colors and icon cues.';
        loadCategoriesGrid();
    } else if (tabId === 'console') {
        titleEl.textContent = 'SQL Command console';
        descEl.textContent = 'Execute raw queries and interact directly with SQLite schemas.';
    }
}

function refreshCurrentTab() {
    switchTab(state.currentTab);
}

// ==========================================================================
// Dashboard Feature Logic
// ==========================================================================
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        if (!response.ok) throw new Error('Failed to load stats');
        const data = await response.json();

        // 1. Update KPI Values
        document.getElementById('stat-total-items').textContent = data.summary.totalItems;
        document.getElementById('stat-favorites').textContent = data.summary.totalFavorites;
        document.getElementById('stat-categories').textContent = data.summary.totalCategories;
        document.getElementById('stat-tags').textContent = data.summary.totalTags;

        // 2. Render Security Strengths Horizontal Bar Chart
        renderSecurityChart(data.strengths);

        // 3. Render Database Distribution Doughnut Chart
        renderCategoriesChart(data.categories);

        // 4. Load Pinned Favorites Credentials list
        loadDashboardFavoritesList();

    } catch (err) {
        console.error(err);
        showToast('Error loading dashboard analytics.', 'error');
    }
}

function renderSecurityChart(strengths) {
    const canvas = document.getElementById('chart-security-strength');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (securityChart) {
        securityChart.destroy();
    }
    
    const dataVals = [strengths.Strong || 0, strengths.Medium || 0, strengths.Weak || 0];

    securityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Strong', 'Medium', 'Weak'],
            datasets: [{
                data: dataVals,
                backgroundColor: ['#10b981', '#f59e0b', '#f43f5e'],
                borderRadius: 6,
                borderWidth: 0,
                barThickness: 16
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f1423',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    titleFont: { family: 'Outfit' },
                    bodyFont: { family: 'Outfit' }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#64748b', font: { family: 'Outfit' }, stepSize: 1, beginAtZero: true }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { family: 'Outfit', weight: '500' } }
                }
            }
        }
    });
}

function renderCategoriesChart(categoriesData) {
    const canvas = document.getElementById('chart-categories-distribution');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (categoriesChart) {
        categoriesChart.destroy();
    }

    const filteredCats = categoriesData.filter(c => c.count > 0);
    
    if (filteredCats.length === 0) {
        categoriesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['rgba(255,255,255,0.03)']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
        return;
    }

    const labels = filteredCats.map(c => c.name);
    const dataVals = filteredCats.map(c => c.count);
    const colors = filteredCats.map(c => c.color || '#4f46e5');

    categoriesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataVals,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Outfit', size: 11, weight: '500' },
                        boxWidth: 8,
                        boxHeight: 8,
                        padding: 10
                    }
                },
                tooltip: {
                    backgroundColor: '#0f1423',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    titleFont: { family: 'Outfit' },
                    bodyFont: { family: 'Outfit' }
                }
            }
        }
    });
}

async function loadDashboardFavoritesList() {
    const listContainer = document.getElementById('dashboard-favorites-list');
    try {
        const res = await fetch(`${API_BASE}/items?favorite=1`);
        if (!res.ok) throw new Error('Error loading favorites list');
        const items = await res.json();

        listContainer.innerHTML = '';
        if (items.length === 0) {
            listContainer.innerHTML = '<div class="empty-state-small">No pinned/favorite credentials. Add favorites in the Vault view.</div>';
            return;
        }

        items.slice(0, 5).forEach(item => {
            const row = document.createElement('div');
            row.className = 'recent-item-row';
            row.innerHTML = `
                <div class="recent-item-title">
                    <i class="fa-solid fa-star"></i>
                    <span>${escapeHtml(item.title)}</span>
                </div>
                <div>
                    <span class="badge" style="background-color: ${item.category_color}1a; color: ${item.category_color}; border-color: ${item.category_color}33">
                        <i class="fa-solid fa-${item.category_icon || 'folder'}"></i> ${escapeHtml(item.category_name || 'Unassigned')}
                    </span>
                </div>
                <div class="text-secondary" style="font-family: monospace;">${escapeHtml(item.username || '(None)')}</div>
                <div>
                    <button class="btn btn-secondary btn-icon" onclick="copyTextDirect('${escapeHtml(item.secret_value)}')" style="width: 32px; height: 32px;" title="Copy Secret">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </div>
            `;
            listContainer.appendChild(row);
        });
    } catch (err) {
        listContainer.innerHTML = '<div class="empty-state-small">Error listing favorite items.</div>';
    }
}

// ==========================================================================
// Vault Feature Logic (CRUD & Filter integration)
// ==========================================================================
async function loadVaultFilters() {
    try {
        // Load category list
        const catRes = await fetch(`${API_BASE}/categories`);
        const cats = await catRes.json();
        state.categories = cats;

        const catSelect = document.getElementById('vault-filter-category');
        const savedVal = catSelect.value;
        catSelect.innerHTML = '<option value="">All Categories</option>';
        cats.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.name} (${cat.item_count})`;
            catSelect.appendChild(opt);
        });
        if (savedVal) catSelect.value = savedVal;

        // Load tag list
        const tagRes = await fetch(`${API_BASE}/tags`);
        const tags = await tagRes.json();
        state.tags = tags;

        const tagSelect = document.getElementById('vault-filter-tag');
        const savedTag = tagSelect.value;
        tagSelect.innerHTML = '<option value="">All Tags</option>';
        tags.forEach(tag => {
            const opt = document.createElement('option');
            opt.value = tag.id;
            opt.textContent = `#${tag.name}`;
            tagSelect.appendChild(opt);
        });
        if (savedTag) tagSelect.value = savedTag;

    } catch (err) {
        console.error('Error loading filters', err);
    }
}

async function loadVaultItems() {
    const grid = document.getElementById('vault-items-grid');
    grid.innerHTML = '<div class="empty-state-small">Loading vault items...</div>';

    // Construct query parameters
    const params = new URLSearchParams();
    if (state.filters.search) params.append('q', state.filters.search);
    if (state.filters.categoryId) params.append('category_id', state.filters.categoryId);
    if (state.filters.tagId) params.append('tag_id', state.filters.tagId);
    if (state.filters.favoritesOnly) params.append('favorite', '1');

    try {
        const response = await fetch(`${API_BASE}/items?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch items');
        const items = await response.json();

        grid.innerHTML = '';
        if (items.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-cube"></i>
                    <h3>No items found matching your filters</h3>
                    <p>Try refining your search keyword or clearing the selections.</p>
                </div>
            `;
            return;
        }

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.setAttribute('data-id', item.id);

            const categoryTag = item.category_name 
                ? `<span class="item-card-category" style="background-color: ${item.category_color}1a; color: ${item.category_color}; border: 1px solid ${item.category_color}33">
                    <i class="fa-solid fa-${item.category_icon || 'folder'}"></i> ${escapeHtml(item.category_name)}
                   </span>`
                : `<span class="item-card-category text-muted" style="background-color: rgba(255,255,255,0.03); border: 1px solid var(--border-color)">
                    <i class="fa-solid fa-folder-minus"></i> Unassigned
                   </span>`;

            const starClass = item.is_favorite === 1 ? 'is-fav' : '';
            const starIcon = item.is_favorite === 1 ? 'fa-solid fa-star' : 'fa-regular fa-star';

            // Tag badges list
            let tagBadges = '';
            if (item.tags && item.tags.length > 0) {
                item.tags.forEach(tag => {
                    if (tag.trim()) {
                        tagBadges += `<span class="tag-pill">#${escapeHtml(tag.trim())}</span>`;
                    }
                });
            }

            const usernameField = item.username 
                ? `<div class="item-detail-row">
                    <label>Username / Key</label>
                    <div class="item-detail-value-wrapper">
                        <span class="item-detail-value">${escapeHtml(item.username)}</span>
                        <div class="item-detail-actions">
                            <button class="btn-card-copy" onclick="copyTextDirect('${escapeHtml(item.username)}')" title="Copy Username">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                        </div>
                    </div>
                   </div>`
                : '';

            const urlField = item.url
                ? `<div class="item-detail-row">
                    <label>URL Address</label>
                    <div class="item-detail-value-wrapper">
                        <span class="item-detail-value"><a href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(item.url)}</a></span>
                        <div class="item-detail-actions">
                            <button class="btn-card-copy" onclick="copyTextDirect('${escapeHtml(item.url)}')" title="Copy Link">
                                <i class="fa-solid fa-link"></i>
                            </button>
                        </div>
                    </div>
                   </div>`
                : '';

            const notesField = item.notes
                ? `<div class="item-card-notes">${escapeHtml(item.notes)}</div>`
                : '';

            card.innerHTML = `
                <div class="item-card-header">
                    <div class="item-card-header-left">
                        <h3 class="item-card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
                        ${categoryTag}
                    </div>
                    <button class="item-card-fav-btn ${starClass}" onclick="toggleFavorite(${item.id}, ${item.is_favorite === 1})" title="Toggle Pinned Favorite">
                        <i class="${starIcon}"></i>
                    </button>
                </div>
                
                <div class="item-card-details">
                    ${usernameField}
                    
                    <div class="item-detail-row">
                        <label>Secret Value</label>
                        <div class="item-detail-value-wrapper">
                            <span class="item-detail-value masked" id="secret-val-${item.id}">•••••••••••••••</span>
                            <div class="item-detail-actions">
                                <button class="btn-card-toggle" onclick="toggleSecretMask(${item.id}, '${escapeHtml(item.secret_value)}')" id="btn-mask-toggle-${item.id}" title="Show / Mask Secret">
                                    <i class="fa-solid fa-eye-slash"></i>
                                </button>
                                <button class="btn-card-copy" onclick="copyTextDirect('${escapeHtml(item.secret_value)}')" title="Copy Secret">
                                    <i class="fa-solid fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    ${urlField}
                    ${notesField}
                </div>

                <div class="item-card-tags">
                    ${tagBadges}
                </div>

                <div class="item-card-footer">
                    <span class="time">Updated: ${formatRelativeTime(item.updated_at)}</span>
                    <div class="item-card-actions">
                        <button class="btn-card-action edit" onclick="editItem(${item.id})" title="Edit Credentials">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn-card-action delete" onclick="deleteItem(${item.id})" title="Delete Credentials">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (err) {
        grid.innerHTML = '<div class="empty-state-small error">Error loaded vault items. Check server status.</div>';
    }
}

// Toggle Secret Visibility Mask
function toggleSecretMask(id, secret) {
    const textEl = document.getElementById(`secret-val-${id}`);
    const btnIcon = document.querySelector(`#btn-mask-toggle-${id} i`);
    
    const isMasked = textEl.classList.contains('masked');
    if (isMasked) {
        textEl.textContent = secret;
        textEl.classList.remove('masked');
        btnIcon.className = 'fa-solid fa-eye';
    } else {
        textEl.textContent = '•••••••••••••••';
        textEl.classList.add('masked');
        btnIcon.className = 'fa-solid fa-eye-slash';
    }
}

// Toggle Favorite Status call
async function toggleFavorite(id, currentStatus) {
    try {
        const response = await fetch(`${API_BASE}/items/${id}/favorite`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_favorite: !currentStatus })
        });
        if (!response.ok) throw new Error('Favorite toggle failed');
        
        loadVaultItems();
        showToast(currentStatus ? 'Removed from favorites' : 'Added to favorites', 'success');
    } catch (err) {
        showToast('Error toggling favorite.', 'error');
    }
}

// Delete Item endpoint integration
async function deleteItem(id) {
    if (!confirm('Are you sure you want to permanently delete this item from the vault database?')) return;
    try {
        const response = await fetch(`${API_BASE}/items/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Delete request failed');
        
        loadVaultItems();
        showToast('Item deleted successfully', 'success');
    } catch (err) {
        showToast('Error deleting item.', 'error');
    }
}

// Open Item Form Modal (Add mode)
function openItemModal() {
    const modal = document.getElementById('modal-item');
    const form = document.getElementById('form-item');
    form.reset();

    // Populate category choices
    const select = document.getElementById('item-category');
    select.innerHTML = '<option value="">No Category</option>';
    state.categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        select.appendChild(opt);
    });

    document.getElementById('item-id').value = '';
    document.getElementById('item-modal-title').textContent = 'Add Vault Item';
    document.getElementById('item-secret').setAttribute('type', 'password');
    document.querySelector('#btn-modal-toggle-secret i').className = 'fa-solid fa-eye-slash';
    updatePasswordStrengthMeter('');
    
    modal.classList.add('active');
}

// Populate and Open Item Form Modal (Edit mode)
async function editItem(id) {
    openItemModal();
    try {
        const res = await fetch(`${API_BASE}/items/${id}`);
        if (!res.ok) throw new Error('Failed to retrieve item details');
        const item = await res.json();

        document.getElementById('item-id').value = item.id;
        document.getElementById('item-modal-title').textContent = 'Edit Vault Item';
        document.getElementById('item-title').value = item.title;
        document.getElementById('item-category').value = item.category_id || '';
        document.getElementById('item-username').value = item.username || '';
        document.getElementById('item-secret').value = item.secret_value;
        document.getElementById('item-url').value = item.url || '';
        document.getElementById('item-notes').value = item.notes || '';
        
        // Tags extraction
        const tagNames = item.tags.map(t => t.name).join(', ');
        document.getElementById('item-tags').value = tagNames;

        updatePasswordStrengthMeter(item.secret_value);

    } catch (err) {
        showToast('Error loading item details', 'error');
        closeAllModals();
    }
}

// Handles create/edit submissions for items
async function handleItemSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('item-id').value;
    
    const tagString = document.getElementById('item-tags').value;
    const tagsArray = tagString.split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

    const payload = {
        title: document.getElementById('item-title').value.trim(),
        category_id: document.getElementById('item-category').value || null,
        username: document.getElementById('item-username').value.trim(),
        secret_value: document.getElementById('item-secret').value,
        url: document.getElementById('item-url').value.trim(),
        notes: document.getElementById('item-notes').value.trim(),
        tags: tagsArray
    };

    const isEdit = id !== '';
    const endpoint = isEdit ? `${API_BASE}/items/${id}` : `${API_BASE}/items`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Server rejected request');
        }

        closeAllModals();
        loadVaultItems();
        showToast(isEdit ? 'Vault credentials updated.' : 'Vault credentials saved.', 'success');
    } catch (err) {
        showToast(`Save failed: ${err.message}`, 'error');
    }
}

// ==========================================================================
// Category CRUD Feature Logic
// ==========================================================================
async function loadCategoriesGrid() {
    const grid = document.getElementById('categories-grid');
    grid.innerHTML = '<div class="empty-state-small">Loading categories...</div>';

    try {
        const response = await fetch(`${API_BASE}/categories`);
        if (!response.ok) throw new Error('Error getting categories');
        const categories = await response.json();
        state.categories = categories;

        grid.innerHTML = '';
        if (categories.length === 0) {
            grid.innerHTML = '<div class="empty-state-small">No categories found. Click "New Category" to begin segmentation.</div>';
            return;
        }

        categories.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.innerHTML = `
                <div class="category-card-glow" style="background-color: ${cat.color}"></div>
                <div class="category-card-icon" style="background-color: ${cat.color}">
                    <i class="fa-solid fa-${cat.icon || 'folder'}"></i>
                </div>
                <h3>${escapeHtml(cat.name)}</h3>
                <span class="count">${cat.item_count} items assigned</span>
                
                <div class="category-card-footer">
                    <button class="btn btn-secondary btn-icon" onclick="editCategory(${cat.id})" style="padding: 0; width: 34px; height: 34px;" title="Edit Name/Color">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn btn-danger btn-icon" onclick="deleteCategory(${cat.id})" style="padding: 0; width: 34px; height: 34px;" title="Delete Category">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (err) {
        grid.innerHTML = '<div class="empty-state-small error">Failed to load relational categories.</div>';
    }
}

function openCategoryModal() {
    const modal = document.getElementById('modal-category');
    const form = document.getElementById('form-category');
    form.reset();

    document.getElementById('category-id').value = '';
    document.getElementById('category-modal-title').textContent = 'Create Category';
    
    // Choose default first icon radio option
    const firstIconRadio = form.querySelector('input[name="category-icon"]');
    if (firstIconRadio) firstIconRadio.checked = true;

    modal.classList.add('active');
}

function editCategory(id) {
    const cat = state.categories.find(c => c.id === id);
    if (!cat) return;

    openCategoryModal();
    document.getElementById('category-id').value = cat.id;
    document.getElementById('category-modal-title').textContent = 'Edit Category';
    document.getElementById('category-name').value = cat.name;
    document.getElementById('category-color').value = cat.color;

    // Check correct radio option
    const radio = document.querySelector(`input[name="category-icon"][value="${cat.icon}"]`);
    if (radio) radio.checked = true;
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    const id = document.getElementById('category-id').value;
    const isEdit = id !== '';

    const payload = {
        name: document.getElementById('category-name').value.trim(),
        color: document.getElementById('category-color').value,
        icon: document.querySelector('input[name="category-icon"]:checked').value
    };

    const endpoint = isEdit ? `${API_BASE}/categories/${id}` : `${API_BASE}/categories`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Server rejected validation');
        }

        closeAllModals();
        loadCategoriesGrid();
        showToast(isEdit ? 'Category updated.' : 'Category created.', 'success');
    } catch (err) {
        showToast(`Save failed: ${err.message}`, 'error');
    }
}

async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category? Relational items will remain but lose their category tag.')) return;
    try {
        const response = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Delete category request failed');

        loadCategoriesGrid();
        showToast('Category deleted successfully.', 'success');
    } catch (err) {
        showToast('Error deleting category.', 'error');
    }
}

// ==========================================================================
// SQL Command Console Execution Logic
// ==========================================================================
async function executeConsoleQuery() {
    const queryStr = document.getElementById('sql-editor').value.trim();
    const statusEl = document.getElementById('console-status');
    const container = document.getElementById('results-container');
    const countEl = document.getElementById('results-count');

    if (!queryStr) {
        showToast('Please type a SQL command first.', 'warning');
        return;
    }

    statusEl.className = 'console-status-bar';
    statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running query against sqlite database...';
    container.innerHTML = '';
    countEl.textContent = '0 rows';

    const unsafeChecked = document.getElementById('console-unsafe-mode').checked;

    try {
        const response = await fetch(`${API_BASE}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sql: queryStr,
                unsafe: unsafeChecked
            })
        });

        const result = await response.json();

        if (!response.ok) {
            statusEl.className = 'console-status-bar error';
            statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <strong>SQLite Error:</strong> ${escapeHtml(result.error || 'Query failed')}`;
            container.innerHTML = `
                <div class="empty-table-state" style="color: var(--danger)">
                    <i class="fa-solid fa-circle-xmark"></i>
                    <p>Execution failed. Check SQL syntax or toggle Admin/Unsafe Write mode if performing modifications.</p>
                </div>`;
            return;
        }

        // Render Results Table
        statusEl.className = 'console-status-bar success';
        statusEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Query executed successfully. Action modified/returned <strong>${result.rowsCount}</strong> rows.`;
        countEl.textContent = `${result.rowsCount} rows`;

        if (result.rowsCount === 0 || !result.data || result.data.length === 0) {
            container.innerHTML = `
                <div class="empty-table-state">
                    <i class="fa-solid fa-circle-info"></i>
                    <p>Query returned 0 records or executed a modifying action without result sets.</p>
                </div>`;
            return;
        }

        // Generate data table dynamically
        const columns = Object.keys(result.data[0]);
        const table = document.createElement('table');
        table.className = 'data-table';

        // Headers
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');
        result.data.forEach(row => {
            const tr = document.createElement('tr');
            columns.forEach(col => {
                const td = document.createElement('td');
                const val = row[col];
                
                // Mask secret values inside tables for visual protection unless revealed
                if (col.toLowerCase() === 'secret_value') {
                    td.innerHTML = '<span class="text-muted" style="letter-spacing:0.2em">••••••••</span>';
                    td.title = "Secret masked for safety";
                } else {
                    td.textContent = val === null ? 'NULL' : val;
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        container.appendChild(table);

    } catch (err) {
        statusEl.className = 'console-status-bar error';
        statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Network connection error executing query.`;
    }
}

// ==========================================================================
// Helper Utility Libraries
// ==========================================================================

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

// Password Strength Meter updater
function updatePasswordStrengthMeter(password) {
    const indicator = document.getElementById('modal-strength-indicator');
    const barFill = indicator.querySelector('.fill');
    const textSpan = indicator.querySelector('.text');

    if (!password) {
        barFill.style.width = '0';
        barFill.style.backgroundColor = 'transparent';
        textSpan.textContent = 'Strength: None';
        return;
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 14) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    let level = 'Weak';
    let width = '33%';
    let color = 'var(--danger)';

    if (score > 2 && score <= 4) {
        level = 'Medium';
        width = '66%';
        color = 'var(--warning)';
    } else if (score > 4) {
        level = 'Strong';
        width = '100%';
        color = 'var(--success)';
    }

    barFill.style.width = width;
    barFill.style.backgroundColor = color;
    textSpan.textContent = `Strength: ${level}`;
    textSpan.style.color = color;
}

// Floating Toast Alert creation
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-xmark';
    if (type === 'info') icon = 'fa-circle-info';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    // Auto remove toast
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Clipboard copying utility
function copyTextDirect(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(err => {
        showToast('Copy failed. Enable clipboard permissions.', 'error');
    });
}

// Random strong password generator
function generateStrongPassword(length = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
    let password = '';
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        password += chars[array[i] % chars.length];
    }
    return password;
}

// Format Relative Timestamp helper
function formatRelativeTime(dateString) {
    try {
        const date = new Date(dateString.replace(' ', 'T') + 'Z'); // Normalize sqlite date format to ISO UTC
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
        return dateString;
    }
}

// HTML Escaping sanitizer
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Theme management helper functions
function toggleTheme() {
    const body = document.body;
    const isLight = body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    updateThemeUI(isLight);
}

function updateThemeUI(isLight) {
    const icon = document.getElementById('theme-toggle-icon');
    const text = document.getElementById('theme-toggle-text');
    if (!icon || !text) return;
    
    if (isLight) {
        icon.className = 'fa-solid fa-sun';
        text.textContent = 'Light Theme';
    } else {
        icon.className = 'fa-solid fa-moon';
        text.textContent = 'Dark Theme';
    }
}

function checkThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const isLight = savedTheme === 'light' || (!savedTheme && systemPrefersLight);
    
    document.body.classList.toggle('light-theme', isLight);
    updateThemeUI(isLight);
}
