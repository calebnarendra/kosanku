const router = require('express').Router();
const roomController = require('../controllers/roomController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

router.get('/', roomController.listRooms);
router.get('/favorites', authenticate, requireRole('student'), roomController.listFavorites);
router.get('/:id', roomController.getRoomById);
router.post('/', authenticate, requireRole('provider'), roomController.createRoom);
router.put('/:id', authenticate, requireRole('provider'), roomController.updateRoom);
router.post('/:id/favorite', authenticate, requireRole('student'), roomController.addFavorite);
router.delete('/:id/favorite', authenticate, requireRole('student'), roomController.removeFavorite);
router.post('/:id/rating', authenticate, requireRole('student'), roomController.submitRoomRating);

module.exports = router;
