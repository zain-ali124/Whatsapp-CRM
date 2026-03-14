const express = require('express');
const router  = express.Router();
const { protect, ownerOnly } = require('../middlewares/auth');
const {
  getLeads, getLead, createLead, updateLead,
  assignLead, setReminder, deleteLead, bulkAssign,
} = require('../controllers/leadController');

router.use(protect);

// NOTE: static sub-paths MUST be before /:id to avoid Express param collision
router.post('/bulk-assign',      ownerOnly, bulkAssign);   // → POST (was PATCH, mismatch fixed)

router.get('/',                  getLeads);
router.post('/',                 createLead);
router.get('/:id',               getLead);
router.patch('/:id',             updateLead);
router.patch('/:id/assign',      ownerOnly, assignLead);   // ← new
router.patch('/:id/reminder',    setReminder);             // ← new (agent can set own)
router.delete('/:id',            ownerOnly, deleteLead);

module.exports = router;