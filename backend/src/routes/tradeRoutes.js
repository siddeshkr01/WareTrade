const express = require('express');
const router = express.Router();

const tradeController = require('../controllers/tradeController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, tradeController.createTrade);
router.post('/:tradeId/items', authMiddleware, tradeController.addItemsToTrade);
router.post('/:tradeId/send', authMiddleware, tradeController.sendTradeRequest);
router.post('/:tradeId/respond', authMiddleware, tradeController.respondToTradeRequest);

// ✅ static routes first
router.get('/initiated', authMiddleware, tradeController.getInitiatedTradesByUserId);
router.get('/received', authMiddleware, tradeController.getReceivedTradesByUserId);

// ✅ dynamic routes last
router.get('/:tradeId', authMiddleware, tradeController.getTradeByTradeId);
router.get('/:tradeId/items', authMiddleware, tradeController.getTradeItemsByTradeId);
router.get('/:tradeId/details', authMiddleware, tradeController.getTradeDetailsByTradeId);

module.exports = router;