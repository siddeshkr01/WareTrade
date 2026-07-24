const notificationModel = require('../models/notificationModel');

const notify = async ({ user_id, type, message, link }, conn) => {
    return await notificationModel.create({ user_id, type, message, link }, conn);
};

const listForUser = async (user_id) => {
    return await notificationModel.listForUser(user_id);
};

const getUnreadCount = async (user_id) => {
    return await notificationModel.getUnreadCount(user_id);
};

const markRead = async (notification_id, user_id) => {
    const result = await notificationModel.markRead(notification_id, user_id);
    if (result.affectedRows === 0) throw new Error("Notification not found");
};

const markAllRead = async (user_id) => {
    await notificationModel.markAllRead(user_id);
};

const markReadByLinks = async (user_id, links) => {
    const cleaned = [...new Set(links)].filter(Boolean);
    await notificationModel.markReadByLinks(user_id, cleaned);
};

module.exports = {
    notify,
    listForUser,
    getUnreadCount,
    markRead,
    markAllRead,
    markReadByLinks
};
