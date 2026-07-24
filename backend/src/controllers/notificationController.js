const notificationService = require('../services/notificationService');

const listNotifications = async (req, res) => {
    try {
        const notifications = await notificationService.listForUser(req.user.user_id);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const count = await notificationService.getUnreadCount(req.user.user_id);
        res.json({ count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const markRead = async (req, res) => {
    try {
        const notificationId = parseInt(req.params.notificationId);
        await notificationService.markRead(notificationId, req.user.user_id);
        res.json({ message: "Marked as read" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const markAllRead = async (req, res) => {
    try {
        await notificationService.markAllRead(req.user.user_id);
        res.json({ message: "All marked as read" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const markReadByLink = async (req, res) => {
    try {
        const links = Array.isArray(req.body.links) ? req.body.links : [req.body.link].filter(Boolean);
        await notificationService.markReadByLinks(req.user.user_id, links);
        res.json({ message: "Marked as read" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

module.exports = {
    listNotifications,
    getUnreadCount,
    markRead,
    markAllRead,
    markReadByLink
};
