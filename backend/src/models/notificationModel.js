const db = require('../config/db');

const create = async ({ user_id, type, message, link }, conn = db) => {
    const [result] = await conn.query(
        `INSERT INTO notification (user_id, type, message, link) VALUES (?, ?, ?, ?)`,
        [user_id, type, message, link || null]
    );
    return result;
};

const listForUser = async (user_id, limit = 30) => {
    const safeLimit = Number.isInteger(limit) ? limit : 30;
    const [rows] = await db.query(
        `SELECT notification_id, type, message, link, is_read, created_at
         FROM notification WHERE user_id = ? ORDER BY created_at DESC LIMIT ${safeLimit}`,
        [user_id]
    );
    return rows;
};

const getUnreadCount = async (user_id) => {
    const [rows] = await db.query(
        `SELECT COUNT(*) AS count FROM notification WHERE user_id = ? AND is_read = 0`,
        [user_id]
    );
    return rows[0].count;
};

const markRead = async (notification_id, user_id) => {
    const [result] = await db.query(
        `UPDATE notification SET is_read = 1 WHERE notification_id = ? AND user_id = ?`,
        [notification_id, user_id]
    );
    return result;
};

const markAllRead = async (user_id) => {
    const [result] = await db.query(
        `UPDATE notification SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
        [user_id]
    );
    return result;
};

const markReadByLinks = async (user_id, links) => {
    if (!links.length) return { affectedRows: 0 };
    const placeholders = links.map(() => '?').join(',');
    const [result] = await db.query(
        `UPDATE notification SET is_read = 1 WHERE user_id = ? AND is_read = 0 AND link IN (${placeholders})`,
        [user_id, ...links]
    );
    return result;
};

module.exports = {
    create,
    listForUser,
    getUnreadCount,
    markRead,
    markAllRead,
    markReadByLinks
};
