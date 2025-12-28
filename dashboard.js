// ==========================================
// Stash - Full Dashboard JavaScript
// ==========================================

// State
let tabGroups = [];
let currentView = 'all';
let settings = { darkMode: true };

// DOM Elements
const elements = {
    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    viewTitle: document.getElementById('viewTitle'),
    headerTabCount: document.getElementById('headerTabCount'),

    // Stats
    sidebarGroups: document.getElementById('sidebarGroups'),
    sidebarTabs: document.getElementById('sidebarTabs'),

    // Actions
    dashboardSaveAll: document.getElementById('dashboardSaveAll'),
    dashboardExport: document.getElementById('dashboardExport'),
    dashboardImport: document.getElementById('dashboardImport'),
    dashboardImportFile: document.getElementById('dashboardImportFile'),
    themeToggle: document.getElementById('themeToggle'),
    dashboardSettings: document.getElementById('dashboardSettings'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsModal: document.getElementById('closeSettingsModal'),
    settingCloseAfterSave: document.getElementById('settingCloseAfterSave'),
    settingIncludePinned: document.getElementById('settingIncludePinned'),
    clearAllDataBtn: document.getElementById('clearAllDataBtn'),

    // Search
    dashboardSearch: document.getElementById('dashboardSearch'),

    // Content
    contentArea: document.getElementById('contentArea'),
    dashboardEmpty: document.getElementById('dashboardEmpty'),

    // Toast
    toast: document.getElementById('dashboardToast'),
    toastMessage: document.getElementById('dashboardToastMessage')
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadSettings();
    await loadTabGroups();
    applyTheme();
    renderGroups();
    updateStats();
    setupEventListeners();
}

// Load/Save
async function loadSettings() {
    const stored = await chrome.storage.local.get('settings');
    if (stored.settings) {
        settings = { ...settings, ...stored.settings };
    }
}

async function loadTabGroups() {
    const stored = await chrome.storage.local.get('tabGroups');
    tabGroups = stored.tabGroups || [];
}

async function saveTabGroups() {
    await chrome.storage.local.set({ tabGroups });
}

async function saveSettings() {
    await chrome.storage.local.set({ settings });
}

function applyTheme() {
    if (settings.darkMode) {
        document.body.classList.remove('light-theme');
    } else {
        document.body.classList.add('light-theme');
    }
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            elements.navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            currentView = item.dataset.view;
            updateViewTitle();
            renderGroups();
        });
    });

    // Save all tabs
    elements.dashboardSaveAll.addEventListener('click', saveAllTabs);

    // Export/Import
    elements.dashboardExport.addEventListener('click', exportData);
    elements.dashboardImport.addEventListener('click', () => elements.dashboardImportFile.click());
    elements.dashboardImportFile.addEventListener('change', importData);

    // Theme toggle
    elements.themeToggle.addEventListener('click', () => {
        settings.darkMode = !settings.darkMode;
        saveSettings();
        applyTheme();
    });

    // Settings modal
    elements.dashboardSettings.addEventListener('click', openSettingsModal);
    elements.closeSettingsModal.addEventListener('click', closeSettingsModal);
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) closeSettingsModal();
    });

    // Settings toggles
    elements.settingCloseAfterSave.addEventListener('change', (e) => {
        settings.closeAfterSave = e.target.checked;
        saveSettings();
    });

    elements.settingIncludePinned.addEventListener('change', (e) => {
        settings.includePinned = e.target.checked;
        saveSettings();
    });

    elements.clearAllDataBtn.addEventListener('click', clearAllData);

    // Search
    elements.dashboardSearch.addEventListener('input', handleSearch);
}

// Settings Modal
function openSettingsModal() {
    elements.settingCloseAfterSave.checked = settings.closeAfterSave !== false;
    elements.settingIncludePinned.checked = settings.includePinned || false;
    elements.settingsModal.classList.add('active');
}

function closeSettingsModal() {
    elements.settingsModal.classList.remove('active');
}

async function clearAllData() {
    if (!confirm('Tüm kaydedilmiş sekmeleri silmek istediğinize emin misiniz?')) return;
    tabGroups = [];
    await saveTabGroups();
    closeSettingsModal();
    renderGroups();
    updateStats();
    showToast('Tüm veriler silindi');
}

function updateViewTitle() {
    const titles = {
        all: 'Tüm Sekmeler',
        recent: 'Son Eklenenler',
        favorites: 'Favoriler'
    };
    elements.viewTitle.textContent = titles[currentView] || 'Tüm Sekmeler';
}

// Save All Tabs
async function saveAllTabs() {
    try {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const stored = await chrome.storage.local.get('settings');
        const userSettings = stored.settings || { includePinned: false, closeAfterSave: true };

        let filteredTabs = tabs.filter(tab => {
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                return false;
            }
            if (!userSettings.includePinned && tab.pinned) {
                return false;
            }
            return true;
        });

        if (filteredTabs.length === 0) {
            showToast('Kaydedilecek sekme bulunamadı');
            return;
        }

        const group = {
            id: generateId(),
            createdAt: new Date().toISOString(),
            favorite: false,
            tabs: filteredTabs.map(tab => ({
                id: generateId(),
                title: tab.title || 'Başlıksız',
                url: tab.url,
                favicon: tab.favIconUrl || null
            }))
        };

        tabGroups.unshift(group);
        await saveTabGroups();

        if (userSettings.closeAfterSave) {
            const tabIds = filteredTabs.map(tab => tab.id);
            await chrome.tabs.create({ url: 'chrome://newtab' });
            await chrome.tabs.remove(tabIds);
        }

        renderGroups();
        updateStats();
        showToast(`${filteredTabs.length} sekme kaydedildi`);

    } catch (error) {
        console.error('Error saving tabs:', error);
        showToast('Sekmeler kaydedilirken hata oluştu');
    }
}

// Render Groups
function renderGroups(searchQuery = '') {
    let groups = [...tabGroups];

    // Filter by view
    if (currentView === 'recent') {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        groups = groups.filter(g => new Date(g.createdAt).getTime() > oneDayAgo);
    } else if (currentView === 'favorites') {
        groups = groups.filter(g => g.favorite);
    }

    // Filter by search
    if (searchQuery) {
        groups = groups.map(group => ({
            ...group,
            tabs: group.tabs.filter(tab =>
                tab.title.toLowerCase().includes(searchQuery) ||
                tab.url.toLowerCase().includes(searchQuery)
            )
        })).filter(group => group.tabs.length > 0);
    }

    // Update header count
    const totalTabs = groups.reduce((sum, g) => sum + g.tabs.length, 0);
    elements.headerTabCount.textContent = `${totalTabs} sekme`;

    // Clear content
    const existingCards = elements.contentArea.querySelectorAll('.group-card');
    existingCards.forEach(card => card.remove());

    if (groups.length === 0) {
        elements.dashboardEmpty.style.display = 'flex';
        return;
    }

    elements.dashboardEmpty.style.display = 'none';

    // Render cards
    groups.forEach((group, index) => {
        const card = createGroupCard(group);
        card.style.animationDelay = `${index * 50}ms`;
        elements.contentArea.appendChild(card);
    });
}

function createGroupCard(group) {
    const card = document.createElement('div');
    card.className = 'group-card';
    card.dataset.groupId = group.id;

    const date = new Date(group.createdAt);
    const formattedDate = formatDate(date);

    card.innerHTML = `
    <div class="group-card-header">
      <div class="group-card-info">
        <div class="group-card-icon">${group.tabs.length}</div>
        <div class="group-card-details">
          <h3>${formattedDate}</h3>
          <span>${group.tabs.length} sekme</span>
        </div>
      </div>
      <div class="group-card-actions">
        <button class="card-action-btn favorite ${group.favorite ? 'active' : ''}" title="Favori">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${group.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
          </svg>
        </button>
        <button class="card-action-btn restore-all" title="Tümünü Aç">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,3 21,3 21,9"/>
            <path d="M21 3l-7 7"/>
            <path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5"/>
          </svg>
        </button>
        <button class="card-action-btn danger delete-group" title="Grubu Sil">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="group-card-tabs">
      ${group.tabs.map(tab => createTabItemHTML(tab)).join('')}
    </div>
  `;

    // Event listeners
    const favoriteBtn = card.querySelector('.favorite');
    const restoreBtn = card.querySelector('.restore-all');
    const deleteBtn = card.querySelector('.delete-group');

    favoriteBtn.addEventListener('click', () => toggleFavorite(group.id));
    restoreBtn.addEventListener('click', () => restoreGroup(group.id));
    deleteBtn.addEventListener('click', () => deleteGroup(group.id));

    // Tab events
    card.querySelectorAll('.card-tab-item').forEach(tabItem => {
        const tabId = tabItem.dataset.tabId;
        const tab = group.tabs.find(t => t.id === tabId);

        tabItem.addEventListener('click', (e) => {
            if (!e.target.closest('.card-tab-delete')) {
                openTab(tab.url);
            }
        });

        const deleteTabBtn = tabItem.querySelector('.card-tab-delete');
        deleteTabBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTab(group.id, tabId);
        });
    });

    return card;
}

function createTabItemHTML(tab) {
    const faviconHTML = tab.favicon
        ? `<img class="card-tab-favicon" src="${tab.favicon}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
       <div class="card-tab-favicon-placeholder" style="display: none;">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <circle cx="12" cy="12" r="10"/>
         </svg>
       </div>`
        : `<div class="card-tab-favicon-placeholder">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <circle cx="12" cy="12" r="10"/>
         </svg>
       </div>`;

    const domain = extractDomain(tab.url);

    return `
    <div class="card-tab-item" data-tab-id="${tab.id}">
      ${faviconHTML}
      <div class="card-tab-info">
        <div class="card-tab-title">${escapeHtml(tab.title)}</div>
        <div class="card-tab-url">${domain}</div>
      </div>
      <button class="card-tab-delete" title="Sekmeyi Sil">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;
}

// Actions
async function openTab(url) {
    await chrome.tabs.create({ url });
}

async function toggleFavorite(groupId) {
    const group = tabGroups.find(g => g.id === groupId);
    if (group) {
        group.favorite = !group.favorite;
        await saveTabGroups();
        renderGroups();
        updateStats();
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

    renderGroups();
    updateStats();
    showToast(`${group.tabs.length} sekme açıldı`);
}

async function deleteGroup(groupId) {
    tabGroups = tabGroups.filter(g => g.id !== groupId);
    await saveTabGroups();

    renderGroups();
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
    renderGroups();
    updateStats();
}

// Search
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    renderGroups(query);
}

// Export/Import
function exportData() {
    const data = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        groups: tabGroups
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `stash-export-${formatDateForFile(new Date())}.json`;
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
            throw new Error('Invalid format');
        }

        tabGroups = [...data.groups, ...tabGroups];
        await saveTabGroups();

        renderGroups();
        updateStats();
        showToast(`${data.groups.length} grup içe aktarıldı`);

    } catch (error) {
        console.error('Import error:', error);
        showToast('İçe aktarma başarısız');
    }

    e.target.value = '';
}

// Stats
function updateStats() {
    const groupCount = tabGroups.length;
    const tabCount = tabGroups.reduce((sum, g) => sum + g.tabs.length, 0);

    elements.sidebarGroups.textContent = groupCount;
    elements.sidebarTabs.textContent = tabCount;
}

// Toast
function showToast(message) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('active');

    setTimeout(() => {
        elements.toast.classList.remove('active');
    }, 3000);
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
    if (minutes < 60) return `${minutes} dakika önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;

    return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function formatDateForFile(date) {
    return date.toISOString().split('T')[0];
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
