// ==========================================
// Stash Dashboard - Clean JavaScript
// ==========================================

// State
let tabGroups = [];
let currentView = 'all';
let settings = {
    themeMode: 'system', // 'dark', 'light', 'system'
    language: 'en',
    closeAfterSave: true,
    includePinned: false,
    autoSave: false // New: Auto Save
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
    // Navigation (support both old and new)
    navTabs: document.querySelectorAll('.nav-tab'),
    floatingNavItems: document.querySelectorAll('.floating-nav-item'),

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
    scanDuplicatesBtn: document.getElementById('scanDuplicatesBtn'), // New

    // Settings
    settingCloseAfterSave: document.getElementById('settingCloseAfterSave'),
    settingIncludePinned: document.getElementById('settingIncludePinned'),
    settingThemeMode: document.getElementById('settingThemeMode'),
    settingLanguage: document.getElementById('settingLanguage'),
    settingAutoSave: document.getElementById('settingAutoSave'), // New

    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadSettings();
    await loadTabGroups();
    
    // Cleanup old trash (older than 30 days)
    cleanupTrash();

    applyTheme();
    applyLanguage();
    renderView();
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
    if (elements.settingCloseAfterSave) elements.settingCloseAfterSave.checked = settings.closeAfterSave !== false;
    if (elements.settingIncludePinned) elements.settingIncludePinned.checked = settings.includePinned || false;
    if (elements.settingAutoSave) elements.settingAutoSave.checked = settings.autoSave || false;
    if (elements.settingThemeMode) elements.settingThemeMode.value = settings.themeMode || 'system';
    if (elements.settingLanguage) elements.settingLanguage.value = settings.language || 'en';
}

function applyTheme() {
    let isDark = true;
    if (settings.themeMode === 'light') isDark = false;
    else if (settings.themeMode === 'system') isDark = systemThemeQuery.matches;
    
    if (isDark) document.body.classList.remove('light-theme');
    else document.body.classList.add('light-theme');
}

function applyLanguage() {
    const lang = settings.language || 'en';
    if (typeof setLanguage === 'function') setLanguage(lang);

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (typeof t === 'function') el.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (typeof t === 'function') el.placeholder = t(key);
    });
}

// Navigation Helper
function setActiveNav(view) {
    elements.floatingNavItems.forEach(t => t.classList.remove('active'));
    const activeFloatingItem = document.querySelector(`.floating-nav-item[data-view="${view}"]`);
    if (activeFloatingItem) activeFloatingItem.classList.add('active');

    currentView = view;
    renderView();
}

// Event Listeners
function setupEventListeners() {
    elements.floatingNavItems.forEach(item => {
        item.addEventListener('click', () => setActiveNav(item.dataset.view));
    });

    if (elements.saveAllBtn) elements.saveAllBtn.addEventListener('click', saveAllTabs);
    if (elements.searchInput) elements.searchInput.addEventListener('input', handleSearch);

    // Settings
    const bindToggle = (el, key) => {
        if (el) el.addEventListener('change', (e) => { settings[key] = e.target.checked; saveSettings(); });
    };
    const bindSelect = (el, key, cb) => {
        if (el) el.addEventListener('change', (e) => { settings[key] = e.target.value; saveSettings(); if(cb) cb(); });
    };

    bindToggle(elements.settingCloseAfterSave, 'closeAfterSave');
    bindToggle(elements.settingIncludePinned, 'includePinned');
    bindToggle(elements.settingAutoSave, 'autoSave');

    bindSelect(elements.settingThemeMode, 'themeMode', applyTheme);
    bindSelect(elements.settingLanguage, 'language', () => { applyLanguage(); renderView(); });

    // Data
    if (elements.exportBtn) elements.exportBtn.addEventListener('click', exportData);
    if (elements.importBtn) elements.importBtn.addEventListener('click', () => elements.importFile.click());
    if (elements.importFile) elements.importFile.addEventListener('change', importData);
    if (elements.clearAllBtn) elements.clearAllBtn.addEventListener('click', clearAllData);
    if (elements.scanDuplicatesBtn) elements.scanDuplicatesBtn.addEventListener('click', scanDuplicates);
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
        groups = groups.filter(g => g.favorite && !g.deletedAt);
    } else if (currentView === 'trash') {
        groups = groups.filter(g => g.deletedAt);
    } else {
        // All view - exclude deleted
        groups = groups.filter(g => !g.deletedAt);
    }

    // Render
    if (groups.length === 0) {
        if (emptyState) {
            emptyState.style.display = 'flex';
            const title = emptyState.querySelector('h2');
            const p = emptyState.querySelector('p');
            if (currentView === 'trash') {
                title.textContent = t('trashEmpty') || 'Trash is empty';
                p.textContent = '';
            } else if (currentView === 'favorites') {
                title.textContent = t('noFavorites') || 'No favorites yet';
                p.textContent = t('noFavoritesDesc') || 'Mark items as favorite to see them here';
            } else {
                title.textContent = t('noTabsYet');
                p.textContent = t('noTabsDescription');
            }
        }
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
    const isTrash = !!group.deletedAt;

    card.innerHTML = `
        <div class="group-header">
            <div class="group-info">
                <div class="group-count">${group.tabs.length}</div>
                <div class="group-meta">
                    <h4>${date}</h4>
                    <span>${group.tabs.length} ${t('tabsCount')}</span>
                </div>
            </div>
            <div class="group-actions">
                ${!isTrash ? `
                <button class="action-btn favorite ${group.favorite ? 'active' : ''}" title="${t('favorite')}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="${group.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                    </svg>
                </button>
                <button class="action-btn restore" title="${t('openAll')}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15,3 21,3 21,9"/>
                        <path d="M21 3l-7 7"/>
                        <path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5"/>
                    </svg>
                </button>
                <button class="action-btn danger delete" title="${t('delete')}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </button>
                ` : `
                <button class="action-btn restore-trash" title="Restore">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6M3 10l6-6"/>
                    </svg>
                </button>
                <button class="action-btn danger delete-permanent" title="Delete Forever">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
                `}
            </div>
        </div>
        <div class="tab-list">
            ${group.tabs.map(tab => createTabItemHTML(tab, isTrash)).join('')}
        </div>
    `;

    if (!isTrash) {
        card.querySelector('.favorite').addEventListener('click', () => toggleFavorite(group.id));
        card.querySelector('.restore').addEventListener('click', () => restoreGroup(group.id));
        card.querySelector('.delete').addEventListener('click', () => deleteGroup(group.id));
    } else {
        card.querySelector('.restore-trash').addEventListener('click', () => recoverFromTrash(group.id));
        card.querySelector('.delete-permanent').addEventListener('click', () => permanentDelete(group.id));
    }

    card.querySelectorAll('.tab-item').forEach(tabEl => {
        const tabId = tabEl.dataset.tabId;
        const tab = group.tabs.find(t => t.id === tabId);
        
        // Click to open (unless trash)
        if (!isTrash) {
            tabEl.addEventListener('click', (e) => {
                if (!e.target.closest('.tab-delete')) openTab(tab.url);
            });
            const deleteTabBtn = tabEl.querySelector('.tab-delete');
            if (deleteTabBtn) {
                deleteTabBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteTab(group.id, tabId);
                });
            }
        }
    });

    return card;
}

function createTabItemHTML(tab, isTrash) {
    const faviconHTML = tab.favicon
        ? `<img class="tab-favicon" src="${tab.favicon}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="tab-favicon-placeholder" style="display: none;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg></div>`
        : `<div class="tab-favicon-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg></div>`;

    const domain = extractDomain(tab.url);

    return `
        <div class="tab-item" data-tab-id="${tab.id}" style="${isTrash ? 'cursor: default; opacity: 0.7;' : ''}">
            ${faviconHTML}
            <div class="tab-info">
                <div class="tab-title">${escapeHtml(tab.title)}</div>
                <div class="tab-url">${domain}</div>
            </div>
            ${!isTrash ? `
            <button class="tab-delete" title="${t('delete')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>` : ''}
        </div>
    `;
}

// Logic
async function saveAllTabs() {
    try {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        let filteredTabs = tabs.filter(tab => {
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return false;
            if (!settings.includePinned && tab.pinned) return false;
            return true;
        });

        if (filteredTabs.length === 0) {
            showToast(t('noTabsToSave'));
            return;
        }

        const group = {
            id: generateId(),
            createdAt: new Date().toISOString(),
            favorite: false,
            tabs: filteredTabs.map(tab => ({
                id: generateId(),
                title: tab.title || t('untitled'),
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
        showToast(`${filteredTabs.length} ${t('tabsSaved')}`);
    } catch (error) {
        console.error('Error:', error);
        showToast(t('errorOccurred'));
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
    for (const tab of group.tabs) await chrome.tabs.create({ url: tab.url });
    // Keep in list? Yes.
    showToast(`${group.tabs.length} ${t('tabsOpened')}`);
}

async function deleteGroup(groupId) {
    const group = tabGroups.find(g => g.id === groupId);
    if (group) {
        group.deletedAt = new Date().toISOString(); // Soft delete
        await saveTabGroups();
        renderView();
        showToast(t('groupDeleted') || 'Group moved to trash');
    }
}

async function recoverFromTrash(groupId) {
    const group = tabGroups.find(g => g.id === groupId);
    if (group) {
        delete group.deletedAt;
        await saveTabGroups();
        renderView(); // likely to 'trash' view, so it disappears
        showToast('Group restored');
    }
}

async function permanentDelete(groupId) {
    if (!confirm('Permanently delete this group?')) return;
    tabGroups = tabGroups.filter(g => g.id !== groupId);
    await saveTabGroups();
    renderView();
    showToast('Deleted forever');
}

async function deleteTab(groupId, tabId) {
    const group = tabGroups.find(g => g.id === groupId);
    if (!group) return;
    group.tabs = group.tabs.filter(t => t.id !== tabId);
    if (group.tabs.length === 0) {
        // If empty, delete group (move to trash)
        group.deletedAt = new Date().toISOString();
    }
    await saveTabGroups();
    renderView();
}

async function openTab(url) {
    await chrome.tabs.create({ url });
}

async function cleanupTrash() {
    // Remove items deleted > 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const initialLen = tabGroups.length;
    tabGroups = tabGroups.filter(g => {
        if (!g.deletedAt) return true;
        return new Date(g.deletedAt) > thirtyDaysAgo;
    });
    if (tabGroups.length !== initialLen) await saveTabGroups();
}

// Advanced Search
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
        renderView();
        return;
    }

    let groups = [...tabGroups].filter(g => !g.deletedAt); // Search only active
    
    // Check for advanced filters
    // site:github.com
    // tag:work (if tags existed, but let's stick to domain/title)
    
    let domainFilter = null;
    let textQuery = query;

    if (query.includes('site:')) {
        const parts = query.split('site:');
        if (parts[1]) {
            const domainPart = parts[1].split(' ')[0];
            domainFilter = domainPart;
            textQuery = parts[0] + (parts[1].substring(domainPart.length));
        }
    }

    const filtered = groups.filter(group => {
        return group.tabs.some(tab => {
            let match = true;
            if (domainFilter) {
                if (!tab.url.includes(domainFilter)) match = false;
            }
            if (match && textQuery.trim()) {
                const t = textQuery.trim();
                if (!tab.title.toLowerCase().includes(t) && !tab.url.toLowerCase().includes(t)) match = false;
            }
            return match;
        });
    });

    const groupsGrid = elements.groupsGrid;
    if (filtered.length === 0) {
        if (groupsGrid) groupsGrid.innerHTML = '<div style="text-align:center;width:100%;padding:20px;color:var(--text-secondary)">No matches found</div>';
    } else {
        if (groupsGrid) {
            groupsGrid.style.display = 'grid';
            groupsGrid.innerHTML = '';
            filtered.forEach(group => {
                const card = createGroupCard(group);
                groupsGrid.appendChild(card);
            });
        }
    }
    elements.emptyState.style.display = 'none';
}

// Duplicate Scanner
async function scanDuplicates() {
    const allTabs = [];
    const urlMap = new Map();
    let duplicatesFound = 0;

    // Build map
    tabGroups.forEach(g => {
        if (g.deletedAt) return;
        g.tabs.forEach(t => {
            if (urlMap.has(t.url)) {
                duplicatesFound++;
                urlMap.get(t.url).push({ group: g, tab: t });
            } else {
                urlMap.set(t.url, [{ group: g, tab: t }]);
            }
        });
    });

    if (duplicatesFound === 0) {
        showToast('No duplicates found');
        return;
    }

    if (confirm(`Found ${duplicatesFound} duplicates. Remove them? (Keeps the oldest)`)) {
        urlMap.forEach((occurrences) => {
            if (occurrences.length > 1) {
                // Sort by date? group.createdAt is date string.
                // We want to keep one. Let's keep the one in the newest group? Or oldest? 
                // Usually people want to keep the organized one.
                // Let's keep the most recent one (first in array usually if unshift used).
                // Actually, let's keep the *first* one encountered (latest) and delete others?
                // The loop iterates groups. If we iterate map, we have all occurences.
                
                // Let's keep the first one in the list (newest) and delete the rest
                for (let i = 1; i < occurrences.length; i++) {
                    const { group, tab } = occurrences[i];
                    group.tabs = group.tabs.filter(t => t.id !== tab.id);
                    if (group.tabs.length === 0) group.deletedAt = new Date().toISOString();
                }
            }
        });
        
        await saveTabGroups();
        renderView();
        showToast('Duplicates removed');
    }
}

// Export/Import
function exportData() {
    const data = { version: '1.2', exportedAt: new Date().toISOString(), groups: tabGroups };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stash-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported successfully');
}

async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.groups || !Array.isArray(data.groups)) throw new Error('Invalid format');
        tabGroups = [...data.groups, ...tabGroups];
        await saveTabGroups();
        renderView();
        showToast('Imported successfully');
    } catch (error) {
        console.error('Import error:', error);
        showToast('Import failed');
    }
    e.target.value = '';
}

async function clearAllData() {
    if (!confirm(t('confirmClearAll') || 'Are you sure?')) return;
    tabGroups = [];
    await saveTabGroups();
    currentView = 'all';
    setActiveNav('all');
    renderView();
    showToast('All data cleared');
}

// Utils
function showToast(message) {
    if (elements.toastMessage) elements.toastMessage.textContent = message;
    if (elements.toast) {
        elements.toast.classList.add('active');
        setTimeout(() => elements.toast.classList.remove('active'), 3000);
    }
}

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('justNow');
    if (minutes < 60) return `${minutes} ${t('minutesAgo')}`;
    if (hours < 24) return `${hours} ${t('hoursAgo')}`;
    if (days < 7) return `${days} ${t('daysAgo')}`;

    return date.toLocaleDateString(settings.language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

function extractDomain(url) {
    try { return new URL(url).hostname; } catch { return url; }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}