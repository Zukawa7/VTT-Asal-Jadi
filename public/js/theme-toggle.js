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
      btn.innerHTML = this.current === 'dark' ? '☀️' : '🌙';
      btn.addEventListener('click', () => this.toggle());
    }
  }

  toggle() {
    this.current = this.current === 'dark' ? 'light' : 'dark';
    this.apply();
    this.setupButton();
  }
}

new ThemeToggle();