// ==========================================
// Stash Dashboard - Clean JavaScript
// ==========================================

// State
let tabGroups = [];
let currentView = 'all';
let settings = {
    themeMode: 'system', // 'dark', 'light', 'system'
    language: 'tr',
    closeAfterSave: true,
    includePinned: false
};

// System theme detection
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
systemThemeQuery.addEventListener('change', () => {
    if (settings.themeMode === 'system') {
        applyTheme();
    }
});

// DOM Elements
const elements = {
    // Navigation
    navTabs: document.querySelectorAll('.nav-tab'),

    // Content
    groupsGrid: document.getElementById('groupsGrid'),
    emptyState: document.getElementById('emptyState'),
    settingsView: document.getElementById('settingsView'),

    // Search
    searchInput: document.getElementById('searchInput'),

    // Actions
    saveAllBtn: document.getElementById('saveAllBtn'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    clearAllBtn: document.getElementById('clearAllBtn'),

    // Settings
    settingCloseAfterSave: document.getElementById('settingCloseAfterSave'),
    settingIncludePinned: document.getElementById('settingIncludePinned'),
    settingThemeMode: document.getElementById('settingThemeMode'),
    settingLanguage: document.getElementById('settingLanguage'),

    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),

    // Stats (hidden)
    sidebarGroups: document.getElementById('sidebarGroups'),
    sidebarTabs: document.getElementById('sidebarTabs')
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadSettings();
    await loadTabGroups();
    applyTheme();
    applyLanguage();
    renderView();
    updateStats();
    setupEventListeners();
}

// Storage
async function loadSettings() {
    try {
        const stored = await chrome.storage.local.get('settings');
        if (stored.settings) {
            settings = { ...settings, ...stored.settings };
        }
        syncSettingsUI();
    } catch (e) {
        console.error('Error loading settings:', e);
    }
}

async function saveSettings() {
    try {
        await chrome.storage.local.set({ settings });
    } catch (e) {
        console.error('Error saving settings:', e);
    }
}

async function loadTabGroups() {
    try {
        const stored = await chrome.storage.local.get('tabGroups');
        tabGroups = stored.tabGroups || [];
    } catch (e) {
        console.error('Error loading tab groups:', e);
    }
}

async function saveTabGroups() {
    try {
        await chrome.storage.local.set({ tabGroups });
    } catch (e) {
        console.error('Error saving tab groups:', e);
    }
}

// UI Sync
function syncSettingsUI() {
    if (elements.settingCloseAfterSave) {
        elements.settingCloseAfterSave.checked = settings.closeAfterSave !== false;
    }
    if (elements.settingIncludePinned) {
        elements.settingIncludePinned.checked = settings.includePinned || false;
    }
    if (elements.settingThemeMode) {
        elements.settingThemeMode.value = settings.themeMode || 'system';
    }
    if (elements.settingLanguage) {
        elements.settingLanguage.value = settings.language || 'tr';
    }
}

function applyTheme() {
    let isDark = true;

    if (settings.themeMode === 'light') {
        isDark = false;
    } else if (settings.themeMode === 'system') {
        isDark = systemThemeQuery.matches;
    } else {
        isDark = true; // default to dark
    }

    if (isDark) {
        document.body.classList.remove('light-theme');
    } else {
        document.body.classList.add('light-theme');
    }
}

function applyLanguage() {
    const lang = settings.language || 'tr';
    if (typeof setLanguage === 'function') {
        setLanguage(lang);
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (typeof t === 'function') {
            el.textContent = t(key);
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (typeof t === 'function') {
            el.placeholder = t(key);
        }
    });
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    elements.navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentView = tab.dataset.view;
            renderView();
        });
    });

    // Save All
    if (elements.saveAllBtn) {
        elements.saveAllBtn.addEventListener('click', saveAllTabs);
    }

    // Search
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', handleSearch);
    }

    // Settings toggles
    if (elements.settingCloseAfterSave) {
        elements.settingCloseAfterSave.addEventListener('change', (e) => {
            settings.closeAfterSave = e.target.checked;
            saveSettings();
        });
    }

    if (elements.settingIncludePinned) {
        elements.settingIncludePinned.addEventListener('change', (e) => {
            settings.includePinned = e.target.checked;
            saveSettings();
        });
    }

    if (elements.settingThemeMode) {
        elements.settingThemeMode.addEventListener('change', (e) => {
            settings.themeMode = e.target.value;
            saveSettings();
            applyTheme();
        });
    }

    if (elements.settingLanguage) {
        elements.settingLanguage.addEventListener('change', (e) => {
            settings.language = e.target.value;
            saveSettings();
            applyLanguage();
            renderView();
        });
    }

    // Export/Import
    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', exportData);
    }

    if (elements.importBtn) {
        elements.importBtn.addEventListener('click', () => elements.importFile.click());
    }

    if (elements.importFile) {
        elements.importFile.addEventListener('change', importData);
    }

    if (elements.clearAllBtn) {
        elements.clearAllBtn.addEventListener('click', clearAllData);
    }
}

// Render
function renderView() {
    const groupsGrid = elements.groupsGrid;
    const emptyState = elements.emptyState;
    const settingsView = elements.settingsView;

    // Reset visibility
    if (groupsGrid) groupsGrid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (settingsView) settingsView.style.display = 'none';

    if (currentView === 'settings') {
        if (settingsView) settingsView.style.display = 'block';
        return;
    }

    // Filter groups
    let groups = [...tabGroups];

    if (currentView === 'favorites') {
        groups = groups.filter(g => g.favorite);
    }

    // Render
    if (groups.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
    } else {
        if (groupsGrid) {
            groupsGrid.style.display = 'grid';
            groupsGrid.innerHTML = '';
            groups.forEach(group => {
                const card = createGroupCard(group);
                groupsGrid.appendChild(card);
            });
        }
    }
}

function createGroupCard(group) {
    const card = document.createElement('div');
    card.className = 'group-card';
    card.dataset.groupId = group.id;

    const date = formatDate(new Date(group.createdAt));

    card.innerHTML = `
        <div class="group-header">
            <div class="group-info">
                <div class="group-count">${group.tabs.length}</div>
                <div class="group-meta">
                    <h4>${date}</h4>
                    <span>${group.tabs.length} sekme</span>
                </div>
            </div>
            <div class="group-actions">
                <button class="action-btn favorite ${group.favorite ? 'active' : ''}" title="Favori">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="${group.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                    </svg>
                </button>
                <button class="action-btn restore" title="Tümünü Aç">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15,3 21,3 21,9"/>
                        <path d="M21 3l-7 7"/>
                        <path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5"/>
                    </svg>
                </button>
                <button class="action-btn danger delete" title="Sil">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="tab-list">
            ${group.tabs.map(tab => createTabItemHTML(tab)).join('')}
        </div>
    `;

    // Event listeners
    const favoriteBtn = card.querySelector('.favorite');
    const restoreBtn = card.querySelector('.restore');
    const deleteBtn = card.querySelector('.delete');

    favoriteBtn.addEventListener('click', () => toggleFavorite(group.id));
    restoreBtn.addEventListener('click', () => restoreGroup(group.id));
    deleteBtn.addEventListener('click', () => deleteGroup(group.id));

    // Tab events
    card.querySelectorAll('.tab-item').forEach(tabEl => {
        const tabId = tabEl.dataset.tabId;
        const tab = group.tabs.find(t => t.id === tabId);

        tabEl.addEventListener('click', (e) => {
            if (!e.target.closest('.tab-delete')) {
                openTab(tab.url);
            }
        });

        const deleteTabBtn = tabEl.querySelector('.tab-delete');
        if (deleteTabBtn) {
            deleteTabBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTab(group.id, tabId);
            });
        }
    });

    return card;
}

function createTabItemHTML(tab) {
    const faviconHTML = tab.favicon
        ? `<img class="tab-favicon" src="${tab.favicon}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="tab-favicon-placeholder" style="display: none;">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <circle cx="12" cy="12" r="10"/>
             </svg>
           </div>`
        : `<div class="tab-favicon-placeholder">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <circle cx="12" cy="12" r="10"/>
             </svg>
           </div>`;

    const domain = extractDomain(tab.url);

    return `
        <div class="tab-item" data-tab-id="${tab.id}">
            ${faviconHTML}
            <div class="tab-info">
                <div class="tab-title">${escapeHtml(tab.title)}</div>
                <div class="tab-url">${domain}</div>
            </div>
            <button class="tab-delete" title="Sil">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `;
}

// Actions
async function saveAllTabs() {
    try {
        const tabs = await chrome.tabs.query({ currentWindow: true });

        let filteredTabs = tabs.filter(tab => {
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                return false;
            }
            if (!settings.includePinned && tab.pinned) {
                return false;
            }
            return true;
        });

        if (filteredTabs.length === 0) {
            showToast('Kaydedilecek sekme yok');
            return;
        }

        const group = {
            id: generateId(),
            createdAt: new Date().toISOString(),
            favorite: false,
            tags: [],
            tabs: filteredTabs.map(tab => ({
                id: generateId(),
                title: tab.title || 'Başlıksız',
                url: tab.url,
                favicon: tab.favIconUrl || null
            }))
        };

        tabGroups.unshift(group);
        await saveTabGroups();

        if (settings.closeAfterSave) {
            const tabIds = filteredTabs.map(tab => tab.id);
            await chrome.tabs.create({ url: 'chrome://newtab' });
            await chrome.tabs.remove(tabIds);
        }

        renderView();
        updateStats();
        showToast(`${filteredTabs.length} sekme kaydedildi`);

    } catch (error) {
        console.error('Error saving tabs:', error);
        showToast('Bir hata oluştu');
    }
}

async function toggleFavorite(groupId) {
    const group = tabGroups.find(g => g.id === groupId);
    if (group) {
        group.favorite = !group.favorite;
        await saveTabGroups();
        renderView();
    }
}

async function restoreGroup(groupId) {
    const group = tabGroups.find(g => g.id === groupId);
    if (!group) return;

    for (const tab of group.tabs) {
        await chrome.tabs.create({ url: tab.url });
    }

    tabGroups = tabGroups.filter(g => g.id !== groupId);
    await saveTabGroups();

    renderView();
    updateStats();
    showToast(`${group.tabs.length} sekme açıldı`);
}

async function deleteGroup(groupId) {
    tabGroups = tabGroups.filter(g => g.id !== groupId);
    await saveTabGroups();

    renderView();
    updateStats();
    showToast('Grup silindi');
}

async function deleteTab(groupId, tabId) {
    const group = tabGroups.find(g => g.id === groupId);
    if (!group) return;

    group.tabs = group.tabs.filter(t => t.id !== tabId);

    if (group.tabs.length === 0) {
        tabGroups = tabGroups.filter(g => g.id !== groupId);
    }

    await saveTabGroups();
    renderView();
    updateStats();
}

async function openTab(url) {
    await chrome.tabs.create({ url });
}

// Search
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();

    if (!query) {
        renderView();
        return;
    }

    let groups = [...tabGroups];

    if (currentView === 'favorites') {
        groups = groups.filter(g => g.favorite);
    }

    const filtered = groups.filter(group => {
        return group.tabs.some(tab =>
            (tab.title && tab.title.toLowerCase().includes(query)) ||
            (tab.url && tab.url.toLowerCase().includes(query))
        );
    });

    const groupsGrid = elements.groupsGrid;
    const emptyState = elements.emptyState;

    if (filtered.length === 0) {
        if (groupsGrid) groupsGrid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (groupsGrid) {
            groupsGrid.style.display = 'grid';
            groupsGrid.innerHTML = '';
            filtered.forEach(group => {
                const card = createGroupCard(group);
                groupsGrid.appendChild(card);
            });
        }
    }
}

// Export/Import
function exportData() {
    const data = {
        version: '1.1',
        exportedAt: new Date().toISOString(),
        groups: tabGroups
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `stash-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showToast('Veriler dışa aktarıldı');
}

async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.groups || !Array.isArray(data.groups)) {
            throw new Error('Geçersiz format');
        }

        tabGroups = [...data.groups, ...tabGroups];
        await saveTabGroups();

        renderView();
        updateStats();
        showToast(`${data.groups.length} grup içe aktarıldı`);

    } catch (error) {
        console.error('Import error:', error);
        showToast('İçe aktarma başarısız');
    }

    e.target.value = '';
}

async function clearAllData() {
    if (!confirm('Tüm veriler silinecek. Emin misiniz?')) return;

    tabGroups = [];
    await saveTabGroups();

    // Go back to all view
    currentView = 'all';
    elements.navTabs.forEach(t => t.classList.remove('active'));
    const allTab = document.querySelector('.nav-tab[data-view="all"]');
    if (allTab) allTab.classList.add('active');

    renderView();
    updateStats();
    showToast('Tüm veriler silindi');
}

// Stats
function updateStats() {
    const groupCount = tabGroups.length;
    const tabCount = tabGroups.reduce((sum, g) => sum + g.tabs.length, 0);

    if (elements.sidebarGroups) elements.sidebarGroups.textContent = groupCount;
    if (elements.sidebarTabs) elements.sidebarTabs.textContent = tabCount;
}

// Toast
function showToast(message) {
    if (elements.toastMessage) {
        elements.toastMessage.textContent = message;
    }
    if (elements.toast) {
        elements.toast.classList.add('active');
        setTimeout(() => {
            elements.toast.classList.remove('active');
        }, 3000);
    }
}

// Utilities
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dk önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;

    return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function extractDomain(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
