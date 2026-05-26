const router = require('express').Router();
const roomController = require('../controllers/roomController');
const bookingController = require('../controllers/bookingController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

router.use(authenticate, requireRole('provider'));
router.get('/rooms', roomController.listProviderRooms);
router.get('/bookings', bookingController.listProviderBookings);

module.exports = router;
