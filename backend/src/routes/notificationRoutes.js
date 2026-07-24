const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, notificationController.listNotifications);
router.get('/unread-count', authMiddleware, notificationController.getUnreadCount);
router.post('/read-all', authMiddleware, notificationController.markAllRead);
router.post('/mark-read-by-link', authMiddleware, notificationController.markReadByLink);
router.post('/:notificationId/read', authMiddleware, notificationController.markRead);

module.exports = router;
