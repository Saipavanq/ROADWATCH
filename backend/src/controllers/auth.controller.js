// ============================================================
// Auth Controller — Register, Login, Guest, Refresh, Me
// ============================================================
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../models/db');

const generateAccessToken  = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });

// ── Register ─────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });

    // Check existing
    const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length)
      return res.status(409).json({ success: false, message: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, phone, role, is_verified)
       VALUES ($1, $2, $3, $4, 'citizen', FALSE) RETURNING id, name, email, role, created_at`,
      [name, email, password_hash, phone || null]
    );
    const user = rows[0];

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await query(
      'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3',
      [otpCode, otpExpires, user.id]
    );

    // MOCK SEND OTP - PRINT TO CONSOLE
    console.log(`\n========================================`);
    console.log(`🔑 OTP for New User ${email}: ${otpCode}`);
    console.log(`========================================\n`);

    res.status(201).json({ 
      success: true, 
      message: 'Account created. OTP sent to email.', 
      data: { requiresOtp: true, userId: user.id } 
    });
  } catch (err) { next(err); }
};

// ── Login ─────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required' });

    const { rows } = await query(
      'SELECT id, name, email, role, password_hash, is_active, is_verified FROM users WHERE email = $1 AND is_guest = FALSE',
      [email]
    );
    if (!rows.length)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const user = rows[0];
    if (!user.is_active)
      return res.status(403).json({ success: false, message: 'Account is deactivated' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Generate Tokens immediately (Removed OTP for login per user request)
    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);
    const expiresAt    = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    const { password_hash, ...userSafe } = user;
    res.json({ 
      success: true, 
      message: 'Login successful', 
      data: { user: userSafe, accessToken, refreshToken, requiresOtp: false } 
    });
  } catch (err) { next(err); }
};

// ── Verify OTP ────────────────────────────────────────────────
exports.verifyOtp = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp)
      return res.status(400).json({ success: false, message: 'User ID and OTP are required' });

    const { rows } = await query(
      'SELECT id, name, email, role, otp_code, otp_expires_at FROM users WHERE id = $1',
      [userId]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'User not found' });

    const user = rows[0];
    if (user.otp_code !== otp)
      return res.status(401).json({ success: false, message: 'Invalid OTP code' });
    
    if (new Date() > new Date(user.otp_expires_at))
      return res.status(401).json({ success: false, message: 'OTP has expired' });

    // Mark as verified and clear OTP
    await query(
      'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
      [user.id]
    );

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);
    const expiresAt    = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    const { otp_code, otp_expires_at, ...userSafe } = user;
    res.json({ success: true, message: 'Login successful', data: { user: userSafe, accessToken, refreshToken } });
  } catch (err) { next(err); }
};

// ── Guest Token ───────────────────────────────────────────────
exports.guestLogin = async (req, res, next) => {
  try {
    const guestName = `Guest_${uuidv4().slice(0, 8)}`;
    const guestEmail = `${guestName.toLowerCase()}@guest.roadwatch`;

    const { rows } = await query(
      `INSERT INTO users (name, email, role, is_guest)
       VALUES ($1, $2, 'citizen', TRUE) RETURNING id, name, email, role`,
      [guestName, guestEmail]
    );
    const user = rows[0];
    const accessToken = generateAccessToken(user);

    res.json({ success: true, message: 'Guest session started', data: { user, accessToken, isGuest: true } });
  } catch (err) { next(err); }
};

// ── Refresh Token ─────────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ success: false, message: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const { rows } = await query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [refreshToken, decoded.id]
    );
    if (!rows.length)
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });

    const userRes = await query(
      'SELECT id, name, email, role FROM users WHERE id = $1 AND is_active = TRUE',
      [decoded.id]
    );
    if (!userRes.rows.length)
      return res.status(401).json({ success: false, message: 'User not found' });

    const user = userRes.rows[0];
    const newAccessToken = generateAccessToken(user);

    res.json({ success: true, data: { accessToken: newAccessToken } });
  } catch (err) { next(err); }
};

// ── Get Current User ──────────────────────────────────────────
exports.me = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, name, email, role, phone, avatar_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ success: true, data: { user: rows[0] } });
  } catch (err) { next(err); }
};

// ── Logout ────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) { next(err); }
};
