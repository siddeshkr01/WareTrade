const productService = require('../services/productService');

const createProduct = async (req, res) => {
    try {
        const result = await productService.addProduct(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const editProduct = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await productService.editProduct(id, req.body);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await productService.deleteProduct(id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getMyProducts = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const products = await productService.getProductsByUserId(user_id);
        res.json(products);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getProductDetails = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const product = await productService.getProductById(id);
        res.json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getAllMygodownsWithProductAlongWithQuantity = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const product_id = parseInt(req.params.id);
        const result = await productService.getAllMygodownsWithProductAlongWithQuantity(user_id, product_id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

module.exports = {
    createProduct,
    editProduct,
    deleteProduct,
    getMyProducts,
    getProductDetails,
    getAllMygodownsWithProductAlongWithQuantity
};