const db = require('../config/db');

const findActiveProduct = async (product_name, category) => {
    const [rows] = await db.query(
        `SELECT * FROM products 
         WHERE product_name = ? AND category = ? AND deleted = FALSE`,
        [product_name, category]
    );
    return rows[0];
};

const findAnyProduct = async (product_name, category) => {
    const [rows] = await db.query(
        `SELECT * FROM products 
         WHERE product_name = ? AND category = ?`,
        [product_name, category]
    );
    return rows[0];
};

const restoreProduct = async (product_name, category) => {
    const [result] = await db.query(
        `UPDATE products SET deleted = FALSE 
         WHERE product_name = ? AND category = ?`,
        [product_name, category]
    );
    return result;
};

const createProduct = async (product_name, category) => {
    const [result] = await db.query(
        `INSERT INTO products (product_name, category) 
         VALUES (?, ?)`,
        [product_name, category]
    );
    return result.insertId;
};

const editProduct = async (product_id, product) => {
    const { product_name, category } = product;

    await db.query(
        `UPDATE products 
         SET product_name = ?, category = ? 
         WHERE product_id = ?`,
        [product_name, category, product_id]
    );
};

const deleteProduct = async (product_id) => {
    await db.query(
        `UPDATE products SET deleted = TRUE WHERE product_id = ?`,
        [product_id]
    );
};

const getProductsByUserId = async (user_id) => {
    const [rows] = await db.query(
        `SELECT 
            p.product_id,
            p.product_name,
            p.category,
            COALESCE(SUM(s.quantity), 0) AS total_quantity
         FROM products p
         JOIN stores s ON p.product_id = s.product_id
         JOIN godown g ON s.godown_id = g.godown_id
         LEFT JOIN godown_rental_details grd 
            ON g.godown_id = grd.godown_id
         WHERE (
                (grd.tenant_id = ? AND grd.status = 'accepted')
                OR
                (
                    g.owner_id = ?
                    AND NOT EXISTS (
                        SELECT 1 
                        FROM godown_rental_details grd2
                        WHERE grd2.godown_id = g.godown_id
                        AND grd2.status = 'accepted'
                    )
                )
               )
           AND p.deleted = FALSE
         GROUP BY 
            p.product_id, p.product_name, p.category
         ORDER BY total_quantity DESC`,
        [user_id, user_id]
    );

    return rows;
};

// ✅ UPDATED: include role
const getAllMygodownsWithProductAlongWithQuantity = async (user_id, product_id) => {
    const [rows] = await db.query(
        `SELECT 
            g.godown_id,
            g.godown_name,
            g.location,
            g.capacity,
            s.quantity,
            grd.status,
            CASE 
                WHEN g.owner_id = ? THEN 'owner'
                ELSE 'tenant'
            END AS role
         FROM godown g
         LEFT JOIN godown_rental_details grd 
            ON g.godown_id = grd.godown_id
         JOIN stores s 
            ON g.godown_id = s.godown_id
         WHERE (
                (grd.tenant_id = ? AND grd.status = 'accepted')
                OR
                (
                    g.owner_id = ?
                    AND NOT EXISTS (
                        SELECT 1 
                        FROM godown_rental_details grd2
                        WHERE grd2.godown_id = g.godown_id
                        AND grd2.status = 'accepted'
                    )
                )
               )
           AND s.product_id = ?
           AND g.deleted = FALSE`,
        [user_id, user_id, user_id, product_id]
    );
    return rows;
};

const getProductDetailsById = async (product_id) => {
    const [rows] = await db.query(
        `SELECT * FROM products 
         WHERE product_id = ? AND deleted = FALSE`,
        [product_id]
    );
    return rows[0];
};

module.exports = {
    findActiveProduct,
    findAnyProduct,
    restoreProduct,
    createProduct,
    editProduct,
    deleteProduct,
    getProductsByUserId,
    getAllMygodownsWithProductAlongWithQuantity,
    getProductDetailsById
};