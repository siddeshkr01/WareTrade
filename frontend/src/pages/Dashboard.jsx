import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import { AuthContext } from "../context/authContextValue";
import { IconGodown, IconProduct, IconTrade, IconRental, IconInbox } from "../components/Icons";

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    const [godowns, setGodowns] = useState([]);
    const [stats, setStats] = useState({ godowns: 0, products: 0, pendingTrades: 0, rentalRequests: 0 });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            API.get("/godown/my-godowns"),
            API.get("/product/my-products"),
            API.get("/trade/initiated"),
            API.get("/trade/received"),
            API.get("/godown/rent/requests")
        ])
            .then(([godownsRes, productsRes, initiatedRes, receivedRes, requestsRes]) => {
                setGodowns(godownsRes.data);
                const pendingTrades = [...initiatedRes.data, ...receivedRes.data].filter(t => t.status === 'pending').length;
                setStats({
                    godowns: godownsRes.data.length,
                    products: productsRes.data.length,
                    pendingTrades,
                    rentalRequests: requestsRes.data.length
                });
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
