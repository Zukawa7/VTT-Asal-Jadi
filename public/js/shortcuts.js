/**
 * Keyboard Shortcuts
 */
document.addEventListener('keydown', (e) => {
  // Ignore shortcuts if typing in an input or textarea
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    return;
  }

  // Helper to trigger button click
  const triggerButton = (selector) => {
    const btn = document.querySelector(selector);
    if (btn) btn.click();
  };

  // Helper to trigger rollDice function if it exists globally
  const callRoll = (dice) => {
    if (typeof window.rollDice === 'function') {
      window.rollDice(dice);
    }
  };

  switch (e.key.toLowerCase()) {
    case 'd':
      if (e.shiftKey) {
        // Shift+D: Advantage (custom roll)
        if (typeof window.executeCustomRoll === 'function') {
          const input = document.getElementById('customRollInput');
          if (input) {
            input.value = '2d20kh1';
            window.executeCustomRoll();
          }
        }
      } else if (e.ctrlKey || e.metaKey) {
        // Ctrl+D: Disadvantage
        if (typeof window.executeCustomRoll === 'function') {
          const input = document.getElementById('customRollInput');
          if (input) {
            input.value = '2d20kl1';
            window.executeCustomRoll();
          }
        }
        e.preventDefault(); // prevent browser bookmark shortcut
      } else {
        // D: Roll d20
        callRoll(20);
      }
      break;
    case '1': callRoll(4); break;
    case '2': callRoll(6); break;
    case '3': callRoll(8); break;
    case '4': callRoll(10); break;
    case '5': callRoll(12); break;
    case '6': callRoll(20); break;
    case '7': callRoll(100); break;
    case '0': callRoll(100); break;
    case 'c':
      // C: Open character sheet or toggle
      if (typeof window.toggleCharSheet === 'function') window.toggleCharSheet();
      break;
    case 's':
      // S: Settings
      e.preventDefault();
      triggerButton('[data-theme-toggle]'); // Just toggling theme as a simple settings proxy
      break;
    case '?':
      // ?: Show Help
      if (window.VTT && VTT.Modal) {
        new VTT.Modal({
          title: 'Keyboard Shortcuts',
          content: `
            <ul style="list-style: none; padding: 0;">
              <li><kbd>D</kbd> - Roll d20</li>
              <li><kbd>Shift+D</kbd> - Roll d20 with Advantage</li>
              <li><kbd>Ctrl+D</kbd> - Roll d20 with Disadvantage</li>
              <li><kbd>1</kbd>-<kbd>7</kbd> - Quick roll d4-d100</li>
              <li><kbd>0</kbd> - Roll d100</li>
              <li><kbd>C</kbd> - Toggle Character Sheet</li>
              <li><kbd>?</kbd> - Show this help menu</li>
            </ul>
          `,
          buttons: [{ label: 'Got it', variant: 'btn-primary' }]
        }).open();
      }
      break;
  }
});