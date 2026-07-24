import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import { AuthContext } from "../context/authContextValue";
import { IconInbox, IconTrade, IconLoan, IconRental } from "../components/Icons";
import UserContact from "../components/UserContact";

const statusClass = (status) => `badge badge-${status}`;
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const typeIcon = {
    trade: IconTrade,
    loan: IconLoan,
    rental: IconRental
};

const typeLabel = {
    trade: "Trade",
    loan: "Loan",
    rental: "Rental"
};

const Transactions = () => {
    const { user } = useContext(AuthContext);

    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all");

    const loadTransactions = () => {
        setLoading(true);
        setError("");

        Promise.all([
            API.get("/trade/initiated"),
            API.get("/trade/received"),
            API.get("/loan/initiated"),
            API.get("/loan/received"),
            API.get("/godown/rent/history")
        ])
            .then(([tradesInitiated, tradesReceived, loansInitiated, loansReceived, rentals]) => {
                const merged = [
                    ...tradesInitiated.data.map(t => ({
                        type: "trade",
                        id: t.trade_id,
                        date: t.created_at,
                        status: t.status,
                        counterpartyId: t.counterparty_id,
                        counterpartyName: t.counterparty_name,
                        description: `${t.trade_type} trade`,
                        link: `/trades/${t.trade_id}`
                    })),
                    ...tradesReceived.data.map(t => ({
                        type: "trade",
                        id: t.trade_id,
                        date: t.created_at,
                        status: t.status,
                        counterpartyId: t.initiator_id,
                        counterpartyName: t.initiator_name,
                        description: `${t.trade_type} trade`,
                        link: `/trades/${t.trade_id}`
                    })),
                    ...loansInitiated.data.map(l => ({
                        type: "loan",
                        id: l.loan_id,
                        date: l.created_at,
                        status: l.status,
                        counterpartyId: l.counterparty_id,
                        counterpartyName: l.counterparty_name,
                        description: `${l.lender_id === user.user_id ? "lending" : "borrowing"} ₹${l.principal} @ ${l.annual_interest_rate}%`,
                        link: `/loans/${l.loan_id}`
                    })),
                    ...loansReceived.data.map(l => ({
                        type: "loan",
                        id: l.loan_id,
                        date: l.created_at,
                        status: l.status,
                        counterpartyId: l.counterparty_id,
                        counterpartyName: l.counterparty_name,
                        description: `${l.lender_id === user.user_id ? "lending" : "borrowing"} ₹${l.principal} @ ${l.annual_interest_rate}%`,
                        link: `/loans/${l.loan_id}`
                    })),
                    ...rentals.data.map(r => ({
                        type: "rental",
                        id: r.rental_id,
                        date: r.start_date,
                        status: r.status,
                        counterpartyId: r.counterparty_id,
                        counterpartyName: r.counterparty_name,
                        description: `${r.role === "tenant" ? "renting" : "rented out"} ${r.godown_name} — ₹${r.rent_cost}`,
                        link: `/godowns/${r.godown_id}`
                    }))
                ];

                merged.sort((a, b) => new Date(b.date) - new Date(a.date));
                setEntries(merged);
            })
            .catch((err) => setError(err.response?.data?.error || "Failed to load transactions"))
            .finally(() => setLoading(false));
    };

    /* loadTransactions sets loading/error synchronously before its async fetch,
       same pattern already used safely elsewhere (Godowns.jsx, Rentals.jsx). */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(loadTransactions, [user]);

    const visible = filter === "all" ? entries : entries.filter(e => e.type === filter);

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>Transactions</h1>
                    <p className="page-subtitle">Every trade, rental, and loan you've been part of, most recent first.</p>
                </div>
            </div>

            <div className="tabs">
                <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
                <button className={`tab ${filter === 'trade' ? 'active' : ''}`} onClick={() => setFilter('trade')}>Trades</button>
                <button className={`tab ${filter === 'rental' ? 'active' : ''}`} onClick={() => setFilter('rental')}>Rentals</button>
                <button className={`tab ${filter === 'loan' ? 'active' : ''}`} onClick={() => setFilter('loan')}>Loans</button>
            </div>

            {loading && <div className="loading-state"><span className="spinner" /> Loading transactions...</div>}
            {error && <p className="error-text">{error}</p>}

            {!loading && !error && visible.length === 0 && (
                <div className="empty-state"><IconInbox /><p>No transactions yet.</p></div>
            )}

            {!loading && !error && visible.length > 0 && (
                <ul className="list">
                    {visible.map((e) => {
                        const Icon = typeIcon[e.type];
                        return (
                            <li key={`${e.type}-${e.id}`} className="card">
                                <div className="card-row">
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                        <Icon width={18} height={18} style={{ marginTop: 3, color: "var(--color-text-secondary)", flexShrink: 0 }} />
                                        <div>
                                            <Link to={e.link} style={{ textDecoration: "none" }}>
                                                <strong style={{ textTransform: "capitalize" }}>{typeLabel[e.type]} #{e.id}</strong>
                                            </Link>
                                            <div className="muted">
                                                {capitalize(e.description)} — with <UserContact userId={e.counterpartyId} name={e.counterpartyName} />
                                            </div>
                                            <div className="muted">{new Date(e.date).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <span className={statusClass(e.status)}>{e.status}</span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default Transactions;
