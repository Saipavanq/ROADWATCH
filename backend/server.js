// ============================================================
// RoadWatch — Main Server Entry Point
// ============================================================
require('dotenv').config();
const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const path       = require('path');
const { Server } = require('socket.io');
const rateLimit  = require('express-rate-limit');

const authRoutes       = require('./src/routes/auth.routes');
const complaintsRoutes = require('./src/routes/complaints.routes');
const issuesRoutes     = require('./src/routes/issues.routes');
const mapRoutes        = require('./src/routes/map.routes');
const authorityRoutes  = require('./src/routes/authority.routes');
const roadsRoutes      = require('./src/routes/roads.routes');
const budgetRoutes     = require('./src/routes/budget.routes');
const contractorsRoutes = require('./src/routes/contractors.routes');
const { autoEscalateStalledComplaints } = require('./src/controllers/authority.controller');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'] },
});

// ── Middleware ──────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api', limiter);

// ── Socket.IO ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`📦 ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes
app.set('io', io);

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/issues',     issuesRoutes);
app.use('/api/map',        mapRoutes);
app.use('/api/authority',  authorityRoutes);
app.use('/api/roads',      roadsRoutes);
app.use('/api/budget',     budgetRoutes);
app.use('/api/contractors', contractorsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'RoadWatch API', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── 404 & Error Handlers ─────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Auto-Escalation Scheduler (Module 10) ────────────────────
// Runs every hour: escalates complaints with no action in 7+ days
const ESCALATION_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
setInterval(async () => {
  const count = await autoEscalateStalledComplaints();
  if (count) console.log(`⚡ Auto-escalated ${count} complaint(s)`);
}, ESCALATION_INTERVAL_MS);

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🛣️  RoadWatch API running on http://localhost:${PORT}`);
  console.log(`📡  Socket.IO ready`);
  console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡  Auto-escalation scheduler: every 1 hour\n`);
});
