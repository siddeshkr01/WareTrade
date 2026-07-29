const db = require('../config/db');

const createUser = async (user) => {
    const { user_name, phone_number, password, address, role, display_name } = user;

    const [result] = await db.query(
        `INSERT INTO user 
        (user_name, phone_number, password, address, role, display_name) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [user_name, phone_number, password, address, role || 'user', display_name]
    );

    return result;
};

const findUserByPhoneOrUserId = async (identifier) => {
    const [rows] = await db.query(
        `SELECT * FROM user 
         WHERE (phone_number = ? OR user_name = ?) 
         AND deleted = FALSE`,
        [identifier, identifier]
    );

    return rows[0];
};

const findPublicUserByIdentifier = async (identifier) => {
    const [rows] = await db.query(
        `SELECT user_id, user_name, display_name FROM user
         WHERE (phone_number = ? OR user_name = ?)
         AND deleted = FALSE`,
        [identifier, identifier]
    );
    return rows[0];
};

const findPublicProfileById = async (user_id) => {
    const [rows] = await db.query(
        `SELECT user_id, user_name, display_name, phone_number, address FROM user
         WHERE user_id = ? AND deleted = FALSE`,
        [user_id]
    );
    return rows[0];
};

const setResetToken = async (user_id, token, expires) => {
    await db.query(
        `UPDATE user SET reset_token = ?, reset_token_expires = ? WHERE user_id = ?`,
        [token, expires, user_id]
    );
};

const findByResetToken = async (token) => {
    const [rows] = await db.query(
        `SELECT * FROM user WHERE reset_token = ? AND deleted = FALSE`,
        [token]
    );
    return rows[0];
};

const updatePasswordAndClearToken = async (user_id, hashedPassword) => {
    await db.query(
        `UPDATE user SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE user_id = ?`,
        [hashedPassword, user_id]
    );
};

module.exports = {
    createUser,
    findUserByPhoneOrUserId,
    findPublicUserByIdentifier,
    findPublicProfileById,
    setResetToken,
    findByResetToken,
    updatePasswordAndClearToken
};