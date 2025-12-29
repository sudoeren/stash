// ==========================================
// Stash - Popup JavaScript
// ==========================================

// State
let tabGroups = [];
let settings = { darkMode: true, language: 'en', includePinned: false, closeAfterSave: true };
const elements = {
    // Header
    openDashboard: document.getElementById('openDashboard'),

    // Main Action
    saveAllTabs: document.getElementById('saveAllTabs'),

    // Stats
    activeTabCount: document.getElementById('activeTabCount'),

    // Search
    searchInput: document.getElementById('searchInput'),

    // Groups
    groupsContainer: document.getElementById('groupsContainer'),
    emptyState: document.getElementById('emptyState'),

    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage')
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadSettings();
    await loadTabGroups();
    applyTheme();
    applyLanguage();
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

function applyLanguage() {
    const lang = settings.language || 'en';
    if (typeof setLanguage === 'function') {
        setLanguage(lang);
    }

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });

    // Update titles (tooltips)
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = t(key);
    });

    // Update button text specifically if needed (though data-i18n handles it)
}

// Stats
async function updateStats() {
    if (elements.activeTabCount) {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        elements.activeTabCount.textContent = tabs.length;
    }
}

// Event Listeners
function setupEventListeners() {
    // Open Dashboard
    elements.openDashboard.addEventListener('click', () => {
        chrome.tabs.create({ url: 'dashboard.html' });
    });

    // Main Actions
    elements.saveAllTabs.addEventListener('click', saveAllTabs);

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
            showToast(t('noTabsToSave'));
            return;
        }

        // Create new group
        const group = {
            id: generateId(),
            createdAt: new Date().toISOString(),
            favorite: false,
            tags: [],
            tabs: filteredTabs.map(tab => ({
                id: generateId(),
                title: tab.title || t('untitled'),
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
        showToast(`${filteredTabs.length} ${t('tabsSaved')}`);

    } catch (error) {
        console.error('Error saving tabs:', error);
        showToast(t('errorOccurred'));
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

    // Generate tags HTML
    const tagsHTML = (group.tags && group.tags.length > 0)
        ? `<div class="group-tags-mini">
            ${group.tags.map(tag => `
                <span class="group-tag-mini" style="background: ${getTagColor(tag)}"></span>
            `).join('')}
           </div>`
        : '';

    div.innerHTML = `
    <div class="group-header">
      <div class="group-info">
        <div class="group-icon">${group.tabs.length}</div>
        <div class="group-details">
          <span class="group-title">${formattedDate}</span>
          <span class="group-meta">${group.tabs.length} ${t('tabsCount')}${tagsHTML}</span>
        </div>
      </div>
      <div class="group-actions">
        <button class="group-action-btn restore-all" title="${t('openAll')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,3 21,3 21,9"/>
            <path d="M21 3l-7 7"/>
            <path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5"/>
          </svg>
        </button>
        <button class="group-action-btn danger delete-group" title="${t('delete')}">
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
      <button class="tab-delete" title="${t('delete')}">
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
    showToast(`${group.tabs.length} ${t('tabsOpened')}`);
}

async function deleteGroup(groupId) {
    tabGroups = tabGroups.filter(g => g.id !== groupId);
    await saveTabGroups();

    renderGroups();
    updateStats();
    showToast(t('groupDeleted'));
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
    showToast(t('exported'));
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
        showToast(`${data.groups.length} ${t('groupsImported')}`);

    } catch (error) {
        console.error('Import error:', error);
        showToast(t('importFailed'));
    }

    e.target.value = '';
}

// Clear All Data
async function clearAllData() {
    if (!confirm(t('confirmClearAll'))) {
        return;
    }

    tabGroups = [];
    await saveTabGroups();

    elements.settingsModal.classList.remove('active');
    renderGroups();
    updateStats();
    showToast(t('allDataCleared'));
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

    if (minutes < 1) return t('justNow');
    if (minutes < 60) return `${minutes} ${t('minutesAgo')}`;
    if (hours < 24) return `${hours} ${t('hoursAgo')}`;
    if (days < 7) return `${days} ${t('daysAgo')}`;

    return date.toLocaleDateString(settings.language === 'tr' ? 'tr-TR' : 'en-US', {
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
