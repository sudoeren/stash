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

document.addEventListener('DOMContentLoaded', async () => {
    // Detect system language
    const browserLang = navigator.language.split('-')[0];
    if (['tr', 'en'].includes(browserLang)) {
        settings.language = browserLang;
        // i18n.js is loaded before this script, so we can set language globally
        if (typeof setLanguage === 'function') {
            setLanguage(settings.language);
        }
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

    // Language Selection
    document.querySelectorAll('[data-type="language"]').forEach(card => {
        card.addEventListener('click', () => {
            const value = card.dataset.value;
            settings.language = value;
            if (typeof setLanguage === 'function') {
                setLanguage(value);
            }
            
            document.querySelectorAll('[data-type="language"]').forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            updateUI(); 
        });
    });

    // Theme Selection
    document.querySelectorAll('[data-type="theme"]').forEach(card => {
        card.addEventListener('click', () => {
            const value = card.dataset.value;
            settings.themeMode = value;

            document.querySelectorAll('[data-type="theme"]').forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            applyTheme();
        });
    });

    // Toggles (Preferences)
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
    
    if (currentStep === 1) {
        backBtn.style.visibility = 'hidden'; 
        backBtn.style.pointerEvents = 'none';
    } else {
        backBtn.style.visibility = 'visible';
        backBtn.style.pointerEvents = 'auto';
        backBtn.querySelector('span').textContent = t('back');
    }

    if (currentStep === totalSteps) {
        nextSpan.textContent = t('finish');
    } else {
        nextSpan.textContent = t('next');
    }
}

function updateUI() {
    // Update i18n texts
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        el.textContent = t(key);
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
