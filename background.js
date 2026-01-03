// Stash - Background Service Worker

chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'save-all-tabs') await saveAllTabsBackground();
});

chrome.runtime.onInstalled.addListener((details) => {
    chrome.contextMenus.create({ id: 'save-current-tab', title: 'Save this tab to Stash', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'save-all-tabs', title: 'Save all tabs to Stash', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'open-dashboard', title: 'Open Stash', contexts: ['page'] });

    if (details.reason === 'install') {
        chrome.tabs.create({ url: 'onboarding.html' });
    }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'save-current-tab') await saveCurrentTab(tab);
    else if (info.menuItemId === 'save-all-tabs') await saveAllTabsBackground();
    else if (info.menuItemId === 'open-dashboard') chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

// Alarm Listener for Auto Save
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'autoSave') {
        await saveAllTabsBackground(true); // true = isAutoSave
    }
});

// Watch for settings changes to update Alarm
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.settings) {
        const newSettings = changes.settings.newValue;
        if (newSettings.autoSave) {
            chrome.alarms.create('autoSave', { periodInMinutes: 30 });
        } else {
            chrome.alarms.clear('autoSave');
        }
    }
});

// Window Removed Listener for Close Auto Save
chrome.windows.onRemoved.addListener(async (windowId) => {
    // See previous note: robust "on close" saving is limited in extensions without persistent background state.
    // We will rely on periodic auto-save.
});

async function saveCurrentTab(tab) {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;
    const stored = await chrome.storage.local.get(['tabGroups', 'settings']);
    let tabGroups = stored.tabGroups || [];
    const settings = stored.settings || { closeAfterSave: true };
    
    // Duplicate Check
    if (settings.preventDuplicates) {
        const isDuplicate = tabGroups.some(group => !group.deletedAt && group.tabs.some(t => t.url === tab.url));
        if (isDuplicate) return;
    }

    const group = { id: generateId(), createdAt: new Date().toISOString(), favorite: false, type: 'single', tabs: [{ id: generateId(), title: tab.title || 'Untitled', url: tab.url, favicon: tab.favIconUrl || null }] };
    tabGroups.unshift(group);
    await chrome.storage.local.set({ tabGroups });
    if (settings.closeAfterSave) await chrome.tabs.remove(tab.id);
}

async function saveAllTabsBackground(isAutoSave = false) {
    try {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const stored = await chrome.storage.local.get(['tabGroups', 'settings']);
        let tabGroups = stored.tabGroups || [];
        const settings = stored.settings || { closeAfterSave: true, includePinned: false };

        let filteredTabs = tabs.filter(tab => !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && (settings.includePinned || !tab.pinned));
        if (filteredTabs.length === 0) return;

        if (isAutoSave) {
            // Check if identical to last group to avoid spam
            const lastGroup = tabGroups.find(g => !g.deletedAt); // Find first non-deleted
            if (lastGroup) {
                const currentUrls = filteredTabs.map(t => t.url).sort().join(',');
                const lastUrls = lastGroup.tabs.map(t => t.url).sort().join(',');
                if (currentUrls === lastUrls) return;
            }
        }

        const group = { 
            id: generateId(), 
            createdAt: new Date().toISOString(), 
            favorite: false, 
            type: isAutoSave ? 'auto' : 'manual',
            tabs: filteredTabs.map(tab => ({ id: generateId(), title: tab.title || 'Untitled', url: tab.url, favicon: tab.favIconUrl || null })) 
        };
        
        tabGroups.unshift(group);
        await chrome.storage.local.set({ tabGroups });

        if (settings.closeAfterSave && !isAutoSave) { 
            const tabIds = filteredTabs.map(tab => tab.id); 
            await chrome.tabs.create({ url: 'chrome://newtab' }); 
            await chrome.tabs.remove(tabIds); 
        }
    } catch (e) {
        console.error(e);
    }
}

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
