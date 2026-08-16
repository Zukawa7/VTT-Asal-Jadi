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
          <ul class="space-y-2 font-mono text-xs text-[#a2a7bd]">
            <li class="flex justify-between items-center"><span>Roll D20</span><span><kbd class="bg-[#0b0c12] border border-[#26293c] px-1.5 py-0.5 rounded text-white font-bold">D</kbd></span></li>
            <li class="flex justify-between items-center"><span>Roll D20 (Advantage)</span><span><kbd class="bg-[#0b0c12] border border-[#26293c] px-1.5 py-0.5 rounded text-white font-bold">Shift+D</kbd></span></li>
            <li class="flex justify-between items-center"><span>Roll D20 (Disadvantage)</span><span><kbd class="bg-[#0b0c12] border border-[#26293c] px-1.5 py-0.5 rounded text-white font-bold">Ctrl+D</kbd></span></li>
            <li class="flex justify-between items-center"><span>Quick roll d4, d6, d8, d10, d12, d20</span><span><kbd class="bg-[#0b0c12] border border-[#26293c] px-1.5 py-0.5 rounded text-white font-bold">1-6</kbd></span></li>
            <li class="flex justify-between items-center"><span>Roll d100</span><span><kbd class="bg-[#0b0c12] border border-[#26293c] px-1.5 py-0.5 rounded text-white font-bold">0</kbd></span></li>
            <li class="flex justify-between items-center"><span>Open Dashboard</span><span><kbd class="bg-[#0b0c12] border border-[#26293c] px-1.5 py-0.5 rounded text-white font-bold">C</kbd></span></li>
          </ul>
        `
      }).open();
    }
  }
});