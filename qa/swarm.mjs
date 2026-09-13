/**
 * Magi Cinema - 1,000 Virtual Bot Swarm Simulator
 * Simulates high concurrent online visitors using lightweight WebSocket presence sessions
 * and realistic human browsing activity.
 */

const TARGET_BOTS = Number(process.argv[2] || process.env.BOT_COUNT || 1000);
const API_BASE_URL = (process.env.API_BASE_URL || 'https://magi-cinema.onrender.com').replace(/\/$/, '');
const ORIGIN = process.env.UI_BASE_URL || 'https://hekio.tokyo';
const BATCH_SIZE = 25; // Connect 25 bots every tick
const BATCH_INTERVAL_MS = 1000; // 25 bots per second => 1,000 bots in ~40 seconds

function getWsUrl() {
  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws/presence';
  url.search = '';
  return url.toString();
}

const WS_URL = getWsUrl();

const PUBLIC_ENDPOINTS = [
  '/showtimes/dates',
  '/combos',
  '/food-items',
];

class Bot {
  constructor(id) {
    this.id = id;
    this.ws = null;
    this.connected = false;
    this.pingTimer = null;
    this.browseTimer = null;
    this.reconnectTimer = null;
    this.stopped = false;
  }

  start() {
    if (this.stopped) return;
    try {
      this.ws = new WebSocket(WS_URL, {
        headers: { Origin: ORIGIN },
      });

      this.ws.onopen = () => {
        this.connected = true;
        stats.connected++;
        stats.connecting = Math.max(0, stats.connecting - 1);

        // Send initial presence ping
        try {
          this.ws.send('ping');
        } catch (_) {}

        // Set up periodic heartbeat ping with random jitter (20s - 30s)
        const pingInterval = 20000 + Math.floor(Math.random() * 10000);
        this.pingTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
              this.ws.send('ping');
            } catch (_) {}
          }
        }, pingInterval);

        // Set up occasional browsing traffic (every 20s - 50s)
        const browseDelay = 10000 + Math.floor(Math.random() * 30000);
        this.browseTimer = setTimeout(() => this.browseLoop(), browseDelay);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (typeof data.count === 'number') {
            stats.lastServerCount = data.count;
          } else if (typeof data.onlineCount === 'number') {
            stats.lastServerCount = data.onlineCount;
          }
        } catch (_) {}
      };

      this.ws.onclose = () => {
        if (this.connected) {
          stats.connected = Math.max(0, stats.connected - 1);
          this.connected = false;
        }
        this.cleanupTimers();

        // Reconnect after 5s if not manually stopped
        if (!this.stopped && !this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.stopped) {
              stats.connecting++;
              this.start();
            }
          }, 5000 + Math.floor(Math.random() * 3000));
        }
      };

      this.ws.onerror = () => {
        stats.errors++;
        try {
          this.ws?.close();
        } catch (_) {}
      };
    } catch (err) {
      stats.errors++;
      stats.connecting = Math.max(0, stats.connecting - 1);
    }
  }

  async browseLoop() {
    if (this.stopped || !this.connected) return;

    // Pick a random public endpoint
    const endpoint = PUBLIC_ENDPOINTS[Math.floor(Math.random() * PUBLIC_ENDPOINTS.length)];
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        stats.httpSuccess++;
      } else {
        stats.httpFailed++;
      }
    } catch (_) {
      stats.httpFailed++;
    }

    // Schedule next browse action (every 25s - 60s)
    const nextDelay = 25000 + Math.floor(Math.random() * 35000);
    this.browseTimer = setTimeout(() => this.browseLoop(), nextDelay);
  }

  cleanupTimers() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.browseTimer) {
      clearTimeout(this.browseTimer);
      this.browseTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  stop() {
    this.stopped = true;
    this.cleanupTimers();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    if (this.connected) {
      stats.connected = Math.max(0, stats.connected - 1);
      this.connected = false;
    }
  }
}

// Global statistics
const stats = {
  target: TARGET_BOTS,
  spawned: 0,
  connected: 0,
  connecting: 0,
  errors: 0,
  httpSuccess: 0,
  httpFailed: 0,
  lastServerCount: 0,
  startTime: Date.now(),
};

const bots = [];

function formatTime(ms) {
  const sec = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
  const min = Math.floor((ms / 60000) % 60).toString().padStart(2, '0');
  const hr = Math.floor(ms / 3600000).toString().padStart(2, '0');
  return `${hr}:${min}:${sec}`;
}

function renderDashboard() {
  const elapsed = Date.now() - stats.startTime;
  const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  const totalHttp = stats.httpSuccess + stats.httpFailed;
  const httpRate = totalHttp > 0 ? ((stats.httpSuccess / totalHttp) * 100).toFixed(1) : '100.0';

  console.clear();
  console.log('================================================================');
  console.log('       🎬 MAGI CINEMA - VIRTUAL BOT SWARM SIMULATOR            ');
  console.log('================================================================');
  console.log(`  Target Backend     : ${API_BASE_URL}`);
  console.log(`  WebSocket Endpoint : ${WS_URL}`);
  console.log(`  Target Bot Count   : ${stats.target.toLocaleString('vi-VN')} bots`);
  console.log('----------------------------------------------------------------');
  console.log(`  🟢 Bots Đang Online : ${stats.connected.toLocaleString('vi-VN')} / ${stats.target.toLocaleString('vi-VN')} (${((stats.connected / stats.target) * 100).toFixed(1)}%)`);
  console.log(`  ⏳ Đang kết nối     : ${stats.connecting}`);
  console.log(`  📡 Server Broadcast : 🟢 ${stats.lastServerCount.toLocaleString('vi-VN')} người đang trực tuyến`);
  console.log(`  🌐 HTTP Requests    : ${totalHttp.toLocaleString('vi-VN')} (Thành công: ${httpRate}%)`);
  console.log(`  💾 RAM máy tính tiêu thụ: ~${mem} MB`);
  console.log(`  ⏱️ Thời gian chạy   : ${formatTime(elapsed)}`);
  console.log('================================================================');
  console.log('  👉 Bạn có thể mở https://hekio.tokyo/admin để xem huy hiệu');
  console.log('     "🟢 X trực tuyến" tăng lên theo thời gian thực!');
  console.log('----------------------------------------------------------------');
  console.log('  [Nhấn phím Ctrl + C để dừng bot và ngắt toàn bộ kết nối]');
  console.log('================================================================');
}

// Spawn loop: gradually add bots in batches to prevent socket burst
let spawnInterval = null;
function startSpawning() {
  spawnInterval = setInterval(() => {
    if (stats.spawned >= stats.target) {
      clearInterval(spawnInterval);
      spawnInterval = null;
      return;
    }

    const countToSpawn = Math.min(BATCH_SIZE, stats.target - stats.spawned);
    for (let i = 0; i < countToSpawn; i++) {
      const bot = new Bot(stats.spawned + 1);
      bots.push(bot);
      stats.spawned++;
      stats.connecting++;
      bot.start();
    }
  }, BATCH_INTERVAL_MS);
}

// Dashboard render ticker
const uiInterval = setInterval(renderDashboard, 1000);

// Graceful shutdown handling
let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  if (spawnInterval) clearInterval(spawnInterval);
  clearInterval(uiInterval);

  console.log('\n\n[ĐANG DỪNG] Đang ngắt kết nối toàn bộ bot một cách an toàn...');
  for (const bot of bots) {
    bot.stop();
  }
  console.log('[HOÀN TẤT] Toàn bộ bot đã thoát. Server đã giải phóng kết nối.');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Launch
renderDashboard();
startSpawning();
