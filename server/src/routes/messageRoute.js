const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const { protect } = require('../middlewares/auth');
const { getMessages, sendMessage, sendAudio } = require('../controllers/messageController');

// multer: store audio in memory (max 16MB — WhatsApp audio limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 16 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/ogg', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/aac'];
    if (allowed.some(t => file.mimetype.startsWith('audio'))) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files allowed'));
    }
  },
});

router.use(protect);

// IMPORTANT: static routes before /:leadId
router.post('/send',        sendMessage);
router.post('/send-audio',  upload.single('audio'), sendAudio);
router.get('/:leadId',      getMessages);

module.exports = router;