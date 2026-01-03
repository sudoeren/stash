document.addEventListener('DOMContentLoaded', async () => {
    const languageSelect = document.getElementById('languageSelect');
    const themeSelect = document.getElementById('themeSelect');
    const finishBtn = document.getElementById('finishBtn');

    // Default settings
    let settings = {
        themeMode: 'system',
        language: 'en',
        closeAfterSave: true,
        includePinned: false
    };

    // Load existing settings if any
    const stored = await chrome.storage.local.get('settings');
    if (stored.settings) {
        settings = { ...settings, ...stored.settings };
    } else {
        // Try to detect browser language
        const browserLang = navigator.language.split('-')[0];
        if (['tr', 'en'].includes(browserLang)) {
            settings.language = browserLang;
        }
    }

    // Set initial values
    languageSelect.value = settings.language;
    themeSelect.value = settings.themeMode;
    applyTheme(settings.themeMode);
    updateTexts(settings.language);

    // Event Listeners
    languageSelect.addEventListener('change', (e) => {
        settings.language = e.target.value;
        updateTexts(settings.language);
    });

    themeSelect.addEventListener('change', (e) => {
        settings.themeMode = e.target.value;
        applyTheme(settings.themeMode);
    });

    finishBtn.addEventListener('click', async () => {
        await chrome.storage.local.set({ settings });
        // Close tab
        chrome.tabs.getCurrent(tab => {
            chrome.tabs.remove(tab.id);
        });
        // Or redirect to dashboard if prefered
         chrome.tabs.create({ url: 'dashboard.html' });
    });
});

function applyTheme(mode) {
    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
        document.body.classList.remove('light-theme');
    } else {
        document.body.classList.add('light-theme');
    }
}

const texts = {
    en: {
        title: 'Welcome to Stash',
        subtitle: 'Save your tabs with one click. Let\'s get you set up.',
        labelLanguage: 'Language',
        labelTheme: 'Theme',
        btnText: 'Get Started'
    },
    tr: {
        title: 'Stash\'e Hoş Geldiniz',
        subtitle: 'Sekmelerinizi tek tıkla kaydedin. Hadi başlayalım.',
        labelLanguage: 'Dil',
        labelTheme: 'Tema',
        btnText: 'Başlayın'
    }
};

function updateTexts(lang) {
    const t = texts[lang] || texts.en;
    document.getElementById('title').textContent = t.title;
    document.getElementById('subtitle').textContent = t.subtitle;
    document.getElementById('labelLanguage').textContent = t.labelLanguage;
    document.getElementById('labelTheme').textContent = t.labelTheme;
    document.getElementById('btnText').textContent = t.btnText;
}
