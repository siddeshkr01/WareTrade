const godownService = require('../services/godownService');

// 🔹 Create Godown
const createGodown = async (req, res) => {
    try {
        const owner_id = req.user.user_id;

        const result = await godownService.addGodown({
            ...req.body,
            owner_id
        });

        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// 🔹 Edit Godown
const editGodown = async (req, res) => {
    try {
        const owner_id = req.user.user_id;
        const godown_id = parseInt(req.params.id);

        if (isNaN(godown_id)) {
            return res.status(400).json({ error: "Invalid godown ID" });
        }

        const result = await godownService.editGodown(
            godown_id,
            req.body,
            owner_id
        );

        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// 🔹 Delete Godown
const deleteGodown = async (req, res) => {
    try {
        const owner_id = req.user.user_id;
        const godown_id = parseInt(req.params.id);

        if (isNaN(godown_id)) {
            return res.status(400).json({ error: "Invalid godown ID" });
        }

        const result = await godownService.deleteGodown(
            godown_id,
            owner_id
        );

        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// 🔹 Get My Active Godowns
const getMyGodowns = async (req, res) => {
    try {
        const user_id = req.user.user_id;

        const godowns = await godownService.getUserActiveGodowns(user_id);

        res.json(godowns);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🔹 Get Godown Details
const getGodownDetails = async (req, res) => {
    try {
        const godown_id = parseInt(req.params.id);
        if (isNaN(godown_id)) {
            return res.status(400).json({ error: "Invalid godown ID" });
        }

        const godown = await godownService.getGodownDetails(godown_id, req.user.user_id);

        res.json(godown);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
};

// 🔹 Get Rental Requests (owner)
const getRentalRequests = async (req, res) => {
    try {
        const owner_id = req.user.user_id;

        const requests = await godownService.getAllRequestsForRent(owner_id);

        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🔹 Get My Rented Godowns
const getRentedGodowns = async (req, res) => {
    try {
        const user_id = req.user.user_id;

        const godowns = await godownService.getAllRentedGodowns(user_id);

        res.json(godowns);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🔹 Add Stock
const addStock = async (req, res) => {
    try {
        const { godown_id, quantity } = req.body;

        const parsedGodownId = parseInt(godown_id);
        const parsedQuantity = parseInt(quantity);

        if (isNaN(parsedGodownId) || isNaN(parsedQuantity)) {
            return res.status(400).json({ error: "Invalid input values" });
        }

        // ✅ removed unused variable
        await godownService.addStock(
            {
                ...req.body,
                godown_id: parsedGodownId,
                quantity: parsedQuantity
            },
            req.user.user_id
        );

        res.json({ message: "Stock added successfully" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const requestRental = async (req, res) => {
    try {
        const { godown_id } = req.body;
        const parsedId = parseInt(godown_id);

        if (isNaN(parsedId)) {
            return res.status(400).json({ error: "Invalid godown ID" });
        }

        await godownService.createRentalRequest(
            parsedId,
            req.user.user_id
        );

        res.json({ message: "Rental request sent" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// 🔹 Remove Stock
const removeStock = async (req, res) => {
    try {
        const { godown_id, product_id, quantity } = req.body;

        const parsedGodownId = parseInt(godown_id);
        const parsedProductId = parseInt(product_id);
        const parsedQuantity = parseInt(quantity);

        if (isNaN(parsedGodownId) || isNaN(parsedProductId) || isNaN(parsedQuantity)) {
            return res.status(400).json({ error: "Invalid input values" });
        }

        await godownService.removeStock(
            parsedGodownId,
            parsedProductId,
            parsedQuantity,
            req.user.user_id
        );

        res.json({ message: "Stock removed successfully" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// 🔹 Accept / Reject Rental
const handleRentalRequest = async (req, res) => {
    try {
        const { rental_id, status } = req.body;

        const parsedRentalId = parseInt(rental_id);

        if (isNaN(parsedRentalId)) {
            return res.status(400).json({ error: "Invalid rental ID" });
        }

        await godownService.handleRentalRequest(
            parsedRentalId,
            status,
            req.user.user_id
        );

        res.json({ message: `Rental ${status}` });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// 🔹 End Rental
const endRental = async (req, res) => {
    try {
        const { rental_id } = req.body;

        const parsedRentalId = parseInt(rental_id);

        if (isNaN(parsedRentalId)) {
            return res.status(400).json({ error: "Invalid rental ID" });
        }

        await godownService.endRental(
            parsedRentalId,
            req.user.user_id
        );

        res.json({ message: "Rental completed" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

module.exports = {
    createGodown,
    editGodown,
    deleteGodown,
    getMyGodowns,
    getGodownDetails,
    getRentalRequests,
    getRentedGodowns,
    addStock,
    removeStock,
    handleRentalRequest,
    endRental,
    requestRental
};