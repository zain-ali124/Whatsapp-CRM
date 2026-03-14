const express = require('express');
const router  = express.Router();
const { protect, ownerOnly } = require('../middlewares/auth');
const {
  getAgents,
  getAgent,
  inviteAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  loginAgent,
} = require('../controllers/agentController');

// ── Public ──────────────────────────────────────────────────
router.post('/login', loginAgent);     // agent login — no auth needed

// ── Protected (owner or agent) ────────────────────────────
router.use(protect);

router.get('/',         getAgents);
router.get('/:id',      getAgent);

// ── Owner-only ────────────────────────────────────────────
router.post('/invite',  ownerOnly, inviteAgent);
router.post('/',        ownerOnly, createAgent);
router.patch('/:id',    ownerOnly, updateAgent);
router.delete('/:id',   ownerOnly, deleteAgent);

module.exports = router;