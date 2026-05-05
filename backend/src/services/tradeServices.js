const tradeModel = require('../models/tradeModels');
const godownModel = require('../models/godownModels');

const createTrade = async (tradeData) => {
    return await tradeModel.createTrade(tradeData);
};

const addItemsToTrade = async (tradeId, userId, items) => {
    const trade = await tradeModel.getTradeByTradeId(tradeId);

    if (!trade) throw new Error("Trade not found");
    if (trade.initiator_id !== userId)
        throw new Error("Only initiator can add items");

    if (trade.status !== 'created')
        throw new Error("Cannot modify trade after sending");

    await tradeModel.addItemsToTrade(tradeId, items);
};

const sendTradeRequest = async (tradeId, userId) => {
    const trade = await tradeModel.getTradeByTradeId(tradeId);

    if (trade.initiator_id !== userId)
        throw new Error("Only initiator can send trade");

    await tradeModel.sendTradeRequest(tradeId);
};

const respondToTradeRequest = async (tradeId, userId, response) => {
    const trade = await tradeModel.getTradeByTradeId(tradeId);

    if (!trade) throw new Error("Trade not found");

    if (trade.counterparty_id !== userId)
        throw new Error("Only receiver can respond");

    if (response === 'accept') {
        const items = await tradeModel.getTradeItemsByTradeId(tradeId);

        for (const item of items) {
            await godownModel.removeProductFromGodown(
                item.from_godown_id,
                item.product_id,
                item.quantity
            );

            await godownModel.addProductToGodown(
                item.to_godown_id,
                item.product_id,
                item.quantity
            );
        }

        await tradeModel.acceptTradeRequest(tradeId);

    } else if (response === 'reject') {
        await tradeModel.rejectTradeRequest(tradeId);

    } else {
        throw new Error("Invalid response");
    }
};

const getTradeByTradeId = async (tradeId) => {
    return await tradeModel.getTradeByTradeId(tradeId);
};

const getInitiatedTradesByUserId = async (userId) => {
    return await tradeModel.getInitiatedTradesByUserId(userId);
};

const getReceivedTradesByUserId = async (userId) => {
    return await tradeModel.getReceivedTradesByUserId(userId);
};

const getTradeItemsByTradeId = async (tradeId) => {
    return await tradeModel.getTradeItemsByTradeId(tradeId);
};

const getTradeDetailsByTradeId = async (tradeId) => {
    return await tradeModel.getTradeDetailsByTradeId(tradeId);
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