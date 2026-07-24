const db = require('../config/db');

const createLoan = async (data) => {
    const { initiator_id, counterparty_id, lender_id, borrower_id, principal, annual_interest_rate } = data;

    const [result] = await db.query(
        `INSERT INTO loan_transaction
         (loan_id, transaction_type, lender_id, borrower_id, initiator_id, counterparty_id, amount, annual_interest_rate, status, recorded_by)
         VALUES (0, 'disbursement', ?, ?, ?, ?, ?, ?, 'created', ?)`,
        [lender_id, borrower_id, initiator_id, counterparty_id, principal, annual_interest_rate, initiator_id]
    );

    const loanId = result.insertId;
    // loan_id has no FK (self-referencing), so this second step just backfills
    // the grouping key to equal the disbursement row's own id.
    await db.query(`UPDATE loan_transaction SET loan_id = ? WHERE transaction_id = ?`, [loanId, loanId]);

    return { loan_id: loanId };
};

const sendLoan = async (loanId) => {
    await db.query(
        `UPDATE loan_transaction SET status = 'pending' WHERE transaction_id = ? AND transaction_type = 'disbursement'`,
        [loanId]
    );
};

const cancelLoan = async (loanId) => {
    await db.query(
        `UPDATE loan_transaction SET status = 'cancelled' WHERE transaction_id = ? AND transaction_type = 'disbursement'`,
        [loanId]
    );
};

const rejectLoan = async (loanId) => {
    await db.query(
        `UPDATE loan_transaction SET status = 'rejected' WHERE transaction_id = ? AND transaction_type = 'disbursement'`,
        [loanId]
    );
};

const activateLoan = async (loanId, conn = db) => {
    await conn.query(
        `UPDATE loan_transaction SET status = 'active', effective_date = NOW()
         WHERE transaction_id = ? AND transaction_type = 'disbursement'`,
        [loanId]
    );
};

const closeLoan = async (loanId, conn = db) => {
    await conn.query(
        `UPDATE loan_transaction SET status = 'closed', closed_at = NOW()
         WHERE transaction_id = ? AND transaction_type = 'disbursement'`,
        [loanId]
    );
};

const getDisbursement = async (loanId, conn = db) => {
    const [rows] = await conn.query(
        `SELECT * FROM loan_transaction WHERE transaction_id = ? AND transaction_type = 'disbursement'`,
        [loanId]
    );
    return rows[0];
};

const getDisbursementForUpdate = async (loanId, conn) => {
    const [rows] = await conn.query(
        `SELECT * FROM loan_transaction WHERE transaction_id = ? AND transaction_type = 'disbursement' FOR UPDATE`,
        [loanId]
    );
    return rows[0];
};

const getTransactionsByLoanId = async (loanId, conn = db) => {
    const [rows] = await conn.query(
        `SELECT * FROM loan_transaction WHERE loan_id = ? ORDER BY effective_date ASC, transaction_id ASC`,
        [loanId]
    );
    return rows;
};

const getRepaymentsByLoanId = async (loanId, conn = db) => {
    const [rows] = await conn.query(
        `SELECT * FROM loan_transaction
         WHERE loan_id = ? AND transaction_type = 'repayment'
         ORDER BY effective_date ASC, transaction_id ASC`,
        [loanId]
    );
    return rows;
};

const proposeAdditionalDisbursement = async (data) => {
    const { loan_id, lender_id, borrower_id, initiator_id, counterparty_id, amount, annual_interest_rate } = data;

    const [result] = await db.query(
        `INSERT INTO loan_transaction
         (loan_id, transaction_type, lender_id, borrower_id, initiator_id, counterparty_id, amount, annual_interest_rate, status, recorded_by)
         VALUES (?, 'disbursement', ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [loan_id, lender_id, borrower_id, initiator_id, counterparty_id, amount, annual_interest_rate, initiator_id]
    );

    return { transaction_id: result.insertId };
};

const getTransactionForUpdate = async (transactionId, conn) => {
    const [rows] = await conn.query(
        `SELECT * FROM loan_transaction WHERE transaction_id = ? FOR UPDATE`,
        [transactionId]
    );
    return rows[0];
};

// Shared by both pending disbursement offers (lend-more) and pending
// repayments — both go through the same propose -> accept/reject/cancel
// lifecycle before they count towards the loan balance.
const activatePendingTransaction = async (transactionId, conn = db) => {
    await conn.query(
        `UPDATE loan_transaction SET status = 'active', effective_date = NOW()
         WHERE transaction_id = ?`,
        [transactionId]
    );
};

const rejectPendingTransaction = async (transactionId, conn = db) => {
    await conn.query(
        `UPDATE loan_transaction SET status = 'rejected' WHERE transaction_id = ?`,
        [transactionId]
    );
};

const cancelPendingTransaction = async (transactionId, conn = db) => {
    await conn.query(
        `UPDATE loan_transaction SET status = 'cancelled' WHERE transaction_id = ?`,
        [transactionId]
    );
};

const getPendingAdditionalDisbursements = async (loanId) => {
    const [rows] = await db.query(
        `SELECT * FROM loan_transaction
         WHERE loan_id = ? AND transaction_type = 'disbursement' AND status = 'pending' AND transaction_id != ?`,
        [loanId, loanId]
    );
    return rows;
};

const proposeRepayment = async (data) => {
    const { loan_id, lender_id, borrower_id, initiator_id, counterparty_id, amount, annual_interest_rate } = data;

    const [result] = await db.query(
        `INSERT INTO loan_transaction
         (loan_id, transaction_type, lender_id, borrower_id, initiator_id, counterparty_id, amount, annual_interest_rate, status, recorded_by)
         VALUES (?, 'repayment', ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [loan_id, lender_id, borrower_id, initiator_id, counterparty_id, amount, annual_interest_rate, initiator_id]
    );

    return { transaction_id: result.insertId };
};

const getPendingRepayments = async (loanId) => {
    const [rows] = await db.query(
        `SELECT * FROM loan_transaction
         WHERE loan_id = ? AND transaction_type = 'repayment' AND status = 'pending'`,
        [loanId]
    );
    return rows;
};

const getInitiatedLoansByUserId = async (userId) => {
    const [rows] = await db.query(
        `SELECT lt.*, u.user_name AS counterparty_name
         FROM loan_transaction lt
         JOIN user u ON lt.counterparty_id = u.user_id
         WHERE lt.transaction_type = 'disbursement' AND lt.initiator_id = ?
         ORDER BY lt.created_at DESC`,
        [userId]
    );
    return rows;
};

const getReceivedLoansByUserId = async (userId) => {
    const [rows] = await db.query(
        `SELECT lt.*, u.user_name AS initiator_name
         FROM loan_transaction lt
         JOIN user u ON lt.initiator_id = u.user_id
         WHERE lt.transaction_type = 'disbursement' AND lt.counterparty_id = ?
         ORDER BY lt.created_at DESC`,
        [userId]
    );
    return rows;
};

const getAllTransactionsAsLender = async (userId) => {
    const [rows] = await db.query(
        `SELECT lt.*, u.user_name AS counterparty_name
         FROM loan_transaction lt
         JOIN user u ON u.user_id = lt.borrower_id
         WHERE lt.lender_id = ?
         ORDER BY lt.loan_id, lt.transaction_id`,
        [userId]
    );
    return rows;
};

const getAllTransactionsAsBorrower = async (userId) => {
    const [rows] = await db.query(
        `SELECT lt.*, u.user_name AS counterparty_name
         FROM loan_transaction lt
         JOIN user u ON u.user_id = lt.lender_id
         WHERE lt.borrower_id = ?
         ORDER BY lt.loan_id, lt.transaction_id`,
        [userId]
    );
    return rows;
};

const getAllTransactionsWithCounterparty = async (userId, counterpartyId) => {
    const [rows] = await db.query(
        `SELECT lt.*, u.user_name AS counterparty_name
         FROM loan_transaction lt
         JOIN user u ON u.user_id = IF(lt.lender_id = ?, lt.borrower_id, lt.lender_id)
         WHERE (lt.lender_id = ? AND lt.borrower_id = ?) OR (lt.lender_id = ? AND lt.borrower_id = ?)
         ORDER BY lt.loan_id, lt.transaction_id`,
        [userId, userId, counterpartyId, counterpartyId, userId]
    );
    return rows;
};

module.exports = {
    createLoan,
    sendLoan,
    cancelLoan,
    rejectLoan,
    activateLoan,
    closeLoan,
    getDisbursement,
    getDisbursementForUpdate,
    getTransactionsByLoanId,
    getRepaymentsByLoanId,
    proposeAdditionalDisbursement,
    getTransactionForUpdate,
    activatePendingTransaction,
    rejectPendingTransaction,
    cancelPendingTransaction,
    getPendingAdditionalDisbursements,
    proposeRepayment,
    getPendingRepayments,
    getInitiatedLoansByUserId,
    getReceivedLoansByUserId,
    getAllTransactionsAsLender,
    getAllTransactionsAsBorrower,
    getAllTransactionsWithCounterparty
};
