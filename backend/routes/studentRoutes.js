const router = require('express').Router();
const bookingController = require('../controllers/bookingController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

router.use(authenticate, requireRole('student'));
router.get('/bookings', bookingController.listStudentBookings);

module.exports = router;
