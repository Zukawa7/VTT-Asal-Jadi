// Mobile Navigation (Tailwind CSS Version)
class MobileNav {
  constructor() {
    this.createMenu();
  }

  createMenu() {
    // Only create if we need a mobile nav (example on dashboard or VTT)
    const header = document.querySelector('header');
    if (!header) return;

    const navBtn = document.createElement('button');
    navBtn.className = 'mobile-nav-toggle hidden text-[#d4a544] hover:text-[#e4c183] text-xl p-2';
    navBtn.innerHTML = '☰';
    
    // Quick CSS injection for mobile nav toggle
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        .mobile-nav-toggle { display: block !important; }
        .desktop-nav { display: none !important; }
      }
    `;
    document.head.appendChild(style);

    header.prepend(navBtn);

    const menu = document.createElement('div');
    menu.className = 'fixed top-0 left-0 bottom-0 w-[250px] bg-[#11131f] border-r border-[#26283b] z-[1001] transform -translate-x-full transition-transform duration-300 p-6 shadow-[0px_16px_40px_#000000a0]';
    menu.id = 'mobileMenu';
    menu.innerHTML = `
      <div class="flex justify-between items-center mb-8">
        <span class="font-bold text-white uppercase tracking-wider text-sm" style="font-family: 'EB Garamond', serif;">Menu</span>
        <button id="closeMobileNav" class="text-[#6b7085] hover:text-white text-lg font-bold">✕</button>
      </div>
      <div class="flex flex-col gap-4">
        <a href="/dashboard" class="rounded-md border border-[#26283b] bg-[#11131f] px-4 py-2 text-center text-xs font-bold text-[#a1a7bc] hover:bg-[#181c2c] transition">Dashboard</a>
        <a href="/vtt" class="rounded-md bg-[#d4a544] px-4 py-2 text-center text-xs font-bold text-[#0a0a0f] hover:bg-[#e4c183] transition">VTT</a>
        <a href="/session-dashboard" class="rounded-md border border-[#26283b] bg-[#11131f] px-4 py-2 text-center text-xs font-bold text-[#a1a7bc] hover:bg-[#181c2c] transition">Logs</a>
      </div>
    `;
    document.body.appendChild(menu);

    navBtn.addEventListener('click', () => {
      menu.classList.remove('-translate-x-full');
      if(document.getElementById('mobileBackdrop')) return;
      const backdrop = document.createElement('div');
      backdrop.id = 'mobileBackdrop';
      backdrop.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] transition-opacity duration-300';
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click', () => {
        menu.classList.add('-translate-x-full');
        backdrop.remove();
      });
    });

    menu.querySelector('#closeMobileNav').addEventListener('click', () => {
      menu.classList.add('-translate-x-full');
      document.getElementById('mobileBackdrop')?.remove();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => new MobileNav());
