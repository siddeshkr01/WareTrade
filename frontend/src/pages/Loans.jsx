import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import { IconInbox, IconSearch } from "../components/Icons";

const Loans = () => {
    const navigate = useNavigate();

    const [tab, setTab] = useState("lending");
    const [summary, setSummary] = useState({ lending: [], borrowing: [] });
    const [listError, setListError] = useState("");
    const [listLoading, setListLoading] = useState(true);

    const [identifier, setIdentifier] = useState("");
    const [foundUser, setFoundUser] = useState(null);
    const [lookupError, setLookupError] = useState("");
    const [direction, setDirection] = useState("lend");
    const [principal, setPrincipal] = useState("");
    const [rate, setRate] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    const loadSummary = () => {
        setListError("");
        setListLoading(true);
        API.get("/loan/summary")
            .then((res) => setSummary(res.data))
            .catch((err) => setListError(err.response?.data?.error || "Failed to load loans"))
            .finally(() => setListLoading(false));
    };

    useEffect(loadSummary, []);

    const lookupUser = async (e) => {
        e.preventDefault();
        setLookupError("");
        setFoundUser(null);
        try {
            const res = await API.get("/user/lookup", { params: { identifier } });
            setFoundUser(res.data);
        } catch (err) {
            setLookupError(err.response?.data?.error || "User not found");
        }
    };

    const createLoan = async () => {
        if (!foundUser) return;
        setCreateError("");
        if (!principal || parseFloat(principal) <= 0) {
            setCreateError("Enter a valid principal amount");
            return;
        }
        setCreating(true);
        try {
            const res = await API.post("/loan", {
                counterparty_id: foundUser.user_id,
                direction,
                principal: parseFloat(principal),
                annual_interest_rate: parseFloat(rate || 0)
            });
            navigate(`/loans/${res.data.loan_id}`);
        } catch (err) {
            setCreateError(err.response?.data?.error || "Failed to create loan");
        } finally {
            setCreating(false);
        }
    };

    const list = tab === "lending" ? summary.lending : summary.borrowing;

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>Loans</h1>
                    <p className="page-subtitle">Lend to or borrow from other traders, with interest tracked automatically.</p>
                </div>
            </div>

            <div className="card">
                <div className="section-title" style={{ marginTop: 0 }}>Propose a Loan</div>
                <form onSubmit={lookupUser} className="form-inline">
                    <div className="form-group" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
                        <input
                            className="input"
                            placeholder="Counterparty username or phone number"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn">
                        <IconSearch width={14} height={14} />
                        Find
                    </button>
                </form>
                {lookupError && <p className="error-text">{lookupError}</p>}

                {foundUser && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
                        <p style={{ margin: "0 0 10px" }}>With <strong>{foundUser.display_name || foundUser.user_name}</strong></p>
                        <div className="form-inline">
                            <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                                <label htmlFor="direction">Direction</label>
                                <select id="direction" className="input" value={direction} onChange={(e) => setDirection(e.target.value)}>
                                    <option value="lend">I'm lending</option>
                                    <option value="borrow">I'm borrowing</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                                <label htmlFor="principal">Principal</label>
                                <input
                                    id="principal"
                                    className="input"
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={principal}
                                    onChange={(e) => setPrincipal(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                                <label htmlFor="rate">Annual interest %</label>
                                <input
                                    id="rate"
                                    className="input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0 for interest-free"
                                    value={rate}
                                    onChange={(e) => setRate(e.target.value)}
                                />
                            </div>
                        </div>
                        <button className="btn btn-primary" onClick={createLoan} disabled={creating}>
                            Propose Loan
                        </button>
                        {createError && <p className="error-text">{createError}</p>}
                    </div>
                )}
            </div>

            <div className="tabs">
                <button className={`tab ${tab === "lending" ? "active" : ""}`} onClick={() => setTab("lending")}>
                    Lending
                </button>
                <button className={`tab ${tab === "borrowing" ? "active" : ""}`} onClick={() => setTab("borrowing")}>
                    Borrowing
                </button>
            </div>

            {listLoading && <div className="loading-state"><span className="spinner" /> Loading loans...</div>}
            {listError && <p className="error-text">{listError}</p>}

            {!listLoading && (
                list.length === 0 ? (
                    <div className="empty-state">
                        <IconInbox />
                        <p>{tab === "lending" ? "You haven't lent to anyone yet." : "You haven't borrowed from anyone yet."}</p>
                    </div>
                ) : (
                    <ul className="list">
                        {list.map((e) => (
                            <li key={e.counterparty_id}>
                                <Link to={`/loans/with/${e.counterparty_id}`} style={{ textDecoration: "none" }}>
                                    <div className="card clickable">
                                        <div className="card-row">
                                            <div>
                                                <strong>{e.counterparty_name}</strong>
                                                <div className="muted">
                                                    {e.loan_count} loan{e.loan_count === 1 ? "" : "s"}
                                                    {e.pending_count > 0 && ` — ${e.pending_count} awaiting response`}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <div><strong>₹{e.total_owed}</strong> total</div>
                                                <div className="muted" style={{ fontSize: 12 }}>
                                                    ₹{e.outstanding_principal} remaining principal + ₹{e.accrued_interest} interest
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )
            )}
        </div>
    );
};

export default Loans;
