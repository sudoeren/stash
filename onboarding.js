let currentStep = 1;
const totalSteps = 4;

const settings = {
    themeMode: 'system',
    language: 'en',
    closeAfterSave: true,
    includePinned: false,
    autoSave: false,
    autoSaveInterval: 30
};

// Internal translation dictionary for onboarding specific strings
const onboardingTexts = {
    en: {
        stepWelcome: 'Welcome',
        stepFeatures: 'Features',
        stepCustomize: 'Customize',
        stepReady: 'Ready',
        welcomeTitle: 'Welcome to Stash',
        welcomeSubtitle: "Let's set up your experience.",
        featuresTitle: 'What can Stash do?',
        featuresSubtitle: 'Discover how Stash helps you stay organized.',
        feature1Title: 'One-Click Save',
        feature1Desc: 'Instantly save all your open tabs into a clean, organized group.',
        feature2Title: 'Organize Groups',
        feature2Desc: 'Name your groups, search through them, and restore them anytime.',
        feature3Title: 'Auto Save',
        feature3Desc: 'Never lose your work with background auto-save capability.',
        customizeTitle: 'Make it yours',
        customizeSubtitle: 'Customize the look and feel.',
        themeLabel: 'THEME',
        themeLight: 'Light',
        themeDark: 'Dark',
        themeSystem: 'System',
        preferencesLabel: 'PREFERENCES',
        closeAfterSave: 'Close tabs after saving',
        closeAfterSaveDesc: 'Keep browser clean automatically',
        includePinned: 'Include pinned tabs',
        includePinnedDesc: 'Save pinned tabs when stashing',
        autoSave: 'Auto Save',
        autoSaveDesc: 'Backup tabs every 30 minutes',
        readyTitle: "You're all set!",
        readySubtitle: 'Your new minimalist tab manager is ready to use.',
        allDone: 'All Done',
        allDoneDesc: 'You can always change these settings later from the dashboard.',
        back: 'Back',
        next: 'Continue',
        finish: 'Get Started',
        craftedBy: 'Crafted by',
        openSourceMsg: 'This project is open source.',
        sourceCode: 'Source Code'
    },
    tr: {
        stepWelcome: 'Hoş Geldiniz',
        stepFeatures: 'Özellikler',
        stepCustomize: 'Özelleştir',
        stepReady: 'Hazır',
        welcomeTitle: 'Stash\'e Hoş Geldiniz',
        welcomeSubtitle: 'Deneyiminizi ayarlayalım.',
        featuresTitle: 'Stash neler yapabilir?',
        featuresSubtitle: 'Stash\'in düzenli kalmanıza nasıl yardımcı olduğunu keşfedin.',
        feature1Title: 'Tek Tıkla Kaydet',
        feature1Desc: 'Tüm açık sekmelerinizi anında temiz, düzenli bir gruba kaydedin.',
        feature2Title: 'Grupları Düzenle',
        feature2Desc: 'Gruplarınızı isimlendirin, aralarında arama yapın ve istediğiniz zaman geri yükleyin.',
        feature3Title: 'Otomatik Kayıt',
        feature3Desc: 'Arka plan otomatik kayıt özelliği ile çalışmalarınızı asla kaybetmeyin.',
        customizeTitle: 'Sizin olsun',
        customizeSubtitle: 'Görünümü ve hissi özelleştirin.',
        themeLabel: 'TEMA',
        themeLight: 'Açık',
        themeDark: 'Koyu',
        themeSystem: 'Sistem',
        preferencesLabel: 'TERCİHLER',
        closeAfterSave: 'Kayıttan sonra sekmeleri kapat',
        closeAfterSaveDesc: 'Tarayıcınızı otomatik olarak temiz tutun',
        includePinned: 'Sabitlenenleri dahil et',
        includePinnedDesc: 'Stash yaparken sabitlenmiş sekmeleri de kaydet',
        autoSave: 'Otomatik Kayıt',
        autoSaveDesc: 'Her 30 dakikada bir sekmeleri yedekle',
        readyTitle: 'Hazırsınız!',
        readySubtitle: 'Yeni minimalist sekme yöneticiniz kullanıma hazır.',
        allDone: 'Her Şey Tamam',
        allDoneDesc: 'Bu ayarları daha sonra kontrol panelinden değiştirebilirsiniz.',
        back: 'Geri',
        next: 'Devam Et',
        finish: 'Başla',
        craftedBy: 'Geliştirici',
        openSourceMsg: 'Bu proje açık kaynaktır.',
        sourceCode: 'Kaynak Kodu'
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // Detect system language
    const browserLang = navigator.language.split('-')[0];
    if (['tr', 'en'].includes(browserLang)) {
        settings.language = browserLang;
    }

    // Initialize UI
    updateUI();
    applyTheme();
    showStep(1);

    // Event Listeners

    // Navigation Buttons
    document.getElementById('nextBtn').addEventListener('click', () => {
        if (currentStep < totalSteps) {
            showStep(currentStep + 1);
        } else {
            finishSetup();
        }
    });

    document.getElementById('backBtn').addEventListener('click', () => {
        if (currentStep > 1) {
            showStep(currentStep - 1);
        }
    });

    // Language Selection (New Class: lang-card)
    document.querySelectorAll('[data-type="language"]').forEach(card => {
        card.addEventListener('click', () => {
            const value = card.dataset.value;
            settings.language = value;
            
            document.querySelectorAll('[data-type="language"]').forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            updateUI(); 
        });
    });

    // Theme Selection (New Class: theme-option)
    document.querySelectorAll('[data-type="theme"]').forEach(card => {
        card.addEventListener('click', () => {
            const value = card.dataset.value;
            settings.themeMode = value;

            document.querySelectorAll('[data-type="theme"]').forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            applyTheme();
        });
    });

    // Toggles (Preferences) (New Class: pref-row)
    document.getElementById('toggle-closeAfterSave').addEventListener('click', function() {
        this.classList.toggle('active');
        settings.closeAfterSave = this.classList.contains('active');
    });

    document.getElementById('toggle-includePinned').addEventListener('click', function() {
        this.classList.toggle('active');
        settings.includePinned = this.classList.contains('active');
    });

    document.getElementById('toggle-autoSave').addEventListener('click', function() {
        this.classList.toggle('active');
        settings.autoSave = this.classList.contains('active');
    });
});

function showStep(step) {
    if (step < 1 || step > totalSteps) return;
    currentStep = step;

    // Update Sidebar Indicators
    document.querySelectorAll('.step-indicator').forEach(el => {
        const s = parseInt(el.dataset.step);
        el.classList.remove('active', 'completed');
        if (s === currentStep) {
            el.classList.add('active');
        } else if (s < currentStep) {
            el.classList.add('completed');
        }
    });

    // Show/Hide Panels
    document.querySelectorAll('.step-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`panel-${step}`).classList.add('active');

    // Update Buttons
    const backBtn = document.getElementById('backBtn');
    const nextBtn = document.getElementById('nextBtn');
    const nextSpan = nextBtn.querySelector('span');
    
    const lang = settings.language;
    const t = onboardingTexts[lang];

    if (currentStep === 1) {
        backBtn.style.visibility = 'hidden'; 
        backBtn.style.pointerEvents = 'none';
    } else {
        backBtn.style.visibility = 'visible';
        backBtn.style.pointerEvents = 'auto';
        backBtn.querySelector('span').textContent = t.back;
    }

    if (currentStep === totalSteps) {
        nextSpan.textContent = t.finish;
        // nextBtn icon stays same or can be hidden if desired
    } else {
        nextSpan.textContent = t.next;
    }
}

function updateUI() {
    const lang = settings.language;
    const t = onboardingTexts[lang];

    // Update i18n texts
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key]) {
            el.textContent = t[key];
        }
    });

    // Update Active States
    
    // Language
    document.querySelectorAll('[data-type="language"]').forEach(c => {
        c.classList.remove('active');
        if (c.dataset.value === settings.language) c.classList.add('active');
    });

    // Theme
    document.querySelectorAll('[data-type="theme"]').forEach(c => {
        c.classList.remove('active');
        if (c.dataset.value === settings.themeMode) c.classList.add('active');
    });

    // Toggles
    const toggleClose = document.getElementById('toggle-closeAfterSave');
    if (settings.closeAfterSave) toggleClose.classList.add('active');
    else toggleClose.classList.remove('active');

    const togglePinned = document.getElementById('toggle-includePinned');
    if (settings.includePinned) togglePinned.classList.add('active');
    else togglePinned.classList.remove('active');

    const toggleAutoSave = document.getElementById('toggle-autoSave');
    if (settings.autoSave) toggleAutoSave.classList.add('active');
    else toggleAutoSave.classList.remove('active');
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
    chrome.tabs.create({ url: 'dashboard.html' }, () => {
        chrome.tabs.getCurrent(tab => {
            if (tab) chrome.tabs.remove(tab.id);
        });
    });
}