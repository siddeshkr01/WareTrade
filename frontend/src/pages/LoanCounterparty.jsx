import { useCallback, useContext, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api/axios";
import { AuthContext } from "../context/authContextValue";
import { ConfirmContext } from "../context/confirmContextValue";
import { IconInbox } from "../components/Icons";
import { markNotificationsReadByLink } from "../utils/notifications";

const statusClass = (status) => `badge badge-${status}`;
const PENDING_STATUSES = ["created", "pending"];

const LoanCounterparty = () => {
    const { counterpartyId } = useParams();
    const { user } = useContext(AuthContext);
    const confirm = useContext(ConfirmContext);

    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const [showPayback, setShowPayback] = useState(false);
    const [repayAmount, setRepayAmount] = useState("");
    const [repayBusy, setRepayBusy] = useState(false);
    const [repayError, setRepayError] = useState("");

    const [showLendMore, setShowLendMore] = useState(false);
    const [lendAmount, setLendAmount] = useState("");
    const [lendBusy, setLendBusy] = useState(false);
    const [lendError, setLendError] = useState("");

    const [confirmBusyId, setConfirmBusyId] = useState(null);
    const [confirmError, setConfirmError] = useState("");

    const load = useCallback(() => {
        setLoading(true);
        setError("");
        API.get(`/loan/with/${counterpartyId}`)
            .then((res) => {
                setData(res.data);
                markNotificationsReadByLink(res.data.loans.map((l) => `/loans/${l.loan_id}`));
            })
            .catch((err) => setError(err.response?.data?.error || "Failed to load loans"))
            .finally(() => setLoading(false));
    }, [counterpartyId]);

    useEffect(load, [load]);

    if (loading) return <div className="page"><div className="loading-state"><span className="spinner" /> Loading...</div></div>;
    if (error) return <div className="page"><p className="error-text">{error}</p></div>;
    if (!data) return null;

    const allTransactions = data.loans
        .flatMap((l) => l.transactions.map((t) => ({ ...t, loan_id: l.loan_id, role: l.role })))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const pendingLoans = data.loans.filter((l) => PENDING_STATUSES.includes(l.status));

    const pendingConfirmations = data.loans.flatMap((l) => [
        ...l.pending_additions.map((p) => ({ ...p, loan_id: l.loan_id, kind: "addition" })),
        ...l.pending_repayments.map((p) => ({ ...p, loan_id: l.loan_id, kind: "repayment" }))
    ]);

    const theyOweYou = data.loans
        .filter((l) => l.role === "lender")
        .reduce((sum, l) => sum + l.total_owed, 0);
    const youOweThem = data.loans
        .filter((l) => l.role === "borrower")
        .reduce((sum, l) => sum + l.total_owed, 0);

    const activeLendingLoan = data.loans.find((l) => l.role === "lender" && l.status === "active");
    const activeBorrowingLoan = data.loans.find((l) => l.role === "borrower" && l.status === "active");

    const handleLendMore = async (e) => {
        e.preventDefault();
        if (!activeLendingLoan) return;
        setLendError("");
        const amount = parseFloat(lendAmount);
        if (!amount || amount <= 0) {
            setLendError("Enter a valid amount");
            return;
        }
        setLendBusy(true);
        try {
            await API.post(`/loan/${activeLendingLoan.loan_id}/lend-more`, { amount });
            setLendAmount("");
            setShowLendMore(false);
            load();
        } catch (err) {
            setLendError(err.response?.data?.error || "Failed to send offer");
        } finally {
            setLendBusy(false);
        }
    };

    const handleRepay = async (e) => {
        e.preventDefault();
        if (!activeBorrowingLoan) return;
        setRepayError("");
        const amount = parseFloat(repayAmount);
        if (!amount || amount <= 0) {
            setRepayError("Enter a valid amount");
            return;
        }
        setRepayBusy(true);
        try {
            await API.post(`/loan/${activeBorrowingLoan.loan_id}/repay`, { amount });
            setRepayAmount("");
            setShowPayback(false);
            load();
        } catch (err) {
            setRepayError(err.response?.data?.error || "Failed to record repayment");
        } finally {
            setRepayBusy(false);
        }
    };

    const respondPath = (kind, transactionId) =>
        kind === "addition" ? `/loan/addition/${transactionId}/respond` : `/loan/repayment/${transactionId}/respond`;
    const cancelPath = (kind, transactionId) =>
        kind === "addition" ? `/loan/addition/${transactionId}/cancel` : `/loan/repayment/${transactionId}/cancel`;

    const handleConfirmationResponse = async (item, response) => {
        setConfirmError("");
        setConfirmBusyId(item.transaction_id);
        try {
            await API.post(respondPath(item.kind, item.transaction_id), { response });
            load();
        } catch (err) {
            setConfirmError(err.response?.data?.error || `Failed to ${response}`);
        } finally {
            setConfirmBusyId(null);
        }
    };

    const handleCancelConfirmation = async (item) => {
        if (!(await confirm(item.kind === "addition" ? "Cancel this lend-more offer?" : "Cancel this repayment?"))) return;
        setConfirmError("");
        setConfirmBusyId(item.transaction_id);
        try {
            await API.post(cancelPath(item.kind, item.transaction_id));
            load();
        } catch (err) {
            setConfirmError(err.response?.data?.error || "Failed to cancel");
        } finally {
            setConfirmBusyId(null);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>{data.counterparty_name}</h1>
                    <p className="page-subtitle">
                        {data.loans.length} loan{data.loans.length === 1 ? "" : "s"} between you
                    </p>
                </div>
                <Link className="btn" to="/loans">Back</Link>
            </div>

            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-value">₹{theyOweYou.toFixed(2)}</div>
                    <div className="stat-label">They owe you</div>
                    {activeLendingLoan && (
                        <button
                            className="btn btn-sm"
                            style={{ marginTop: 10 }}
                            onClick={() => setShowLendMore((v) => !v)}
                        >
                            {showLendMore ? "Cancel" : "Lend More"}
                        </button>
                    )}
                </div>
                <div className="stat-card">
                    <div className="stat-value">₹{youOweThem.toFixed(2)}</div>
                    <div className="stat-label">You owe them</div>
                    {activeBorrowingLoan && (
                        <button
                            className="btn btn-sm btn-primary"
                            style={{ marginTop: 10 }}
                            onClick={() => setShowPayback((v) => !v)}
                        >
                            {showPayback ? "Cancel" : "Payback"}
                        </button>
                    )}
                </div>
            </div>

            {showLendMore && activeLendingLoan && (
                <div className="card">
                    <p className="muted" style={{ marginTop: 0 }}>
                        They'll need to accept this before it's added to loan #{activeLendingLoan.loan_id}.
                    </p>
                    <form onSubmit={handleLendMore} className="form-inline">
                        <div className="form-group" style={{ flex: 1, minWidth: 120, marginBottom: 0 }}>
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
                    {lendError && <p className="error-text">{lendError}</p>}
                </div>
            )}

            {showPayback && activeBorrowingLoan && (
                <div className="card">
                    <p className="muted" style={{ marginTop: 0 }}>
                        They'll need to confirm this before it's applied to loan #{activeBorrowingLoan.loan_id}.
                    </p>
                    <form onSubmit={handleRepay} className="form-inline">
                        <div className="form-group" style={{ flex: 1, minWidth: 120, marginBottom: 0 }}>
                            <input
                                className="input"
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder={`Amount (owed: ₹${activeBorrowingLoan.total_owed})`}
                                value={repayAmount}
                                onChange={(e) => setRepayAmount(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={repayBusy}>Submit Payment</button>
                    </form>
                    {repayError && <p className="error-text">{repayError}</p>}
                </div>
            )}

            {pendingLoans.length > 0 && (
                <>
                    <div className="section-title" style={{ marginTop: 0 }}>Pending Proposals</div>
                    <ul className="list">
                        {pendingLoans.map((l) => (
                            <li key={l.loan_id}>
                                <Link to={`/loans/${l.loan_id}`} style={{ textDecoration: "none" }}>
                                    <div className="card clickable">
                                        <div className="card-row">
                                            <span>
                                                Loan #{l.loan_id} — {l.role === "lender" ? "lending" : "borrowing"} ₹{l.principal} @ {l.annual_interest_rate}%
                                            </span>
                                            <span className={statusClass(l.status)}>{l.status}</span>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {pendingConfirmations.length > 0 && (
                <>
                    <div className="section-title" style={{ marginTop: pendingLoans.length > 0 ? undefined : 0 }}>Pending Confirmations</div>
                    <ul className="list">
                        {pendingConfirmations.map((p) => (
                            <li key={p.transaction_id} className="card">
                                <div className="card-row">
                                    <div>
                                        <strong>₹{p.amount}</strong>
                                        <div className="muted">
                                            {p.kind === "addition" ? "lend more" : "payback"} on loan #{p.loan_id} — awaiting confirmation
                                        </div>
                                    </div>
                                    {user.user_id === p.counterparty_id ? (
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button
                                                className="btn btn-sm btn-primary"
                                                disabled={confirmBusyId === p.transaction_id}
                                                onClick={() => handleConfirmationResponse(p, "accept")}
                                            >
                                                {p.kind === "addition" ? "Accept" : "Confirm"}
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                disabled={confirmBusyId === p.transaction_id}
                                                onClick={() => handleConfirmationResponse(p, "reject")}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    ) : user.user_id === p.initiator_id ? (
                                        <button
                                            className="btn btn-sm"
                                            disabled={confirmBusyId === p.transaction_id}
                                            onClick={() => handleCancelConfirmation(p)}
                                        >
                                            Cancel
                                        </button>
                                    ) : null}
                                </div>
                            </li>
                        ))}
                    </ul>
                    {confirmError && <p className="error-text">{confirmError}</p>}
                </>
            )}

            <div className="section-title" style={{ marginTop: (pendingLoans.length > 0 || pendingConfirmations.length > 0) ? undefined : 0 }}>All Transactions</div>
            {allTransactions.length === 0 ? (
                <div className="empty-state"><IconInbox /><p>No transactions yet.</p></div>
            ) : (
                <ul className="list">
                    {allTransactions.map((t) => (
                        <li key={t.transaction_id} className="card">
                            <div className="card-row">
                                <div>
                                    <span className={`badge ${t.type === "disbursement" ? "badge-active" : "badge-completed"}`}>
                                        {t.type === "disbursement"
                                            ? (t.role === "lender" ? "You lent" : "They lent")
                                            : (t.role === "lender" ? "They repaid" : "You repaid")}
                                    </span>
                                    <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                                        Loan #{t.loan_id} — {new Date(t.date).toLocaleDateString()} — {t.annual_interest_rate}% per year
                                    </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <strong>₹{t.amount}</strong>
                                    <div className="muted" style={{ fontSize: 12 }}>+₹{t.interest_to_date} interest</div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LoanCounterparty;
