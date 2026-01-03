// State
let tabGroups = [];
let currentView = 'all';
let settings = {
    themeMode: 'system',
    language: 'en',
    closeAfterSave: true,
    includePinned: false,
    autoSave: false,
    autoSaveInterval: 30
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadTabGroups();
    cleanupTrash();
    applyTheme();
    applyLanguage();
    renderView();
    setupEventListeners();
    syncSettingsUI();
});

// Storage
async function loadSettings() {
    const stored = await chrome.storage.local.get('settings');
    if (stored.settings) settings = { ...settings, ...stored.settings };
}

async function saveSettings() {
    await chrome.storage.local.set({ settings });
}

async function loadTabGroups() {
    const stored = await chrome.storage.local.get('tabGroups');
    tabGroups = stored.tabGroups || [];
}

async function saveTabGroups() {
    await chrome.storage.local.set({ tabGroups });
}

// UI Sync & Visibility Control
function toggleAutoSave(visible) {
    const row = document.getElementById('autoSaveIntervalRow');
    if (row) {
        if (visible) {
            row.classList.remove('d-none');
        } else {
            row.classList.add('d-none');
        }
    }
}

function syncSettingsUI() {
    const el = (id) => document.getElementById(id);
    
    if (el('settingCloseAfterSave')) el('settingCloseAfterSave').checked = settings.closeAfterSave;
    if (el('settingIncludePinned')) el('settingIncludePinned').checked = settings.includePinned;
    if (el('settingAutoSave')) el('settingAutoSave').checked = settings.autoSave;
    if (el('settingAutoSaveInterval')) el('settingAutoSaveInterval').value = settings.autoSaveInterval;
    if (el('settingThemeMode')) el('settingThemeMode').value = settings.themeMode;
    if (el('settingLanguage')) el('settingLanguage').value = settings.language;

    toggleAutoSave(settings.autoSave);
}

function applyTheme() {
    const isDark = settings.themeMode === 'dark' || (settings.themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.body.classList.toggle('light-theme', !isDark);
}

function applyLanguage() {
    setLanguage(settings.language);
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });

    const intervalSelect = document.getElementById('settingAutoSaveInterval');
    if (intervalSelect) {
        Array.from(intervalSelect.options).forEach(opt => {
            const v = parseInt(opt.value);
            opt.text = v < 60 ? `${v} ${t('min')}` : `${v/60} ${t(v/60 === 1 ? 'hour' : 'hours')}`;
        });
    }
}

// Events
function setupEventListeners() {
    const el = (id) => document.getElementById(id);

    // Nav
    document.querySelectorAll('.floating-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.floating-nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentView = item.dataset.view;
            renderView();
        });
    });

    // Actions
    if (el('saveAllBtn')) el('saveAllBtn').addEventListener('click', saveAllTabs);
    if (el('searchInput')) el('searchInput').addEventListener('input', handleSearch);
    if (el('exportBtn')) el('exportBtn').addEventListener('click', exportData);
    if (el('importBtn')) el('importBtn').addEventListener('click', () => el('importFile').click());
    if (el('importFile')) el('importFile').addEventListener('change', importData);
    if (el('clearAllBtn')) el('clearAllBtn').addEventListener('click', clearAllData);
    if (el('scanDuplicatesBtn')) el('scanDuplicatesBtn').addEventListener('click', scanDuplicates);

    // Settings
    const bind = (id, key, callback) => {
        const item = el(id);
        if (!item) return;
        item.addEventListener('change', (e) => {
            settings[key] = item.type === 'checkbox' ? item.checked : item.value;
            saveSettings();
            if (callback) callback(e);
        });
    };

    bind('settingCloseAfterSave', 'closeAfterSave');
    bind('settingIncludePinned', 'includePinned');
    bind('settingThemeMode', 'themeMode', applyTheme);
    bind('settingLanguage', 'language', () => { applyLanguage(); renderView(); });
    bind('settingAutoSaveInterval', 'autoSaveInterval');
    
    // Explicit Event for Auto Save Toggle
    const autoSaveToggle = el('settingAutoSave');
    if (autoSaveToggle) {
        autoSaveToggle.addEventListener('change', (e) => {
            settings.autoSave = e.target.checked;
            saveSettings();
            toggleAutoSave(e.target.checked);
        });
    }
}

// Render & Logic
function renderView() {
    const grid = document.getElementById('groupsGrid');
    const empty = document.getElementById('emptyState');
    const sv = document.getElementById('settingsView');

    grid.style.display = 'none';
    empty.style.display = 'none';
    sv.style.display = 'none';

    if (currentView === 'settings') { sv.style.display = 'block'; return; }

    let groups = tabGroups.filter(g => {
        if (currentView === 'trash') return !!g.deletedAt;
        if (currentView === 'favorites') return g.favorite && !g.deletedAt;
        return !g.deletedAt;
    });

    if (groups.length === 0) {
        empty.style.display = 'flex';
        updateEmptyState(currentView);
    } else {
        grid.style.display = 'grid';
        grid.innerHTML = '';
        
        // Add empty trash button if in trash view
        if (currentView === 'trash') {
            const emptyTrashBar = document.createElement('div');
            emptyTrashBar.className = 'trash-actions-bar';
            emptyTrashBar.innerHTML = `
                <span class="trash-count">${groups.length} ${t('groups')}</span>
                <button class="empty-trash-btn" id="emptyTrashBtn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    </svg>
                    <span data-i18n="emptyTrash">${t('emptyTrash')}</span>
                </button>
            `;
            grid.appendChild(emptyTrashBar);
            
            emptyTrashBar.querySelector('#emptyTrashBtn').onclick = async () => {
                if (confirm(t('confirmEmptyTrash'))) {
                    tabGroups = tabGroups.filter(g => !g.deletedAt);
                    await saveTabGroups();
                    renderView();
                }
            };
        }
        
        groups.forEach(g => grid.appendChild(createGroupCard(g)));
    }
}

function updateEmptyState(view) {
    const icon = document.getElementById('emptyIcon');
    const title = document.getElementById('emptyTitle');
    const desc = document.getElementById('emptyDesc');
    
    const states = {
        all: {
            icon: `<div class="empty-icon-box">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="3" opacity="0.3"/>
                    <path d="M12 8v8M8 12h8" stroke-linecap="round"/>
                </svg>
            </div>`,
            title: t('noTabsYet'),
            desc: t('noTabsDescription')
        },
        favorites: {
            icon: `<div class="empty-icon-star">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="var(--accent)" opacity="0.15"/>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
            </div>`,
            title: t('noFavorites'),
            desc: t('noFavoritesDesc')
        },
        trash: {
            icon: `<div class="empty-icon-trash">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" opacity="0.5"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6" stroke-linecap="round" opacity="0.5"/>
                </svg>
                <div class="empty-check">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5">
                        <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>`,
            title: t('trashEmpty'),
            desc: t('trashEmptyDesc')
        }
    };
    
    const state = states[view] || states.all;
    icon.innerHTML = state.icon;
    title.textContent = state.title;
    desc.textContent = state.desc;
}

function createGroupCard(group) {
    const card = document.createElement('div');
    card.className = 'group-card';
    card.dataset.groupId = group.id;
    const isTrash = !!group.deletedAt;
    
    const getFaviconUrl = (url) => {
        try {
            const u = new URL(url);
            return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
        } catch { return null; }
    };
    
    card.innerHTML = `
        <div class="group-header">
            <div class="group-info">
                <div class="group-count">${group.tabs.length}</div>
                <div class="group-meta">
                    <h4>${new Date(group.createdAt).toLocaleDateString()}</h4>
                    <span>${group.tabs.length} ${t('tabsCount')}</span>
                </div>
            </div>
            <div class="group-actions">
                ${!isTrash ? `
                    <button class="action-btn fav ${group.favorite ? 'active' : ''}"><svg width="14" height="14" viewBox="0 0 24 24" fill="${group.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg></button>
                    <button class="action-btn open"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,3 21,3 21,9"/><path d="M21 3l-7 7"/><path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5"/></svg></button>
                    <button class="action-btn danger del"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
                ` : `
                    <button class="action-btn restore" title="Restore"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                    <button class="action-btn danger kill" title="Delete Permanently"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>
                `}
            </div>
        </div>
        <div class="tab-list" data-group-id="${group.id}">${group.tabs.map((tab, idx) => `
            <div class="tab-item" draggable="${!isTrash}" data-tab-index="${idx}" data-url="${tab.url}">
                <img class="tab-favicon" src="${getFaviconUrl(tab.url)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
                <div class="tab-favicon-placeholder" style="display:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></div>
                <div class="tab-title">${tab.title}</div>
                <button class="tab-delete ${isTrash ? 'permanent' : ''}" data-tab-index="${idx}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
        `).join('')}</div>
    `;

    // Setup delete for individual tabs
    card.querySelectorAll('.tab-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.tabIndex);
            
            if (!isTrash) {
                // Moving tab to trash
                const deletedTab = group.tabs.splice(idx, 1)[0];
                
                // Find existing trash group from same source group, or create new one
                let trashGroup = tabGroups.find(g => g.deletedAt && g.sourceGroupId === group.id);
                
                if (trashGroup) {
                    // Add to existing trash group
                    trashGroup.tabs.push(deletedTab);
                } else {
                    // Create new trash group
                    trashGroup = {
                        id: 'trash-' + Date.now().toString(),
                        sourceGroupId: group.id,
                        createdAt: new Date().toISOString(),
                        deletedAt: new Date().toISOString(),
                        tabs: [deletedTab]
                    };
                    tabGroups.push(trashGroup);
                }
                
                if (group.tabs.length === 0) {
                    tabGroups = tabGroups.filter(g => g.id !== group.id);
                }
            } else {
                // Permanent delete from trash
                group.tabs.splice(idx, 1);
                if (group.tabs.length === 0) {
                    tabGroups = tabGroups.filter(g => g.id !== group.id);
                }
            }
            
            await saveTabGroups();
            renderView();
        });
    });

    // Setup drag & drop for tabs
    if (!isTrash) {
        const tabItems = card.querySelectorAll('.tab-item');
        tabItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    sourceGroupId: group.id,
                    tabIndex: parseInt(item.dataset.tabIndex),
                    tab: group.tabs[parseInt(item.dataset.tabIndex)]
                }));
                item.classList.add('dragging');
                setTimeout(() => item.style.display = 'none', 0);
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                item.style.display = '';
            });
            
            // Drag over individual items for reordering
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const dragging = document.querySelector('.tab-item.dragging');
                if (dragging && dragging !== item) {
                    card.querySelectorAll('.tab-item').forEach(i => i.classList.remove('drag-over-item'));
                    item.classList.add('drag-over-item');
                }
            });
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over-item');
            });
            item.addEventListener('drop', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                item.classList.remove('drag-over-item');
                card.querySelector('.tab-list').classList.remove('drag-over');
                
                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    const targetIndex = parseInt(item.dataset.tabIndex);
                    
                    if (data.sourceGroupId === group.id) {
                        // Reorder within same group
                        const [movedTab] = group.tabs.splice(data.tabIndex, 1);
                        const newIndex = data.tabIndex < targetIndex ? targetIndex : targetIndex;
                        group.tabs.splice(newIndex, 0, movedTab);
                    } else {
                        // Move to this group at specific position
                        group.tabs.splice(targetIndex, 0, data.tab);
                        
                        // Remove from source
                        const sourceGroup = tabGroups.find(g => g.id === data.sourceGroupId);
                        if (sourceGroup) {
                            sourceGroup.tabs.splice(data.tabIndex, 1);
                            if (sourceGroup.tabs.length === 0) {
                                tabGroups = tabGroups.filter(g => g.id !== sourceGroup.id);
                            }
                        }
                    }
                    
                    await saveTabGroups();
                    renderView();
                } catch {}
            });
        });
        
        const tabList = card.querySelector('.tab-list');
        tabList.addEventListener('dragover', (e) => {
            e.preventDefault();
            tabList.classList.add('drag-over');
        });
        tabList.addEventListener('dragleave', (e) => {
            if (!tabList.contains(e.relatedTarget)) {
                tabList.classList.remove('drag-over');
            }
        });
        tabList.addEventListener('drop', async (e) => {
            e.preventDefault();
            tabList.classList.remove('drag-over');
            card.querySelectorAll('.tab-item').forEach(i => i.classList.remove('drag-over-item'));
            
            // Only handle if dropped on list itself (not on an item)
            if (e.target.classList.contains('tab-list')) {
                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    if (data.sourceGroupId === group.id) return;
                    
                    // Add tab to end of this group
                    group.tabs.push(data.tab);
                    
                    // Remove tab from source group
                    const sourceGroup = tabGroups.find(g => g.id === data.sourceGroupId);
                    if (sourceGroup) {
                        sourceGroup.tabs.splice(data.tabIndex, 1);
                        if (sourceGroup.tabs.length === 0) {
                            tabGroups = tabGroups.filter(g => g.id !== sourceGroup.id);
                        }
                    }
                    
                    await saveTabGroups();
                    renderView();
                } catch {}
            }
        });
    }

    if (!isTrash) {
        const favBtn = card.querySelector('.fav');
        const openBtn = card.querySelector('.open');
        const delBtn = card.querySelector('.del');
        
        if (favBtn) favBtn.onclick = async () => { group.favorite = !group.favorite; await saveTabGroups(); renderView(); };
        if (openBtn) openBtn.onclick = () => { group.tabs.forEach(tab => chrome.tabs.create({ url: tab.url })); };
        if (delBtn) delBtn.onclick = async () => { group.deletedAt = new Date().toISOString(); await saveTabGroups(); renderView(); };
    } else {
        const restoreBtn = card.querySelector('.restore');
        const killBtn = card.querySelector('.kill');
        
        if (restoreBtn) restoreBtn.onclick = async () => { delete group.deletedAt; delete group.sourceGroupId; await saveTabGroups(); renderView(); };
        if (killBtn) killBtn.onclick = async () => { if(confirm(t('confirmPermanentDelete'))) { tabGroups = tabGroups.filter(g => g.id !== group.id); await saveTabGroups(); renderView(); } };
    }
    return card;
}

async function saveAllTabs() {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const filtered = tabs.filter(t => !t.url.startsWith('chrome') && (settings.includePinned || !t.pinned));
    if (filtered.length === 0) return;
    const group = { id: Date.now().toString(), createdAt: new Date().toISOString(), tabs: filtered.map(t => ({ title: t.title, url: t.url })) };
    tabGroups.unshift(group);
    await saveTabGroups();
    if (settings.closeAfterSave) { await chrome.tabs.create({}); chrome.tabs.remove(filtered.map(t => t.id)); }
    renderView();
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.group-card');
    
    cards.forEach(card => {
        const tabs = card.querySelectorAll('.tab-item');
        let hasMatch = false;
        
        tabs.forEach(tab => {
            const title = tab.querySelector('.tab-title')?.textContent.toLowerCase() || '';
            const url = (tab.dataset.url || '').toLowerCase();
            
            if (title.includes(query) || url.includes(query)) {
                hasMatch = true;
            }
        });
        
        card.style.display = hasMatch || query === '' ? '' : 'none';
    });
}

function scanDuplicates() {
    // Placeholder for future implementation
    showToast('Coming soon');
}

function exportData() {
    const data = JSON.stringify(tabGroups, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stash-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('export') + ' ✓');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (Array.isArray(imported)) {
                tabGroups = [...imported, ...tabGroups];
                await saveTabGroups();
                renderView();
                showToast(t('import') + ' ✓');
            }
        } catch {
            showToast(t('errorOccurred'));
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}
function clearAllData() { if(confirm(t('confirmClearAll'))) { tabGroups = []; saveTabGroups(); renderView(); } }
function cleanupTrash() { const limit = Date.now() - 30*24*60*60*1000; tabGroups = tabGroups.filter(g => !g.deletedAt || new Date(g.deletedAt) > limit); saveTabGroups(); }
function showToast(m) { const t = document.getElementById('toast'); t.querySelector('span').textContent = m; t.classList.add('active'); setTimeout(() => t.classList.remove('active'), 3000); }
