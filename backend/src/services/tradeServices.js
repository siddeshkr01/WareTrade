const db = require('../config/db');
const tradeModel = require('../models/tradeModels');
const godownModel = require('../models/godownModel');
const productModel = require('../models/productModel');
const notificationService = require('./notificationService');

const EDITABLE_STATUSES = ['created', 'pending'];
const CONFLICT_MESSAGE = "This trade has changed since you loaded it. Please refresh and try again.";

const assertControlsGodown = async (godown_id, user_id) => {
    const current = await godownModel.getCurrentUser(godown_id);
    if (!current) throw new Error(`Godown ${godown_id} not found`);

    const isUnrentedOwner = current.owner_id === user_id && !current.tenant_id;
    const isAcceptedTenant = current.tenant_id === user_id;

    if (!isUnrentedOwner && !isAcceptedTenant) {
        throw new Error(`You do not have access to godown ${godown_id}`);
    }
};

const createTrade = async (tradeData) => {
    return await tradeModel.createTrade(tradeData);
};

const addItemsToTrade = async (tradeId, userId, items) => {
    const trade = await tradeModel.getTradeByTradeId(tradeId);

    if (!trade) throw new Error("Trade not found");
    if (trade.initiator_id !== userId)
        throw new Error("Only initiator can add items");

    if (!EDITABLE_STATUSES.includes(trade.status))
        throw new Error("Trade can no longer be edited");

    if (!Array.isArray(items) || items.length === 0)
        throw new Error("At least one item is required");

    const existingItems = await tradeModel.getTradeItemsByTradeId(tradeId);
    const existingProductIds = new Set(existingItems.map(i => i.product_id));

    const seenInThisRequest = new Set();
    for (const item of items) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0)
            throw new Error(`Invalid quantity for product ${item.product_id}`);
        if (typeof item.price !== 'number' || item.price < 0)
            throw new Error(`Invalid price for product ${item.product_id}`);
        if (existingProductIds.has(item.product_id) || seenInThisRequest.has(item.product_id))
            throw new Error(`Product ${item.product_id} is already in this trade`);
        seenInThisRequest.add(item.product_id);

        const product = await productModel.getProductDetailsById(item.product_id);
        if (!product) throw new Error(`Product ${item.product_id} not found`);

        if (trade.trade_type === 'sell') {
            if (!item.from_godown_id) throw new Error(`from_godown_id is required for product ${item.product_id}`);
            await assertControlsGodown(item.from_godown_id, userId);
            const { available, reserved } = await godownModel.getStockAvailability(item.from_godown_id, item.product_id);
            if (item.quantity > available) {
                throw new Error(
                    reserved > 0
                        ? `Insufficient available stock for product ${item.product_id} (${reserved} already reserved for pending trades)`
                        : `Insufficient stock for product ${item.product_id}`
                );
            }
            item.to_godown_id = null;
        } else {
            if (!item.to_godown_id) throw new Error(`to_godown_id is required for product ${item.product_id}`);
            await assertControlsGodown(item.to_godown_id, userId);
            item.from_godown_id = null;
        }
    }

    await tradeModel.addItemsToTrade(tradeId, items);
    await tradeModel.bumpVersion(tradeId);
};

const removeItemFromTrade = async (tradeId, userId, productId) => {
    const trade = await tradeModel.getTradeByTradeId(tradeId);

    if (!trade) throw new Error("Trade not found");
    if (trade.initiator_id !== userId)
        throw new Error("Only initiator can remove items");
    if (!EDITABLE_STATUSES.includes(trade.status))
        throw new Error("Trade can no longer be edited");

    const result = await tradeModel.removeTradeItem(tradeId, productId);
    if (result.affectedRows === 0) {
        throw new Error("Item not found in trade");
    }

    await tradeModel.bumpVersion(tradeId);
};

const cancelTrade = async (tradeId, userId) => {
    const trade = await tradeModel.getTradeByTradeId(tradeId);

    if (!trade) throw new Error("Trade not found");
    if (trade.initiator_id !== userId)
        throw new Error("Only initiator can cancel the trade");
    if (!EDITABLE_STATUSES.includes(trade.status))
        throw new Error("Trade can no longer be cancelled");

    await tradeModel.cancelTradeRequest(tradeId);
};

const sendTradeRequest = async (tradeId, userId) => {
    const trade = await tradeModel.getTradeByTradeId(tradeId);

    if (!trade) throw new Error("Trade not found");
    if (trade.initiator_id !== userId)
        throw new Error("Only initiator can send trade");
    if (trade.status !== 'created')
        throw new Error("Trade has already been sent");

    const items = await tradeModel.getTradeItemsByTradeId(tradeId);
    if (items.length === 0) throw new Error("Add at least one item before sending");

    await tradeModel.sendTradeRequest(tradeId);

    await notificationService.notify({
        user_id: trade.counterparty_id,
        type: 'trade_request',
        message: `New ${trade.trade_type} trade request awaiting your response`,
        link: `/trades/${tradeId}`
    });
};

const respondToTradeRequest = async (tradeId, userId, response, allocations, expectedVersion) => {
    const trade = await tradeModel.getTradeByTradeId(tradeId);

    if (!trade) throw new Error("Trade not found");

    if (trade.counterparty_id !== userId)
        throw new Error("Only receiver can respond");

    if (trade.status !== 'pending')
        throw new Error("Trade is not awaiting a response");

    if (expectedVersion !== undefined && expectedVersion !== null && Number(expectedVersion) !== trade.version) {
        throw new Error(CONFLICT_MESSAGE);
    }

    if (response === 'accept') {
        const items = await tradeModel.getTradeItemsByTradeId(tradeId);
        if (items.length === 0) throw new Error("Trade has no items");

        const godownByProduct = new Map(
            (allocations || []).map(a => [a.product_id, a.godown_id])
        );

        for (const item of items) {
            if (!godownByProduct.has(item.product_id)) {
                throw new Error(`Missing godown selection for product ${item.product_id}`);
            }
        }

        const distinctGodowns = [...new Set(godownByProduct.values())];
        for (const godownId of distinctGodowns) {
            await assertControlsGodown(godownId, userId);
        }

        if (trade.trade_type === 'buy') {
            for (const item of items) {
                const sourceGodownId = godownByProduct.get(item.product_id);
                const { available, reserved } = await godownModel.getStockAvailability(sourceGodownId, item.product_id);
                if (item.quantity > available) {
                    throw new Error(
                        reserved > 0
                            ? `Insufficient available stock for product ${item.product_id} (${reserved} already reserved for pending trades)`
                            : `Insufficient stock for product ${item.product_id}`
                    );
                }
            }
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            for (const item of items) {
                const counterpartyGodownId = godownByProduct.get(item.product_id);
                const finalFrom = trade.trade_type === 'sell' ? item.from_godown_id : counterpartyGodownId;
                const finalTo = trade.trade_type === 'sell' ? counterpartyGodownId : item.to_godown_id;

                const removeResult = await godownModel.removeProductFromGodown(
                    finalFrom,
                    item.product_id,
                    item.quantity,
                    conn
                );

                if (removeResult.affectedRows === 0) {
                    throw new Error(
                        `Insufficient stock for product ${item.product_id} in godown ${finalFrom}`
                    );
                }

                await godownModel.addProductToGodown(
                    finalTo,
                    item.product_id,
                    item.quantity,
                    conn
                );

                if (trade.trade_type === 'sell') {
                    await tradeModel.setItemToGodown(tradeId, item.product_id, finalTo, conn);
                } else {
                    await tradeModel.setItemFromGodown(tradeId, item.product_id, finalFrom, conn);
                }
            }

            await tradeModel.acceptTradeRequest(tradeId, conn);

            await notificationService.notify({
                user_id: trade.initiator_id,
                type: 'trade_response',
                message: `Your ${trade.trade_type} trade request was accepted`,
                link: `/trades/${tradeId}`
            }, conn);

            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

    } else if (response === 'reject') {
        await tradeModel.rejectTradeRequest(tradeId);

        await notificationService.notify({
            user_id: trade.initiator_id,
            type: 'trade_response',
            message: `Your ${trade.trade_type} trade request was rejected`,
            link: `/trades/${tradeId}`
        });

    } else {
        throw new Error("Invalid response");
    }
};

// A counter-offer is a fresh trade with initiator/counterparty swapped and
// trade_type flipped (the original counterparty is now proposing terms back
// to the original initiator), which reuses the entire existing
// create-items-send-accept pipeline unchanged instead of teaching the
// accept-transaction code about mid-negotiation turn-taking. The caller
// supplies the full edited item list up front (quantity/price/godown per
// item) so the whole thing — create, add items, send — happens in one call;
// the original trade is only marked 'countered' once all of that succeeds,
// so a failed counter-offer leaves the original untouched and still
// respondable rather than closing it out with nothing to replace it.
const counterTrade = async (tradeId, userId, items) => {
    const trade = await tradeModel.getTradeByTradeId(tradeId);

    if (!trade) throw new Error("Trade not found");
    if (trade.counterparty_id !== userId)
        throw new Error("Only the receiver can counter this trade");
    if (trade.status !== 'pending')
        throw new Error("Trade is not awaiting a response");
    if (!Array.isArray(items) || items.length === 0)
        throw new Error("At least one item is required for a counter-offer");

    const newType = trade.trade_type === 'sell' ? 'buy' : 'sell';

    const created = await tradeModel.createTrade({
        initiator_id: userId,
        counterparty_id: trade.initiator_id,
        trade_type: newType,
        counter_of_trade_id: tradeId
    });

    await addItemsToTrade(created.trade_id, userId, items);
    await sendTradeRequest(created.trade_id, userId);

    await tradeModel.markCountered(tradeId, created.trade_id);

    return created;
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
    removeItemFromTrade,
    cancelTrade,
    sendTradeRequest,
    respondToTradeRequest,
    counterTrade,
    getTradeByTradeId,
    getInitiatedTradesByUserId,
    getReceivedTradesByUserId,
    getTradeItemsByTradeId,
    getTradeDetailsByTradeId
};
