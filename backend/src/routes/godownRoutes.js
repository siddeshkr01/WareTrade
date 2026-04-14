const express = require('express');
const router = express.Router();

const godownController = require('../controllers/godownController'); // fix name if needed
const authMiddleware = require('../middleware/authMiddleware'); // ensure this exists

// 🔹 Create Godown
router.post('/', authMiddleware, godownController.createGodown);

// 🔹 Edit Godown
router.put('/:id', authMiddleware, godownController.editGodown);

// 🔹 Delete Godown
router.delete('/:id', authMiddleware, godownController.deleteGodown);

// 🔹 Get My Active Godowns
router.get('/my-godowns', authMiddleware, godownController.getMyGodowns);

// 🔹 Get Single Godown Details
router.get('/:id', authMiddleware, godownController.getGodownDetails);

// 🔹 Get Rental Requests (Owner)
router.get('/rent/requests', authMiddleware, godownController.getRentalRequests);

// 🔹 Get My Rented Godowns
router.get('/rented', authMiddleware, godownController.getRentedGodowns);

// 🔹 Add Stock
router.post('/stock/add', authMiddleware, godownController.addStock);

// 🔹 Remove Stock
router.post('/stock/remove', authMiddleware, godownController.removeStock);

// 🔹 Accept / Reject Rental Request
router.post('/rent/respond', authMiddleware, godownController.handleRentalRequest);

// 🔹 End Rental
router.post('/rent/end', authMiddleware, godownController.endRental);

module.exports = router;