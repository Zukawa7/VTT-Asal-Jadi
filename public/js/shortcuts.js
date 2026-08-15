/**
 * Keyboard Shortcuts
 */
document.addEventListener('keydown', (e) => {
  // Don't trigger if typing in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const key = e.key.toLowerCase();
  
  if (key === 'd') {
    if (e.shiftKey) {
      // Advantage
      if (window.parseAndRoll && window.currentCharacter) {
        const parsed = window.parseAndRoll('2d20h1');
        if (parsed) {
          window.socket.emit('send-roll', {
            roomId: window.currentRoom,
            characterName: window.currentCharacter.name,
            characterAvatar: window.currentCharacter.avatarUrl,
            rollName: 'Advantage Roll',
            formula: parsed.formula,
            result: parsed.result,
            rolls: parsed.rolls,
            modifier: 0
          });
        }
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Disadvantage
      if (window.parseAndRoll && window.currentCharacter) {
        const parsed = window.parseAndRoll('2d20l1');
        if (parsed) {
          window.socket.emit('send-roll', {
            roomId: window.currentRoom,
            characterName: window.currentCharacter.name,
            characterAvatar: window.currentCharacter.avatarUrl,
            rollName: 'Disadvantage Roll',
            formula: parsed.formula,
            result: parsed.result,
            rolls: parsed.rolls,
            modifier: 0
          });
        }
      }
    } else {
      // Normal d20
      if (window.rollDice) window.rollDice(20);
    }
  } else if (key >= '1' && key <= '7') {
    // Quick rolls
    const diceMap = { '1': 4, '2': 6, '3': 8, '4': 10, '5': 12, '6': 20, '7': 100 };
    if (window.rollDice && diceMap[key]) window.rollDice(diceMap[key]);
  } else if (key === '0') {
    if (window.rollDice) window.rollDice(100);
  } else if (key === 'c') {
    // Toggle custom roll
    if (window.openCustomRoll) {
      e.preventDefault();
      window.openCustomRoll();
    }
  }
});