const express = require('express');
const router = express.Router();

const loanController = require('../controllers/loanController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, loanController.createLoan);
router.post('/:loanId/send', authMiddleware, loanController.sendLoan);
router.post('/:loanId/cancel', authMiddleware, loanController.cancelLoan);
router.post('/:loanId/respond', authMiddleware, loanController.respondToLoan);
router.post('/:loanId/repay', authMiddleware, loanController.proposeRepayment);
router.post('/:loanId/lend-more', authMiddleware, loanController.proposeAdditionalFunds);
router.post('/addition/:transactionId/respond', authMiddleware, loanController.respondToAdditionalFunds);
router.post('/addition/:transactionId/cancel', authMiddleware, loanController.cancelAdditionalFunds);
router.post('/repayment/:transactionId/respond', authMiddleware, loanController.respondToRepayment);
router.post('/repayment/:transactionId/cancel', authMiddleware, loanController.cancelRepayment);

// static routes first
router.get('/initiated', authMiddleware, loanController.getInitiatedLoans);
router.get('/received', authMiddleware, loanController.getReceivedLoans);
router.get('/summary', authMiddleware, loanController.getLoanSummary);
router.get('/with/:counterpartyId', authMiddleware, loanController.getLoansWithCounterparty);

// dynamic routes last
router.get('/:loanId/details', authMiddleware, loanController.getLoanDetails);

module.exports = router;
