const db = require('../config/db');
const loanModel = require('../models/loanModel');
const notificationService = require('./notificationService');

const EDITABLE_STATUSES = ['created', 'pending'];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const daysBetween = (from, to) => Math.max(0, (new Date(to) - new Date(from)) / MS_PER_DAY);

// Merchant's Rule: each transaction is independently future-valued via simple
// interest from its own effective_date to `asOf`. Disbursements count
// positive (money owed), repayments count negative (money returned). Summing
// these gives the current balance without needing to replay history in
// order or track a running principal.
const futureValue = (signedAmount, annualRatePercent, days) => {
    return signedAmount * (1 + (annualRatePercent / 100) * (days / 365));
};

const computeBalance = (transactions, asOf) => {
    let total = 0;
    for (const t of transactions) {
        if (!t.effective_date) continue; // not yet active (created/pending/rejected/cancelled)
        const days = daysBetween(t.effective_date, asOf);
        const signedAmount = t.transaction_type === 'disbursement' ? Number(t.amount) : -Number(t.amount);
        total += futureValue(signedAmount, t.annual_interest_rate, days);
    }
    return total;
};

const getLoanState = async (loanId, userId) => {
    const loan = await loanModel.getDisbursement(loanId);
    if (!loan) throw new Error("Loan not found");
    if (loan.lender_id !== userId && loan.borrower_id !== userId) {
        throw new Error("Loan not found");
    }

    const transactions = await loanModel.getTransactionsByLoanId(loanId);
    const disbursements = transactions.filter(t => t.transaction_type === 'disbursement' && t.effective_date);
    // Pending repayments haven't been confirmed by the other party yet, so
    // they must not affect the balance until effective_date is set.
    const repayments = transactions.filter(t => t.transaction_type === 'repayment' && t.effective_date);
    const pendingAdditionsRaw = await loanModel.getPendingAdditionalDisbursements(loanId);
    const pendingRepaymentsRaw = await loanModel.getPendingRepayments(loanId);

    const total_disbursed = round2(disbursements.reduce((sum, d) => sum + Number(d.amount), 0));

    // Raw principal still outstanding, ignoring interest entirely.
    const outstanding_principal = round2(
        total_disbursed - repayments.reduce((sum, r) => sum + Number(r.amount), 0)
    );

    const total_owed = loan.status === 'active' ? round2(computeBalance(transactions, new Date())) : outstanding_principal;
    const accrued_interest = round2(total_owed - outstanding_principal);

    return {
        loan_id: loan.transaction_id,
        initiator_id: loan.initiator_id,
        counterparty_id: loan.counterparty_id,
        lender_id: loan.lender_id,
        borrower_id: loan.borrower_id,
        principal: Number(loan.amount),
        total_disbursed,
        annual_interest_rate: Number(loan.annual_interest_rate),
        status: loan.status,
        start_date: loan.effective_date,
        closed_at: loan.closed_at,
        outstanding_principal,
        accrued_interest,
        total_owed,
        transactions: transactions
            .filter(t => t.effective_date)
            .map(t => ({
                transaction_id: t.transaction_id,
                type: t.transaction_type,
                amount: Number(t.amount),
                annual_interest_rate: Number(t.annual_interest_rate),
                date: t.effective_date
            })),
        repayments: repayments.map(r => ({
            transaction_id: r.transaction_id,
            amount: Number(r.amount),
            paid_at: r.effective_date
        })),
        pending_additions: pendingAdditionsRaw.map(p => ({
            transaction_id: p.transaction_id,
            amount: Number(p.amount),
            annual_interest_rate: Number(p.annual_interest_rate),
            initiator_id: p.initiator_id,
            counterparty_id: p.counterparty_id,
            created_at: p.created_at
        })),
        pending_repayments: pendingRepaymentsRaw.map(p => ({
            transaction_id: p.transaction_id,
            amount: Number(p.amount),
            annual_interest_rate: Number(p.annual_interest_rate),
            initiator_id: p.initiator_id,
            counterparty_id: p.counterparty_id,
            created_at: p.created_at
        }))
    };
};

const createLoan = async (initiatorId, data) => {
    const { counterparty_id, direction, principal, annual_interest_rate } = data;

    if (counterparty_id === initiatorId) throw new Error("Cannot create a loan with yourself");
    if (!Number.isFinite(principal) || principal <= 0) throw new Error("Principal must be a positive number");
    if (!Number.isFinite(annual_interest_rate) || annual_interest_rate < 0) throw new Error("Interest rate cannot be negative");
    if (!['lend', 'borrow'].includes(direction)) throw new Error("Direction must be 'lend' or 'borrow'");

    const lender_id = direction === 'lend' ? initiatorId : counterparty_id;
    const borrower_id = direction === 'lend' ? counterparty_id : initiatorId;

    return await loanModel.createLoan({
        initiator_id: initiatorId,
        counterparty_id,
        lender_id,
        borrower_id,
        principal: round2(principal),
        annual_interest_rate
    });
};

const sendLoan = async (loanId, userId) => {
    const loan = await loanModel.getDisbursement(loanId);
    if (!loan) throw new Error("Loan not found");
    if (loan.initiator_id !== userId) throw new Error("Only the initiator can send this loan");
    if (loan.status !== 'created') throw new Error("Loan has already been sent");

    await loanModel.sendLoan(loanId);

    await notificationService.notify({
        user_id: loan.counterparty_id,
        type: 'loan_proposal',
        message: `New loan proposal: ₹${loan.amount} at ${loan.annual_interest_rate}% per year`,
        link: `/loans/${loanId}`
    });
};

const cancelLoan = async (loanId, userId) => {
    const loan = await loanModel.getDisbursement(loanId);
    if (!loan) throw new Error("Loan not found");
    if (loan.initiator_id !== userId) throw new Error("Only the initiator can cancel this loan");
    if (!EDITABLE_STATUSES.includes(loan.status)) throw new Error("Loan can no longer be cancelled");

    await loanModel.cancelLoan(loanId);
};

const respondToLoan = async (loanId, userId, response) => {
    const loan = await loanModel.getDisbursement(loanId);
    if (!loan) throw new Error("Loan not found");
    if (loan.counterparty_id !== userId) throw new Error("Only the receiver can respond");
    if (loan.status !== 'pending') throw new Error("Loan is not awaiting a response");

    if (response === 'accept') {
        await loanModel.activateLoan(loanId);
    } else if (response === 'reject') {
        await loanModel.rejectLoan(loanId);
    } else {
        throw new Error("Invalid response");
    }

    await notificationService.notify({
        user_id: loan.initiator_id,
        type: 'loan_response',
        message: `Your loan proposal was ${response}ed`,
        link: `/loans/${loanId}`
    });
};

const proposeRepayment = async (loanId, userId, amount) => {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Repayment amount must be positive");

    const loan = await loanModel.getDisbursement(loanId);
    if (!loan) throw new Error("Loan not found");
    if (loan.lender_id !== userId && loan.borrower_id !== userId) {
        throw new Error("Only the lender or borrower can propose a repayment");
    }
    if (loan.status !== 'active') throw new Error("Loan is not active");

    const transactions = await loanModel.getTransactionsByLoanId(loanId);
    const totalOwed = round2(computeBalance(transactions, new Date()));
    if (amount > totalOwed + 0.01) {
        throw new Error(`Amount exceeds total owed (${totalOwed})`);
    }

    const counterpartyId = loan.lender_id === userId ? loan.borrower_id : loan.lender_id;

    const result = await loanModel.proposeRepayment({
        loan_id: loanId,
        lender_id: loan.lender_id,
        borrower_id: loan.borrower_id,
        initiator_id: userId,
        counterparty_id: counterpartyId,
        amount: round2(amount),
        annual_interest_rate: loan.annual_interest_rate
    });

    await notificationService.notify({
        user_id: counterpartyId,
        type: 'loan_repayment_proposal',
        message: `A repayment of ₹${round2(amount)} was recorded — please confirm you received it`,
        link: `/loans/${loanId}`
    });

    return result;
};

const respondToRepayment = async (transactionId, userId, response) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const tx = await loanModel.getTransactionForUpdate(transactionId, conn);
        if (!tx || tx.transaction_type !== 'repayment') throw new Error("Repayment not found");
        if (tx.counterparty_id !== userId) throw new Error("Only the other party can confirm this repayment");
        if (tx.status !== 'pending') throw new Error("Repayment is not awaiting confirmation");

        if (response === 'accept') {
            const transactions = await loanModel.getTransactionsByLoanId(tx.loan_id, conn);
            const totalOwed = round2(computeBalance(transactions, new Date()));
            if (Number(tx.amount) > totalOwed + 0.01) {
                throw new Error(`Amount exceeds total owed (${totalOwed})`);
            }

            await loanModel.activatePendingTransaction(transactionId, conn);

            const remaining = round2(totalOwed - Number(tx.amount));
            if (remaining <= 0.01) {
                await loanModel.closeLoan(tx.loan_id, conn);
            }
        } else if (response === 'reject') {
            await loanModel.rejectPendingTransaction(transactionId, conn);
        } else {
            throw new Error("Invalid response");
        }

        await notificationService.notify({
            user_id: tx.initiator_id,
            type: 'loan_repayment_response',
            message: `Your repayment of ₹${tx.amount} was ${response}ed`,
            link: `/loans/${tx.loan_id}`
        }, conn);

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const cancelRepayment = async (transactionId, userId) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const tx = await loanModel.getTransactionForUpdate(transactionId, conn);
        if (!tx || tx.transaction_type !== 'repayment') throw new Error("Repayment not found");
        if (tx.initiator_id !== userId) throw new Error("Only the person who recorded this repayment can cancel it");
        if (tx.status !== 'pending') throw new Error("Repayment can no longer be cancelled");

        await loanModel.cancelPendingTransaction(transactionId, conn);

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const proposeAdditionalDisbursement = async (loanId, userId, amount, annualInterestRate) => {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be positive");

    const loan = await loanModel.getDisbursement(loanId);
    if (!loan) throw new Error("Loan not found");
    if (loan.lender_id !== userId) throw new Error("Only the lender can offer additional funds");
    if (loan.status !== 'active') throw new Error("Loan is not active");

    const rate = Number.isFinite(annualInterestRate) ? annualInterestRate : Number(loan.annual_interest_rate);
    if (rate < 0) throw new Error("Interest rate cannot be negative");

    const result = await loanModel.proposeAdditionalDisbursement({
        loan_id: loanId,
        lender_id: loan.lender_id,
        borrower_id: loan.borrower_id,
        initiator_id: userId,
        counterparty_id: loan.borrower_id,
        amount: round2(amount),
        annual_interest_rate: rate
    });

    await notificationService.notify({
        user_id: loan.borrower_id,
        type: 'loan_addition_proposal',
        message: `Lender offered ₹${round2(amount)} more on your loan — respond to accept or reject`,
        link: `/loans/${loanId}`
    });

    return result;
};

const respondToAdditionalDisbursement = async (transactionId, userId, response) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const tx = await loanModel.getTransactionForUpdate(transactionId, conn);
        if (!tx || tx.transaction_type !== 'disbursement') throw new Error("Offer not found");
        if (tx.counterparty_id !== userId) throw new Error("Only the borrower can respond to this offer");
        if (tx.status !== 'pending') throw new Error("Offer is not awaiting a response");

        if (response === 'accept') {
            await loanModel.activatePendingTransaction(transactionId, conn);
        } else if (response === 'reject') {
            await loanModel.rejectPendingTransaction(transactionId, conn);
        } else {
            throw new Error("Invalid response");
        }

        await notificationService.notify({
            user_id: tx.initiator_id,
            type: 'loan_addition_response',
            message: `Your offer to lend ₹${tx.amount} more was ${response}ed`,
            link: `/loans/${tx.loan_id}`
        }, conn);

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const cancelAdditionalDisbursement = async (transactionId, userId) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const tx = await loanModel.getTransactionForUpdate(transactionId, conn);
        if (!tx || tx.transaction_type !== 'disbursement') throw new Error("Offer not found");
        if (tx.initiator_id !== userId) throw new Error("Only the proposer can cancel this offer");
        if (tx.status !== 'pending') throw new Error("Offer can no longer be cancelled");

        await loanModel.cancelPendingTransaction(transactionId, conn);

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// Groups a flat list of loan_transaction rows (any status, any date — this is
// what makes the grouping work for loans created before this feature too)
// by their loan_id, so per-loan totals can be computed independently before
// being summed up per counterparty.
const groupByLoanId = (rows) => {
    const byLoan = new Map();
    for (const r of rows) {
        if (!byLoan.has(r.loan_id)) byLoan.set(r.loan_id, []);
        byLoan.get(r.loan_id).push(r);
    }
    return byLoan;
};

const computeLoanTotals = (txs) => {
    const mainRow = txs.find(t => t.transaction_id === t.loan_id) || txs[0];
    const disbursements = txs.filter(t => t.transaction_type === 'disbursement' && t.effective_date);
    // Pending repayments haven't been confirmed yet, so they must not reduce
    // outstanding_principal until effective_date is set.
    const repayments = txs.filter(t => t.transaction_type === 'repayment' && t.effective_date);
    const total_disbursed = round2(disbursements.reduce((sum, d) => sum + Number(d.amount), 0));
    const outstanding_principal = round2(total_disbursed - repayments.reduce((sum, r) => sum + Number(r.amount), 0));
    // Same rule as getLoanState: once a loan is no longer active, interest
    // stops accruing and the settled outstanding_principal (0 once fully
    // repaid) is used instead of re-projecting balance to "now".
    const total_owed = mainRow.status === 'active' ? round2(computeBalance(txs, new Date())) : outstanding_principal;
    return { mainRow, total_disbursed, outstanding_principal, total_owed };
};

const summarizeByCounterparty = (rows, role) => {
    const byLoan = groupByLoanId(rows);
    const byCounterparty = new Map();

    for (const txs of byLoan.values()) {
        const { mainRow, total_disbursed, outstanding_principal, total_owed } = computeLoanTotals(txs);
        const counterpartyId = role === 'lender' ? mainRow.borrower_id : mainRow.lender_id;

        if (!byCounterparty.has(counterpartyId)) {
            byCounterparty.set(counterpartyId, {
                counterparty_id: counterpartyId,
                counterparty_name: mainRow.counterparty_name,
                total_principal: 0,
                total_outstanding_principal: 0,
                total_owed: 0,
                loan_count: 0,
                active_count: 0,
                pending_count: 0
            });
        }

        const entry = byCounterparty.get(counterpartyId);
        entry.total_principal = round2(entry.total_principal + total_disbursed);
        entry.total_outstanding_principal = round2(entry.total_outstanding_principal + outstanding_principal);
        entry.total_owed = round2(entry.total_owed + total_owed);
        entry.loan_count += 1;
        if (mainRow.status === 'active') entry.active_count += 1;
        if (['created', 'pending'].includes(mainRow.status)) entry.pending_count += 1;
    }

    return Array.from(byCounterparty.values())
        .map(e => ({
            counterparty_id: e.counterparty_id,
            counterparty_name: e.counterparty_name,
            total_principal: e.total_principal,
            outstanding_principal: e.total_outstanding_principal,
            accrued_interest: round2(e.total_owed - e.total_outstanding_principal),
            total_owed: e.total_owed,
            loan_count: e.loan_count,
            active_count: e.active_count,
            pending_count: e.pending_count
        }))
        .sort((a, b) => b.total_owed - a.total_owed || b.loan_count - a.loan_count);
};

const getLoanSummary = async (userId) => {
    const [lendingRows, borrowingRows] = await Promise.all([
        loanModel.getAllTransactionsAsLender(userId),
        loanModel.getAllTransactionsAsBorrower(userId)
    ]);

    return {
        lending: summarizeByCounterparty(lendingRows, 'lender'),
        borrowing: summarizeByCounterparty(borrowingRows, 'borrower')
    };
};

const getLoansWithCounterparty = async (userId, counterpartyId) => {
    const rows = await loanModel.getAllTransactionsWithCounterparty(userId, counterpartyId);
    if (rows.length === 0) throw new Error("No loans found with this user");

    const byLoan = groupByLoanId(rows);
    const loans = Array.from(byLoan.values())
        .map(txs => {
            const { mainRow, total_disbursed, outstanding_principal, total_owed } = computeLoanTotals(txs);
            // Interest per transaction is frozen at closed_at for settled loans,
            // same reasoning as computeLoanTotals: once closed, nothing should
            // keep accruing against "now".
            const asOf = mainRow.status === 'active' ? new Date() : (mainRow.closed_at || new Date());
            return {
                loan_id: mainRow.loan_id,
                role: mainRow.lender_id === userId ? 'lender' : 'borrower',
                status: mainRow.status,
                principal: Number(mainRow.amount),
                total_disbursed,
                annual_interest_rate: Number(mainRow.annual_interest_rate),
                outstanding_principal,
                accrued_interest: round2(total_owed - outstanding_principal),
                total_owed,
                start_date: mainRow.effective_date,
                closed_at: mainRow.closed_at,
                created_at: mainRow.created_at,
                transactions: txs
                    .filter(t => t.effective_date)
                    .map(t => {
                        const days = daysBetween(t.effective_date, asOf);
                        const interest_to_date = round2(
                            futureValue(Number(t.amount), Number(t.annual_interest_rate), days) - Number(t.amount)
                        );
                        return {
                            transaction_id: t.transaction_id,
                            type: t.transaction_type,
                            amount: Number(t.amount),
                            annual_interest_rate: Number(t.annual_interest_rate),
                            date: t.effective_date,
                            interest_to_date
                        };
                    }),
                pending_additions: txs
                    .filter(t => t.transaction_type === 'disbursement' && t.status === 'pending' && t.transaction_id !== mainRow.loan_id)
                    .map(t => ({
                        transaction_id: t.transaction_id,
                        amount: Number(t.amount),
                        annual_interest_rate: Number(t.annual_interest_rate),
                        initiator_id: t.initiator_id,
                        counterparty_id: t.counterparty_id,
                        created_at: t.created_at
                    })),
                pending_repayments: txs
                    .filter(t => t.transaction_type === 'repayment' && t.status === 'pending')
                    .map(t => ({
                        transaction_id: t.transaction_id,
                        amount: Number(t.amount),
                        annual_interest_rate: Number(t.annual_interest_rate),
                        initiator_id: t.initiator_id,
                        counterparty_id: t.counterparty_id,
                        created_at: t.created_at
                    }))
            };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
        counterparty_id: counterpartyId,
        counterparty_name: rows[0].counterparty_name,
        loans
    };
};

const getInitiatedLoansByUserId = async (userId) => {
    const rows = await loanModel.getInitiatedLoansByUserId(userId);
    return rows.map(r => ({
        loan_id: r.transaction_id,
        principal: Number(r.amount),
        annual_interest_rate: Number(r.annual_interest_rate),
        status: r.status,
        lender_id: r.lender_id,
        borrower_id: r.borrower_id,
        counterparty_id: r.counterparty_id,
        counterparty_name: r.counterparty_name,
        created_at: r.created_at
    }));
};

const getReceivedLoansByUserId = async (userId) => {
    const rows = await loanModel.getReceivedLoansByUserId(userId);
    return rows.map(r => ({
        loan_id: r.transaction_id,
        principal: Number(r.amount),
        annual_interest_rate: Number(r.annual_interest_rate),
        status: r.status,
        lender_id: r.lender_id,
        borrower_id: r.borrower_id,
        counterparty_id: r.initiator_id,
        counterparty_name: r.initiator_name,
        created_at: r.created_at
    }));
};

module.exports = {
    createLoan,
    sendLoan,
    cancelLoan,
    respondToLoan,
    proposeRepayment,
    respondToRepayment,
    cancelRepayment,
    proposeAdditionalDisbursement,
    respondToAdditionalDisbursement,
    cancelAdditionalDisbursement,
    getLoanState,
    getLoanSummary,
    getLoansWithCounterparty,
    getInitiatedLoansByUserId,
    getReceivedLoansByUserId
};
