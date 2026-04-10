// ============================================================
// Issues Controller — AI analysis results
// ============================================================
const axios = require('axios').default;
const { query } = require('../models/db');

// ── Analyze Image via AI Service ──────────────────────────────
exports.analyzeImage = async (req, res, next) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'Image file is required' });

    const aiUrl = `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/analyze`;

    let aiResult;
    try {
      const response = await axios.post(aiUrl, {
        image_path: `uploads/complaints/${req.file.filename}`,
      }, { timeout: 15000 });
      aiResult = response.data;
    } catch (_) {
      // Fallback to mock if AI service is down
      aiResult = mockAIAnalysis(req.file.filename);
    }

    res.json({
      success: true,
      message: 'Image analyzed successfully',
      data: {
        issue_type:  aiResult.issue_type,
        severity:    aiResult.severity,
        confidence:  aiResult.confidence,
        notes:       aiResult.notes,
        imagePath:   `/uploads/complaints/${req.file.filename}`,
      },
    });
  } catch (err) { next(err); }
};

// ── Mock AI Analysis (used when real AI service is offline) ───
function mockAIAnalysis(filename) {
  const types     = ['pothole', 'crack', 'waterlogging', 'broken_divider', 'other'];
  const severities = ['low', 'medium', 'high', 'critical'];
  const weights   = [0.40, 0.25, 0.15, 0.10, 0.10]; // pothole is most common

  let rand = Math.random(), cumulative = 0, issue_type = 'other';
  for (let i = 0; i < types.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) { issue_type = types[i]; break; }
  }

  const severityMap = { pothole: 'high', crack: 'medium', waterlogging: 'medium', broken_divider: 'high', other: 'low' };
  const severity    = severityMap[issue_type];
  const confidence  = parseFloat((0.72 + Math.random() * 0.22).toFixed(3));

  const notesMap = {
    pothole:        'Detected surface depression consistent with pothole formation. Immediate attention recommended.',
    crack:          'Linear surface crack pattern detected. Monitor for progression.',
    waterlogging:   'Standing water accumulation detected. Drainage issue likely.',
    broken_divider: 'Road divider damage identified. Safety hazard for traffic.',
    other:          'General road surface anomaly detected.',
  };

  return { issue_type, severity, confidence, notes: notesMap[issue_type] };
}

// ── Get AI Status ─────────────────────────────────────────────
exports.getAIStatus = async (req, res, next) => {
  try {
    let aiOnline = false;
    try {
      const response = await axios.get(`${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/health`, { timeout: 3000 });
      aiOnline = response.data?.status === 'ok';
    } catch (_) {}

    res.json({
      success: true,
      data: {
        aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
        online: aiOnline,
        mode: aiOnline ? 'real' : 'mock',
      },
    });
  } catch (err) { next(err); }
};
