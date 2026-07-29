const express = require('express');
const router = express.Router();

const godownController = require('../controllers/godownController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, godownController.createGodown);
router.put('/:id', authMiddleware, godownController.editGodown);
router.delete('/:id', authMiddleware, godownController.deleteGodown);
router.get('/my-godowns', authMiddleware, godownController.getMyGodowns);
router.get('/search', authMiddleware, godownController.searchAvailableGodowns);
router.get('/rent/requests', authMiddleware, godownController.getRentalRequests);
router.get('/rent/active', authMiddleware, godownController.getActiveRentalsAsOwner);
router.get('/rent/history', authMiddleware, godownController.getRentalHistory);
router.get('/rented', authMiddleware, godownController.getRentedGodowns);
router.post('/stock/add', authMiddleware, godownController.addStock);
router.post('/stock/remove', authMiddleware, godownController.removeStock);
router.post('/rent/request', authMiddleware, godownController.requestRental);
router.post('/rent/respond', authMiddleware, godownController.handleRentalRequest);
router.post('/rent/end', authMiddleware, godownController.endRental);

router.get('/:id/stock', authMiddleware, godownController.getGodownStock);
router.get('/:id/history', authMiddleware, godownController.getStockHistory);
router.get('/:id', authMiddleware, godownController.getGodownDetails);

module.exports = router;