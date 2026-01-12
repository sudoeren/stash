// ==========================================
// Stash - Popup JavaScript V2
// ==========================================

// State
let tabGroups = [];
let settings = { themeMode: 'system', language: 'en', includePinned: false, closeAfterSave: true };

// System theme detection
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
systemThemeQuery.addEventListener('change', () => {
    if (settings.themeMode === 'system') {
        applyTheme();
    }
});

// DOM Elements
const elements = {
    // Header
    openDashboard: document.getElementById('openDashboard'),

    // Main Action
    saveAllTabs: document.getElementById('saveAllTabs'),
    tabCountHint: document.getElementById('tabCountHint'),

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
}

// Stats
async function updateStats() {
    try {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const count = tabs.length;

        if (elements.activeTabCount) {
            elements.activeTabCount.textContent = count;
        }

        if (elements.tabCountHint) {
            const lang = settings.language || 'en';
            if (lang === 'tr') {
                elements.tabCountHint.textContent = `${count} sekme kaydedilmeye hazır`;
            } else {
                elements.tabCountHint.textContent = `${count} tabs ready to save`;
            }
        }
    } catch (error) {
        console.error('Error updating stats:', error);
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

        // Create new group with proper favicon handling
        const group = {
            id: generateId(),
            createdAt: new Date().toISOString(),
            favorite: false,
            tags: [],
            tabs: filteredTabs.map(tab => ({
                id: generateId(),
                title: tab.title || t('untitled'),
                url: tab.url,
                favicon: getFaviconUrl(tab.url, tab.favIconUrl)
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

// Get reliable favicon URL using Google's favicon service
function getFaviconUrl(pageUrl, originalFavicon) {
    try {
        const url = new URL(pageUrl);
        // Use Google's favicon service for more reliable favicon loading
        return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
    } catch {
        return originalFavicon || null;
    }
}

// Get tag color
function getTagColor(tag) {
    const colors = {
        'work': '#3b82f6',
        'personal': '#8b5cf6',
        'reading': '#10b981',
        'shopping': '#f59e0b',
        'social': '#ec4899',
        'news': '#6366f1',
        'video': '#ef4444',
        'music': '#14b8a6'
    };
    return colors[tag.toLowerCase()] || '#6b7280';
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

    groups.forEach((group, index) => {
        const groupEl = createGroupElement(group, index);
        elements.groupsContainer.appendChild(groupEl);
    });
}

function createGroupElement(group, index) {
    const div = document.createElement('div');
    div.className = 'tab-group';
    div.dataset.groupId = group.id;
    div.style.animationDelay = `${index * 50}ms`;

    const date = new Date(group.createdAt);
    const formattedDate = formatDate(date);

    // Generate tags HTML
    const tagsHTML = (group.tags && group.tags.length > 0)
        ? `<div class="group-tags-mini">
            ${group.tags.map(tag => `
                <span class="group-tag-mini" style="background: ${getTagColor(tag)}; color: ${getTagColor(tag)}"></span>
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,3 21,3 21,9"/>
            <path d="M21 3l-7 7"/>
            <path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5"/>
          </svg>
        </button>
        <button class="group-action-btn danger delete-group" title="${t('delete')}">
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
    const header = div.querySelector('.group-header');
    const tabList = div.querySelector('.tab-list');
    const restoreBtn = div.querySelector('.restore-all');
    const deleteBtn = div.querySelector('.delete-group');

    header.addEventListener('click', (e) => {
        if (!e.target.closest('.group-action-btn')) {
            tabList.classList.toggle('collapsed');
            div.classList.toggle('expanded');
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
    // Always use Google Favicon service for reliability
    const faviconUrl = getFaviconUrl(tab.url, tab.favicon);

    const faviconHTML = `
        <img class="tab-favicon" 
             src="${faviconUrl}" 
             alt="" 
             loading="lazy"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="tab-favicon-placeholder" style="display: none;">
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
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
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
