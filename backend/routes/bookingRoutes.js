const router = require('express').Router();
const bookingController = require('../controllers/bookingController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

router.post('/', authenticate, requireRole('student'), bookingController.createBooking);
router.patch('/:id/cancel', authenticate, requireRole('student'), bookingController.cancelBooking);
router.patch('/:id/status', authenticate, requireRole('provider'), bookingController.updateBookingStatus);
router.patch('/:id/remove-student', authenticate, requireRole('provider'), bookingController.removeStudentFromRoom);
router.get('/:id/requests', authenticate, bookingController.listMaintenanceRequests);
router.post('/:id/requests', authenticate, requireRole('student'), bookingController.createMaintenanceRequest);
router.patch('/requests/:requestId/acknowledge', authenticate, requireRole('provider'), bookingController.acknowledgeMaintenanceRequest);

module.exports = router;
