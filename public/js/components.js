/**
 * VTT Component Library
 * Reusable UI Components
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
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'modalBackdrop';
    
    const dialog = document.createElement('div');
    dialog.className = 'modal card animate-slideInUp';
    dialog.style.maxWidth = '500px';
    dialog.style.position = 'fixed';
    dialog.style.top = '50%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.zIndex = 'var(--z-modal)';
    
    dialog.innerHTML = `
      <div class="card-header">
        <h2 class="card-title">${this.title}</h2>
        <button class="btn btn-ghost" id="modalClose">×</button>
      </div>
      <div style="padding: var(--space-lg); max-height: 70vh; overflow-y: auto;">
        ${this.content}
      </div>
      <div class="card-footer flex" style="justify-content: flex-end; gap: var(--space-md);">
        ${this.buttons.map((btn, i) => `
          <button class="btn ${btn.variant || 'btn-secondary'}" data-action="${i}">
            ${btn.label}
          </button>
        `).join('')}
      </div>
    `;
    
    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);
    
    const closeBtn = dialog.querySelector('#modalClose');
    closeBtn?.addEventListener('click', () => this.close());
    backdrop?.addEventListener('click', () => this.close());
    
    dialog.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.action);
        this.buttons[idx]?.onClick?.();
        this.close();
      });
    });
    
    this.modal = dialog;
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
      container.className = 'notification-container';
      container.style.position = 'fixed';
      container.style.top = '1.5rem';
      container.style.right = '1.5rem';
      container.style.zIndex = 'var(--z-notification)';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '1rem';
      container.style.maxWidth = '400px';
      document.body.appendChild(container);
    }

    const icon = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }[type] || 'ℹ️';
    
    const notif = document.createElement('div');
    notif.className = `notification notification-${type} animate-slideInDown`;
    notif.style.display = 'flex';
    notif.style.alignItems = 'center';
    notif.style.gap = '1rem';
    notif.style.padding = '1rem 1.5rem';
    notif.style.backgroundColor = 'var(--bg-secondary)';
    notif.style.borderLeft = `4px solid var(--${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'})`;
    notif.style.borderRadius = 'var(--radius-md)';
    notif.style.boxShadow = 'var(--shadow-lg)';
    
    notif.innerHTML = `
      <span style="font-size: 1.25rem;">${icon}</span>
      <span>${message}</span>
      <button class="btn btn-ghost" style="margin-left: auto; width: 24px; height: 24px; padding: 0;">×</button>
    `;
    
    container.appendChild(notif);
    
    notif.querySelector('button').addEventListener('click', () => {
      notif.classList.add('animate-fadeOut');
      setTimeout(() => notif.remove(), 300);
    });
    
    if (duration > 0) {
      setTimeout(() => {
        notif.classList.add('animate-fadeOut');
        setTimeout(() => notif.remove(), 300);
      }, duration);
    }
  }

  static success(msg) { new VTT.Notification(msg, 'success', 3000); }
  static error(msg) { new VTT.Notification(msg, 'error', 5000); }
  static info(msg) { new VTT.Notification(msg, 'info', 4000); }
  static warning(msg) { new VTT.Notification(msg, 'warning', 4000); }
};

// ===== TABS =====
VTT.Tabs = class {
  constructor(container) {
    this.container = container;
    this.tabs = container.querySelectorAll('[data-tab]');
    this.contents = container.querySelectorAll('[data-tab-content]');
    
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const name = tab.dataset.tab;
        this.switch(name);
      });
    });
  }

  switch(name) {
    this.tabs.forEach(t => t.classList.remove('active'));
    this.contents.forEach(c => c.classList.add('hidden'));
    
    this.container.querySelector(\`[data-tab="${name}"]\`)?.classList.add('active');
    this.container.querySelector(\`[data-tab-content="${name}"]\`)?.classList.remove('hidden');
  }
};

// ===== CONFIRM DIALOG =====
VTT.Confirm = {
  ask: async (message, title = 'Confirm') => {
    return new Promise(resolve => {
      const modal = new VTT.Modal({
        title,
        content: message,
        buttons: [
          { label: 'Cancel', variant: 'btn-secondary', onClick: () => resolve(false) },
          { label: 'Confirm', variant: 'btn-accent', onClick: () => resolve(true) }
        ]
      });
      modal.open();
    });
  }
};

// CSS Styles for components
const styles = `
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: var(--z-modal-backdrop);
  animation: fadeIn var(--transition-base);
}

.notification-container {
  pointer-events: none;
}

.notification {
  pointer-events: all;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
