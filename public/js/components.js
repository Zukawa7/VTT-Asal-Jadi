/**
 * VTT Component Library
 * Reusable UI Components (Tailwind CSS Version)
 */

window.VTT = window.VTT || {};

// ===== MODAL =====
VTT.Modal = class {
  constructor(options = {}) {
    this.title = options.title || 'Dialog';
    this.content = options.content || '';
    this.buttons = options.buttons || [];
  }

  open() {
    const backdrop = document.createElement('div');
    backdrop.className =
      'fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] transition-opacity duration-300';
    backdrop.id = 'modalBackdrop';

    const dialog = document.createElement('div');
    dialog.className =
      'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001] w-[90%] max-w-[500px] rounded-2xl border border-[#26283b] bg-[#11131f] p-0 shadow-[0px_16px_40px_#000000a0] flex flex-col overflow-hidden';
    dialog.style.transform = 'translate(-50%, -50%)';

    const corners = `
      <span aria-hidden="true" class="absolute h-3 w-3 border-[#d4a544] top-1.5 left-1.5 border-t-2 border-l-2 pointer-events-none"></span>
      <span aria-hidden="true" class="absolute h-3 w-3 border-[#d4a544] top-1.5 right-1.5 border-t-2 border-r-2 pointer-events-none"></span>
      <span aria-hidden="true" class="absolute h-3 w-3 border-[#d4a544] bottom-1.5 left-1.5 border-b-2 border-l-2 pointer-events-none"></span>
      <span aria-hidden="true" class="absolute h-3 w-3 border-[#d4a544] right-1.5 bottom-1.5 border-r-2 border-b-2 pointer-events-none"></span>
    `;

    dialog.innerHTML = `
      ${corners}
      <div class="flex items-center justify-between px-6 py-4 border-b border-[#26283b]">
        <h2 class="text-sm font-bold text-white uppercase tracking-wider" style="font-family: 'EB Garamond', serif;">${this.title}</h2>
        <button class="text-[#6b7085] hover:text-white text-lg font-bold" id="modalClose">×</button>
      </div>
      <div class="p-6 max-h-[70vh] overflow-y-auto text-sm text-[#a1a7bc]">
        ${this.content}
      </div>
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-[#26283b]/50 bg-[#0d0e15]/50">
        ${this.buttons
          .map((btn, i) => {
            const btnClass =
              btn.variant === 'btn-accent' || btn.variant === 'btn-primary'
                ? 'rounded-md bg-[#d4a544] px-4 py-2 text-xs font-bold text-[#0a0a0f] hover:bg-[#e4c183] transition'
                : 'rounded-md border border-[#26283b] bg-[#11131f] px-4 py-2 text-xs font-bold text-[#a1a7bc] hover:bg-[#181c2c] transition';
            return `
            <button class="${btnClass}" data-action="${i}">
              ${btn.label}
            </button>
          `;
          })
          .join('')}
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);

    const closeBtn = dialog.querySelector('#modalClose');
    closeBtn?.addEventListener('click', () => this.close());
    backdrop?.addEventListener('click', () => this.close());

    dialog.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.action);
        this.buttons[idx]?.onClick?.();
        this.close();
      });
    });

    this.modal = dialog;
    window.hpModal = this; // backward compatibility for hpModal.close()
  }

  close() {
    this.modal?.remove();
    document.getElementById('modalBackdrop')?.remove();
  }
};

// ===== NOTIFICATION =====
VTT.Notification = class {
  constructor(message, type = 'info', duration = 5000) {
    let container = document.querySelector('.notification-container');
    if (!container) {
      container = document.createElement('div');
      container.className =
        'notification-container fixed top-6 right-6 z-[1002] flex flex-col gap-4 max-w-[400px] w-[90%] pointer-events-none';
      document.body.appendChild(container);
    }

    const icon = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }[type] || 'ℹ️';
    const borderColors =
      {
        success: 'border-l-green-500',
        error: 'border-l-red-500',
        warning: 'border-l-yellow-500',
        info: 'border-l-blue-500',
      }[type] || 'border-l-blue-500';

    const notif = document.createElement('div');
    notif.className = `pointer-events-auto flex items-center gap-3 p-4 rounded-xl border border-[#26283b] border-l-4 ${borderColors} bg-[#11131f]/95 backdrop-blur-md shadow-[0px_8px_32px_rgba(0,0,0,0.8)] relative overflow-hidden transition-all duration-300`;

    notif.innerHTML = `
      <span style="font-size: 1.25rem;">${icon}</span>
      <span class="text-xs text-[#a1a7bc]">${message}</span>
      <button class="text-[#6b7085] hover:text-white font-bold ml-auto" style="width: 24px; height: 24px; padding: 0;">×</button>
    `;

    container.appendChild(notif);

    notif.querySelector('button').addEventListener('click', () => {
      notif.classList.add('opacity-0');
      setTimeout(() => notif.remove(), 300);
    });

    if (duration > 0) {
      setTimeout(() => {
        notif.classList.add('opacity-0');
        setTimeout(() => notif.remove(), 300);
      }, duration);
    }
  }

  static success(msg) {
    new VTT.Notification(msg, 'success', 3000);
  }
  static error(msg) {
    new VTT.Notification(msg, 'error', 5000);
  }
  static info(msg) {
    new VTT.Notification(msg, 'info', 4000);
  }
  static warning(msg) {
    new VTT.Notification(msg, 'warning', 4000);
  }
};

// ===== TABS =====
VTT.Tabs = class {
  constructor(container) {
    this.container = container;
    this.tabs = container.querySelectorAll('[data-tab]');
    this.contents = container.querySelectorAll('[data-tab-content]');

    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const name = tab.dataset.tab;
        this.switch(name);
      });
    });
  }

  switch(name) {
    this.tabs.forEach((t) => t.classList.remove('active'));
    this.contents.forEach((c) => c.classList.add('hidden'));

    this.container.querySelector(`[data-tab="${name}"]`)?.classList.add('active');
    this.container.querySelector(`[data-tab-content="${name}"]`)?.classList.remove('hidden');
  }
};

// ===== CONFIRM DIALOG =====
VTT.Confirm = {
  ask: async (message, title = 'Confirm') => {
    return new Promise((resolve) => {
      const modal = new VTT.Modal({
        title,
        content: message,
        buttons: [
          { label: 'Cancel', variant: 'btn-secondary', onClick: () => resolve(false) },
          { label: 'Confirm', variant: 'btn-accent', onClick: () => resolve(true) },
        ],
      });
      modal.open();
    });
  },
};

// ===== UTILITIES =====
// Small helpers that other views can reuse
window.signed = window.signed || function (n) {
  // Return "+N" for non-negative numbers, otherwise return the number string
  if (typeof n === 'number') return n >= 0 ? '+' + n : String(n);
  const parsed = Number(n);
  if (!Number.isFinite(parsed)) return String(n);
  return parsed >= 0 ? '+' + parsed : String(parsed);
};
