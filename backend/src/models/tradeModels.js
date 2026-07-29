const db = require('../config/db');

const createTrade = async (tradeData) => {
    const { initiator_id, counterparty_id, trade_type, counter_of_trade_id } = tradeData;

    const [result] = await db.query(
        `INSERT INTO trade (initiator_id, counterparty_id, trade_type, status, counter_of_trade_id)
         VALUES (?, ?, ?, ?, ?)`,
        [initiator_id, counterparty_id, trade_type, 'created', counter_of_trade_id || null]
    );

    return { trade_id: result.insertId };
};

const markCountered = async (tradeId, newTradeId) => {
    await db.query(
        `UPDATE trade SET status = 'countered', countered_by_trade_id = ? WHERE trade_id = ?`,
        [newTradeId, tradeId]
    );
};

const addItemsToTrade = async (tradeId, items, conn = db) => {
    const values = items.map(item => [
        tradeId,
        item.product_id,
        item.quantity,
        item.price,
        item.from_godown_id ?? null,
        item.to_godown_id ?? null
    ]);

    await conn.query(
        `INSERT INTO trade_item
        (trade_id, product_id, quantity, price, from_godown_id, to_godown_id)
         VALUES ?`,
        [values]
    );
};

const removeTradeItem = async (tradeId, productId, conn = db) => {
    const [result] = await conn.query(
        `DELETE FROM trade_item WHERE trade_id = ? AND product_id = ?`,
        [tradeId, productId]
    );
    return result;
};

const setItemToGodown = async (tradeId, productId, toGodownId, conn = db) => {
    await conn.query(
        `UPDATE trade_item SET to_godown_id = ? WHERE trade_id = ? AND product_id = ?`,
        [toGodownId, tradeId, productId]
    );
};

const setItemFromGodown = async (tradeId, productId, fromGodownId, conn = db) => {
    await conn.query(
        `UPDATE trade_item SET from_godown_id = ? WHERE trade_id = ? AND product_id = ?`,
        [fromGodownId, tradeId, productId]
    );
};

const bumpVersion = async (tradeId, conn = db) => {
    await conn.query(
        `UPDATE trade SET version = version + 1 WHERE trade_id = ?`,
        [tradeId]
    );
};

const sendTradeRequest = async (tradeId) => {
    await db.query(
        `UPDATE trade SET status = 'pending' WHERE trade_id = ?`,
        [tradeId]
    );
};

const acceptTradeRequest = async (tradeId, conn = db) => {
    await conn.query(
        `UPDATE trade SET status = 'accepted' WHERE trade_id = ?`,
        [tradeId]
    );
};

const rejectTradeRequest = async (tradeId) => {
    await db.query(
        `UPDATE trade SET status = 'rejected' WHERE trade_id = ?`,
        [tradeId]
    );
};

const cancelTradeRequest = async (tradeId) => {
    await db.query(
        `UPDATE trade SET status = 'cancelled' WHERE trade_id = ?`,
        [tradeId]
    );
};

const getTradeByTradeId = async (tradeId) => {
    const [rows] = await db.query(
        `SELECT * FROM trade WHERE trade_id = ?`,
        [tradeId]
    );
    return rows[0];
};

const getInitiatedTradesByUserId = async (userId) => {
    const [rows] = await db.query(
        `SELECT t.*, u.user_name AS counterparty_name
         FROM trade t
         JOIN user u ON t.counterparty_id = u.user_id
         WHERE t.initiator_id = ?
         ORDER BY t.created_at DESC`,
        [userId]
    );
    return rows;
};

const getReceivedTradesByUserId = async (userId) => {
    const [rows] = await db.query(
        `SELECT t.*, u.user_name AS initiator_name
         FROM trade t
         JOIN user u ON t.initiator_id = u.user_id
         WHERE t.counterparty_id = ?
         ORDER BY t.created_at DESC`,
        [userId]
    );
    return rows;
};

const getTradeItemsByTradeId = async (tradeId) => {
    const [rows] = await db.query(
        `SELECT * FROM trade_item WHERE trade_id = ?`,
        [tradeId]
    );
    return rows;
};

const getTradeDetailsByTradeId = async (tradeId) => {
    const trade = await getTradeByTradeId(tradeId);
    if (!trade) return null;

    const items = await getTradeItemsByTradeId(tradeId);

    return { ...trade, items };
};

module.exports = {
    createTrade,
    markCountered,
    addItemsToTrade,
    removeTradeItem,
    setItemToGodown,
    setItemFromGodown,
    bumpVersion,
    sendTradeRequest,
    acceptTradeRequest,
    rejectTradeRequest,
    cancelTradeRequest,
    getTradeByTradeId,
    getInitiatedTradesByUserId,
    getReceivedTradesByUserId,
    getTradeItemsByTradeId,
    getTradeDetailsByTradeId
};
