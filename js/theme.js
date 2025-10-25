// Theme Management Module
// Handles light/dark mode switching

const Theme = {
    init() {
        // Load saved theme preference
        const preferences = Storage.getPreferences();
        this.setTheme(preferences.theme || 'light');

        // Set up theme toggle button
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (preferences.autoTheme) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    },

    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);

        // Save preference
        const preferences = Storage.getPreferences();
        preferences.theme = theme;
        Storage.savePreferences(preferences);

        // Update button appearance if needed
        this.updateToggleButton(theme);
    },

    toggle() {
        const currentTheme = this.getCurrentTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    },

    updateToggleButton(theme) {
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.setAttribute('title', theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode');
        }
    }
};
