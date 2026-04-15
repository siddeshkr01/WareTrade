const godownModel = require('../models/godownModel');
const productModel = require('../models/productModel');

const addGodown = async (data) => {
    const { godown_name, location, capacity, owner_id } = data;

    if (!godown_name?.trim() || !location?.trim()) {
        throw new Error("Required fields missing");
    }

    if (!Number.isInteger(capacity) || capacity <= 0) {
        throw new Error("Capacity must be a positive integer");
    }

    const result = await godownModel.createGodown({
        godown_name,
        location,
        capacity,
        owner_id
    });

    return { godown_id: result.insertId };
};

const editGodown = async (godown_id, data, owner_id) => {
    const { godown_name, location, capacity } = data;

    if (!godown_name?.trim() || !location?.trim()) {
        throw new Error("Required fields missing");
    }

    if (!Number.isInteger(capacity) || capacity <= 0) {
        throw new Error("Capacity must be a positive integer");
    }

    const result = await godownModel.editGodown(godown_id, {
        godown_name,
        location,
        capacity,
        owner_id
    });

    if (result.affectedRows === 0) {
        throw new Error("Godown not found or unauthorized");
    }

    return { message: "Godown updated successfully" };
};

const deleteGodown = async (godown_id, owner_id) => {
    const hasRental = await godownModel.checkActiveRental(godown_id);
    if (hasRental) {
        throw new Error("Cannot delete: Godown is currently rented");
    }

    const hasProducts = await godownModel.checkStoredProducts(godown_id);
    if (hasProducts) {
        throw new Error("Cannot delete: Godown contains products");
    }

    const result = await godownModel.deleteGodown(godown_id, owner_id);

    if (result.affectedRows === 0) {
        throw new Error("Godown not found or unauthorized");
    }

    return { message: "Godown deleted successfully" };
};

const getGodownDetails = async (godown_id, user_id) => {

    const godown = await godownModel.getGodownDetails(godown_id);
    if (!godown) throw new Error("Godown not found");

    // ✅ Owner access
    if (godown.owner_id === user_id) {
        return godown;
    }

    // ✅ Tenant access
    const current = await godownModel.getCurrentUser(godown_id);

    if (!current || current.tenant_id !== user_id) {
        throw new Error("Unauthorized");
    }

    return godown;
};

const getUserActiveGodowns = async (user_id) => {
    return await godownModel.getUserActiveGodowns(user_id);
};

const getAllRequestsForRent = async (owner_id) => {
    return await godownModel.getAllRequestsForRent(owner_id);
};

const getAllRentedGodowns = async (tenant_id) => {
    return await godownModel.getAllRentedGodowns(tenant_id);
};

const addStock = async (data, user_id) => {
    const { godown_id, quantity , product_name, category} = data;
    const currentuser = await godownModel.getCurrentUser(godown_id);
    if (!currentuser) {
        throw new Error("Godown not found");
    }
    if (currentuser.owner_id !== user_id && currentuser.tenant_id !== user_id) {
        throw new Error("Unauthorized");
    }
    if (currentuser.owner_id === user_id && currentuser.tenant_id) {
        throw new Error("Cannot add stock to a currently rented godown");
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Quantity must be positive");
    }
    const product = await productModel.findActiveProduct(product_name, category);
    if (!product) {
        if (!product_name?.trim() || !category?.trim()) {
            throw new Error("Product name and category required");
        }
        data.product_id = await productModel.createProduct(product_name, category);
    } else {
        data.product_id = product.product_id;
    }
    return await godownModel.addProductToGodown(godown_id, data.product_id, quantity);
};

const removeStock = async (godown_id, product_id, quantity, user_id) => {

    const currentuser = await godownModel.getCurrentUser(godown_id);
    if (!currentuser) {
        throw new Error("Godown not found");
    }
    if (currentuser.owner_id !== user_id && currentuser.tenant_id !== user_id) {
        throw new Error("Unauthorized");
    }
    if (currentuser.owner_id === user_id && currentuser.tenant_id) {
        throw new Error("Cannot remove stock from a currently rented godown");
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Quantity must be positive");
    }

    const result = await godownModel.removeProductFromGodown(
        godown_id,
        product_id,
        quantity
    );

    if (result.affectedRows === 0) {
        throw new Error("Insufficient stock");
    }

    return result;
};

const createRentalRequest = async (godown_id, tenant_id) => {
    const current = await godownModel.getCurrentUser(godown_id);

    if (!current) {
        throw new Error("Godown not found");
    }

    if (current.owner_id === tenant_id) {
        throw new Error("Owner cannot request own godown");
    }

    if (current.tenant_id) {
        throw new Error("Godown already rented");
    }

    return await godownModel.createRentalRequest(godown_id, tenant_id);
};

const handleRentalRequest = async (rental_id, status, user_id) => {
    const rental = await godownModel.getRentalById(rental_id);
    if (!rental) {
        throw new Error("Rental request not found");
    }
    if (rental.owner_id !== user_id) {
        throw new Error("Unauthorized");
    }
    if (!['accepted', 'rejected'].includes(status)) {
        throw new Error("Invalid status");
    }
    return await godownModel.updateRentalStatus(rental_id, status, user_id);
};

const endRental = async (rental_id, user_id) => {
    const rental = await godownModel.getRentalById(rental_id);
    if (!rental) {
        throw new Error("Rental not found");
    }
    if (rental.owner_id !== user_id) {
        throw new Error("Unauthorized");
    }
    if (rental.status !== 'accepted') {
        throw new Error("Rental is not active");
    }
    if (rental.tenant_id === user_id) {
        throw new Error("Tenants cannot end rentals. Contact the owner to end the rental.");
    }
    return await godownModel.updateRentalStatus(rental_id, 'completed');
};

module.exports = {
    addGodown,
    editGodown,
    deleteGodown,
    getGodownDetails,
    getUserActiveGodowns,
    getAllRequestsForRent,
    getAllRentedGodowns,
    addStock,
    removeStock,
    handleRentalRequest,
    endRental,
    createRentalRequest
};