const db = require('../config/db');

const createTrade = async (tradeData) => {
    const { initiator_id, counterparty_id, trade_type } = tradeData;

    const [result] = await db.query(
        `INSERT INTO trade (initiator_id, counterparty_id, trade_type, status) 
         VALUES (?, ?, ?, ?)`,
        [initiator_id, counterparty_id, trade_type, 'created']
    );

    return { trade_id: result.insertId };
};

const addItemsToTrade = async (tradeId, items) => {
    const values = items.map(item => [
        tradeId,
        item.product_id,
        item.quantity,
        item.price,
        item.from_godown_id,
        item.to_godown_id
    ]);

    await db.query(
        `INSERT INTO trade_item 
        (trade_id, product_id, quantity, price, from_godown_id, to_godown_id) 
         VALUES ?`,
        [values]
    );
};

const sendTradeRequest = async (tradeId) => {
    await db.query(
        `UPDATE trade SET status = 'pending' WHERE trade_id = ?`,
        [tradeId]
    );
};

const acceptTradeRequest = async (tradeId) => {
    await db.query(
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

const getTradeByTradeId = async (tradeId) => {
    const [rows] = await db.query(
        `SELECT * FROM trade WHERE trade_id = ?`,
        [tradeId]
    );
    return rows[0];
};

const getInitiatedTradesByUserId = async (userId) => {
    const [rows] = await db.query(
        `SELECT * FROM trade WHERE initiator_id = ?`,
        [userId]
    );
    return rows;
};

const getReceivedTradesByUserId = async (userId) => {
    const [rows] = await db.query(
        `SELECT * FROM trade WHERE counterparty_id = ?`,
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
    addItemsToTrade,
    sendTradeRequest,
    acceptTradeRequest,
    rejectTradeRequest,
    getTradeByTradeId,
    getInitiatedTradesByUserId,
    getReceivedTradesByUserId,
    getTradeItemsByTradeId,
    getTradeDetailsByTradeId
};