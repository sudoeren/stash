// Stash - Background Service Worker

chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'save-all-tabs') await saveAllTabsBackground();
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({ id: 'save-current-tab', title: 'Save this tab to Stash', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'save-all-tabs', title: 'Save all tabs to Stash', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'open-dashboard', title: 'Open Stash', contexts: ['page'] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'save-current-tab') await saveCurrentTab(tab);
    else if (info.menuItemId === 'save-all-tabs') await saveAllTabsBackground();
    else if (info.menuItemId === 'open-dashboard') chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

async function saveCurrentTab(tab) {
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;
    const stored = await chrome.storage.local.get(['tabGroups', 'settings']);
    let tabGroups = stored.tabGroups || [];
    const settings = stored.settings || { closeAfterSave: true };
    const group = { id: generateId(), createdAt: new Date().toISOString(), favorite: false, tabs: [{ id: generateId(), title: tab.title || 'Untitled', url: tab.url, favicon: tab.favIconUrl || null }] };
    tabGroups.unshift(group);
    await chrome.storage.local.set({ tabGroups });
    if (settings.closeAfterSave) await chrome.tabs.remove(tab.id);
}

async function saveAllTabsBackground() {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const stored = await chrome.storage.local.get(['tabGroups', 'settings']);
    let tabGroups = stored.tabGroups || [];
    const settings = stored.settings || { closeAfterSave: true, includePinned: false };
    let filteredTabs = tabs.filter(tab => !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && (settings.includePinned || !tab.pinned));
    if (filteredTabs.length === 0) return;
    const group = { id: generateId(), createdAt: new Date().toISOString(), favorite: false, tabs: filteredTabs.map(tab => ({ id: generateId(), title: tab.title || 'Untitled', url: tab.url, favicon: tab.favIconUrl || null })) };
    tabGroups.unshift(group);
    await chrome.storage.local.set({ tabGroups });
    if (settings.closeAfterSave) { const tabIds = filteredTabs.map(tab => tab.id); await chrome.tabs.create({ url: 'chrome://newtab' }); await chrome.tabs.remove(tabIds); }
}

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
