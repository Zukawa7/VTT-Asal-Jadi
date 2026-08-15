// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  // Ignore if typing in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key === 'd' || e.key === 'D') {
    if (e.shiftKey) {
      if (window.rollDice) window.rollDice(20, 'advantage');
    } else if (e.ctrlKey || e.metaKey) {
      if (window.rollDice) window.rollDice(20, 'disadvantage');
    } else {
      if (window.rollDice) window.rollDice(20);
    }
  } else if (e.key === '1') {
    if (window.rollDice) window.rollDice(4);
  } else if (e.key === '2') {
    if (window.rollDice) window.rollDice(6);
  } else if (e.key === '3') {
    if (window.rollDice) window.rollDice(8);
  } else if (e.key === '4') {
    if (window.rollDice) window.rollDice(10);
  } else if (e.key === '5') {
    if (window.rollDice) window.rollDice(12);
  } else if (e.key === '6') {
    if (window.rollDice) window.rollDice(20);
  } else if (e.key === '0') {
    if (window.rollDice) window.rollDice(100);
  } else if (e.key === 'c' || e.key === 'C') {
    // Toggle character sheet or go to dashboard
    window.location.href = '/dashboard';
  } else if (e.key === '?' || e.key === '/') {
    if (window.VTT && VTT.Modal) {
      new VTT.Modal({
        title: 'Keyboard Shortcuts',
        content: `
          <ul style="list-style: none; padding: 0;">
            <li><kbd>D</kbd> - Roll D20</li>
            <li><kbd>Shift+D</kbd> - Roll D20 (Advantage)</li>
            <li><kbd>Ctrl+D</kbd> - Roll D20 (Disadvantage)</li>
            <li><kbd>1-6</kbd> - Quick roll d4, d6, d8, d10, d12, d20</li>
            <li><kbd>0</kbd> - Roll d100</li>
            <li><kbd>C</kbd> - Open Dashboard</li>
          </ul>
        `
      }).open();
    }
  }
});