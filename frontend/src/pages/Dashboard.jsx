import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import { AuthContext } from "../context/authContextValue";
import { IconGodown, IconProduct, IconTrade, IconRental, IconInbox } from "../components/Icons";
import HorizontalBarChart from "../components/charts/HorizontalBarChart";

// Reserved status palette (never themed) — good/warning/critical/muted —
// paired with a visible text label on every bar, per the dataviz status-color
// rule ("never color alone"). 'closed' gets the sequential blue since it's a
// distinct "completed successfully" outcome, not just "currently good".
const STATUS_COLORS = {
    created: "#898781",
    pending: "#fab219",
    accepted: "#0ca30c",
    active: "#0ca30c",
    closed: "#2a78d6",
    rejected: "#d03b3b",
    cancelled: "#898781",
    countered: "#898781"
};

const STOCK_COLOR = "#2a78d6";

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const countByStatus = (items) => {
    const counts = {};
    for (const item of items) counts[item.status] = (counts[item.status] || 0) + 1;
    return Object.entries(counts)
        .map(([status, value]) => ({ key: status, label: capitalize(status), value, color: STATUS_COLORS[status] || "#898781" }))
        .sort((a, b) => b.value - a.value);
};

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    const [godowns, setGodowns] = useState([]);
    const [stats, setStats] = useState({ godowns: 0, products: 0, pendingTrades: 0, rentalRequests: 0 });
    const [productStock, setProductStock] = useState([]);
    const [tradeStatusCounts, setTradeStatusCounts] = useState([]);
    const [loanStatusCounts, setLoanStatusCounts] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            API.get("/godown/my-godowns"),
            API.get("/product/my-products"),
            API.get("/trade/initiated"),
            API.get("/trade/received"),
            API.get("/godown/rent/requests"),
            API.get("/loan/initiated"),
            API.get("/loan/received")
        ])
            .then(([godownsRes, productsRes, initiatedRes, receivedRes, requestsRes, loanInitiatedRes, loanReceivedRes]) => {
                setGodowns(godownsRes.data);

                const allTrades = [...initiatedRes.data, ...receivedRes.data];
                const pendingTrades = allTrades.filter(t => t.status === 'pending').length;
                setStats({
                    godowns: godownsRes.data.length,
                    products: productsRes.data.length,
                    pendingTrades,
                    rentalRequests: requestsRes.data.length
                });

                setProductStock(
                    [...productsRes.data]
                        .sort((a, b) => b.total_quantity - a.total_quantity)
                        .slice(0, 6)
                        .map(p => ({ key: p.product_id, label: p.product_name, value: p.total_quantity, color: STOCK_COLOR }))
                );
                setTradeStatusCounts(countByStatus(allTrades));
                setLoanStatusCounts(countByStatus([...loanInitiatedRes.data, ...loanReceivedRes.data]));
            })
            .catch((err) => setError(err.response?.data?.error || "Failed to load dashboard"))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>Welcome back, {user?.display_name || user?.user_name}</h1>
                    <p className="page-subtitle">Here's what's happening across your godowns.</p>
                </div>
            </div>

            {loading && <div className="loading-state"><span className="spinner" /> Loading dashboard...</div>}
            {error && <p className="error-text">{error}</p>}

            {!loading && !error && (
                <>
                    <div className="stat-grid">
                        <div className="stat-card">
                            <IconGodown />
                            <div className="stat-value">{stats.godowns}</div>
                            <div className="stat-label">Godowns in use</div>
                        </div>
                        <div className="stat-card">
                            <IconProduct />
                            <div className="stat-value">{stats.products}</div>
                            <div className="stat-label">Products stored</div>
                        </div>
                        <div className="stat-card">
                            <IconTrade />
                            <div className="stat-value">{stats.pendingTrades}</div>
                            <div className="stat-label">Trades awaiting response</div>
                        </div>
                        <div className="stat-card">
                            <IconRental />
                            <div className="stat-value">{stats.rentalRequests}</div>
                            <div className="stat-label">Incoming rental requests</div>
                        </div>
                    </div>

                    <div className="chart-cards">
                        <div className="card">
                            <div className="section-title" style={{ marginTop: 0 }}>Stock By Product</div>
                            <HorizontalBarChart data={productStock} emptyText="No stock recorded yet." />
                        </div>
                        <div className="card">
                            <div className="section-title" style={{ marginTop: 0 }}>Trades By Status</div>
                            <HorizontalBarChart data={tradeStatusCounts} emptyText="No trades yet." />
                        </div>
                        <div className="card">
                            <div className="section-title" style={{ marginTop: 0 }}>Loans By Status</div>
                            <HorizontalBarChart data={loanStatusCounts} emptyText="No loans yet." />
                        </div>
                    </div>

                    <div className="section-title" style={{ marginTop: 0 }}>My Godowns</div>

                    {godowns.length === 0 ? (
                        <div className="empty-state">
                            <IconInbox />
                            <p>You don't have any godowns yet.</p>
                            <Link className="btn btn-primary" to="/godowns">Create your first godown</Link>
                        </div>
                    ) : (
                        <ul className="list">
                            {godowns.map((g) => (
                                <li key={g.godown_id}>
                                    <Link to={`/godowns/${g.godown_id}`} style={{ textDecoration: "none" }}>
                                        <div className="card clickable">
                                            <div className="card-row">
                                                <div>
                                                    <strong>{g.godown_name}</strong>
                                                    <div className="muted">{g.location} — capacity {g.capacity}</div>
                                                </div>
                                                <span className="badge">{g.type === 'own' ? 'owned' : 'rented in'}</span>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
};

export default Dashboard;
