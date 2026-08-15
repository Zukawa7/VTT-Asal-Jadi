import express from 'express';

import crypto from 'crypto';
import { exec } from 'child_process';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.static(path.join(__dirname, 'public')));

// Helper to get stat value
function getStatValue(characterData, statId) {
  const statNames = {
    1: 'strength',
    2: 'dexterity',
    3: 'constitution',
    4: 'intelligence',
    5: 'wisdom',
    6: 'charisma'
  };
  const statName = statNames[statId];
  const baseObj = characterData.stats.find(s => s.id === statId);
  let val = baseObj ? baseObj.value : 10;
  
  let bonus = 0;
  const modifierTypes = ['race', 'class', 'background', 'item', 'feat'];
  for (const type of modifierTypes) {
    const mods = characterData.modifiers[type];
    if (mods && Array.isArray(mods)) {
      for (const mod of mods) {
        if (mod.type === 'bonus' && mod.subType === `${statName}-score`) {
          bonus += mod.value || 0;
        }
      }
    }
  }
  
  const overrideObj = characterData.overrideStats.find(s => s.id === statId);
  if (overrideObj && overrideObj.value) {
    return overrideObj.value;
  }
  
  const bonusObj = characterData.bonusStats.find(s => s.id === statId);
  if (bonusObj && bonusObj.value) {
    bonus += bonusObj.value;
  }
  
  return val + bonus;
}

// Webhook endpoint for auto-deployment
app.post('/api/webhook/github', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.WEBHOOK_SECRET || 'vtt-asal-jadi-secret';

  if (!signature) {
    console.warn('Webhook received but no signature header was found.');
    return res.status(401).send('No signature');
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(req.rawBody || '').digest('hex');

  if (signature !== digest) {
    console.warn('Webhook signature verification failed.');
    return res.status(401).send('Invalid signature');
  }

  console.log('GitHub Push Webhook verified. Starting deployment...');

  // Execute git pull and npm install
  exec('git pull && npm install', (err, stdout, stderr) => {
    if (err) {
      console.error('Git pull / npm install failed:', err);
      return res.status(500).send(`Deploy failed: ${err.message}`);
    }
    
    console.log('Deploy stdout:', stdout);
    if (stderr) console.warn('Deploy stderr:', stderr);

    res.status(200).send('Deployment triggered successfully');

    // Exit process so process manager (like PM2 or systemd) restarts the app with the new code
    console.log('Exiting process to trigger PM2/systemd auto-restart...');
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });
});


// Endpoint to import character from D&D Beyond
app.get('/api/character/:id', async (req, res) => {
  const characterId = req.params.id;
  try {
    const response = await fetch(`https://character-service.dndbeyond.com/character/v2/character/${characterId}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch character from D&D Beyond (Status: ${response.status})` });
    }
    const json = await response.json();
    if (!json.success || !json.data) {
      return res.status(400).json({ error: 'Invalid character data returned from D&D Beyond' });
    }
    
    const data = json.data;
    
    // Calculate stats
    const stats = {
      str: getStatValue(data, 1),
      dex: getStatValue(data, 2),
      con: getStatValue(data, 3),
      int: getStatValue(data, 4),
      wis: getStatValue(data, 5),
      cha: getStatValue(data, 6)
    };
    
    const modifiers = {
      str: Math.floor((stats.str - 10) / 2),
      dex: Math.floor((stats.dex - 10) / 2),
      con: Math.floor((stats.con - 10) / 2),
      int: Math.floor((stats.int - 10) / 2),
      wis: Math.floor((stats.wis - 10) / 2),
      cha: Math.floor((stats.cha - 10) / 2)
    };
    
    // Calculate level and classes
    const classes = data.classes.map(c => ({
      name: c.definition.name,
      level: c.level,
      isStarting: c.isStarting
    }));
    const totalLevel = classes.reduce((sum, c) => sum + c.level, 0);
    
    // Calculate HP
    const conMod = modifiers.con;
    const baseHp = data.baseHitPoints || 0;
    const bonusHp = data.bonusHitPoints || 0;
    
    // Check for other HP modifiers (like Tough feat, etc.)
    let hpPerLevelBonus = 0;
    const modifierTypes = ['race', 'class', 'background', 'item', 'feat'];
    for (const type of modifierTypes) {
      const mods = data.modifiers[type];
      if (mods && Array.isArray(mods)) {
        for (const mod of mods) {
          if (mod.type === 'bonus' && mod.subType === 'hit-points-per-level') {
            hpPerLevelBonus += mod.value || 0;
          }
        }
      }
    }
    
    let maxHp = data.overrideHitPoints || (baseHp + (conMod * totalLevel) + bonusHp + (hpPerLevelBonus * totalLevel));
    const currentHp = maxHp - (data.removedHitPoints || 0) + (data.temporaryHitPoints || 0);
    
    const character = {
      id: data.id,
      name: data.name,
      avatarUrl: data.avatarUrl || 'https://www.dndbeyond.com/content/skins/waterdeep/images/characters/default-avatar.png',
      race: data.race ? data.race.fullName : 'Unknown Race',
      classes,
      level: totalLevel,
      hp: {
        current: currentHp,
        max: maxHp,
        temp: data.temporaryHitPoints || 0
      },
      stats,
      modifiers
    };
    
    res.json(character);
  } catch (error) {
    console.error('Error fetching character:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Socket.io for real-time events (rolls, logs, updates)
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });
  
  socket.on('send-roll', (data) => {
    // data: { roomId, characterName, rollName, formula, result, rolls }
    io.to(data.roomId).emit('new-roll', data);
    console.log(`Roll in room ${data.roomId}:`, data);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
