// Mobile Navigation
class MobileNav {
  constructor() {
    this.createMenu();
  }

  createMenu() {
    // Only create if we need a mobile nav (example on dashboard or VTT)
    const header = document.querySelector('header');
    if (!header) return;

    const navBtn = document.createElement('button');
    navBtn.className = 'btn btn-ghost lg-hidden';
    navBtn.innerHTML = '☰';
    navBtn.style.display = 'none'; // Will be handled by CSS media query
    
    // Quick CSS injection for mobile nav toggle
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        .mobile-nav-toggle { display: block !important; }
        .desktop-nav { display: none !important; }
      }
      .mobile-menu {
        position: fixed; top: 0; left: 0; bottom: 0; width: 250px;
        background: var(--bg-secondary); z-index: var(--z-modal);
        transform: translateX(-100%); transition: transform 0.3s;
        padding: var(--space-md);
      }
      .mobile-menu.open { transform: translateX(0); }
    `;
    document.head.appendChild(style);

    navBtn.classList.add('mobile-nav-toggle');
    header.prepend(navBtn);

    const menu = document.createElement('div');
    menu.className = 'mobile-menu shadow-lg border-r border-gray-800';
    menu.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom: 2rem;">
        <span style="font-weight:bold; color:var(--primary);">Menu</span>
        <button id="closeMobileNav" class="btn btn-ghost">✕</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:1rem;">
        <a href="/dashboard" class="btn btn-secondary">Dashboard</a>
        <a href="/vtt" class="btn btn-accent">VTT</a>
        <a href="/session-dashboard" class="btn btn-secondary">Logs</a>
      </div>
    `;
    document.body.appendChild(menu);

    navBtn.addEventListener('click', () => {
      menu.classList.add('open');
      if(document.getElementById('modalBackdrop')) return;
      const backdrop = document.createElement('div');
      backdrop.id = 'mobileBackdrop';
      backdrop.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:999;';
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click', () => {
        menu.classList.remove('open');
        backdrop.remove();
      });
    });

    menu.querySelector('#closeMobileNav').addEventListener('click', () => {
      menu.classList.remove('open');
      document.getElementById('mobileBackdrop')?.remove();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => new MobileNav());
