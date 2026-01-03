let settings = {
    themeMode: 'system',
    language: 'en',
    closeAfterSave: true,
    includePinned: false,
    autoSave: false,
    autoSaveInterval: 30
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Detect system language
    const browserLang = navigator.language.split('-')[0];
    if (['tr', 'en'].includes(browserLang)) {
        settings.language = browserLang;
    }

    // Initial Render
    updateUI();
    applyTheme();

    // Event Listeners for Options
    document.querySelectorAll('.option-card').forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.type;
            const value = card.dataset.value;
            selectOption(type, value);
        });
    });

    // Finish Button
    document.getElementById('finishBtn').addEventListener('click', finishSetup);
});

function selectOption(type, value) {
    if (type === 'language') {
        settings.language = value;
    } else if (type === 'theme') {
        settings.themeMode = value;
    }
    updateUI();
    applyTheme();
}

function updateUI() {
    // Update active states
    document.querySelectorAll('.option-card').forEach(card => {
        card.classList.remove('active');
        const type = card.dataset.type;
        const value = card.dataset.value;

        if (type === 'language' && value === settings.language) {
            card.classList.add('active');
        }
        if (type === 'theme' && value === settings.themeMode) {
            card.classList.add('active');
        }
    });

    // Update Texts
    const t = texts[settings.language];
    document.getElementById('title').textContent = t.title;
    document.getElementById('subtitle').textContent = t.subtitle;
    document.getElementById('labelLanguage').textContent = t.labelLanguage;
    document.getElementById('labelTheme').textContent = t.labelTheme;
    document.getElementById('btnText').textContent = t.btnText;
    
    // Update theme texts in cards
    document.querySelector('[data-value="light"][data-type="theme"] .option-text').textContent = t.themeLight;
    document.querySelector('[data-value="dark"][data-type="theme"] .option-text').textContent = t.themeDark;
    document.querySelector('[data-value="system"][data-type="theme"] .option-text').textContent = t.themeSystem;
}

function applyTheme() {
    const isDark = settings.themeMode === 'dark' || (settings.themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
        document.body.classList.remove('light-theme');
    } else {
        document.body.classList.add('light-theme');
    }
}

async function finishSetup() {
    await chrome.storage.local.set({ settings });
    
    // Close current tab and open dashboard
    chrome.tabs.create({ url: 'dashboard.html' }, () => {
        chrome.tabs.getCurrent(tab => {
            if (tab) chrome.tabs.remove(tab.id);
        });
    });
}

const texts = {
    en: {
        title: 'Welcome to Stash',
        subtitle: 'The minimalist way to save your tabs and clear your mind.',
        labelLanguage: 'LANGUAGE',
        labelTheme: 'THEME',
        themeLight: 'Light',
        themeDark: 'Dark',
        themeSystem: 'System',
        btnText: 'Get Started'
    },
    tr: {
        title: 'Stash\'e Hoş Geldiniz',
        subtitle: 'Sekmelerinizi kaydetmenin ve zihninizi boşaltmanın en minimalist yolu.',
        labelLanguage: 'DİL',
        labelTheme: 'TEMA',
        themeLight: 'Açık',
        themeDark: 'Koyu',
        themeSystem: 'Sistem',
        btnText: 'Başlayalım'
    }
};
