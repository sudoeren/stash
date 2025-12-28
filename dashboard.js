// ==========================================
// Stash - Full Dashboard JavaScript
// ==========================================

// State
let tabGroups = [];
let currentView = 'all';
let currentTagFilter = null;
let settings = { darkMode: true, language: 'en' };

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
    settingLanguage: document.getElementById('settingLanguage'),
    clearAllDataBtn: document.getElementById('clearAllDataBtn'),

    // Tag Filter
    tagFilterContainer: document.getElementById('tagFilterContainer'),

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
    applyLanguage();
    renderTagFilter();
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

    // Apply to UI
    if (elements.settingLanguage) {
        elements.settingLanguage.value = settings.language || 'en';
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
    setLanguage(lang);

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

    // Update titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = t(key);
    });

    // Update view title
    updateViewTitle();
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

    elements.settingLanguage.addEventListener('change', (e) => {
        settings.language = e.target.value;
        saveSettings();
        applyLanguage();
        renderTagFilter();
        renderGroups();
    });

    elements.clearAllDataBtn.addEventListener('click', clearAllData);

    // Search
    elements.dashboardSearch.addEventListener('input', handleSearch);
}

// Tag Filter
function renderTagFilter() {
    if (!elements.tagFilterContainer) return;

    const predefinedTags = getPredefinedTags();
    const usedTags = getUsedTags();

    elements.tagFilterContainer.innerHTML = `
        <button class="tag-filter-btn ${!currentTagFilter ? 'active' : ''}" data-tag="">
            ${t('allGroups')}
        </button>
        ${predefinedTags.map(tag => {
        const count = usedTags[tag] || 0;
        if (count === 0) return '';
        return `
                <button class="tag-filter-btn ${currentTagFilter === tag ? 'active' : ''}" 
                        data-tag="${tag}" 
                        style="--tag-color: ${getTagColor(tag)}">
                    <span class="tag-dot" style="background: ${getTagColor(tag)}"></span>
                    ${t(tag)} (${count})
                </button>
            `;
    }).join('')}
    `;

    // Add event listeners
    elements.tagFilterContainer.querySelectorAll('.tag-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTagFilter = btn.dataset.tag || null;
            renderTagFilter();
            renderGroups();
        });
    });
}

function getUsedTags() {
    const tags = {};
    tabGroups.forEach(group => {
        if (group.tags && Array.isArray(group.tags)) {
            group.tags.forEach(tag => {
                tags[tag] = (tags[tag] || 0) + 1;
            });
        }
    });
    return tags;
}

// Settings Modal
function openSettingsModal() {
    elements.settingCloseAfterSave.checked = settings.closeAfterSave !== false;
    elements.settingIncludePinned.checked = settings.includePinned || false;
    elements.settingLanguage.value = settings.language || 'en';
    elements.settingsModal.classList.add('active');
}

function closeSettingsModal() {
    elements.settingsModal.classList.remove('active');
}

async function clearAllData() {
    if (!confirm(t('confirmClearAll'))) return;
    tabGroups = [];
    await saveTabGroups();
    closeSettingsModal();
    renderTagFilter();
    renderGroups();
    updateStats();
    showToast(t('allDataCleared'));
}

function updateViewTitle() {
    const titles = {
        all: t('allTabs'),
        recent: t('recent'),
        favorites: t('favorites')
    };
    elements.viewTitle.textContent = titles[currentView] || t('allTabs');
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
            showToast(t('noTabsToSave'));
            return;
        }

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

        tabGroups.unshift(group);
        await saveTabGroups();

        if (userSettings.closeAfterSave) {
            const tabIds = filteredTabs.map(tab => tab.id);
            await chrome.tabs.create({ url: 'chrome://newtab' });
            await chrome.tabs.remove(tabIds);
        }

        renderTagFilter();
        renderGroups();
        updateStats();
        showToast(`${filteredTabs.length} ${t('tabsSaved')}`);

    } catch (error) {
        console.error('Error saving tabs:', error);
        showToast(t('errorOccurred'));
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

    // Filter by tag
    if (currentTagFilter) {
        groups = groups.filter(g => g.tags && g.tags.includes(currentTagFilter));
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
    elements.headerTabCount.textContent = `${totalTabs} ${t('tabsCount')}`;

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

    // Generate tags HTML
    const tagsHTML = (group.tags && group.tags.length > 0)
        ? `<div class="group-tags">
            ${group.tags.map(tag => `
                <span class="group-tag" style="background: ${getTagColor(tag)}20; color: ${getTagColor(tag)}; border-color: ${getTagColor(tag)}40">
                    ${t(tag)}
                    <button class="tag-remove" data-tag="${tag}" title="${t('delete')}">×</button>
                </span>
            `).join('')}
           </div>`
        : '';

    card.innerHTML = `
    <div class="group-card-header">
      <div class="group-card-info">
        <div class="group-card-icon">${group.tabs.length}</div>
        <div class="group-card-details">
          <h3>${formattedDate}</h3>
          <span>${group.tabs.length} ${t('tabsCount')}</span>
          ${tagsHTML}
        </div>
      </div>
      <div class="group-card-actions">
        <button class="card-action-btn add-tag" title="${t('addTag')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
        </button>
        <button class="card-action-btn favorite ${group.favorite ? 'active' : ''}" title="${t('favorite')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${group.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
          </svg>
        </button>
        <button class="card-action-btn restore-all" title="${t('openAll')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,3 21,3 21,9"/>
            <path d="M21 3l-7 7"/>
            <path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5"/>
          </svg>
        </button>
        <button class="card-action-btn danger delete-group" title="${t('deleteGroup')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="tag-dropdown" style="display: none;">
      <div class="tag-dropdown-content">
        ${getPredefinedTags().map(tag => `
          <button class="tag-option ${group.tags && group.tags.includes(tag) ? 'selected' : ''}" data-tag="${tag}">
            <span class="tag-dot" style="background: ${getTagColor(tag)}"></span>
            ${t(tag)}
            ${group.tags && group.tags.includes(tag) ? '<span class="tag-check">✓</span>' : ''}
          </button>
        `).join('')}
      </div>
    </div>
    <div class="group-card-tabs">
      ${group.tabs.map(tab => createTabItemHTML(tab)).join('')}
    </div>
  `;

    // Event listeners
    const addTagBtn = card.querySelector('.add-tag');
    const tagDropdown = card.querySelector('.tag-dropdown');
    const favoriteBtn = card.querySelector('.favorite');
    const restoreBtn = card.querySelector('.restore-all');
    const deleteBtn = card.querySelector('.delete-group');

    // Tag dropdown toggle
    addTagBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = tagDropdown.style.display === 'block';
        // Close all other dropdowns
        document.querySelectorAll('.tag-dropdown').forEach(dd => dd.style.display = 'none');
        tagDropdown.style.display = isVisible ? 'none' : 'block';
    });

    // Tag selection
    card.querySelectorAll('.tag-option').forEach(option => {
        option.addEventListener('click', async (e) => {
            e.stopPropagation();
            const tag = option.dataset.tag;
            await toggleTag(group.id, tag);
        });
    });

    // Tag remove
    card.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const tag = btn.dataset.tag;
            await removeTag(group.id, tag);
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        tagDropdown.style.display = 'none';
    });

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

    // Setup drag and drop
    setupDragAndDrop(card, group);

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
      <button class="card-tab-delete" title="${t('deleteTab')}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;
}

// Tag Actions
async function toggleTag(groupId, tag) {
    const group = tabGroups.find(g => g.id === groupId);
    if (!group) return;

    if (!group.tags) group.tags = [];

    const tagIndex = group.tags.indexOf(tag);
    if (tagIndex === -1) {
        group.tags.push(tag);
        showToast(t('tagAdded'));
    } else {
        group.tags.splice(tagIndex, 1);
        showToast(t('tagRemoved'));
    }

    await saveTabGroups();
    renderTagFilter();
    renderGroups();
}

async function removeTag(groupId, tag) {
    const group = tabGroups.find(g => g.id === groupId);
    if (!group || !group.tags) return;

    group.tags = group.tags.filter(t => t !== tag);
    await saveTabGroups();
    renderTagFilter();
    renderGroups();
    showToast(t('tagRemoved'));
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

    renderTagFilter();
    renderGroups();
    updateStats();
    showToast(`${group.tabs.length} ${t('tabsOpened')}`);
}

async function deleteGroup(groupId) {
    tabGroups = tabGroups.filter(g => g.id !== groupId);
    await saveTabGroups();

    renderTagFilter();
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
    renderTagFilter();
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
        version: '1.1',
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

        renderTagFilter();
        renderGroups();
        updateStats();
        showToast(`${data.groups.length} ${t('groupsImported')}`);

    } catch (error) {
        console.error('Import error:', error);
        showToast(t('importFailed'));
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

    if (minutes < 1) return t('justNow');
    if (minutes < 60) return `${minutes} ${t('minutesAgo')}`;
    if (hours < 24) return `${hours} ${t('hoursAgo')}`;
    if (days < 7) return `${days} ${t('daysAgo')}`;

    return date.toLocaleDateString(settings.language === 'tr' ? 'tr-TR' : 'en-US', {
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

// ==========================================
// DRAG AND DROP SYSTEM
// ==========================================

let draggedElement = null;
let draggedType = null; // 'group' or 'tab'
let draggedGroupId = null;
let draggedTabId = null;
let dragPlaceholder = null;

function setupDragAndDrop(card, group) {
    // Make the card draggable for group reordering
    const cardHeader = card.querySelector('.group-card-header');

    // Add drag handle
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="5" r="1"/>
            <circle cx="9" cy="12" r="1"/>
            <circle cx="9" cy="19" r="1"/>
            <circle cx="15" cy="5" r="1"/>
            <circle cx="15" cy="12" r="1"/>
            <circle cx="15" cy="19" r="1"/>
        </svg>
    `;
    dragHandle.title = t('dragToReorder') || 'Drag to reorder';
    cardHeader.querySelector('.group-card-info').prepend(dragHandle);

    // Group drag events
    dragHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startGroupDrag(card, group.id, e);
    });

    // Tab drag events
    const tabItems = card.querySelectorAll('.card-tab-item');
    tabItems.forEach(tabItem => {
        tabItem.draggable = true;
        tabItem.addEventListener('dragstart', (e) => {
            draggedElement = tabItem;
            draggedType = 'tab';
            draggedGroupId = group.id;
            draggedTabId = tabItem.dataset.tabId;
            tabItem.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', tabItem.dataset.tabId);
        });

        tabItem.addEventListener('dragend', () => {
            tabItem.classList.remove('dragging');
            draggedElement = null;
            draggedType = null;
            draggedGroupId = null;
            draggedTabId = null;
            removeDragPlaceholder();
        });

        tabItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedType !== 'tab') return;

            const afterElement = getDragAfterElement(tabItem.parentElement, e.clientY);
            if (afterElement !== tabItem && afterElement !== draggedElement) {
                showDragPlaceholder(tabItem.parentElement, afterElement, 'tab');
            }
        });
    });

    // Tab drop zone
    const tabsContainer = card.querySelector('.group-card-tabs');
    tabsContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedType !== 'tab') return;
    });

    tabsContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        if (draggedType !== 'tab' || !draggedTabId) return;

        const targetGroupId = group.id;
        const afterElement = getDragAfterElement(tabsContainer, e.clientY);

        await moveTab(draggedGroupId, targetGroupId, draggedTabId, afterElement?.dataset?.tabId);
        removeDragPlaceholder();
    });
}

function startGroupDrag(card, groupId, e) {
    draggedElement = card;
    draggedType = 'group';
    draggedGroupId = groupId;
    card.classList.add('dragging');

    const startY = e.clientY;
    const startX = e.clientX;
    const rect = card.getBoundingClientRect();
    const offsetY = startY - rect.top;
    const offsetX = startX - rect.left;

    // Create clone for dragging
    const clone = card.cloneNode(true);
    clone.className = 'group-card drag-clone';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.position = 'fixed';
    clone.style.zIndex = '1000';
    clone.style.pointerEvents = 'none';
    clone.style.opacity = '0.9';
    document.body.appendChild(clone);

    function moveClone(e) {
        clone.style.top = (e.clientY - offsetY) + 'px';
        clone.style.left = (e.clientX - offsetX) + 'px';

        // Find drop position
        const cards = [...elements.contentArea.querySelectorAll('.group-card:not(.dragging):not(.drag-clone)')];
        let afterCard = null;

        for (const c of cards) {
            const box = c.getBoundingClientRect();
            const centerY = box.top + box.height / 2;
            if (e.clientY < centerY) {
                afterCard = c;
                break;
            }
        }

        showDragPlaceholder(elements.contentArea, afterCard, 'group');
    }

    async function endGroupDrag(e) {
        document.removeEventListener('mousemove', moveClone);
        document.removeEventListener('mouseup', endGroupDrag);

        clone.remove();
        card.classList.remove('dragging');

        // Find new position
        const cards = [...elements.contentArea.querySelectorAll('.group-card:not(.dragging):not(.drag-placeholder)')];
        let newIndex = cards.length;

        for (let i = 0; i < cards.length; i++) {
            const box = cards[i].getBoundingClientRect();
            if (e.clientY < box.top + box.height / 2) {
                newIndex = i;
                break;
            }
        }

        await reorderGroup(groupId, newIndex);
        removeDragPlaceholder();

        draggedElement = null;
        draggedType = null;
        draggedGroupId = null;
    }

    document.addEventListener('mousemove', moveClone);
    document.addEventListener('mouseup', endGroupDrag);

    moveClone(e);
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.card-tab-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function showDragPlaceholder(container, beforeElement, type) {
    removeDragPlaceholder();

    dragPlaceholder = document.createElement('div');
    dragPlaceholder.className = `drag-placeholder ${type}-placeholder`;

    if (beforeElement) {
        container.insertBefore(dragPlaceholder, beforeElement);
    } else {
        container.appendChild(dragPlaceholder);
    }
}

function removeDragPlaceholder() {
    if (dragPlaceholder) {
        dragPlaceholder.remove();
        dragPlaceholder = null;
    }
}

async function moveTab(fromGroupId, toGroupId, tabId, beforeTabId) {
    const fromGroup = tabGroups.find(g => g.id === fromGroupId);
    const toGroup = tabGroups.find(g => g.id === toGroupId);

    if (!fromGroup || !toGroup) return;

    const tabIndex = fromGroup.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    const [tab] = fromGroup.tabs.splice(tabIndex, 1);

    if (beforeTabId) {
        const beforeIndex = toGroup.tabs.findIndex(t => t.id === beforeTabId);
        toGroup.tabs.splice(beforeIndex, 0, tab);
    } else {
        toGroup.tabs.push(tab);
    }

    // Remove empty groups
    if (fromGroup.tabs.length === 0) {
        tabGroups = tabGroups.filter(g => g.id !== fromGroupId);
    }

    await saveTabGroups();
    renderTagFilter();
    renderGroups();
    updateStats();
}

async function reorderGroup(groupId, newIndex) {
    const currentIndex = tabGroups.findIndex(g => g.id === groupId);
    if (currentIndex === -1 || currentIndex === newIndex) return;

    const [group] = tabGroups.splice(currentIndex, 1);

    // Adjust index if needed
    const adjustedIndex = newIndex > currentIndex ? newIndex - 1 : newIndex;
    tabGroups.splice(adjustedIndex, 0, group);

    await saveTabGroups();
    renderGroups();
}

