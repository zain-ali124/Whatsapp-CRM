const Template = require('../models/Template');
const mongoose = require('mongoose');

/* ─────────────────────────────────────────────────────────────
   GET /api/templates
   List all templates for the logged-in user.
   Query params: ?category=follow_up&search=hello&favourite=true
──────────────────────────────────────────────────────────────── */
exports.getTemplates = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, search, favourite } = req.query;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Invalid user ID' });
    }

    const filter = { userId: new mongoose.Types.ObjectId(userId) };

    // Add category filter if provided and valid
    if (category && category !== 'all' && category !== 'undefined' && category !== 'null') {
      filter.category = category;
    }

    // Add favourite filter if provided
    if (favourite === 'true') {
      filter.isFavourite = true;
    }

    // Add search filter if provided
    if (search && search.trim() && search !== 'undefined' && search !== 'null') {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { body: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const templates = await Template.find(filter)
      .sort({ isFavourite: -1, updatedAt: -1 })
      .lean();

    res.json({ 
      success: true,
      templates: templates || [] 
    });
  } catch (err) {
    console.error('getTemplates error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch templates',
      error: err.message 
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/templates/:id
──────────────────────────────────────────────────────────────── */
exports.getTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }

    const template = await Template.findOne({
      _id: id,
      userId: userId,
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ 
      success: true,
      template 
    });
  } catch (err) {
    console.error('getTemplate error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch template',
      error: err.message 
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/templates
   Body: { name, body, category }
──────────────────────────────────────────────────────────────── */
exports.createTemplate = async (req, res) => {
  try {
    console.log('========== CREATE TEMPLATE DEBUG ==========');
    console.log('1. Request body:', req.body);
    console.log('2. Request user:', req.user);
    console.log('3. Request user ID:', req.user?.id);
    console.log('4. Request headers:', req.headers);
    
    const { name, body, category } = req.body;
    const userId = req.user?.id;

    // Log each field
    console.log('5. Extracted fields:', { name, body, category, userId });

    // Validate required fields
    if (!userId) {
      console.log('6. ERROR: No user ID found');
      return res.status(401).json({ message: 'Not authorized - no user ID' });
    }

    if (!name || !name.trim()) {
      console.log('6. ERROR: No name provided');
      return res.status(400).json({ message: 'Template name is required' });
    }

    if (!body || !body.trim()) {
      console.log('6. ERROR: No body provided');
      return res.status(400).json({ message: 'Template body is required' });
    }

    // Check if mongoose is available
    console.log('7. Mongoose available:', !!mongoose);
    console.log('8. Types.ObjectId available:', !!mongoose.Types.ObjectId);
    console.log('9. Is userId valid ObjectId?', mongoose.Types.ObjectId.isValid(userId));

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('10. ERROR: Invalid user ID format:', userId);
      return res.status(401).json({ message: 'Invalid user ID format' });
    }

    // Check Template model
    console.log('11. Template model exists:', !!Template);
    console.log('12. Template model methods:', Object.keys(Template));

    // Create template object
    const templateData = {
      userId: new mongoose.Types.ObjectId(userId),
      name: name.trim(),
      body: body.trim(),
      category: category || 'custom',
    };
    console.log('13. Template data to save:', templateData);

    // Try to create template
    console.log('14. Attempting to create template...');
    const template = await Template.create(templateData);
    console.log('15. Template created successfully:', template);

    res.status(201).json({ 
      success: true,
      template, 
      message: 'Template created successfully' 
    });

  } catch (err) {
    console.log('========== CREATE TEMPLATE ERROR ==========');
    console.log('Error name:', err.name);
    console.log('Error message:', err.message);
    console.log('Error stack:', err.stack);
    
    if (err.name === 'ValidationError') {
      console.log('Validation errors:', err.errors);
      return res.status(400).json({ 
        message: Object.values(err.errors).map(e => e.message).join(', ') 
      });
    }
    
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
      console.log('MongoDB error code:', err.code);
      console.log('MongoDB error details:', err);
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to create template',
      error: err.message,
      errorName: err.name
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   PATCH /api/templates/:id
   Body: { name?, body?, category?, isFavourite? }
──────────────────────────────────────────────────────────────── */
exports.updateTemplate = async (req, res) => {
  try {
    const { name, body, category, isFavourite } = req.body;
    const userId = req.user.id;
    const { id } = req.params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Invalid user ID' });
    }

    // Find template
    const template = await Template.findOne({
      _id: id,
      userId: userId,
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Update fields if provided
    if (name !== undefined) template.name = name.trim();
    if (body !== undefined) template.body = body.trim();
    if (category !== undefined) template.category = category;
    if (isFavourite !== undefined) template.isFavourite = isFavourite;

    await template.save();

    res.json({ 
      success: true,
      template, 
      message: 'Template updated successfully' 
    });
  } catch (err) {
    console.error('updateTemplate error:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: Object.values(err.errors).map(e => e.message).join(', ') 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to update template',
      error: err.message 
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   DELETE /api/templates/:id
──────────────────────────────────────────────────────────────── */
exports.deleteTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Invalid user ID' });
    }

    // Delete template
    const template = await Template.findOneAndDelete({
      _id: id,
      userId: userId,
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ 
      success: true,
      message: 'Template deleted successfully' 
    });
  } catch (err) {
    console.error('deleteTemplate error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete template',
      error: err.message 
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/templates/:id/use
   Increments usageCount — called when agent sends a template.
──────────────────────────────────────────────────────────────── */
exports.markUsed = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Invalid user ID' });
    }

    // Update usage count
    const template = await Template.findOneAndUpdate(
      { _id: id, userId: userId },
      { $inc: { usageCount: 1 } },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ 
      success: true,
      template,
      message: 'Usage recorded successfully' 
    });
  } catch (err) {
    console.error('markUsed error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to mark template as used',
      error: err.message 
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/templates/:id/toggle-favourite
──────────────────────────────────────────────────────────────── */
exports.toggleFavourite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Invalid user ID' });
    }

    // Find template
    const template = await Template.findOne({
      _id: id,
      userId: userId,
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Toggle favourite
    template.isFavourite = !template.isFavourite;
    await template.save();

    res.json({ 
      success: true,
      template, 
      isFavourite: template.isFavourite,
      message: template.isFavourite ? 'Added to favourites' : 'Removed from favourites'
    });
  } catch (err) {
    console.error('toggleFavourite error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to toggle favourite',
      error: err.message 
    });
  }
};