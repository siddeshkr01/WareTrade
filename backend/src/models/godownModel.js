const db = require('../config/db');

const createGodown = async (godown) => {
    const { godown_name, location, capacity, owner_id } = godown;

    const [result] = await db.query(
        `INSERT INTO godown (godown_name, location, capacity, owner_id) 
         VALUES (?, ?, ?, ?)`,
        [godown_name, location, capacity, owner_id]
    );

    return result;
};

const editGodown = async (godown_id, godown) => {
    const { godown_name, location, capacity, owner_id } = godown;

    const [result] = await db.query(
        `UPDATE godown 
         SET godown_name = ?, location = ?, capacity = ? 
         WHERE godown_id = ? 
         AND owner_id = ? 
         AND deleted = FALSE`,
        [godown_name, location, capacity, godown_id, owner_id]
    );

    return result;
};

const deleteGodown = async (godown_id, owner_id) => {
    const [result] = await db.query(
        `UPDATE godown 
         SET deleted = TRUE 
         WHERE godown_id = ? 
         AND owner_id = ? 
         AND deleted = FALSE`,
        [godown_id, owner_id]
    );

    return result;
};

const getUserActiveGodowns = async (user_id) => {
    const [rows] = await db.query(
        `SELECT g.godown_id, g.godown_name, g.location, g.capacity, 'own' AS type
         FROM godown g
         WHERE g.owner_id = ?
         AND g.deleted = FALSE
         AND NOT EXISTS (
             SELECT 1 FROM godown_rental_details grd
             WHERE grd.godown_id = g.godown_id
             AND grd.status = 'accepted'
         )

         UNION

         SELECT g.godown_id, g.godown_name, g.location, g.capacity, 'rented' AS type
         FROM godown g
         JOIN godown_rental_details grd 
             ON g.godown_id = grd.godown_id
         WHERE grd.tenant_id = ?
         AND grd.status = 'accepted'
         AND g.deleted = FALSE`,
        [user_id, user_id]
    );

    return rows;
};

const getAllRequestsForRent = async (owner_id) => {
    const [rows] = await db.query(
        `SELECT 
            grd.rental_id,
            g.godown_name,
            g.location,
            g.capacity,
            u.user_name AS tenant_name,
            grd.status
         FROM godown_rental_details grd
         JOIN godown g ON grd.godown_id = g.godown_id
         JOIN user u ON grd.tenant_id = u.user_id
         WHERE g.owner_id = ?
         AND grd.status = 'requested'
         AND g.deleted = FALSE`,
        [owner_id]
    );

    return rows;
};

const getAllRentedGodowns = async (user_id) => {
    const [rows] = await db.query(
        `SELECT 
            g.godown_id,
            g.godown_name,
            g.location,
            g.capacity,
            grd.status
         FROM godown g
         JOIN godown_rental_details grd 
            ON g.godown_id = grd.godown_id
         WHERE grd.tenant_id = ?
         AND grd.status = 'accepted'
         AND g.deleted = FALSE`,
        [user_id]
    );

    return rows;
};

const checkActiveRental = async (godown_id) => {
    const [rows] = await db.query(
        `SELECT * FROM godown_rental_details
         WHERE godown_id = ? AND status = 'accepted'`,
        [godown_id]
    );
    return rows[0];
};

const checkStoredProducts = async (godown_id) => {
    const [rows] = await db.query(
        `SELECT 1 FROM stores
         WHERE godown_id = ? AND quantity > 0`,
        [godown_id]
    );
    return rows.length > 0;
};

const addProductToGodown = async (godown_id, product_id, quantity) => {
    const [result] = await db.query(
        `INSERT INTO stores (godown_id, product_id, quantity) 
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
        [godown_id, product_id, quantity, quantity]
    );
    const [result2] = await db.query(
        `INSERT INTO store_history (godown_id, product_id, quantity_change, action_type) 
            VALUES (?, ?, ?, 'add')`,
        [godown_id, product_id, quantity, "add"]
    );
    return result;
};

const removeProductFromGodown = async (godown_id, product_id, quantity) => {
    const [result] = await db.query(
        `UPDATE stores 
         SET quantity = quantity - ? 
         WHERE godown_id = ? 
         AND product_id = ? 
         AND quantity >= ?`,
        [quantity, godown_id, product_id, quantity]
    );

    if (result.affectedRows > 0) {
        await db.query(
            `INSERT INTO store_history 
            (godown_id, product_id, quantity_change, action_type) 
            VALUES (?, ?, ?, 'remove')`,
            [godown_id, product_id, quantity]
        );
    }

    return result;
};

const createRentalRequest = async (godown_id, tenant_id) => {
    const [result] = await db.query(
        `INSERT INTO godown_rental_details (godown_id, tenant_id, status)
         VALUES (?, ?, 'requested')`,
        [godown_id, tenant_id]
    );

    return result;
};

const updateRentalStatus = async (rental_id, status, owner_id) => {
    const [result] = await db.query(
        `UPDATE godown_rental_details grd
        JOIN godown g ON grd.godown_id = g.godown_id
        SET grd.status = ?
        WHERE grd.rental_id = ?
        AND g.owner_id = ?`,
        [status, rental_id, owner_id]
    );

    return result;
};

const getCurrentUser = async (godown_id) => {
    const [rows] = await db.query(
        `SELECT owner_id, tenant_id FROM godown g
            LEFT JOIN godown_rental_details grd ON g.godown_id = grd.godown_id AND grd.status = 'accepted'
         WHERE g.godown_id = ?`,
        [godown_id]
    );
    return rows[0];
};

const getGodownDetails = async (godown_id) => {
    const [rows] = await db.query(
        `SELECT 
            g.godown_id, 
            g.godown_name, 
            g.location, 
            g.capacity, 
            g.owner_id,   -- ✅ ADDED
            u.user_name AS owner_name
         FROM godown g
         JOIN user u ON g.owner_id = u.user_id
         WHERE g.godown_id = ? AND g.deleted = FALSE`,
        [godown_id]
    );

    return rows[0];
};

const getRentalById = async (rental_id) => {
    const [rows] = await db.query(
        `SELECT grd.*, g.owner_id 
         FROM godown_rental_details grd
         JOIN godown g 
            ON grd.godown_id = g.godown_id
         WHERE grd.rental_id = ?`,
        [rental_id]
    );
    return rows[0];
};

module.exports = {
    createGodown,
    editGodown,
    deleteGodown,
    getUserActiveGodowns,
    getAllRequestsForRent,
    getAllRentedGodowns,
    addProductToGodown,
    removeProductFromGodown,
    checkActiveRental,
    checkStoredProducts,
    getGodownDetails,
    updateRentalStatus,
    getCurrentUser,
    getRentalById,
    createRentalRequest
};