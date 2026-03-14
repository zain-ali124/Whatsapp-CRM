const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  markUsed,
  toggleFavourite
} = require('../controllers/templateController');

// All template routes require authentication
router.use(protect);

// GET /api/templates - Get all templates
router.get('/', getTemplates);

// GET /api/templates/:id - Get single template
router.get('/:id', getTemplate);

// POST /api/templates - Create new template
router.post('/', createTemplate);

// PATCH /api/templates/:id - Update template
router.patch('/:id', updateTemplate);

// DELETE /api/templates/:id - Delete template
router.delete('/:id', deleteTemplate);

// POST /api/templates/:id/use - Mark template as used
router.post('/:id/use', markUsed);

// POST /api/templates/:id/toggle-favourite - Toggle favourite status
router.post('/:id/toggle-favourite', toggleFavourite);

module.exports = router;