const router = require('express').Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/password', authenticate, authController.changePassword);
router.post('/email-verification/send', authenticate, authController.requestEmailVerification);
router.post('/email-verification/confirm', authenticate, authController.confirmEmailVerification);
router.delete('/account', authenticate, authController.deleteAccount);

module.exports = router;
