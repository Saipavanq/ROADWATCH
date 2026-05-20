// ============================================================
// Auth Routes
// ============================================================
const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  register, login, verifyOtp, guestLogin,
  refreshToken, me, logout,
  requestDeleteOtp, deleteAccount
} = require('../controllers/auth.controller');

router.post('/register',   register);
router.post('/login',      login);
router.post('/verify-otp', verifyOtp);
router.post('/guest',      guestLogin);
router.post('/refresh',  refreshToken);
router.post('/logout',   authenticate, logout);
router.get('/me',        authenticate, me);
router.post('/delete-otp', authenticate, requestDeleteOtp);
router.delete('/delete-account', authenticate, deleteAccount);

module.exports = router;
