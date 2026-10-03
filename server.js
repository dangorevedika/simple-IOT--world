const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Simple JSON Database Path
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper: Format Date and Time in Asia/Kolkata (IST +5:30)
function getKolkataDateTime(date = new Date()) {
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const time = timeFormatter.format(date);
  // dateFormatter gives DD/MM/YYYY in en-GB, replace slashes with hyphens
  const dateFormatted = dateFormatter.format(date).replace(/\//g, '-');

  return { time, date: dateFormatted };
}

// Initial default database state
function getDefaultDb() {
  const now = new Date();
  const dt1 = getKolkataDateTime(new Date(now.getTime() - 15 * 60000));
  const dt2 = getKolkataDateTime(new Date(now.getTime() - 10 * 60000));
  const dt3 = getKolkataDateTime(new Date(now.getTime() - 5 * 60000));
  const dt4 = getKolkataDateTime(now);

  return {
    users: [
      {
        id: 'usr_vedika_default',
        name: 'vedika',
        email: 'vedika@sbjain.edu',
        password: 'password123',
        createdAt: now.toISOString()
      }
    ],
    deviceState: {
      led: false,
      lcdLine1: 'SMART DISPLAY',
      lcdLine2: 'MyData',
      lastPing: now.toISOString() // initial seed
    },
    readings: [
      {
        id: 1,
        temperature: 32.5,
        humidity: 55,
        time: dt1.time,
        date: dt1.date,
        timestamp: now.getTime() - 15 * 60000
      },
      {
        id: 2,
        temperature: 33.1,
        humidity: 53,
        time: dt2.time,
        date: dt2.date,
        timestamp: now.getTime() - 10 * 60000
      },
      {
        id: 3,
        temperature: 33.8,
        humidity: 51,
        time: dt3.time,
        date: dt3.date,
        timestamp: now.getTime() - 5 * 60000
      },
      {
        id: 4,
        temperature: 34.0,
        humidity: 50,
        time: dt4.time,
        date: dt4.date,
        timestamp: now.getTime()
      }
    ],
    nextReadingId: 5
  };
}

// Load database from file or initialize
let db = null;
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(content);
    } else {
      db = getDefaultDb();
      saveDb();
    }
  } catch (err) {
    console.error('Error loading db.json, using default state:', err.message);
    db = getDefaultDb();
    saveDb();
  }
}

// Save database to file
function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving db.json:', err.message);
  }
}

// Initial DB load
loadDb();

// Helper: Check if ESP8266 is considered ONLINE (pinged within 45 seconds)
function isDeviceOnline() {
  if (!db.deviceState.lastPing) return false;
  const lastPingTime = new Date(db.deviceState.lastPing).getTime();
  const diffSeconds = (Date.now() - lastPingTime) / 1000;
  return diffSeconds <= 45;
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return res.status(409).json({ success: false, message: 'User already exists with this email. Please login.' });
  }

  const newUser = {
    id: 'usr_' + Date.now(),
    name: name.trim(),
    email: normalizedEmail,
    password: password, // In production, bcrypt can hash this
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDb();

  return res.status(201).json({
    success: true,
    message: 'Registration successful! Welcome to Simple IoT World.',
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email
    },
    token: 'jwt_simulated_' + newUser.id
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail && u.password === password);

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  return res.json({
    success: true,
    message: 'Login successful.',
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    },
    token: 'jwt_simulated_' + user.id
  });
});

// Get Current User Profile
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  // Find user by token prefix
  const userId = authHeader.replace('Bearer jwt_simulated_', '').replace('Bearer ', '');
  const user = db.users.find(u => u.id === userId) || db.users[0];

  return res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  });
});

// ==========================================
// IOT HARDWARE & DEVICE STATUS ROUTES
// ==========================================

// Get full IoT Status (used by web dashboard)
app.get('/api/iot/status', (req, res) => {
  const online = isDeviceOnline();
  const latestReading = db.readings.length > 0 ? db.readings[db.readings.length - 1] : { temperature: 0, humidity: 0 };

  res.json({
    success: true,
    online,
    lastPing: db.deviceState.lastPing,
    led: db.deviceState.led,
    lcd: {
      line1: db.deviceState.lcdLine1,
      line2: db.deviceState.lcdLine2
    },
    currentReading: {
      temperature: latestReading.temperature,
      humidity: latestReading.humidity,
      time: latestReading.time,
      date: latestReading.date,
      timestamp: latestReading.timestamp
    }
  });
});

// Lightweight endpoint for ESP8266 to fetch LCD & LED state
app.get('/api/iot/device-state', (req, res) => {
  // Update last ping since ESP is communicating
  db.deviceState.lastPing = new Date().toISOString();
  saveDb();

  res.json({
    led: db.deviceState.led ? 1 : 0,
    ledStatus: db.deviceState.led ? 'ON' : 'OFF',
    line1: (db.deviceState.lcdLine1 || '').padEnd(16, ' ').substring(0, 16),
    line2: (db.deviceState.lcdLine2 || '').padEnd(16, ' ').substring(0, 16)
  });
});

// POST data from ESP8266 or Simulator
// Supports body JSON or URL Query Params: ?temp=34&hum=50 or ?temperature=34&humidity=50
app.all('/api/iot/data', (req, res) => {
  const tempRaw = req.body.temperature ?? req.body.temp ?? req.query.temperature ?? req.query.temp;
  const humRaw = req.body.humidity ?? req.body.hum ?? req.query.humidity ?? req.query.hum;

  if (tempRaw !== undefined && humRaw !== undefined) {
    const temperature = parseFloat(tempRaw);
    const humidity = parseFloat(humRaw);

    const now = new Date();
    const { time, date } = getKolkataDateTime(now);

    const newReading = {
      id: db.nextReadingId++,
      temperature: Number(temperature.toFixed(1)),
      humidity: Number(humidity.toFixed(1)),
      time,
      date,
      timestamp: now.getTime()
    };

    db.readings.push(newReading);

    // Keep up to 500 readings in memory/file
    if (db.readings.length > 500) {
      db.readings.splice(0, db.readings.length - 500);
    }

    db.deviceState.lastPing = now.toISOString();
    saveDb();

    return res.json({
      success: true,
      message: 'Data saved successfully',
      readingId: newReading.id,
      led: db.deviceState.led ? 1 : 0,
      ledStatus: db.deviceState.led ? 'ON' : 'OFF',
      line1: db.deviceState.lcdLine1,
      line2: db.deviceState.lcdLine2
    });
  }

  // If no readings passed, just record ping
  db.deviceState.lastPing = new Date().toISOString();
  saveDb();

  return res.json({
    success: true,
    message: 'Ping acknowledged',
    led: db.deviceState.led ? 1 : 0,
    line1: db.deviceState.lcdLine1,
    line2: db.deviceState.lcdLine2
  });
});

// POST /api/iot/led : Turn LED ON / OFF (Web Dashboard Tab 3)
app.post('/api/iot/led', (req, res) => {
  const { led } = req.body;
  if (led === undefined) {
    return res.status(400).json({ success: false, message: 'led state (true/false) required' });
  }

  db.deviceState.led = Boolean(led);
  saveDb();

  res.json({
    success: true,
    message: `LED turned ${db.deviceState.led ? 'ON' : 'OFF'}`,
    led: db.deviceState.led
  });
});

// POST /api/iot/lcd : Update 16x2 LCD Text (Web Dashboard Tab 2)
app.post('/api/iot/lcd', (req, res) => {
  let { line1, line2 } = req.body;

  line1 = (line1 !== undefined ? String(line1) : '').substring(0, 16);
  line2 = (line2 !== undefined ? String(line2) : '').substring(0, 16);

  db.deviceState.lcdLine1 = line1;
  db.deviceState.lcdLine2 = line2;
  saveDb();

  res.json({
    success: true,
    message: 'LCD details updated successfully',
    line1: db.deviceState.lcdLine1,
    line2: db.deviceState.lcdLine2
  });
});

// POST /api/iot/ping : Simulate device heartbeat for testing
app.post('/api/iot/ping', (req, res) => {
  db.deviceState.lastPing = new Date().toISOString();
  saveDb();
  res.json({ success: true, online: true, lastPing: db.deviceState.lastPing });
});

// ==========================================
// READINGS & RECORDS ROUTES
// ==========================================

// GET /api/readings : Paginated records for table (Web Dashboard Tab 1, Section 2)
app.get('/api/readings', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // Most recent first for display
  const sorted = [...db.readings].reverse();
  const total = sorted.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginated = sorted.slice(startIndex, startIndex + limit);

  const latestReading = db.readings.length > 0 ? db.readings[db.readings.length - 1] : { temperature: 0, humidity: 0 };

  res.json({
    success: true,
    readings: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages
    },
    current: {
      temperature: latestReading.temperature,
      humidity: latestReading.humidity
    }
  });
});

// GET /api/readings/history : Recent readings for Chart.js graphs
app.get('/api/readings/history', (req, res) => {
  const count = parseInt(req.query.count) || 20;
  // Get last N records in chronological order
  const sliceStart = Math.max(0, db.readings.length - count);
  const history = db.readings.slice(sliceStart);

  res.json({
    success: true,
    history
  });
});

// DELETE /api/readings/:id : Delete single record
app.delete('/api/readings/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = db.readings.findIndex(r => r.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  const removed = db.readings.splice(index, 1)[0];
  saveDb();

  res.json({
    success: true,
    message: `Record #${id} deleted successfully`,
    deleted: removed
  });
});

// POST /api/readings/simulate : Manually add a test reading (useful for manual testing!)
app.post('/api/readings/simulate', (req, res) => {
  const lastTemp = db.readings.length > 0 ? db.readings[db.readings.length - 1].temperature : 30;
  const lastHum = db.readings.length > 0 ? db.readings[db.readings.length - 1].humidity : 50;

  // Generate slight realistic variation
  const tempDelta = (Math.random() * 2 - 1).toFixed(1);
  const humDelta = Math.floor(Math.random() * 5 - 2);

  let newTemp = Math.min(50, Math.max(15, parseFloat(lastTemp) + parseFloat(tempDelta)));
  let newHum = Math.min(95, Math.max(20, parseInt(lastHum) + humDelta));

  newTemp = Number(newTemp.toFixed(1));
  newHum = Number(newHum);

  const now = new Date();
  const { time, date } = getKolkataDateTime(now);

  const newReading = {
    id: db.nextReadingId++,
    temperature: newTemp,
    humidity: newHum,
    time,
    date,
    timestamp: now.getTime()
  };

  db.readings.push(newReading);
  db.deviceState.lastPing = now.toISOString();
  saveDb();

  res.json({
    success: true,
    message: 'Simulated reading added successfully',
    reading: newReading
  });
});

// Catch-all to serve index.html for frontend navigation
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Simple IoT World - Server is Running!`);
  console.log(` Port: ${PORT}`);
  console.log(` Timezone: Asia/Kolkata (+5:30)`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` Ready for Render Deployment`);
  console.log(`=========================================`);
});
