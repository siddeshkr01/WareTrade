const tradeService = require('../services/tradeServices');

const createTrade = async (req, res) => {
    try {
        const tradeData = req.body;
        tradeData.initiator_id = req.user.user_id;

        const result = await tradeService.createTrade(tradeData);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const addItemsToTrade = async (req, res) => {
    try {
        const tradeId = parseInt(req.params.tradeId);
        const items = req.body.items;
        const userId = req.user.user_id;

        await tradeService.addItemsToTrade(tradeId, userId, items);
        res.json({ message: "Items added successfully" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const sendTradeRequest = async (req, res) => {
    try {
        const tradeId = parseInt(req.params.tradeId);
        const userId = req.user.user_id;

        await tradeService.sendTradeRequest(tradeId, userId);
        res.json({ message: "Trade sent" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const respondToTradeRequest = async (req, res) => {
    try {
        const tradeId = parseInt(req.params.tradeId);
        const response = req.body.response;
        const userId = req.user.user_id;

        await tradeService.respondToTradeRequest(tradeId, userId, response);
        res.json({ message: `Trade ${response}ed successfully` });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getTradeByTradeId = async (req, res) => {
    try {
        const tradeId = parseInt(req.params.tradeId);
        const trade = await tradeService.getTradeByTradeId(tradeId);
        res.json(trade);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getInitiatedTradesByUserId = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const trades = await tradeService.getInitiatedTradesByUserId(userId);
        res.json(trades);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getReceivedTradesByUserId = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const trades = await tradeService.getReceivedTradesByUserId(userId);
        res.json(trades);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getTradeItemsByTradeId = async (req, res) => {
    try {
        const tradeId = parseInt(req.params.tradeId);
        const items = await tradeService.getTradeItemsByTradeId(tradeId);
        res.json(items);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getTradeDetailsByTradeId = async (req, res) => {
    try {
        const tradeId = parseInt(req.params.tradeId);
        const details = await tradeService.getTradeDetailsByTradeId(tradeId);
        res.json(details);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

module.exports = {
    createTrade,
    addItemsToTrade,
    sendTradeRequest,
    respondToTradeRequest,
    getTradeByTradeId,
    getInitiatedTradesByUserId,
    getReceivedTradesByUserId,
    getTradeItemsByTradeId,
    getTradeDetailsByTradeId
};