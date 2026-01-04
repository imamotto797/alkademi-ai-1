/**
 * Theme Manager - Handles dark/light mode toggling
 */
class ThemeManager {
    constructor() {
        this.themeKey = 'alkademi-theme';
        this.darkClassName = 'dark-mode';
        this.init();
    }

    init() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        themeToggle.addEventListener('click', () => this.toggleTheme());
        this.updateToggleIcon();
    }

    toggleTheme() {
        const isDarkMode = document.body.classList.toggle(this.darkClassName);
        localStorage.setItem(this.themeKey, isDarkMode ? 'dark' : 'light');
        this.updateToggleIcon();
    }

    updateToggleIcon() {
        const themeToggle = document.getElementById('themeToggle');
        const icon = themeToggle?.querySelector('.theme-toggle-icon');
        const label = themeToggle?.querySelector('.theme-label');
        
        const isDarkMode = document.body.classList.contains(this.darkClassName);
        
        if (icon) icon.textContent = isDarkMode ? '☀️' : '🌙';
        if (label) label.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
    }

    getCurrentTheme() {
        return document.body.classList.contains(this.darkClassName) ? 'dark' : 'light';
    }
}

// Initialize theme manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ThemeManager();
    });
} else {
    new ThemeManager();
}
