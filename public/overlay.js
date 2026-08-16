// OBS overlay configuration is intentionally plain JavaScript so Browser Source
// can load it without a frontend bundler.
const overlayDefaults = {
  position: 'bottom',
  animationStyle: 'slide',
  fontSize: 'medium',
  showFormula: true,
  autoHideTimeout: 10,
  soundEffectsEnabled: false,
};

const overlayParams = new URLSearchParams(window.location.search);
const overlayStorageKey = 'vtt-overlay-config';
const savedOverlayConfig = (() => {
  try { return JSON.parse(localStorage.getItem(overlayStorageKey) || '{}'); } catch { return {}; }
})();

function booleanParam(value, fallback) {
  if (value === null) return fallback;
  return value === 'true' || value === '1';
}

const overlayConfig = {
  ...overlayDefaults,
  ...savedOverlayConfig,
  position: overlayParams.get('position') || overlayParams.get('pos') || savedOverlayConfig.position || overlayDefaults.position,
  animationStyle: overlayParams.get('animation') || savedOverlayConfig.animationStyle || overlayDefaults.animationStyle,
  fontSize: overlayParams.get('fontSize') || savedOverlayConfig.fontSize || overlayDefaults.fontSize,
  showFormula: booleanParam(overlayParams.get('showFormula'), savedOverlayConfig.showFormula ?? overlayDefaults.showFormula),
  autoHideTimeout: Math.min(30, Math.max(5, Number(overlayParams.get('timeout') || savedOverlayConfig.autoHideTimeout || overlayDefaults.autoHideTimeout))),
  soundEffectsEnabled: booleanParam(overlayParams.get('sound'), savedOverlayConfig.soundEffectsEnabled ?? overlayDefaults.soundEffectsEnabled),
};

const validPositions = ['top', 'bottom', 'center'];
const validAnimations = ['slide', 'fade', 'bounce'];
const validFontSizes = ['small', 'medium', 'large'];
if (!validPositions.includes(overlayConfig.position)) overlayConfig.position = overlayDefaults.position;
if (!validAnimations.includes(overlayConfig.animationStyle)) overlayConfig.animationStyle = overlayDefaults.animationStyle;
if (!validFontSizes.includes(overlayConfig.fontSize)) overlayConfig.fontSize = overlayDefaults.fontSize;

document.body.classList.add(`position-${overlayConfig.position}`, `animation-${overlayConfig.animationStyle}`, `font-${overlayConfig.fontSize}`);

const socket = io();
const room = overlayParams.get('room') || 'default-room';
const feed = document.getElementById('feed');
socket.emit('join-room', room);

socket.on('new-roll', (data) => {
  if (!data.system) createRollCard(data);
});

function createRollCard(data) {
  const card = document.createElement('div');
  card.className = 'roll-card border border-[#26283b] bg-[#11131f]/95 backdrop-blur-md rounded-xl p-4 shadow-[0px_8px_32px_rgba(0,0,0,0.8)] flex items-center justify-between gap-4 transition-all duration-500 relative';
  
  const corners = `
    <span aria-hidden="true" class="absolute h-2 w-2 border-[#d4a544] top-1 left-1 border-t border-l pointer-events-none"></span>
    <span aria-hidden="true" class="absolute h-2 w-2 border-[#d4a544] top-1 right-1 border-t border-r pointer-events-none"></span>
    <span aria-hidden="true" class="absolute h-2 w-2 border-[#d4a544] bottom-1 left-1 border-b border-l pointer-events-none"></span>
    <span aria-hidden="true" class="absolute h-2 w-2 border-[#d4a544] right-1 bottom-1 border-r border-b pointer-events-none"></span>
  `;

  let resultClass = 'text-white border-[#26283b] bg-[#0a0c11]';
  let badgeText = '';
  if (String(data.formula || '').startsWith('1d20')) {
    const rawRoll = data.rolls?.[0];
    if (rawRoll === 20) {
      resultClass = 'text-[#d4a544] border-[#d4a544] bg-[#d4a544]/10';
      badgeText = '<span class="badge text-[#d4a544] text-[9px] font-bold uppercase tracking-wider mb-1">Nat 20!</span>';
    }
    if (rawRoll === 1) {
      resultClass = 'text-[#8a1d1d] border-[#8a1d1d] bg-[#8a1d1d]/10';
      badgeText = '<span class="badge text-[#8a1d1d] text-[9px] font-bold uppercase tracking-wider mb-1">Crit Fail</span>';
    }
  }
  const avatarImg = `<img src="${data.characterAvatar || ''}" class="w-10 h-10 rounded-full border border-[#26283b] object-cover bg-[#0a0c11]">`;
  const formula = `${data.formula || ''} (${(data.rolls || []).join(', ')})`;
  const modifier = data.modifier ? (data.modifier >= 0 ? ` + ${data.modifier}` : ` - ${Math.abs(data.modifier)}`) : '';
  const formulaMarkup = overlayConfig.showFormula ? `<p class="formula text-[#e4c183] font-mono text-[10px] truncate">${formula}${modifier}</p>` : '';
  
  card.innerHTML = `
    ${corners}
    <div class="flex items-center gap-3 min-w-0">
      <div>${avatarImg}</div>
      <div class="min-w-0">
        <h3 class="font-bold text-white text-xs truncate">${data.characterName || 'Adventurer'}</h3>
        <p class="roll-name text-[#a1a7bc] text-[10px] truncate">${data.rollName || 'Roll'}</p>
        ${formulaMarkup}
      </div>
    </div>
    <div class="text-center flex flex-col items-center justify-center">
      ${badgeText}
      <div class="result font-bold px-3 py-1 rounded border ${resultClass}">${data.result}</div>
    </div>
  `;
  
  feed.appendChild(card);
  while (feed.children.length > 5) feed.removeChild(feed.firstElementChild);
  window.setTimeout(() => removeCard(card), overlayConfig.autoHideTimeout * 1000);
}

function removeCard(card) {
  if (!card.parentNode) return;
  card.classList.add('fade-out');
  window.setTimeout(() => card.parentNode?.removeChild(card), 500);
}
