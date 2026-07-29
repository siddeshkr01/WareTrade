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
            grd.rent_cost,
            grd.tenant_id,
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

const getRentalHistoryForUser = async (user_id) => {
    const [rows] = await db.query(
        `SELECT
            grd.rental_id,
            grd.godown_id,
            g.godown_name,
            grd.rent_cost,
            grd.status,
            grd.start_date,
            grd.end_date,
            grd.tenant_id,
            g.owner_id,
            CASE WHEN grd.tenant_id = ? THEN 'tenant' ELSE 'owner' END AS role,
            CASE WHEN grd.tenant_id = ? THEN owner_u.user_id ELSE tenant_u.user_id END AS counterparty_id,
            CASE WHEN grd.tenant_id = ? THEN owner_u.user_name ELSE tenant_u.user_name END AS counterparty_name
         FROM godown_rental_details grd
         JOIN godown g ON grd.godown_id = g.godown_id
         JOIN user tenant_u ON grd.tenant_id = tenant_u.user_id
         JOIN user owner_u ON g.owner_id = owner_u.user_id
         WHERE grd.tenant_id = ? OR g.owner_id = ?
         ORDER BY grd.start_date DESC`,
        [user_id, user_id, user_id, user_id, user_id]
    );
    return rows;
};

const getActiveRentalsAsOwner = async (owner_id) => {
    const [rows] = await db.query(
        `SELECT
            grd.rental_id,
            g.godown_id,
            g.godown_name,
            g.location,
            g.capacity,
            grd.rent_cost,
            grd.tenant_id,
            u.user_name AS tenant_name,
            grd.status
         FROM godown_rental_details grd
         JOIN godown g ON grd.godown_id = g.godown_id
         JOIN user u ON grd.tenant_id = u.user_id
         WHERE g.owner_id = ?
         AND grd.status = 'accepted'
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
            g.owner_id,
            u.user_name AS owner_name,
            grd.rent_cost,
            grd.status
         FROM godown g
         JOIN godown_rental_details grd
            ON g.godown_id = grd.godown_id
         JOIN user u ON g.owner_id = u.user_id
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

const addProductToGodown = async (godown_id, product_id, quantity, conn = db) => {
    const [result] = await conn.query(
        `INSERT INTO stores (godown_id, product_id, quantity)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
        [godown_id, product_id, quantity, quantity]
    );
    await conn.query(
        `INSERT INTO store_history (godown_id, product_id, quantity_change, action_type)
            VALUES (?, ?, ?, 'add')`,
        [godown_id, product_id, quantity, "add"]
    );
    return result;
};

const removeProductFromGodown = async (godown_id, product_id, quantity, conn = db) => {
    const [result] = await conn.query(
        `UPDATE stores
         SET quantity = quantity - ?
         WHERE godown_id = ?
         AND product_id = ?
         AND quantity >= ?`,
        [quantity, godown_id, product_id, quantity]
    );

    if (result.affectedRows > 0) {
        await conn.query(
            `INSERT INTO store_history
            (godown_id, product_id, quantity_change, action_type)
            VALUES (?, ?, ?, 'remove')`,
            [godown_id, product_id, quantity]
        );
    }

    return result;
};

const createRentalRequest = async (godown_id, tenant_id, rent_cost) => {
    const [result] = await db.query(
        `INSERT INTO godown_rental_details (godown_id, tenant_id, rent_cost, status)
         VALUES (?, ?, ?, 'requested')`,
        [godown_id, tenant_id, rent_cost]
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

const getGodownStock = async (godown_id) => {
    const [rows] = await db.query(
        `SELECT p.product_id, p.product_name, p.category, s.quantity,
                COALESCE(r.reserved, 0) AS reserved,
                s.quantity - COALESCE(r.reserved, 0) AS available
         FROM stores s
         JOIN products p ON s.product_id = p.product_id
         LEFT JOIN (
             SELECT ti.from_godown_id AS godown_id, ti.product_id, SUM(ti.quantity) AS reserved
             FROM trade_item ti
             JOIN trade t ON ti.trade_id = t.trade_id
             WHERE t.status IN ('created', 'pending') AND ti.from_godown_id IS NOT NULL
             GROUP BY ti.from_godown_id, ti.product_id
         ) r ON r.godown_id = s.godown_id AND r.product_id = s.product_id
         WHERE s.godown_id = ? AND s.quantity > 0 AND p.deleted = FALSE
         ORDER BY p.product_name`,
        [godown_id]
    );
    return rows.map(row => ({
        ...row,
        quantity: Number(row.quantity),
        reserved: Number(row.reserved),
        available: Number(row.available)
    }));
};

const getStockHistory = async (godown_id, limit = 50) => {
    const safeLimit = Number.isInteger(limit) ? limit : 50;
    const [rows] = await db.query(
        `SELECT sh.id, sh.product_id, p.product_name, sh.quantity_change, sh.action_type, sh.created_at
         FROM store_history sh
         JOIN products p ON sh.product_id = p.product_id
         WHERE sh.godown_id = ?
         ORDER BY sh.created_at DESC
         LIMIT ${safeLimit}`,
        [godown_id]
    );
    return rows;
};

const getStockAvailability = async (godown_id, product_id, conn = db) => {
    const [rows] = await conn.query(
        `SELECT
            COALESCE(s.quantity, 0) AS total,
            COALESCE((
                SELECT SUM(ti.quantity)
                FROM trade_item ti
                JOIN trade t ON ti.trade_id = t.trade_id
                WHERE ti.from_godown_id = ? AND ti.product_id = ?
                AND t.status IN ('created', 'pending')
            ), 0) AS reserved
         FROM stores s
         WHERE s.godown_id = ? AND s.product_id = ?`,
        [godown_id, product_id, godown_id, product_id]
    );

    const row = rows[0] || { total: 0, reserved: 0 };
    const total = Number(row.total);
    const reserved = Number(row.reserved);
    return { total, reserved, available: total - reserved };
};

const searchAvailableGodowns = async (excludeUserId, searchTerm) => {
    const params = [excludeUserId];
    let sql = `
        SELECT g.godown_id, g.godown_name, g.location, g.capacity, g.owner_id, u.user_name AS owner_name
        FROM godown g
        JOIN user u ON g.owner_id = u.user_id
        WHERE g.deleted = FALSE
        AND g.owner_id != ?
        AND NOT EXISTS (
            SELECT 1 FROM godown_rental_details grd
            WHERE grd.godown_id = g.godown_id AND grd.status = 'accepted'
        )
    `;

    if (searchTerm) {
        sql += ` AND (g.godown_name LIKE ? OR g.location LIKE ?)`;
        params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    sql += ` ORDER BY g.godown_name`;

    const [rows] = await db.query(sql, params);
    return rows;
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
    getActiveRentalsAsOwner,
    getRentalHistoryForUser,
    getAllRentedGodowns,
    addProductToGodown,
    removeProductFromGodown,
    checkActiveRental,
    checkStoredProducts,
    getGodownDetails,
    getGodownStock,
    getStockHistory,
    getStockAvailability,
    searchAvailableGodowns,
    updateRentalStatus,
    getCurrentUser,
    getRentalById,
    createRentalRequest
};