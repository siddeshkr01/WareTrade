const productModel = require('../models/productModel');

const addProduct = async (data) => {
    const { product_name, category } = data;

    if (!product_name?.trim() || !category?.trim()) {
        throw new Error("Required fields missing");
    }

    const active = await productModel.findActiveProduct(product_name, category);
    const any = await productModel.findAnyProduct(product_name, category);

    if (active) {
        throw new Error("Product already exists");
    } else if (any) {
        await productModel.restoreProduct(product_name, category);
        return { message: "Product restored successfully" };
    } else {
        const product_id = await productModel.createProduct(product_name, category);
        return { product_id };
    }
};

const editProduct = async (id, data) => {
    const { product_name, category } = data;

    if (!product_name?.trim() || !category?.trim()) {
        throw new Error("Required fields missing");
    }

    const existing = await productModel.findActiveProduct(product_name, category);
    if (existing && existing.product_id !== id) {
        throw new Error("Product already exists");
    }

    await productModel.editProduct(id, { product_name, category });
    return { message: "Product updated successfully" };
};

const deleteProduct = async (id) => {
    await productModel.deleteProduct(id);
    return { message: "Product deleted successfully" };
};

const getProductsByUserId = async (user_id) => {
    return await productModel.getProductsByUserId(user_id);
};

// ✅ SPLIT RESPONSE HERE
const getAllMygodownsWithProductAlongWithQuantity = async (user_id, product_id) => {
    const data = await productModel.getAllMygodownsWithProductAlongWithQuantity(user_id, product_id);

    const owned = [];
    const rented = [];

    for (const g of data) {
        if (g.role === 'owner') {
            owned.push(g);
        } else {
            rented.push(g);
        }
    }

    return {
        owned_godowns: owned,
        rented_godowns: rented
    };
};

const getProductById = async (product_id) => {
    const product = await productModel.getProductDetailsById(product_id);
    if (!product) throw new Error("Product not found");
    return product;
};

module.exports = {
    addProduct,
    editProduct,
    deleteProduct,
    getProductsByUserId,
    getAllMygodownsWithProductAlongWithQuantity,
    getProductById
};