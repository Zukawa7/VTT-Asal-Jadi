import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { exec } from 'child_process';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { runQuery, getQuery, allQuery } from './db-legacy.js';

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

const JWT_SECRET = process.env.JWT_SECRET || 'vtt-jwt-secret-key';
const socketRollWindows = new Map();

const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((value) => value.trim()).filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production';
app.use(cors({ origin: (origin, callback) => {
  if (!origin || (!isProduction && allowedOrigins.length === 0) || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  // If CORS_ORIGIN is not configured, preserve same-origin compatibility.
  // Production deployments should set CORS_ORIGIN explicitly when other
  // origins must be restricted.
  if (allowedOrigins.length === 0) {
    callback(null, true);
    return;
  }
  callback(new Error('CORS origin is not allowed'));
} }));

const apiLimiter = rateLimit({ windowMs: 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 3, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many login or registration attempts. Try again later.' } });
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'vtt-asal-jadi', timestamp: new Date().toISOString() }));

// Helper to hash password
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

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

  // Rebuild sqlite3 because production runs on ARM64 and uses a native binding.
  exec('git pull --ff-only origin main && npm install --include=dev && npm rebuild sqlite3 --build-from-source', (err, stdout, stderr) => {
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

// --- Authentication APIs ---

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const existingUser = await getQuery('SELECT id FROM users WHERE username = ?', [cleanUsername]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);

    await runQuery(
      'INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)',
      [cleanUsername, hash, salt]
    );

    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUsername = username.trim().toLowerCase();

  try {
    const user = await getQuery('SELECT * FROM users WHERE username = ?', [cleanUsername]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const hash = hashPassword(password, user.salt);
    if (hash !== user.password_hash) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get current user info
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username });
});

// --- Character APIs ---

// Import character (Authenticated)
app.post('/api/character/import', authenticateToken, async (req, res) => {
  let { characterId } = req.body;
  if (!characterId) {
    return res.status(400).json({ error: 'Character ID is required' });
  }

  // Extract ID if a full URL was provided
  const match = characterId.toString().match(/(?:characters\/)?(\d+)/i);
  if (match && match[1]) {
    characterId = match[1];
  }

  try {
    const response = await fetch(`https://character-service.dndbeyond.com/character/v5/character/${characterId}`);
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
      avatarUrl: data.avatarUrl || data.decorations?.avatarUrl || data.decorations?.frameAvatarUrl || data.race?.portraitAvatarUrl || data.race?.avatarUrl || 'https://www.dndbeyond.com/content/skins/waterdeep/images/characters/default-avatar.png',
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
    
    // Save or update in database
    const characterJson = JSON.stringify(character);
    await runQuery(
      `INSERT INTO characters (id, user_id, name, data) 
       VALUES (?, ?, ?, ?) 
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, data=excluded.data`,
      [character.id.toString(), req.user.id, character.name, characterJson]
    );
    
    res.json(character);
  } catch (error) {
    console.error('Error importing character:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get user's characters
app.get('/api/characters', authenticateToken, async (req, res) => {
  try {
    const rows = await allQuery('SELECT id, name, data FROM characters WHERE user_id = ?', [req.user.id]);
    const characters = rows.map(r => JSON.parse(r.data));
    res.json(characters);
  } catch (err) {
    console.error('Fetch characters error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete character
app.delete('/api/character/:id', authenticateToken, async (req, res) => {
  const characterId = req.params.id;
  try {
    await runQuery('DELETE FROM characters WHERE id = ? AND user_id = ?', [characterId, req.user.id]);
    res.json({ success: true, message: 'Character deleted successfully' });
  } catch (err) {
    console.error('Delete character error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Public API: Get character by username and characterId
app.get('/api/character/:username/:characterId', async (req, res) => {
  const { username, characterId } = req.params;
  try {
    const user = await getQuery('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const characterRow = await getQuery('SELECT data FROM characters WHERE id = ? AND user_id = ?', [characterId, user.id]);
    if (!characterRow) {
      return res.status(404).json({ error: 'Character not found' });
    }
    res.json(JSON.parse(characterRow.data));
  } catch (err) {
    console.error('Get public character error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Serve HTML pages with clean URLs
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/vtt', (req, res) => res.sendFile(path.join(__dirname, 'public', 'vtt.html')));
app.get('/session-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'session-dashboard.html')));
app.get('/:username/dashboard/characters/:characterId', (req, res) => res.sendFile(path.join(__dirname, 'public', 'character-view.html')));


// Persistent roll history
app.get('/api/rooms/:roomId/rolls', async (req, res) => {
  const roomId = req.params.roomId;
  if (!/^[a-z0-9-]{3,50}$/.test(roomId)) return res.status(400).json({ error: 'Invalid room ID' });
  try {
    const session = await getQuery('SELECT id FROM game_sessions WHERE room_id = ?', [roomId]);
    if (!session) return res.json([]);
    const rolls = await allQuery(
      `SELECT id, character_id AS characterId, character_name AS characterName,
              roll_name AS rollName, roll_formula AS formula, result,
              is_critical AS isCritical, rolls_json AS rolls, created_at AS createdAt
       FROM dice_rolls WHERE session_id = ? ORDER BY id DESC LIMIT 100`, [session.id]
    );
    res.json(rolls.map((roll) => ({ ...roll, rolls: JSON.parse(roll.rolls || '[]') })));
  } catch (error) {
    console.error('Roll history error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Socket.io for real-time events (rolls, logs, updates)
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });
  
  socket.on('send-roll', async (data) => {
    const now = Date.now();
    const window = socketRollWindows.get(socket.id) || { startedAt: now, count: 0 };
    if (now - window.startedAt >= 60_000) { window.startedAt = now; window.count = 0; }
    if (window.count >= 100) { socket.emit('new-roll', { system: true, text: 'Roll limit reached. Try again in a minute.' }); return; }
    window.count += 1;
    socketRollWindows.set(socket.id, window);

    if (!data || typeof data.roomId !== 'string' || !Array.isArray(data.rolls)) return;
    io.to(data.roomId).emit('new-roll', data);
    console.log(`Roll in room ${data.roomId}:`, data);

    if (!/^[a-z0-9-]{3,50}$/.test(data.roomId)) return;
    try {
      await runQuery('INSERT OR IGNORE INTO game_sessions (room_id) VALUES (?)', [data.roomId]);
      const session = await getQuery('SELECT id FROM game_sessions WHERE room_id = ?', [data.roomId]);
      await runQuery(
        `INSERT INTO dice_rolls (session_id, character_id, character_name, roll_name, roll_formula, result, is_critical, rolls_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [session.id, data.characterId || null, String(data.characterName || 'Adventurer'), String(data.rollName || 'Roll'),
          String(data.formula || ''), Number(data.result) || 0,
          data.rolls?.[0] === 20 || data.rolls?.[0] === 1 ? 1 : 0,
          JSON.stringify(Array.isArray(data.rolls) ? data.rolls : [])]
      );
    } catch (error) {
      console.error('Failed to persist roll:', error);
    }
  });
  
  socket.on('disconnect', () => {
    socketRollWindows.delete(socket.id);
    console.log('User disconnected:', socket.id);
  });
});

export { app, io, httpServer };

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
