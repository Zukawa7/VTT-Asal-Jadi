// Socket Connection
const socket = io();

// State
let currentCharacter = null;
let currentRoom = 'default-room';

// DOM Elements
const roomIdInput = document.getElementById('roomIdInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const charIdInput = document.getElementById('charIdInput');
const importBtn = document.getElementById('importBtn');
const importBtnText = document.getElementById('importBtnText');
const importSpinner = document.getElementById('importSpinner');
const importError = document.getElementById('importError');

const charSheet = document.getElementById('charSheet');
const charPlaceholder = document.getElementById('charPlaceholder');
const charAvatar = document.getElementById('charAvatar');
const charName = document.getElementById('charName');
const charSub = document.getElementById('charSub');
const charCurrentHp = document.getElementById('charCurrentHp');
const charMaxHp = document.getElementById('charMaxHp');
const charTempHp = document.getElementById('charTempHp');
const charTempHpContainer = document.getElementById('charTempHpContainer');
const hpBar = document.getElementById('hpBar');

const customRollForm = document.getElementById('customRollForm');
const customRollInput = document.getElementById('customRollInput');
const obsUrlInput = document.getElementById('obsUrlInput');
const logContainer = document.getElementById('logContainer');

// Init OBS URL & Join Default Room
updateObsUrl();
joinRoom();

// Event Listeners
joinRoomBtn.addEventListener('click', () => {
  currentRoom = roomIdInput.value.trim() || 'default-room';
  joinRoom();
  updateObsUrl();
});

importBtn.addEventListener('click', importCharacter);

// Socket Event Handlers
function joinRoom() {
  socket.emit('join-room', currentRoom);
  addLogMessage({
    system: true,
    text: `Connected to room: "${currentRoom}"`
  });
}

socket.on('new-roll', (data) => {
  addLogMessage(data);
});

// Import Character function
async function importCharacter() {
  const charId = charIdInput.value.trim();
  if (!charId) {
    showImportError('Please enter a valid Character ID');
    return;
  }

  // UI state: loading
  importBtn.disabled = true;
  importBtnText.textContent = 'Importing...';
  importSpinner.classList.remove('hidden');
  importError.classList.add('hidden');

  try {
    const response = await fetch(`/api/character/${charId}`);
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to fetch character');
    }

    const data = await response.json();
    currentCharacter = data;
    renderCharacterSheet(data);
    
    addLogMessage({
      system: true,
      text: `Character "${data.name}" (${data.race} ${data.classes.map(c => `${c.name} ${c.level}`).join('/')}) imported successfully!`
    });

  } catch (err) {
    console.error(err);
    showImportError(err.message || 'An error occurred while importing. Please double-check the ID.');
  } finally {
    importBtn.disabled = false;
    importBtnText.textContent = 'Import';
    importSpinner.classList.add('hidden');
  }
}

function showImportError(msg) {
  importError.textContent = msg;
  importError.classList.remove('hidden');
}

// Render character details to UI
function renderCharacterSheet(char) {
  charPlaceholder.classList.add('hidden');
  charSheet.classList.remove('hidden');

  charAvatar.src = char.avatarUrl;
  charName.textContent = char.name;
  
  const classStr = char.classes.map(c => `${c.name} ${c.level}`).join('/') + ` (Level ${char.level})`;
  charSub.textContent = `${char.race} | ${classStr}`;

  charCurrentHp.textContent = char.hp.current;
  charMaxHp.textContent = char.hp.max;
  
  if (char.hp.temp > 0) {
    charTempHp.textContent = char.hp.temp;
    charTempHpContainer.classList.remove('hidden');
  } else {
    charTempHpContainer.classList.add('hidden');
  }

  // Calculate HP bar percentage
  const hpPercent = Math.max(0, Math.min(100, (char.hp.current / char.hp.max) * 100));
  hpBar.style.width = `${hpPercent}%`;
  
  // Color HP bar based on health
  if (hpPercent < 25) {
    hpBar.className = 'bg-red-600 h-full transition-all duration-300';
  } else if (hpPercent < 50) {
    hpBar.className = 'bg-yellow-500 h-full transition-all duration-300';
  } else {
    hpBar.className = 'bg-green-500 h-full transition-all duration-300';
  }

  // Render Stats
  const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  stats.forEach(stat => {
    const scoreEl = document.getElementById(`statScore-${stat}`);
    const modEl = document.getElementById(`statMod-${stat}`);
    
    if (scoreEl && modEl) {
      scoreEl.textContent = char.stats[stat];
      const mod = char.modifiers[stat];
      modEl.textContent = mod >= 0 ? `+${mod}` : mod;
    }
  });
}

// Roll logic
window.rollStat = function(statLabel, statKey) {
  if (!currentCharacter) return;
  
  const modifier = currentCharacter.modifiers[statKey];
  const roll = Math.floor(Math.random() * 20) + 1;
  const total = roll + modifier;
  const sign = modifier >= 0 ? '+' : '';
  const formula = `1d20${sign}${modifier}`;

  const rollData = {
    roomId: currentRoom,
    characterName: currentCharacter.name,
    characterAvatar: currentCharacter.avatarUrl,
    rollName: `${statLabel} Check`,
    formula: formula,
    result: total,
    rolls: [roll],
    modifier: modifier
  };

  socket.emit('send-roll', rollData);
};

window.rollDice = function(sides) {
  const roll = Math.floor(Math.random() * sides) + 1;
  const name = currentCharacter ? currentCharacter.name : 'Adventurer';
  const avatar = currentCharacter ? currentCharacter.avatarUrl : 'https://www.dndbeyond.com/content/skins/waterdeep/images/characters/default-avatar.png';

  const rollData = {
    roomId: currentRoom,
    characterName: name,
    characterAvatar: avatar,
    rollName: `d${sides} Roll`,
    formula: `1d${sides}`,
    result: roll,
    rolls: [roll],
    modifier: 0
  };

  socket.emit('send-roll', rollData);
};

window.openCustomRoll = function() {
  customRollForm.classList.toggle('hidden');
  if (!customRollForm.classList.contains('hidden')) {
    customRollInput.focus();
  }
};

window.executeCustomRoll = function() {
  const formula = customRollInput.value.trim();
  if (!formula) return;

  const parsed = parseAndRoll(formula);
  if (!parsed) {
    alert('Invalid roll formula. Use format like: 2d6+4, d20, 1d100-5');
    return;
  }

  const name = currentCharacter ? currentCharacter.name : 'Adventurer';
  const avatar = currentCharacter ? currentCharacter.avatarUrl : 'https://www.dndbeyond.com/content/skins/waterdeep/images/characters/default-avatar.png';

  const rollData = {
    roomId: currentRoom,
    characterName: name,
    characterAvatar: avatar,
    rollName: 'Custom Roll',
    formula: parsed.formula,
    result: parsed.result,
    rolls: parsed.rolls,
    modifier: parsed.modifier
  };

  socket.emit('send-roll', rollData);
  customRollInput.value = '';
};

// Dice parser helper
function parseAndRoll(formula) {
  const cleanFormula = formula.replace(/\s+/g, '').toLowerCase();
  const match = cleanFormula.match(/^(\d*)d(\d+)([\+\-]\d+)?$/);
  if (!match) return null;
  
  const count = match[1] ? parseInt(match[1]) : 1;
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;
  
  if (count <= 0 || count > 100 || sides <= 0 || sides > 1000) return null;

  const rolls = [];
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    sum += roll;
  }
  
  const result = sum + modifier;
  
  return {
    formula: `${count}d${sides}${modifier !== 0 ? (modifier > 0 ? '+' + modifier : modifier) : ''}`,
    count,
    sides,
    modifier,
    rolls,
    result
  };
}

// Log view management
function addLogMessage(data) {
  // Remove placeholder if it exists
  if (logContainer.querySelector('.italic')) {
    logContainer.innerHTML = '';
  }

  const msgEl = document.createElement('div');
  msgEl.className = 'border-b border-gray-800/60 pb-2 mb-2 last:border-b-0';

  if (data.system) {
    msgEl.innerHTML = `<span class="text-amber-500 font-bold">[SYSTEM]</span> <span class="text-gray-300">${data.text}</span>`;
  } else {
    const avatarImg = `<img src="${data.characterAvatar}" class="w-5 h-5 rounded-full inline-block mr-1.5 align-middle object-cover">`;
    const rollsList = `(${data.rolls.join(', ')})`;
    const modStr = data.modifier ? (data.modifier >= 0 ? ` + ${data.modifier}` : ` - ${Math.abs(data.modifier)}`) : '';
    
    msgEl.innerHTML = `
      <div class="flex items-center gap-1 text-xs text-gray-400">
        ${avatarImg}
        <span class="font-bold text-gray-200">${data.characterName}</span>
        <span class="text-gray-500">•</span>
        <span>${data.rollName}</span>
      </div>
      <div class="mt-1 flex justify-between items-baseline">
        <span class="text-amber-400 text-xs">${data.formula} ${rollsList}${modStr}</span>
        <span class="text-lg font-black text-white bg-gray-800 px-2 py-0.5 rounded border border-gray-700">${data.result}</span>
      </div>
    `;
  }

  logContainer.appendChild(msgEl);
  logContainer.scrollTop = logContainer.scrollHeight;
}

window.clearLog = function() {
  logContainer.innerHTML = '<div class="text-gray-500 italic">No rolls yet. Join a room and roll some dice!</div>';
};

// OBS URL generator
function updateObsUrl() {
  const protocol = window.location.protocol;
  const host = window.location.host;
  const url = `${protocol}//${host}/overlay.html?room=${currentRoom}`;
  obsUrlInput.value = url;
}

window.copyObsUrl = function() {
  obsUrlInput.select();
  obsUrlInput.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(obsUrlInput.value);
  
  // Quick visual feedback
  const copyBtn = event.target;
  const origText = copyBtn.textContent;
  copyBtn.textContent = 'Copied!';
  copyBtn.classList.remove('bg-gray-700', 'hover:bg-gray-600');
  copyBtn.classList.add('bg-green-600');
  
  setTimeout(() => {
    copyBtn.textContent = origText;
    copyBtn.classList.remove('bg-green-600');
    copyBtn.classList.add('bg-gray-700', 'hover:bg-gray-600');
  }, 2000);
};
