// Socket Connection
const socket = io();

// Get Room ID from URL query param
const urlParams = new URLSearchParams(window.location.search);
const room = urlParams.get('room') || 'default-room';

// DOM Elements
const feed = document.getElementById('feed');

// Join the specified room
socket.emit('join-room', room);

// Listen for new rolls
socket.on('new-roll', (data) => {
  // Ignore system messages on overlay
  if (data.system) return;

  createRollCard(data);
});

function createRollCard(data) {
  const card = document.createElement('div');
  card.className = 'roll-card border border-slate-700/60 rounded-lg p-4 shadow-2xl flex items-center justify-between gap-4 transition-all duration-500';

  // Highlight special rolls (Nat 20 or Nat 1 if it's a d20 roll)
  let resultClass = 'text-white border-slate-600 bg-slate-800';
  let badgeText = '';
  
  if (data.formula.startsWith('1d20')) {
    const rawRoll = data.rolls[0];
    if (rawRoll === 20) {
      resultClass = 'text-amber-400 border-amber-500 bg-amber-950/60 animate-bounce';
      badgeText = '<span class="text-[10px] uppercase font-bold text-amber-500 block leading-none mb-1">Nat 20!</span>';
    } else if (rawRoll === 1) {
      resultClass = 'text-red-400 border-red-500 bg-red-950/60';
      badgeText = '<span class="text-[10px] uppercase font-bold text-red-500 block leading-none mb-1">Crit Fail</span>';
    }
  }

  const avatarImg = `<img src="${data.characterAvatar}" class="w-10 h-10 rounded-full border border-slate-600 object-cover bg-slate-800">`;
  const rollsList = `(${data.rolls.join(', ')})`;
  const modStr = data.modifier ? (data.modifier >= 0 ? ` + ${data.modifier}` : ` - ${Math.abs(data.modifier)}`) : '';

  card.innerHTML = `
    <div class="flex items-center gap-3 min-w-0">
      ${avatarImg}
      <div class="min-w-0">
        <h3 class="font-bold text-slate-100 text-sm truncate leading-tight">${data.characterName}</h3>
        <p class="text-xs text-slate-400 truncate mt-0.5">${data.rollName}</p>
        <p class="text-[10px] text-amber-500/80 font-mono mt-0.5 truncate">${data.formula} ${rollsList}${modStr}</p>
      </div>
    </div>
    <div class="text-center flex flex-col items-center justify-center">
      ${badgeText}
      <div class="text-2xl font-black px-3 py-1 rounded border ${resultClass} shadow-inner min-w-[50px]">
        ${data.result}
      </div>
    </div>
  `;

  // Append card
  feed.appendChild(card);

  // Auto-scroll if there are too many items
  if (feed.children.length > 5) {
    const oldest = feed.children[0];
    oldest.classList.add('fade-out');
    setTimeout(() => {
      if (oldest.parentNode === feed) {
        feed.removeChild(oldest);
      }
    }, 500);
  }

  // Fade out and remove after 10 seconds
  setTimeout(() => {
    card.classList.add('fade-out');
    setTimeout(() => {
      if (card.parentNode === feed) {
        feed.removeChild(card);
      }
    }, 500);
  }, 10000);
}
