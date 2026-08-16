class ThemeToggle {
  constructor() {
    this.init();
  }

  init() {
    // Always force dark theme to match the template's dark obsidian design
    document.documentElement.setAttribute('data-theme', 'dark');
    
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', '#0a0b10');
    }

    this.setupButton();
  }

  setupButton() {
    const btn = document.querySelector('[data-theme-toggle]');
    if (btn) {
      const icon = btn.querySelector('i');
      const text = btn.querySelector('span');
      if (icon && text) {
        icon.setAttribute('data-lucide', 'moon');
        text.textContent = 'DARK MODE';
        if (window.lucide) {
          window.lucide.createIcons();
        }
      } else {
        btn.innerHTML = '🌙';
      }
      
      // Remove any existing click event listener by replacing the button
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    }
  }
}

new ThemeToggle();
