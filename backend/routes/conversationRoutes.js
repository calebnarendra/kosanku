const router = require('express').Router();
const conversationController = require('../controllers/conversationController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);
router.get('/', conversationController.listConversations);
router.post('/', conversationController.createOrOpenConversation);
router.get('/:id/messages', conversationController.listMessages);
router.post('/:id/messages', conversationController.sendMessage);
router.patch('/:id/read', conversationController.markConversationRead);

module.exports = router;
