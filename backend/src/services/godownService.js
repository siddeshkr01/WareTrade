const godownModel = require('../models/godownModel');

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

const getGodownDetails = async (godown_id) => {
    const godown = await godownModel.getGodownDetails(godown_id);
    if (!godown) throw new Error("Godown not found");
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

const addStock = async (godown_id, product_id, quantity) => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Quantity must be positive");
    }

    return await godownModel.addProductToGodown(godown_id, product_id, quantity);
};

const removeStock = async (godown_id, product_id, quantity) => {
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

const handleRentalRequest = async (rental_id, status) => {
    if (!['accepted', 'rejected'].includes(status)) {
        throw new Error("Invalid status");
    }

    return await godownModel.updateRentalStatus(rental_id, status);
};

const endRental = async (rental_id) => {
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
    endRental
};