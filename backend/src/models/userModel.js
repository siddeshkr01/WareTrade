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

module.exports = {
    createUser,
    findUserByPhoneOrUserId
};