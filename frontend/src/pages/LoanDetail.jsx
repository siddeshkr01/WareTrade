import { useContext, useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api/axios";
import { AuthContext } from "../context/authContextValue";
import { ConfirmContext } from "../context/confirmContextValue";
import { IconInbox } from "../components/Icons";
import { markNotificationsReadByLink } from "../utils/notifications";

const statusClass = (status) => `badge badge-${status}`;
const TERMINAL_STATUSES = ['rejected', 'cancelled', 'closed'];
const EDITABLE_STATUSES = ['created', 'pending'];

const LoanDetail = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const confirm = useContext(ConfirmContext);

    const [loan, setLoan] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const [sendBusy, setSendBusy] = useState(false);
    const [cancelBusy, setCancelBusy] = useState(false);
    const [respondBusy, setRespondBusy] = useState(false);
    const [actionError, setActionError] = useState("");

    const [showPayback, setShowPayback] = useState(false);
    const [repayAmount, setRepayAmount] = useState("");
    const [repayBusy, setRepayBusy] = useState(false);
    const [repayError, setRepayError] = useState("");

    const [showLendMore, setShowLendMore] = useState(false);
    const [lendAmount, setLendAmount] = useState("");
    const [lendBusy, setLendBusy] = useState(false);
    const [lendError, setLendError] = useState("");

    const [additionBusyId, setAdditionBusyId] = useState(null);
    const [additionError, setAdditionError] = useState("");

    const [repaymentBusyId, setRepaymentBusyId] = useState(null);
    const [repaymentRespondError, setRepaymentRespondError] = useState("");

    const load = useCallback(() => {
        setLoading(true);
        setError("");
        API.get(`/loan/${id}/details`)
            .then((res) => {
                setLoan(res.data);
                markNotificationsReadByLink(`/loans/${id}`);
            })
            .catch((err) => setError(err.response?.data?.error || "Failed to load loan"))
            .finally(() => setLoading(false));
    }, [id]);

    const poll = useCallback(() => {
        API.get(`/loan/${id}/details`)
            .then((res) => setLoan(res.data))
            .catch(() => {});
    }, [id]);

    useEffect(load, [load]);

    useEffect(() => {
        if (!loan || TERMINAL_STATUSES.includes(loan.status)) return;
        const interval = setInterval(poll, 5000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loan?.status, poll]);

    if (loading) return <div className="page"><div className="loading-state"><span className="spinner" /> Loading loan...</div></div>;
    if (error) return <div className="page"><p className="error-text">{error}</p></div>;
    if (!loan) return null;

    const isInitiator = user && loan.initiator_id === user.user_id;
    const isCounterparty = user && loan.counterparty_id === user.user_id;
    const isLender = user && loan.lender_id === user.user_id;
    const isBorrower = user && loan.borrower_id === user.user_id;
    const canEdit = isInitiator && EDITABLE_STATUSES.includes(loan.status);

    const handleSend = async () => {
        setActionError("");
        setSendBusy(true);
        try {
            await API.post(`/loan/${id}/send`);
            load();
        } catch (err) {
            setActionError(err.response?.data?.error || "Failed to send loan");
        } finally {
            setSendBusy(false);
        }
    };

    const handleCancel = async () => {
        if (!(await confirm("Cancel this loan proposal?"))) return;
        setActionError("");
        setCancelBusy(true);
        try {
            await API.post(`/loan/${id}/cancel`);
            load();
        } catch (err) {
            setActionError(err.response?.data?.error || "Failed to cancel loan");
        } finally {
            setCancelBusy(false);
        }
    };

    const handleRespond = async (response) => {
        setActionError("");
        setRespondBusy(true);
        try {
            await API.post(`/loan/${id}/respond`, { response });
            load();
        } catch (err) {
            setActionError(err.response?.data?.error || `Failed to ${response} loan`);
        } finally {
            setRespondBusy(false);
        }
    };

    const handleRepay = async (e) => {
        e.preventDefault();
        setRepayError("");
        const amount = parseFloat(repayAmount);
        if (!amount || amount <= 0) {
            setRepayError("Enter a valid amount");
            return;
        }
        setRepayBusy(true);
        try {
            await API.post(`/loan/${id}/repay`, { amount });
            setRepayAmount("");
            setShowPayback(false);
            load();
        } catch (err) {
            setRepayError(err.response?.data?.error || "Failed to record repayment");
        } finally {
            setRepayBusy(false);
        }
    };

    const handleProposeLendMore = async (e) => {
        e.preventDefault();
        setLendError("");
        const amount = parseFloat(lendAmount);
        if (!amount || amount <= 0) {
            setLendError("Enter a valid amount");
            return;
        }
        setLendBusy(true);
        try {
            await API.post(`/loan/${id}/lend-more`, { amount });
            setLendAmount("");
            setShowLendMore(false);
            load();
        } catch (err) {
            setLendError(err.response?.data?.error || "Failed to send offer");
        } finally {
            setLendBusy(false);
        }
    };

    const handleAdditionResponse = async (transactionId, response) => {
        setAdditionError("");
        setAdditionBusyId(transactionId);
        try {
            await API.post(`/loan/addition/${transactionId}/respond`, { response });
            load();
        } catch (err) {
            setAdditionError(err.response?.data?.error || `Failed to ${response} offer`);
        } finally {
            setAdditionBusyId(null);
        }
    };

    const handleCancelAddition = async (transactionId) => {
        if (!(await confirm("Cancel this lend-more offer?"))) return;
        setAdditionError("");
        setAdditionBusyId(transactionId);
        try {
            await API.post(`/loan/addition/${transactionId}/cancel`);
            load();
        } catch (err) {
            setAdditionError(err.response?.data?.error || "Failed to cancel offer");
        } finally {
            setAdditionBusyId(null);
        }
    };

    const handleRepaymentResponse = async (transactionId, response) => {
        setRepaymentRespondError("");
        setRepaymentBusyId(transactionId);
        try {
            await API.post(`/loan/repayment/${transactionId}/respond`, { response });
            load();
        } catch (err) {
            setRepaymentRespondError(err.response?.data?.error || `Failed to ${response} repayment`);
        } finally {
            setRepaymentBusyId(null);
        }
    };

    const handleCancelRepayment = async (transactionId) => {
        if (!(await confirm("Cancel this repayment?"))) return;
        setRepaymentRespondError("");
        setRepaymentBusyId(transactionId);
        try {
            await API.post(`/loan/repayment/${transactionId}/cancel`);
            load();
        } catch (err) {
            setRepaymentRespondError(err.response?.data?.error || "Failed to cancel repayment");
        } finally {
            setRepaymentBusyId(null);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>Loan #{loan.loan_id}</h1>
                    <p className="page-subtitle">
                        {isLender ? "You are lending to the borrower" : "You owe the lender"} — {loan.annual_interest_rate}% per year
                    </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={statusClass(loan.status)}>{loan.status}</span>
                    <Link className="btn" to="/loans">Back</Link>
                </div>
            </div>

            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-value">₹{loan.principal}</div>
                    <div className="stat-label">Original principal</div>
                </div>
                {loan.total_disbursed !== loan.principal && (
                    <div className="stat-card">
                        <div className="stat-value">₹{loan.total_disbursed}</div>
                        <div className="stat-label">Total lent so far</div>
                    </div>
                )}
                <div className="stat-card">
                    <div className="stat-value">₹{loan.outstanding_principal}</div>
                    <div className="stat-label">Outstanding principal</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">₹{loan.accrued_interest}</div>
                    <div className="stat-label">Accrued interest</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">₹{loan.total_owed}</div>
                    <div className="stat-label">Total owed right now</div>
                </div>
            </div>

            {actionError && <p className="error-text">{actionError}</p>}

            {canEdit && (
                <div className="card">
                    <div className="section-title" style={{ marginTop: 0 }}>Proposal Actions</div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {loan.status === 'created' && (
                            <button className="btn btn-primary" onClick={handleSend} disabled={sendBusy}>Send Proposal</button>
                        )}
                        <button className="btn btn-danger" onClick={handleCancel} disabled={cancelBusy}>Cancel Loan</button>
                    </div>
                </div>
            )}

            {isCounterparty && loan.status === 'pending' && (
                <div className="card">
                    <div className="section-title" style={{ marginTop: 0 }}>Respond To Proposal</div>
                    <p className="muted">
                        {loan.lender_id === user.user_id
                            ? "You've been asked to lend this amount."
                            : "You've been asked to borrow this amount."}
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-primary" onClick={() => handleRespond('accept')} disabled={respondBusy}>Accept</button>
                        <button className="btn btn-danger" onClick={() => handleRespond('reject')} disabled={respondBusy}>Reject</button>
                    </div>
                </div>
            )}

            {isBorrower && loan.status === 'active' && (
                <div className="card">
                    <div className="card-row" style={{ marginBottom: showPayback ? 12 : 0 }}>
                        <div className="section-title" style={{ margin: 0 }}>Payback</div>
                        <button className="btn btn-sm btn-primary" onClick={() => setShowPayback((v) => !v)}>
                            {showPayback ? "Cancel" : "Payback"}
                        </button>
                    </div>
                    {showPayback && (
                        <>
                            <p className="muted" style={{ marginTop: 0 }}>
                                The lender needs to confirm this before it's applied to the loan.
                            </p>
                            <form onSubmit={handleRepay} className="form-inline">
                                <div className="form-group" style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
                                    <input
                                        className="input"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        placeholder={`Amount (owed: ₹${loan.total_owed})`}
                                        value={repayAmount}
                                        onChange={(e) => setRepayAmount(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={repayBusy}>Submit Payment</button>
                            </form>
                        </>
                    )}
                    {repayError && <p className="error-text">{repayError}</p>}
                </div>
            )}

            {isLender && loan.status === 'active' && (
                <div className="card">
                    <div className="card-row" style={{ marginBottom: showLendMore ? 12 : 0 }}>
                        <div className="section-title" style={{ margin: 0 }}>Lend More</div>
                        <button className="btn btn-sm" onClick={() => setShowLendMore((v) => !v)}>
                            {showLendMore ? "Cancel" : "Lend More"}
                        </button>
                    </div>
                    {showLendMore && (
                        <>
                            <p className="muted" style={{ marginTop: 0 }}>
                                The borrower needs to accept this offer before it's added to the loan.
                            </p>
                            <form onSubmit={handleProposeLendMore} className="form-inline">
                                <div className="form-group" style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
                                    <input
                                        className="input"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        placeholder="Amount"
                                        value={lendAmount}
                                        onChange={(e) => setLendAmount(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={lendBusy}>Send Offer</button>
                            </form>
                        </>
                    )}
                    {lendError && <p className="error-text">{lendError}</p>}
                </div>
            )}

            {loan.pending_additions.length > 0 && (
                <div className="card">
                    <div className="section-title" style={{ marginTop: 0 }}>Pending Lend-More Offers</div>
                    <ul className="list">
                        {loan.pending_additions.map((p) => (
                            <li key={p.transaction_id} className="card">
                                <div className="card-row">
                                    <div>
                                        <strong>₹{p.amount}</strong>
                                        <div className="muted">at {p.annual_interest_rate}% per year — awaiting response</div>
                                    </div>
                                    {isBorrower ? (
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button
                                                className="btn btn-sm btn-primary"
                                                disabled={additionBusyId === p.transaction_id}
                                                onClick={() => handleAdditionResponse(p.transaction_id, 'accept')}
                                            >
                                                Accept
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                disabled={additionBusyId === p.transaction_id}
                                                onClick={() => handleAdditionResponse(p.transaction_id, 'reject')}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    ) : isLender ? (
                                        <button
                                            className="btn btn-sm"
                                            disabled={additionBusyId === p.transaction_id}
                                            onClick={() => handleCancelAddition(p.transaction_id)}
                                        >
                                            Cancel Offer
                                        </button>
                                    ) : null}
                                </div>
                            </li>
                        ))}
                    </ul>
                    {additionError && <p className="error-text">{additionError}</p>}
                </div>
            )}

            {loan.pending_repayments.length > 0 && (
                <div className="card">
                    <div className="section-title" style={{ marginTop: 0 }}>Pending Repayment Confirmations</div>
                    <ul className="list">
                        {loan.pending_repayments.map((p) => (
                            <li key={p.transaction_id} className="card">
                                <div className="card-row">
                                    <div>
                                        <strong>₹{p.amount}</strong>
                                        <div className="muted">awaiting confirmation</div>
                                    </div>
                                    {user.user_id === p.counterparty_id ? (
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button
                                                className="btn btn-sm btn-primary"
                                                disabled={repaymentBusyId === p.transaction_id}
                                                onClick={() => handleRepaymentResponse(p.transaction_id, 'accept')}
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                disabled={repaymentBusyId === p.transaction_id}
                                                onClick={() => handleRepaymentResponse(p.transaction_id, 'reject')}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    ) : user.user_id === p.initiator_id ? (
                                        <button
                                            className="btn btn-sm"
                                            disabled={repaymentBusyId === p.transaction_id}
                                            onClick={() => handleCancelRepayment(p.transaction_id)}
                                        >
                                            Cancel
                                        </button>
                                    ) : null}
                                </div>
                            </li>
                        ))}
                    </ul>
                    {repaymentRespondError && <p className="error-text">{repaymentRespondError}</p>}
                </div>
            )}

            <div className="section-title">Transaction History</div>
            {loan.transactions.length === 0 ? (
                <div className="empty-state"><IconInbox /><p>No transactions recorded yet.</p></div>
            ) : (
                <ul className="list">
                    {loan.transactions.map((t) => (
                        <li key={t.transaction_id} className="card">
                            <div className="card-row">
                                <span className={`badge ${t.type === 'disbursement' ? 'badge-active' : 'badge-completed'}`}>
                                    {t.type === 'disbursement' ? 'Lent' : 'Repaid'}
                                </span>
                                <div style={{ textAlign: "right" }}>
                                    <strong>₹{t.amount}</strong>
                                    <div className="muted" style={{ fontSize: 12 }}>{new Date(t.date).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LoanDetail;
