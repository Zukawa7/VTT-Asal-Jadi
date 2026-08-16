class ThemeToggle {
  constructor() {
    this.key = 'vtt-theme';
    this.current = localStorage.getItem(this.key) || 'dark';
    this.init();
  }

  init() {
    this.apply();
    this.setupButton();
  }

  apply() {
    document.documentElement.setAttribute('data-theme', this.current);
    localStorage.setItem(this.key, this.current);
    
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', this.current === 'light' ? '#F5F1E8' : '#1A1617');
    }
  }

  setupButton() {
    const btn = document.querySelector('[data-theme-toggle]');
    if (btn) {
      const icon = btn.querySelector('i');
      const text = btn.querySelector('span');
      if (icon && text) {
        if (this.current === 'dark') {
          icon.setAttribute('data-lucide', 'sun');
          text.textContent = 'LIGHT MODE';
        } else {
          icon.setAttribute('data-lucide', 'moon');
          text.textContent = 'DARK MODE';
        }
        if (window.lucide) {
          window.lucide.createIcons();
        }
      } else {
        btn.innerHTML = this.current === 'dark' ? '☀️' : '🌙';
      }
      
      // Replace button to remove old event listeners safely
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => this.toggle());
    }
  }

  toggle() {
    this.current = this.current === 'dark' ? 'light' : 'dark';
    this.apply();
    this.setupButton();
  }
}

new ThemeToggle();
