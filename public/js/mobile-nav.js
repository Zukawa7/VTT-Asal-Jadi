/**
 * Mobile Navigation (Hamburger Menu)
 */
document.addEventListener('DOMContentLoaded', () => {
  // Try to find an existing mobile menu or create one
  let mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const desktopNav = document.querySelector('.desktop-nav');
  
  if (!mobileMenuBtn && desktopNav) {
    // Create Hamburger Button
    mobileMenuBtn = document.createElement('button');
    mobileMenuBtn.id = 'mobileMenuBtn';
    mobileMenuBtn.className = 'btn btn-ghost lg:hidden';
    mobileMenuBtn.innerHTML = '☰';
    mobileMenuBtn.style.fontSize = '1.5rem';
    mobileMenuBtn.style.padding = '0.5rem';
    
    // Insert into header
    const headerRow = desktopNav.parentElement;
    if (headerRow) {
      headerRow.insertBefore(mobileMenuBtn, desktopNav);
    }
  }

  if (mobileMenuBtn && desktopNav) {
    // Hide desktop nav on small screens initially if not already handled by CSS
    desktopNav.classList.add('hidden', 'lg:flex');
    
    mobileMenuBtn.addEventListener('click', () => {
      desktopNav.classList.toggle('hidden');
      if (!desktopNav.classList.contains('hidden')) {
        desktopNav.style.flexDirection = 'column';
        desktopNav.style.position = 'absolute';
        desktopNav.style.top = '100%';
        desktopNav.style.left = '0';
        desktopNav.style.right = '0';
        desktopNav.style.backgroundColor = 'var(--bg-secondary)';
        desktopNav.style.padding = 'var(--space-md)';
        desktopNav.style.borderBottom = '1px solid var(--border-primary)';
        desktopNav.style.zIndex = 'var(--z-dropdown)';
        desktopNav.classList.add('animate-slideInDown');
      } else {
        desktopNav.style.position = '';
        desktopNav.style.flexDirection = '';
        desktopNav.classList.remove('animate-slideInDown');
      }
    });
  }
});
