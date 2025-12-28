// ==========================================
// Stash - Internationalization (i18n)
// ==========================================

const translations = {
    en: {
        // General
        appName: 'Stash',

        // Actions
        saveAll: 'Save All',
        export: 'Export',
        import: 'Import',
        theme: 'Theme',
        settings: 'Settings',
        delete: 'Delete',

        // Navigation
        allTabs: 'All Tabs',
        recent: 'Recent',
        favorites: 'Favorites',

        // Stats
        groups: 'Groups',
        tabs: 'Tabs',
        tabsCount: 'tabs',

        // Search
        searchPlaceholder: 'Search tabs...',

        // Empty State
        noTabsYet: 'No tabs yet',
        noTabsDescription: 'Click "Save All" to save your open tabs',

        // Settings
        closeAfterSave: 'Close tabs after saving',
        includePinned: 'Include pinned tabs',
        lightTheme: 'Light theme',
        clearAllData: 'Clear All Data',

        // Toast Messages
        tabsSaved: 'tabs saved',
        tabsOpened: 'tabs opened',
        groupDeleted: 'Group deleted',
        allDataCleared: 'All data cleared',
        exported: 'Exported',
        groupsImported: 'groups imported',
        importFailed: 'Import failed',
        noTabsToSave: 'No tabs to save',
        errorOccurred: 'An error occurred',

        // Confirmations
        confirmClearAll: 'Are you sure you want to delete all saved tabs?',

        // Tooltips
        openAll: 'Open All',
        favorite: 'Favorite',
        deleteGroup: 'Delete Group',
        deleteTab: 'Delete Tab',
        fullscreen: 'Fullscreen',

        // Time
        justNow: 'Just now',
        minutesAgo: 'min ago',
        hoursAgo: 'hours ago',
        daysAgo: 'days ago',

        // Misc
        untitled: 'Untitled'
    },

    tr: {
        // General
        appName: 'Stash',

        // Actions
        saveAll: 'Tümünü Kaydet',
        export: 'Dışa Aktar',
        import: 'İçe Aktar',
        theme: 'Tema',
        settings: 'Ayarlar',
        delete: 'Sil',

        // Navigation
        allTabs: 'Tüm Sekmeler',
        recent: 'Son Eklenenler',
        favorites: 'Favoriler',

        // Stats
        groups: 'Grup',
        tabs: 'Sekme',
        tabsCount: 'sekme',

        // Search
        searchPlaceholder: 'Sekmelerde ara...',

        // Empty State
        noTabsYet: 'Henüz sekme yok',
        noTabsDescription: 'Açık sekmelerinizi kaydetmek için "Tümünü Kaydet" butonuna tıklayın',

        // Settings
        closeAfterSave: 'Kayıttan sonra kapat',
        includePinned: 'Pinli sekmeleri dahil et',
        lightTheme: 'Açık tema',
        clearAllData: 'Tümünü Sil',

        // Toast Messages
        tabsSaved: 'sekme kaydedildi',
        tabsOpened: 'sekme açıldı',
        groupDeleted: 'Grup silindi',
        allDataCleared: 'Tüm veriler silindi',
        exported: 'Dışa aktarıldı',
        groupsImported: 'grup aktarıldı',
        importFailed: 'İçe aktarma başarısız',
        noTabsToSave: 'Kaydedilecek sekme yok',
        errorOccurred: 'Hata oluştu',

        // Confirmations
        confirmClearAll: 'Tüm sekmeleri silmek istediğinize emin misiniz?',

        // Tooltips
        openAll: 'Tümünü Aç',
        favorite: 'Favori',
        deleteGroup: 'Grubu Sil',
        deleteTab: 'Sekmeyi Sil',
        fullscreen: 'Tam Ekran',

        // Time
        justNow: 'Just now',
        minutesAgo: 'min ago',
        hoursAgo: 'hours ago',
        daysAgo: 'days ago',

        // Misc
        untitled: 'Untitled'
    }
};

// Current language (default: English)
let currentLang = 'en';

// Get translation
function t(key) {
    return translations[currentLang]?.[key] || translations['en'][key] || key;
}

// Set language
function setLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        return true;
    }
    return false;
}

// Get current language
function getLanguage() {
    return currentLang;
}

// Get available languages
function getAvailableLanguages() {
    return Object.keys(translations);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { translations, t, setLanguage, getLanguage, getAvailableLanguages };
}
