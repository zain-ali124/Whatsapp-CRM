const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  getDashboardStats,
  getSourceStats,
  getAgentPerformance,
  getConversionFunnel,
  getLeadsOverTime
} = require('../controllers/analyticsController');

router.use(protect);

router.get('/dashboard',       getDashboardStats);
router.get('/sources',         getSourceStats);
router.get('/agents',          getAgentPerformance);
router.get('/funnel',          getConversionFunnel);
router.get('/leads-over-time', getLeadsOverTime);

module.exports = router;