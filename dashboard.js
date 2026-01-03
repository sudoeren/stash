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
    } else {
        grid.style.display = 'grid';
        grid.innerHTML = '';
        groups.forEach(g => grid.appendChild(createGroupCard(g)));
    }
}

function createGroupCard(group) {
    const card = document.createElement('div');
    card.className = 'group-card';
    const isTrash = !!group.deletedAt;
    
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
        <div class="tab-list">${group.tabs.map(t => `<div class="tab-item"><div class="tab-title">${t.title}</div></div>`).join('')}</div>
    `;

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
