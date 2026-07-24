const godownModel = require('../models/godownModel');
const productModel = require('../models/productModel');
const notificationService = require('./notificationService');

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

const getGodownStock = async (godown_id, user_id) => {
    const current = await godownModel.getCurrentUser(godown_id);
    if (!current) throw new Error("Godown not found");

    if (current.owner_id !== user_id && current.tenant_id !== user_id) {
        throw new Error("Unauthorized");
    }

    return await godownModel.getGodownStock(godown_id);
};

const searchAvailableGodowns = async (user_id, searchTerm) => {
    return await godownModel.searchAvailableGodowns(user_id, searchTerm);
};

const getAllRequestsForRent = async (owner_id) => {
    return await godownModel.getAllRequestsForRent(owner_id);
};

const getActiveRentalsAsOwner = async (owner_id) => {
    return await godownModel.getActiveRentalsAsOwner(owner_id);
};

const getRentalHistoryForUser = async (user_id) => {
    return await godownModel.getRentalHistoryForUser(user_id);
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

    const { available, reserved } = await godownModel.getStockAvailability(godown_id, product_id);
    if (quantity > available) {
        throw new Error(
            reserved > 0
                ? `Insufficient available stock (${reserved} reserved for pending trades)`
                : "Insufficient stock"
        );
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

const createRentalRequest = async (godown_id, tenant_id, rent_cost) => {
    if (typeof rent_cost !== 'number' || rent_cost <= 0) {
        throw new Error("Rent cost must be a positive number");
    }

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

    const result = await godownModel.createRentalRequest(godown_id, tenant_id, rent_cost);

    await notificationService.notify({
        user_id: current.owner_id,
        type: 'rental_request',
        message: `New rental request received (offer: ₹${rent_cost})`,
        link: `/rentals`
    });

    return result;
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
    if (rental.status !== 'requested') {
        throw new Error("Rental request has already been processed");
    }
    if (status === 'accepted') {
        const activeRental = await godownModel.checkActiveRental(rental.godown_id);
        if (activeRental) {
            throw new Error("Godown is already rented out");
        }
    }
    const result = await godownModel.updateRentalStatus(rental_id, status, user_id);

    await notificationService.notify({
        user_id: rental.tenant_id,
        type: 'rental_response',
        message: `Your rental request was ${status}`,
        link: `/rentals`
    });

    return result;
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
    const result = await godownModel.updateRentalStatus(rental_id, 'completed', user_id);

    await notificationService.notify({
        user_id: rental.tenant_id,
        type: 'rental_ended',
        message: `A rental you had has been ended by the owner`,
        link: `/rentals`
    });

    return result;
};

module.exports = {
    addGodown,
    editGodown,
    deleteGodown,
    getGodownDetails,
    getGodownStock,
    searchAvailableGodowns,
    getUserActiveGodowns,
    getAllRequestsForRent,
    getActiveRentalsAsOwner,
    getRentalHistoryForUser,
    getAllRentedGodowns,
    addStock,
    removeStock,
    handleRentalRequest,
    endRental,
    createRentalRequest
};