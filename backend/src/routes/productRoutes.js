const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, productController.createProduct);
router.put('/:id', authMiddleware, productController.editProduct);
router.delete('/:id', authMiddleware, productController.deleteProduct);
router.get('/my-products', authMiddleware, productController.getMyProducts);
router.get('/:id', authMiddleware, productController.getProductDetails);

// final endpoint
router.get('/godowns-with-products/:id', authMiddleware, productController.getAllMygodownsWithProductAlongWithQuantity);

module.exports = router;