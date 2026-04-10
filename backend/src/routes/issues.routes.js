// ============================================================
// Issues (AI) Routes
// ============================================================
const express = require('express');
const router  = express.Router();
const upload  = require('../middleware/upload');
const { analyzeImage, getAIStatus } = require('../controllers/issues.controller');

router.post('/analyze', upload.single('image'), analyzeImage);
router.get('/ai-status', getAIStatus);

module.exports = router;
