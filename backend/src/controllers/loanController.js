const loanService = require('../services/loanService');

const createLoan = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { counterparty_id, direction, principal, annual_interest_rate } = req.body;

        const result = await loanService.createLoan(userId, {
            counterparty_id: parseInt(counterparty_id),
            direction,
            principal: parseFloat(principal),
            annual_interest_rate: parseFloat(annual_interest_rate)
        });

        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const sendLoan = async (req, res) => {
    try {
        const loanId = parseInt(req.params.loanId);
        await loanService.sendLoan(loanId, req.user.user_id);
        res.json({ message: "Loan sent" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const cancelLoan = async (req, res) => {
    try {
        const loanId = parseInt(req.params.loanId);
        await loanService.cancelLoan(loanId, req.user.user_id);
        res.json({ message: "Loan cancelled" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const respondToLoan = async (req, res) => {
    try {
        const loanId = parseInt(req.params.loanId);
        const { response } = req.body;
        await loanService.respondToLoan(loanId, req.user.user_id, response);
        res.json({ message: `Loan ${response}ed successfully` });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const proposeRepayment = async (req, res) => {
    try {
        const loanId = parseInt(req.params.loanId);
        const amount = parseFloat(req.body.amount);
        const result = await loanService.proposeRepayment(loanId, req.user.user_id, amount);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const respondToRepayment = async (req, res) => {
    try {
        const transactionId = parseInt(req.params.transactionId);
        const { response } = req.body;
        await loanService.respondToRepayment(transactionId, req.user.user_id, response);
        res.json({ message: `Repayment ${response}ed successfully` });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const cancelRepayment = async (req, res) => {
    try {
        const transactionId = parseInt(req.params.transactionId);
        await loanService.cancelRepayment(transactionId, req.user.user_id);
        res.json({ message: "Repayment cancelled" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const proposeAdditionalFunds = async (req, res) => {
    try {
        const loanId = parseInt(req.params.loanId);
        const amount = parseFloat(req.body.amount);
        const annual_interest_rate = req.body.annual_interest_rate !== undefined
            ? parseFloat(req.body.annual_interest_rate)
            : undefined;
        const result = await loanService.proposeAdditionalDisbursement(loanId, req.user.user_id, amount, annual_interest_rate);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const respondToAdditionalFunds = async (req, res) => {
    try {
        const transactionId = parseInt(req.params.transactionId);
        const { response } = req.body;
        await loanService.respondToAdditionalDisbursement(transactionId, req.user.user_id, response);
        res.json({ message: `Offer ${response}ed successfully` });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const cancelAdditionalFunds = async (req, res) => {
    try {
        const transactionId = parseInt(req.params.transactionId);
        await loanService.cancelAdditionalDisbursement(transactionId, req.user.user_id);
        res.json({ message: "Offer cancelled" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getInitiatedLoans = async (req, res) => {
    try {
        const loans = await loanService.getInitiatedLoansByUserId(req.user.user_id);
        res.json(loans);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getReceivedLoans = async (req, res) => {
    try {
        const loans = await loanService.getReceivedLoansByUserId(req.user.user_id);
        res.json(loans);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getLoanDetails = async (req, res) => {
    try {
        const loanId = parseInt(req.params.loanId);
        const state = await loanService.getLoanState(loanId, req.user.user_id);
        res.json(state);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
};

const getLoanSummary = async (req, res) => {
    try {
        const summary = await loanService.getLoanSummary(req.user.user_id);
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getLoansWithCounterparty = async (req, res) => {
    try {
        const counterpartyId = parseInt(req.params.counterpartyId);
        const result = await loanService.getLoansWithCounterparty(req.user.user_id, counterpartyId);
        res.json(result);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
};

module.exports = {
    createLoan,
    sendLoan,
    cancelLoan,
    respondToLoan,
    proposeRepayment,
    respondToRepayment,
    cancelRepayment,
    proposeAdditionalFunds,
    respondToAdditionalFunds,
    cancelAdditionalFunds,
    getInitiatedLoans,
    getReceivedLoans,
    getLoanDetails,
    getLoanSummary,
    getLoansWithCounterparty
};
