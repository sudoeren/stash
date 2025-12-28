// ==========================================
// Stash - Popup JavaScript
// ==========================================

// DOM Elements
const elements = {
    saveAllTabs: document.getElementById('saveAllTabs'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettings: document.getElementById('closeSettings'),
    openDashboard: document.getElementById('openDashboard'),
    groupsContainer: document.getElementById('groupsContainer'),
    emptyState: document.getElementById('emptyState'),
    searchInput: document.getElementById('searchInput'),
    totalGroups: document.getElementById('totalGroups'),
    totalTabs: document.getElementById('totalTabs'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    // Settings
    closeAfterSave: document.getElementById('closeAfterSave'),
    includePinned: document.getElementById('includePinned'),
    darkMode: document.getElementById('darkMode'),
    clearAllData: document.getElementById('clearAllData')
};

// State
let tabGroups = [];
let settings = {
    closeAfterSave: true,
    includePinned: false,
    darkMode: true
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

// Settings Management
async function loadSettings() {
    const stored = await chrome.storage.local.get('settings');
    if (stored.settings) {
        settings = { ...settings, ...stored.settings };
    }

    // Apply to UI
    elements.closeAfterSave.checked = settings.closeAfterSave;
    elements.includePinned.checked = settings.includePinned;
    elements.darkMode.checked = !settings.darkMode; // Inverted: checkbox = light mode
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

// Tab Groups Management
async function loadTabGroups() {
    const stored = await chrome.storage.local.get('tabGroups');
    tabGroups = stored.tabGroups || [];
}

async function saveTabGroups() {
    await chrome.storage.local.set({ tabGroups });
}

// Event Listeners
function setupEventListeners() {
    // Save all tabs
    elements.saveAllTabs.addEventListener('click', saveAllTabs);

    // Open dashboard
    elements.openDashboard.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    });

    // Export/Import
    elements.exportBtn.addEventListener('click', exportData);
    elements.importBtn.addEventListener('click', () => elements.importFile.click());
    elements.importFile.addEventListener('change', importData);

    // Settings
    elements.settingsBtn.addEventListener('click', () => {
        elements.settingsModal.classList.add('active');
    });

    elements.closeSettings.addEventListener('click', () => {
        elements.settingsModal.classList.remove('active');
    });

    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) {
            elements.settingsModal.classList.remove('active');
        }
    });

    // Settings toggles
    elements.closeAfterSave.addEventListener('change', (e) => {
        settings.closeAfterSave = e.target.checked;
        saveSettings();
    });

    elements.includePinned.addEventListener('change', (e) => {
        settings.includePinned = e.target.checked;
        saveSettings();
    });

    elements.darkMode.addEventListener('change', (e) => {
        settings.darkMode = !e.target.checked; // Inverted
        saveSettings();
        applyTheme();
    });

    elements.clearAllData.addEventListener('click', clearAllData);

    // Search
    elements.searchInput.addEventListener('input', handleSearch);
}

// Save All Tabs
async function saveAllTabs() {
    try {
        const tabs = await chrome.tabs.query({ currentWindow: true });

        // Filter tabs
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

        // Create new group
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

        // Add to groups
        tabGroups.unshift(group);
        await saveTabGroups();

        // Close tabs if setting is on
        if (settings.closeAfterSave) {
            const tabIds = filteredTabs.map(tab => tab.id);
            await chrome.tabs.create({ url: 'chrome://newtab' });
            await chrome.tabs.remove(tabIds);
        }

        renderGroups();
        updateStats();
        showToast(`${filteredTabs.length} sekme kaydedildi`);

    } catch (error) {
        console.error('Error saving tabs:', error);
        showToast('Hata oluştu');
    }
}

// Render Groups
function renderGroups(filteredGroups = null) {
    const groups = filteredGroups || tabGroups;

    if (groups.length === 0) {
        elements.emptyState.style.display = 'flex';
        const existingGroups = elements.groupsContainer.querySelectorAll('.tab-group');
        existingGroups.forEach(g => g.remove());
        return;
    }

    elements.emptyState.style.display = 'none';

    const existingGroups = elements.groupsContainer.querySelectorAll('.tab-group');
    existingGroups.forEach(g => g.remove());

    groups.forEach(group => {
        const groupEl = createGroupElement(group);
        elements.groupsContainer.appendChild(groupEl);
    });
}

function createGroupElement(group) {
    const div = document.createElement('div');
    div.className = 'tab-group';
    div.dataset.groupId = group.id;

    const date = new Date(group.createdAt);
    const formattedDate = formatDate(date);

    div.innerHTML = `
    <div class="group-header">
      <div class="group-info">
        <div class="group-icon">${group.tabs.length}</div>
        <div class="group-details">
          <span class="group-title">${formattedDate}</span>
          <span class="group-meta">${group.tabs.length} sekme</span>
        </div>
      </div>
      <div class="group-actions">
        <button class="group-action-btn restore-all" title="Tümünü Aç">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,3 21,3 21,9"/>
            <path d="M21 3l-7 7"/>
            <path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5"/>
          </svg>
        </button>
        <button class="group-action-btn danger delete-group" title="Sil">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
    const header = div.querySelector('.group-header');
    const tabList = div.querySelector('.tab-list');
    const restoreBtn = div.querySelector('.restore-all');
    const deleteBtn = div.querySelector('.delete-group');

    header.addEventListener('click', (e) => {
        if (!e.target.closest('.group-action-btn')) {
            tabList.classList.toggle('collapsed');
        }
    });

    restoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        restoreGroup(group.id);
    });

    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteGroup(group.id);
    });

    div.querySelectorAll('.tab-item').forEach(tabItem => {
        const tabId = tabItem.dataset.tabId;
        const tab = group.tabs.find(t => t.id === tabId);

        tabItem.addEventListener('click', (e) => {
            if (!e.target.closest('.tab-delete')) {
                openTab(tab.url);
            }
        });

        const deleteBtn = tabItem.querySelector('.tab-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTab(group.id, tabId);
        });
    });

    return div;
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
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;
}

// Tab Actions
async function openTab(url) {
    await chrome.tabs.create({ url });
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

    if (!query) {
        renderGroups();
        return;
    }

    const filteredGroups = tabGroups
        .map(group => ({
            ...group,
            tabs: group.tabs.filter(tab =>
                tab.title.toLowerCase().includes(query) ||
                tab.url.toLowerCase().includes(query)
            )
        }))
        .filter(group => group.tabs.length > 0);

    renderGroups(filteredGroups);
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
    a.download = `stash-${formatDateForFile(new Date())}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showToast('Dışa aktarıldı');
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
        showToast(`${data.groups.length} grup aktarıldı`);

    } catch (error) {
        console.error('Import error:', error);
        showToast('İçe aktarma başarısız');
    }

    e.target.value = '';
}

// Clear All Data
async function clearAllData() {
    if (!confirm('Tüm sekmeleri silmek istediğinize emin misiniz?')) {
        return;
    }

    tabGroups = [];
    await saveTabGroups();

    elements.settingsModal.classList.remove('active');
    renderGroups();
    updateStats();
    showToast('Tümü silindi');
}

// Stats
function updateStats() {
    const groupCount = tabGroups.length;
    const tabCount = tabGroups.reduce((sum, g) => sum + g.tabs.length, 0);

    elements.totalGroups.textContent = groupCount;
    elements.totalTabs.textContent = tabCount;
}

// Toast
function showToast(message) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('active');

    setTimeout(() => {
        elements.toast.classList.remove('active');
    }, 2500);
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
        month: 'short'
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
