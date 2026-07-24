import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import { IconInbox, IconSearch } from "../components/Icons";

const statusClass = (status) => `badge badge-${status}`;

const Trades = () => {
    const navigate = useNavigate();

    const [initiated, setInitiated] = useState([]);
    const [received, setReceived] = useState([]);
    const [listError, setListError] = useState("");
    const [listLoading, setListLoading] = useState(true);

    const [identifier, setIdentifier] = useState("");
    const [foundUser, setFoundUser] = useState(null);
    const [lookupError, setLookupError] = useState("");
    const [tradeType, setTradeType] = useState("sell");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    const loadTrades = () => {
        setListError("");
        setListLoading(true);
        Promise.all([API.get("/trade/initiated"), API.get("/trade/received")])
            .then(([i, r]) => {
                setInitiated(i.data);
                setReceived(r.data);
            })
            .catch((err) => setListError(err.response?.data?.error || "Failed to load trades"))
            .finally(() => setListLoading(false));
    };

    // Background refresh: same fetch, but stays quiet on transient errors
    // instead of surfacing them over live data every poll tick.
    const pollTrades = () => {
        Promise.all([API.get("/trade/initiated"), API.get("/trade/received")])
            .then(([i, r]) => {
                setInitiated(i.data);
                setReceived(r.data);
            })
            .catch(() => {});
    };

    useEffect(loadTrades, []);

    useEffect(() => {
        const interval = setInterval(pollTrades, 5000);
        return () => clearInterval(interval);
    }, []);

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

    const createTrade = async () => {
        if (!foundUser) return;
        setCreating(true);
        setCreateError("");
        try {
            const res = await API.post("/trade", {
                counterparty_id: foundUser.user_id,
                trade_type: tradeType
            });
            navigate(`/trades/${res.data.trade_id}`);
        } catch (err) {
            setCreateError(err.response?.data?.error || "Failed to create trade");
        } finally {
            setCreating(false);
        }
    };

    const TradeList = ({ trades, emptyText }) => (
        trades.length === 0 ? (
            <div className="empty-state"><IconInbox /><p>{emptyText}</p></div>
        ) : (
            <ul className="list">
                {trades.map((t) => (
                    <li key={t.trade_id}>
                        <Link to={`/trades/${t.trade_id}`} style={{ textDecoration: "none" }}>
                            <div className="card clickable">
                                <div className="card-row">
                                    <span style={{ textTransform: "capitalize" }}>Trade #{t.trade_id} — {t.trade_type}</span>
                                    <span className={statusClass(t.status)}>{t.status}</span>
                                </div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        )
    );

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>Trades</h1>
                    <p className="page-subtitle">Buy from or sell to other traders on the platform.</p>
                </div>
            </div>

            <div className="card">
                <div className="section-title" style={{ marginTop: 0 }}>Start a New Trade</div>
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
                        <p style={{ margin: "0 0 10px" }}>Trading with <strong>{foundUser.display_name || foundUser.user_name}</strong></p>
                        <div className="form-inline">
                            <select className="input" style={{ width: 150 }} value={tradeType} onChange={(e) => setTradeType(e.target.value)}>
                                <option value="sell">I'm selling</option>
                                <option value="buy">I'm buying</option>
                            </select>
                            <button className="btn btn-primary" onClick={createTrade} disabled={creating}>
                                Create Trade
                            </button>
                        </div>
                        {createError && <p className="error-text">{createError}</p>}
                    </div>
                )}
            </div>

            {listLoading && <div className="loading-state"><span className="spinner" /> Loading trades...</div>}
            {listError && <p className="error-text">{listError}</p>}

            {!listLoading && (
                <>
                    <div className="section-title">Trades I Started</div>
                    <TradeList trades={initiated} emptyText="You haven't started any trades yet." />

                    <div className="section-title">Trades Sent To Me</div>
                    <TradeList trades={received} emptyText="No one has sent you a trade yet." />
                </>
            )}
        </div>
    );
};

export default Trades;
