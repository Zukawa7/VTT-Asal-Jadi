// Socket Connection
const socket = io();

// State
let currentCharacter = null;
let currentRoom = 'default-room';
let localTokens = {};

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

// VTT Map DOM Elements
const mapContainer = document.getElementById('mapContainer');
const mapUrlInput = document.getElementById('mapUrlInput');
const setMapBtn = document.getElementById('setMapBtn');
const addTokenBtn = document.getElementById('addTokenBtn');

// Init OBS URL & Join Default Room
updateObsUrl();
joinRoom();

// Event Listeners
if (joinRoomBtn) {
  joinRoomBtn.addEventListener('click', () => {
    currentRoom = (roomIdInput ? roomIdInput.value.trim() : '') || 'default-room';
    joinRoom();
    updateObsUrl();
  });
}

if (importBtn) {
  importBtn.addEventListener('click', importCharacter);
}

// VTT Map Event Listeners
if (setMapBtn) {
  setMapBtn.addEventListener('click', () => {
    const mapUrl = mapUrlInput ? mapUrlInput.value.trim() : '';
    if (!mapUrl) return;
    socket.emit('update-map', { roomId: currentRoom, mapUrl });
  });
}

if (addTokenBtn) {
  addTokenBtn.addEventListener('click', () => {
    if (!currentCharacter) {
      alert('Please import a character first!');
      return;
    }
    socket.emit('add-token', {
      roomId: currentRoom,
      token: {
        id: currentCharacter.id.toString(),
        name: currentCharacter.name,
        avatarUrl: currentCharacter.avatarUrl,
        x: 0,
        y: 0,
      },
    });
  });
}

// Drag and Drop for VTT Map
if (mapContainer) {
  mapContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  mapContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    const tokenId = e.dataTransfer.getData('text/plain');
    if (!tokenId) return;

    const rect = mapContainer.getBoundingClientRect();
    const xCell = Math.floor(((e.clientX - rect.left) / rect.width) * 12);
    const yCell = Math.floor(((e.clientY - rect.top) / rect.height) * 12);

    const x = Math.max(0, Math.min(11, xCell));
    const y = Math.max(0, Math.min(11, yCell));

    socket.emit('move-token', {
      roomId: currentRoom,
      tokenId,
      x,
      y,
    });
  });
}

// Socket Event Handlers
function joinRoom() {
  socket.emit('join-room', currentRoom);
  if (logContainer) {
    logContainer.innerHTML = '';
  }
  addLogMessage({
    system: true,
    text: `Connected to room: "${currentRoom}"`,
  });
  loadRollHistory(currentRoom);
}

async function loadRollHistory(roomId) {
  try {
    const response = await fetch(`/api/v2/rolls/${encodeURIComponent(roomId)}`);
    if (!response.ok) return;
    const history = await response.json();
    history.reverse().forEach((roll) =>
      addLogMessage({
        characterName: roll.characterName || 'Adventurer',
        characterAvatar:
          roll.characterAvatar ||
          'https://www.dndbeyond.com/content/skins/waterdeep/images/characters/default-avatar.png',
        rollName: roll.rollName || 'Historical Roll',
        formula: roll.formula,
        result: roll.result,
        rolls: Array.isArray(roll.rolls) ? roll.rolls : [],
        modifier: roll.modifier || 0,
      }),
    );
  } catch (error) {
    console.warn('Unable to load roll history:', error);
  }
}

socket.on('new-roll', (data) => {
  addLogMessage(data);
});

socket.on('room-state', (state) => {
  if (state.mapUrl) updateMapBackground(state.mapUrl);
  localTokens = state.tokens || {};
  renderTokens(localTokens);
});

socket.on('map-updated', (mapUrl) => {
  updateMapBackground(mapUrl);
});

socket.on('token-added', (token) => {
  localTokens[token.id] = token;
  renderTokens(localTokens);
});

socket.on('token-moved', (data) => {
  if (localTokens[data.tokenId]) {
    localTokens[data.tokenId].x = data.x;
    localTokens[data.tokenId].y = data.y;
    renderTokens(localTokens);
  }
});

socket.on('token-removed', (tokenId) => {
  delete localTokens[tokenId];
  renderTokens(localTokens);
});

// Import Character function
async function importCharacter() {
  const rawInput = charIdInput ? charIdInput.value.trim() : '';
  if (!rawInput) {
    showImportError('Please enter a valid Character ID');
    return;
  }

  const match = rawInput.match(/(?:characters\/)?(\d+)/i);
  const charId = match && match[1] ? match[1] : rawInput;

  // UI state: loading
  if (importBtn) importBtn.disabled = true;
  if (importBtnText) importBtnText.textContent = 'Importing...';
  if (importSpinner) importSpinner.classList.remove('hidden');
  if (importError) importError.classList.add('hidden');

  try {
    const token = localStorage.getItem('token');
    // First try fetching public/cached sheet
    let response = await fetch(`/api/v2/character/${encodeURIComponent(charId)}/sheet`);

    // If not found and user has auth token, import from DDB API
    if (!response.ok && token) {
      const importRes = await fetch('/api/v2/character/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ characterId: charId }),
      });
      if (importRes.ok) {
        response = await fetch(`/api/v2/character/${encodeURIComponent(charId)}/sheet`);
      }
    }

    if (!response.ok) {
      let errText = 'Failed to fetch character';
      try {
        const errData = await response.json();
        errText = errData.error || errText;
      } catch (e) {
        // ignore JSON parse errors for non-JSON responses
      }
      throw new Error(errText);
    }

    const data = await response.json();
    currentCharacter = data;
    renderCharacterSheet(data);

    addLogMessage({
      system: true,
      text: `Character "${data.name}" (${data.race} ${data.classes.map((c) => `${c.name} ${c.level}`).join('/')}) imported successfully!`,
    });
  } catch (err) {
    console.error(err);
    showImportError(
      err.message || 'An error occurred while importing. Please double-check the ID.',
    );
  } finally {
    if (importBtn) importBtn.disabled = false;
    if (importBtnText) importBtnText.textContent = 'Import';
    if (importSpinner) importSpinner.classList.add('hidden');
  }
}

function showImportError(msg) {
  if (importError) {
    importError.textContent = msg;
    importError.classList.remove('hidden');
  }
}

// Render character details to UI
function renderCharacterSheet(char) {
  if (charPlaceholder) charPlaceholder.classList.add('hidden');
  if (charSheet) charSheet.classList.remove('hidden');

  if (charAvatar)
    charAvatar.src =
      char.avatarUrl ||
      'https://www.dndbeyond.com/content/skins/waterdeep/images/characters/default-avatar.png';
  if (charName) charName.textContent = char.name;

  const classStr =
    char.classes.map((c) => `${c.name} ${c.level}`).join('/') + ` (Level ${char.level})`;
  if (charSub) charSub.textContent = `${char.race} | ${classStr}`;

  if (charCurrentHp) charCurrentHp.textContent = char.hp.current;
  if (charMaxHp) charMaxHp.textContent = char.hp.max;

  if (charTempHp && charTempHpContainer) {
    if (char.hp.temp > 0) {
      charTempHp.textContent = char.hp.temp;
      charTempHpContainer.classList.remove('hidden');
    } else {
      charTempHpContainer.classList.add('hidden');
    }
  }

  // Calculate HP bar percentage
  if (hpBar && char.hp.max > 0) {
    const hpPercent = Math.max(0, Math.min(100, (char.hp.current / char.hp.max) * 100));
    hpBar.style.width = `${hpPercent}%`;

    // Color HP bar based on health
    if (hpPercent < 25) {
      hpBar.style.background = 'var(--danger, #ef4444)';
    } else if (hpPercent < 50) {
      hpBar.style.background = 'var(--warning, #f59e0b)';
    } else {
      hpBar.style.background = 'var(--success, #10b981)';
    }
  }

  // Render Stats & Modifiers
  const stats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  stats.forEach((stat) => {
    const scoreEl = document.getElementById(`statScore-${stat}`);
    const modEl = document.getElementById(`statMod-${stat}`);

    if (scoreEl && char.stats && char.stats[stat] !== undefined) {
      scoreEl.textContent = char.stats[stat];
    }
    if (modEl && char.modifiers && char.modifiers[stat] !== undefined) {
      const mod = char.modifiers[stat];
      modEl.textContent = mod >= 0 ? `+${mod}` : `${mod}`;
    }
  });
}

// Roll logic
window.rollStat = function (statLabel, statKey) {
  if (!currentCharacter) return;

  const modifier = currentCharacter.modifiers ? currentCharacter.modifiers[statKey] || 0 : 0;
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
    modifier: modifier,
  };

  socket.emit('send-roll', rollData);
};

window.rollDice = function (sides, mode) {
  let rolls = [];
  let result = 0;
  let rollTitle = `d${sides} Roll`;
  let formula = `1d${sides}`;

  if (sides === 20 && (mode === 'advantage' || mode === 'disadvantage')) {
    const r1 = Math.floor(Math.random() * 20) + 1;
    const r2 = Math.floor(Math.random() * 20) + 1;
    rolls = [r1, r2];
    if (mode === 'advantage') {
      result = Math.max(r1, r2);
      rollTitle = 'd20 (Advantage)';
      formula = '2d20kh1';
    } else {
      result = Math.min(r1, r2);
      rollTitle = 'd20 (Disadvantage)';
      formula = '2d20kl1';
    }
  } else {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls = [roll];
    result = roll;
  }

  const name = currentCharacter ? currentCharacter.name : 'Adventurer';
  const avatar = currentCharacter
    ? currentCharacter.avatarUrl
    : 'https://www.dndbeyond.com/content/skins/waterdeep/images/characters/default-avatar.png';

  const rollData = {
    roomId: currentRoom,
    characterName: name,
    characterAvatar: avatar,
    rollName: rollTitle,
    formula: formula,
    result: result,
    rolls: rolls,
    modifier: 0,
  };

  socket.emit('send-roll', rollData);
};

window.openCustomRoll = function () {
  if (customRollForm) {
    customRollForm.classList.toggle('hidden');
    if (!customRollForm.classList.contains('hidden') && customRollInput) {
      customRollInput.focus();
    }
  }
};

window.executeCustomRoll = function () {
  if (!customRollInput) return;
  const formula = customRollInput.value.trim();
  if (!formula) return;

  const parsed = parseAndRoll(formula);
  if (!parsed) {
    alert('Invalid roll formula. Use format like: 2d6+4, d20, 1d100-5, 4d6kh3');
    return;
  }

  const name = currentCharacter ? currentCharacter.name : 'Adventurer';
  const avatar = currentCharacter
    ? currentCharacter.avatarUrl
    : 'https://www.dndbeyond.com/content/skins/waterdeep/images/characters/default-avatar.png';

  const rollData = {
    roomId: currentRoom,
    characterName: name,
    characterAvatar: avatar,
    rollName: 'Custom Roll',
    formula: parsed.formula,
    result: parsed.result,
    rolls: parsed.rolls,
    modifier: parsed.modifier,
  };

  socket.emit('send-roll', rollData);
  customRollInput.value = '';
};

// Dice parser helper
function parseAndRoll(formula) {
  const cleanFormula = formula.replace(/\s+/g, '').toLowerCase();
  const match = cleanFormula.match(/^(\d*)d(\d+)([hl]\d+|kh\d+|kl\d+)?([+-]\d+)?$/);
  if (!match) return null;

  const count = match[1] ? parseInt(match[1]) : 1;
  const sides = parseInt(match[2]);
  let keepMode = null;
  let keepCount = count;

  if (match[3]) {
    if (match[3].startsWith('kh') || match[3].startsWith('h')) {
      keepMode = 'h';
      keepCount = parseInt(match[3].replace(/^[kh]+/, '')) || 1;
    } else if (match[3].startsWith('kl') || match[3].startsWith('l')) {
      keepMode = 'l';
      keepCount = parseInt(match[3].replace(/^[kl]+/, '')) || 1;
    }
  }

  const modifier = match[4] ? parseInt(match[4]) : 0;

  if (count <= 0 || count > 100 || sides <= 0 || sides > 1000 || keepCount < 1 || keepCount > count)
    return null;

  const rolls = [];
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    sum += roll;
  }

  const keptRolls =
    keepMode === 'h'
      ? [...rolls].sort((a, b) => b - a).slice(0, keepCount)
      : keepMode === 'l'
        ? [...rolls].sort((a, b) => a - b).slice(0, keepCount)
        : rolls;
  const result = keptRolls.reduce((total, value) => total + value, modifier);

  return {
    formula: `${count}d${sides}${match[3] || ''}${modifier !== 0 ? (modifier > 0 ? '+' + modifier : modifier) : ''}`,
    count,
    sides,
    modifier,
    rolls,
    result,
  };
}

// Log view management
function addLogMessage(data) {
  if (!logContainer) return;
  // Remove placeholder if it exists
  if (logContainer.querySelector('.italic')) {
    logContainer.innerHTML = '';
  }

  const msgEl = document.createElement('div');
  msgEl.className = 'border-b pb-2 mb-2 last:border-b-0';
  msgEl.style.borderColor = 'var(--border-secondary, rgba(255,255,255,0.08))';

  if (data.system) {
    msgEl.innerHTML = `<span style="color: var(--gold-400); font-weight: bold;">[SYSTEM]</span> <span style="color: var(--text-secondary);">${data.text}</span>`;
  } else {
    const avatarImg = `<img src="${data.characterAvatar}" class="w-5 h-5 rounded-full inline-block mr-1.5 align-middle object-cover" style="background: var(--bg-tertiary);">`;
    const rollsList = data.rolls && data.rolls.length ? `(${data.rolls.join(', ')})` : '';
    const modStr = data.modifier
      ? data.modifier >= 0
        ? ` + ${data.modifier}`
        : ` - ${Math.abs(data.modifier)}`
      : '';

    // Critical coloring
    let resultColor = 'color: var(--gold-400);';
    if (data.formula && data.formula.includes('d20') && data.rolls && data.rolls.length === 1) {
      if (data.rolls[0] === 20) resultColor = 'color: var(--success); font-weight: 900;';
      if (data.rolls[0] === 1) resultColor = 'color: var(--danger); font-weight: 900;';
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    msgEl.innerHTML = `
      <div class="flex items-center gap-1 text-xs" style="color: var(--text-secondary);">
        ${avatarImg}
        <span class="font-bold" style="color: var(--gold-400);">${data.characterName}</span>
        <span style="color: var(--text-tertiary);">•</span>
        <span>${data.rollName}</span>
        <span class="ml-auto text-[10px]" style="color: var(--text-tertiary);">${timestamp}</span>
      </div>
      <div class="mt-1 flex justify-between items-baseline">
        <span class="text-xs" style="color: var(--text-secondary);">${data.formula} ${rollsList}${modStr}</span>
        <span class="text-base font-black px-2 py-0.5 rounded border" style="${resultColor} background: var(--bg-tertiary); border-color: var(--border-secondary);">${data.result}</span>
      </div>
    `;
  }

  logContainer.appendChild(msgEl);
  logContainer.scrollTop = logContainer.scrollHeight;
}

window.addLogMessage = addLogMessage;
window.logRoll = addLogMessage;

window.clearLog = function () {
  if (logContainer) {
    logContainer.innerHTML =
      '<div class="italic" style="color: var(--text-tertiary);">No rolls yet. Join a room and roll some dice!</div>';
  }
};

// VTT Map Helper Functions
function updateMapBackground(mapUrl) {
  if (!mapContainer || !mapUrl) return;
  mapContainer.style.backgroundImage = `linear-gradient(to right, rgba(245, 158, 11, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(245, 158, 11, 0.2) 1px, transparent 1px), url('${mapUrl}')`;
  mapContainer.style.backgroundSize =
    'calc(100% / 12) calc(100% / 12), calc(100% / 12) calc(100% / 12), cover';
  mapContainer.style.backgroundPosition = '0 0, 0 0, center';
  if (mapUrlInput) mapUrlInput.value = mapUrl;
}

function renderTokens(tokens) {
  if (!mapContainer) return;
  // Remove existing token elements
  const tokenEls = mapContainer.querySelectorAll('.token-element');
  tokenEls.forEach((el) => el.remove());

  Object.values(tokens).forEach((token) => {
    const tokenEl = document.createElement('div');
    tokenEl.className =
      'token-element absolute cursor-pointer group p-1 transition-all duration-100 z-10';
    tokenEl.style.width = 'calc(100% / 12)';
    tokenEl.style.height = 'calc(100% / 12)';
    tokenEl.style.left = `calc((${token.x} / 12) * 100%)`;
    tokenEl.style.top = `calc((${token.y} / 12) * 100%)`;

    tokenEl.draggable = true;
    tokenEl.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', token.id);
      e.dataTransfer.effectAllowed = 'move';
    });

    tokenEl.innerHTML = `
      <div class="relative w-full h-full flex items-center justify-center">
        <img src="${token.avatarUrl}" class="w-11/12 h-11/12 rounded-full border-2 object-cover shadow-lg" style="border-color: var(--gold-500); background: var(--bg-tertiary);" title="${token.name}">
        <!-- Delete Button on Hover -->
        <button onclick="removeToken('${token.id}')" class="absolute -top-1 -right-1 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow z-20" style="background: var(--danger);">×</button>
        <!-- Name Badge on Hover -->
        <span class="absolute -bottom-5 text-white text-[9px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20 border" style="background: rgba(12, 14, 20, 0.95); border-color: var(--border-secondary);">${token.name}</span>
      </div>
    `;

    mapContainer.appendChild(tokenEl);
  });
}

window.removeToken = function (tokenId) {
  socket.emit('remove-token', {
    roomId: currentRoom,
    tokenId,
  });
};

// OBS URL generator
function updateObsUrl() {
  if (!obsUrlInput) return;
  const protocol = window.location.protocol;
  const host = window.location.host;
  const url = `${protocol}//${host}/overlay.html?room=${currentRoom}`;
  obsUrlInput.value = url;
}

window.copyObsUrl = function (btnEvent) {
  if (!obsUrlInput) return;
  obsUrlInput.select();
  obsUrlInput.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(obsUrlInput.value);

  const targetBtn =
    btnEvent && btnEvent.target
      ? btnEvent.target
      : document.querySelector('button[onclick*="copyObsUrl"]');
  if (targetBtn) {
    const origText = targetBtn.textContent;
    targetBtn.textContent = 'Copied!';
    targetBtn.style.background = 'var(--success, #10b981)';
    targetBtn.style.color = '#ffffff';

    setTimeout(() => {
      targetBtn.textContent = origText;
      targetBtn.style.background = '';
      targetBtn.style.color = '';
    }, 2000);
  }
};

// --- DICE POOL LOGIC ---
let dicePool = {};

window.addToPool = function (sides) {
  if (!dicePool[sides]) dicePool[sides] = 0;
  dicePool[sides]++;
  renderDicePool();
};

window.renderDicePool = function () {
  const container = document.getElementById('dicePoolContainer');
  if (!container) return;

  const entries = Object.entries(dicePool).filter(([s, c]) => c > 0);
  if (entries.length === 0) {
    container.innerHTML =
      '<span class="text-xs italic" style="color: var(--text-tertiary);">Click dice to add to pool...</span>';
    return;
  }

  container.innerHTML = entries
    .map(
      ([sides, count]) =>
        `<span class="badge-gold cursor-pointer" style="padding: 2px 6px; font-size: 11px;" onclick="removeFromPool(${sides})" title="Click to remove 1">
       ${count}d${sides} <span style="opacity: 0.6; margin-left: 2px;">×</span>
     </span>`,
    )
    .join(' ');
};

window.removeFromPool = function (sides) {
  if (dicePool[sides] > 0) {
    dicePool[sides]--;
    renderDicePool();
  }
};

const clearPoolBtn = document.getElementById('clearPoolBtn');
if (clearPoolBtn) {
  clearPoolBtn.addEventListener('click', () => {
    dicePool = {};
    renderDicePool();
    const mod = document.getElementById('diceModifier');
    if (mod) mod.value = '0';
  });
}

window.rollPool = function () {
  const entries = Object.entries(dicePool).filter(([s, c]) => c > 0);
  if (entries.length === 0) return; // empty pool

  const modifier = parseInt(document.getElementById('diceModifier')?.value || 0);

  let totalResult = modifier;
  let allRolls = [];
  let formulaParts = [];

  for (const [sides, count] of entries) {
    formulaParts.push(`${count}d${sides}`);
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * parseInt(sides)) + 1;
      allRolls.push(roll);
      totalResult += roll;
    }
  }

  let formulaStr = formulaParts.join(' + ');
  if (modifier > 0) formulaStr += ` + ${modifier}`;
  else if (modifier < 0) formulaStr += ` - ${Math.abs(modifier)}`;

  const name = currentCharacter ? currentCharacter.name : 'Adventurer';
  const avatar = currentCharacter
    ? currentCharacter.avatarUrl
    : 'https://www.dndbeyond.com/content/skins/waterdeep/images/characters/default-avatar.png';

  const rollData = {
    roomId: currentRoom,
    characterName: name,
    characterAvatar: avatar,
    rollName: `Dice Pool`,
    formula: formulaStr,
    result: totalResult,
    rolls: allRolls,
    modifier: modifier,
  };

  socket.emit('send-roll', rollData);

  // Clear pool after roll
  dicePool = {};
  renderDicePool();
  if (document.getElementById('diceModifier')) document.getElementById('diceModifier').value = '0';
};
