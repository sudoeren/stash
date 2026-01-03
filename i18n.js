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
        scanDuplicates: 'Scan Duplicates',

        // Navigation
        allTabs: 'All Tabs',
        recent: 'Recent',
        favorites: 'Favorites',
        trash: 'Trash',

        // Stats
        groups: 'Groups',
        tabs: 'Tabs',
        tabsCount: 'tabs',

        // Search
        searchPlaceholder: 'Search (e.g. site:github.com)',

        // Empty State
        noTabsYet: 'No tabs yet',
        noTabsDescription: 'Click "Save All" to save your open tabs',
        trashEmpty: 'Trash is empty',
        noFavorites: 'No favorites yet',
        noFavoritesDesc: 'Mark items as favorite to see them here',

        // Settings
        general: 'General',
        appearance: 'Appearance',
        settings: 'Settings',
        language: 'Language',
        closeAfterSave: 'Close tabs after saving',
        includePinned: 'Include pinned tabs',
        darkTheme: 'Dark Theme',
        theme: 'Theme',
        themeMode: 'Theme Mode',
        themeDark: 'Dark',
        themeLight: 'Light',
        themeSystem: 'System',
        dataManagement: 'Data Management',
        clearAllData: 'Reset All',
        activeTabs: 'Active Tabs',
        autoSave: 'Auto Save',
        enableAutoSave: 'Enable Auto Save',
        autoSaveDesc: 'Save every 30 mins',

        // Toast Messages
        tabsSaved: 'tabs saved',
        tabsOpened: 'tabs opened',
        groupDeleted: 'Group moved to trash',
        allDataCleared: 'All data cleared',
        exported: 'Exported',
        groupsImported: 'groups imported',
        importFailed: 'Import failed',
        noTabsToSave: 'No tabs to save',
        errorOccurred: 'An error occurred',
        tagAdded: 'Tag added',
        tagRemoved: 'Tag removed',

        // Confirmations
        confirmClearAll: 'Are you sure you want to delete all saved tabs?',

        // Tooltips
        openAll: 'Open All',
        favorite: 'Favorite',
        deleteGroup: 'Delete Group',
        deleteTab: 'Delete Tab',
        fullscreen: 'Fullscreen',
        addTag: 'Add Tag',
        editTags: 'Edit Tags',

        // Time
        justNow: 'Just now',
        minutesAgo: 'min ago',
        hoursAgo: 'hours ago',
        daysAgo: 'days ago',

        // Misc
        untitled: 'Untitled',

        // Tags
        tags: 'Tags',
        newTag: 'New tag...',
        work: 'Work',
        research: 'Research',
        entertainment: 'Entertainment',
        shopping: 'Shopping',
        social: 'Social',
        news: 'News',
        learning: 'Learning',
        other: 'Other',
        filterByTag: 'Filter by tag',
        allGroups: 'All Groups',
        noTags: 'No tags',

        // Drag and Drop
        dragToReorder: 'Drag to reorder',

        // View Subtitles
        dashboardSubtitle: 'Dashboard',
        recentSubtitle: 'Latest Stashes',
        favoritesSubtitle: 'Your Collection',
        tabsStashed: 'Tabs Stashed',

        // Empty States Extended
        noFavoritesYet: 'No Favorites Yet',
        noFavoritesDescription: 'Mark items as favorite to see them here.',
        noMatchesFound: 'No matches found',
        tryDifferentSearch: 'Try a different search term'
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
        scanDuplicates: 'Çoğaltmaları Tara',

        // Navigation
        allTabs: 'Tüm Sekmeler',
        recent: 'Son Eklenenler',
        favorites: 'Favoriler',
        trash: 'Çöp Kutusu',

        // Stats
        groups: 'Grup',
        tabs: 'Sekme',
        tabsCount: 'sekme',

        // Search
        searchPlaceholder: 'Ara (örn. site:github.com)',

        // Empty State
        noTabsYet: 'Henüz sekme yok',
        noTabsDescription: 'Açık sekmelerinizi kaydetmek için "Tümünü Kaydet" butonuna tıklayın',
        trashEmpty: 'Çöp kutusu boş',
        noFavorites: 'Henüz favori yok',
        noFavoritesDesc: 'Favorilediğiniz öğeler burada görünür',

        // Settings
        general: 'Genel',
        appearance: 'Görünüm',
        settings: 'Ayarlar',
        language: 'Dil',
        closeAfterSave: 'Kayıttan sonra kapat',
        includePinned: 'Pinli sekmeleri dahil et',
        darkTheme: 'Koyu Tema',
        theme: 'Tema',
        themeMode: 'Tema Modu',
        themeDark: 'Koyu',
        themeLight: 'Açık',
        themeSystem: 'Sistem',
        dataManagement: 'Veri Yönetimi',
        clearAllData: 'Tümünü Sıfırla',
        activeTabs: 'Aktif Sekmeler',
        autoSave: 'Otomatik Kayıt',
        enableAutoSave: 'Otomatik Kaydı Aç',
        autoSaveDesc: 'Her 30 dk bir kaydet',

        // Toast Messages
        tabsSaved: 'sekme kaydedildi',
        tabsOpened: 'sekme açıldı',
        groupDeleted: 'Grup çöp kutusuna taşındı',
        allDataCleared: 'Tüm veriler silindi',
        exported: 'Dışa aktarıldı',
        groupsImported: 'grup aktarıldı',
        importFailed: 'İçe aktarma başarısız',
        noTabsToSave: 'Kaydedilecek sekme yok',
        errorOccurred: 'Hata oluştu',
        tagAdded: 'Etiket eklendi',
        tagRemoved: 'Etiket kaldırıldı',

        // Confirmations
        confirmClearAll: 'Tüm sekmeleri silmek istediğinize emin misiniz?',

        // Tooltips
        openAll: 'Tümünü Aç',
        favorite: 'Favori',
        deleteGroup: 'Grubu Sil',
        deleteTab: 'Sekmeyi Sil',
        fullscreen: 'Tam Ekran',
        addTag: 'Etiket Ekle',
        editTags: 'Etiketleri Düzenle',

        // Time
        justNow: 'Az önce',
        minutesAgo: 'dk önce',
        hoursAgo: 'saat önce',
        daysAgo: 'gün önce',

        // Misc
        untitled: 'Başlıksız',

        // Tags
        tags: 'Etiketler',
        newTag: 'Yeni etiket...',
        work: 'İş',
        research: 'Araştırma',
        entertainment: 'Eğlence',
        shopping: 'Alışveriş',
        social: 'Sosyal',
        news: 'Haberler',
        learning: 'Öğrenme',
        other: 'Diğer',
        filterByTag: 'Etikete göre filtrele',
        allGroups: 'Tüm Gruplar',
        noTags: 'Etiket yok',

        // Drag and Drop
        dragToReorder: 'Sıralamak için sürükle',

        // View Subtitles
        dashboardSubtitle: 'Panel',
        recentSubtitle: 'Son Eklenenler',
        favoritesSubtitle: 'Koleksiyonunuz',
        tabsStashed: 'Sekme Saklandı',

        // Empty States Extended
        noFavoritesYet: 'Henüz Favori Yok',
        noFavoritesDescription: 'Burada görmek için öğeleri favori olarak işaretleyin.',
        noMatchesFound: 'Eşleşme bulunamadı',
        tryDifferentSearch: 'Farklı bir arama terimi deneyin'
    }
};

// Predefined tag colors
const tagColors = {
    work: '#3b82f6',      // Blue
    research: '#8b5cf6',  // Purple
    entertainment: '#ec4899', // Pink
    shopping: '#f59e0b',  // Amber
    social: '#10b981',    // Emerald
    news: '#6366f1',      // Indigo
    learning: '#14b8a6',  // Teal
    other: '#6b7280'      // Gray
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

// Get tag color
function getTagColor(tagKey) {
    return tagColors[tagKey] || tagColors.other;
}

// Get all predefined tags
function getPredefinedTags() {
    return Object.keys(tagColors);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { translations, tagColors, t, setLanguage, getLanguage, getAvailableLanguages, getTagColor, getPredefinedTags };
}