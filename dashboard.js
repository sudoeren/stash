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
        groups.forEach(g => grid.appendChild(createGroupCard(g)));
    }
}

function updateEmptyState(view) {
    const icon = document.getElementById('emptyIcon');
    const title = document.getElementById('emptyTitle');
    const desc = document.getElementById('emptyDesc');
    
    const states = {
        all: {
            icon: `<svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 10C3 8.34315 4.34315 7 6 7H9C9.55228 7 10 7.44772 10 8V9.5C10 10.3284 10.6716 11 11.5 11H12.5C13.3284 11 14 10.3284 14 9.5V8C14 7.44772 14.4477 7 15 7H18C19.6569 7 21 8.34315 21 10V18C21 19.1046 19.6569 20 18 20H6C4.34315 20 3 18.6569 3 17V10Z" fill="currentColor" opacity="0.3" />
                <rect x="10.5" y="4.5" width="3" height="6" rx="1.5" fill="var(--accent)" opacity="0.6" />
                <path d="M12 14v2M12 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
            </svg>`,
            title: t('noTabsYet'),
            desc: t('noTabsDescription')
        },
        favorites: {
            icon: `<svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="var(--accent)" opacity="0.2" stroke="var(--accent)" stroke-width="1.5" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" fill="var(--accent)" opacity="0.4"/>
            </svg>`,
            title: t('noFavorites'),
            desc: t('noFavoritesDesc')
        },
        trash: {
            icon: `<svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
                <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
                <rect x="4" y="4" width="16" height="3" rx="1" fill="currentColor" opacity="0.2"/>
                <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
                <circle cx="12" cy="14" r="6" stroke="var(--success)" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.4"/>
                <path d="M9.5 14l1.5 1.5 3-3" stroke="var(--success)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
            </svg>`,
            title: t('trashEmpty'),
            desc: t('trashEmptyDesc') || t('noTabsDescription')
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
                    <button class="action-btn restore">Restore</button>
                    <button class="action-btn danger kill">Permanent</button>
                `}
            </div>
        </div>
        <div class="tab-list" data-group-id="${group.id}">${group.tabs.map((tab, idx) => `
            <div class="tab-item" draggable="true" data-tab-index="${idx}" data-url="${tab.url}">
                <img class="tab-favicon" src="${getFaviconUrl(tab.url)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
                <div class="tab-favicon-placeholder" style="display:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></div>
                <div class="tab-title">${tab.title}</div>
            </div>
        `).join('')}</div>
    `;

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
        card.querySelector('.fav').onclick = () => { group.favorite = !group.favorite; saveTabGroups(); renderView(); };
        card.querySelector('.open').onclick = () => { group.tabs.forEach(t => chrome.tabs.create({ url: t.url })); };
        card.querySelector('.del').onclick = () => { group.deletedAt = new Date().toISOString(); saveTabGroups(); renderView(); };
    } else {
        card.querySelector('.restore').onclick = () => { delete group.deletedAt; saveTabGroups(); renderView(); };
        card.querySelector('.kill').onclick = () => { if(confirm('Permanent?')) { tabGroups = tabGroups.filter(g => g.id !== group.id); saveTabGroups(); renderView(); } };
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

function handleSearch(e) { /* ... */ }
function scanDuplicates() { /* ... */ }
function exportData() { /* ... */ }
function importData() { /* ... */ }
function clearAllData() { if(confirm(t('confirmClearAll'))) { tabGroups = []; saveTabGroups(); renderView(); } }
function cleanupTrash() { const limit = Date.now() - 30*24*60*60*1000; tabGroups = tabGroups.filter(g => !g.deletedAt || new Date(g.deletedAt) > limit); saveTabGroups(); }
function showToast(m) { const t = document.getElementById('toast'); t.querySelector('span').textContent = m; t.classList.add('active'); setTimeout(() => t.classList.remove('active'), 3000); }
