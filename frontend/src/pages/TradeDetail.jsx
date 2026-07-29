import { useContext, useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../api/axios";
import { AuthContext } from "../context/authContextValue";
import { ConfirmContext } from "../context/confirmContextValue";
import { ToastContext } from "../context/toastContextValue";
import { IconInbox } from "../components/Icons";
import CounterOfferModal from "../components/CounterOfferModal";
import { markNotificationsReadByLink } from "../utils/notifications";

const statusClass = (status) => `badge badge-${status}`;
const EDITABLE_STATUSES = ['created', 'pending'];
const CONFLICT_HINT = "changed since you loaded it";

const TradeDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const confirm = useContext(ConfirmContext);
    const showToast = useContext(ToastContext);

    const [trade, setTrade] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [conflict, setConflict] = useState(false);

    const [productNames, setProductNames] = useState({});
    const [godownNames, setGodownNames] = useState({});

    const [myGodowns, setMyGodowns] = useState([]);

    // --- add item (sell) ---
    const [sellForm, setSellForm] = useState({ from_godown_id: "", product_id: "", quantity: "", price: "" });
    const [fromGodownStock, setFromGodownStock] = useState([]);

    // --- add item (buy) ---
    const [buyForm, setBuyForm] = useState({ to_godown_id: "", quantity: "", price: "" });
    const [productQuery, setProductQuery] = useState("");
    const [productResults, setProductResults] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [addBusy, setAddBusy] = useState(false);
    const [removeBusyId, setRemoveBusyId] = useState(null);

    const [allocations, setAllocations] = useState({});
    const [respondBusy, setRespondBusy] = useState(false);

    const [sendBusy, setSendBusy] = useState(false);
    const [cancelBusy, setCancelBusy] = useState(false);

    const [showCounterModal, setShowCounterModal] = useState(false);
    const [counterBusy, setCounterBusy] = useState(false);
    const [counterError, setCounterError] = useState("");

    const resolveNames = useCallback(async (items) => {
        const productIds = [...new Set(items.map(i => i.product_id))];
        const godownIds = [...new Set(items.flatMap(i => [i.from_godown_id, i.to_godown_id]).filter(Boolean))];

        const productEntries = await Promise.all(productIds.map(async (pid) => {
            try {
                const res = await API.get(`/product/${pid}`);
                return [pid, res.data.product_name];
            } catch {
                return [pid, `Product #${pid}`];
            }
        }));

        const godownEntries = await Promise.all(godownIds.map(async (gid) => {
            try {
                const res = await API.get(`/godown/${gid}`);
                return [gid, res.data.godown_name];
            } catch {
                return [gid, `Godown #${gid}`];
            }
        }));

        setProductNames(Object.fromEntries(productEntries));
        setGodownNames(Object.fromEntries(godownEntries));
    }, []);

    const load = useCallback(() => {
        setLoading(true);
        setError("");
        setConflict(false);
        API.get(`/trade/${id}/details`)
            .then((res) => {
                setTrade(res.data);
                if (res.data.items?.length) resolveNames(res.data.items);
                markNotificationsReadByLink(`/trades/${id}`);
            })
            .catch((err) => setError(err.response?.data?.error || "Failed to load trade"))
            .finally(() => setLoading(false));
    }, [id, resolveNames]);

    // Background refresh used by polling: updates data without flashing the
    // full-page loading state, and stays quiet on transient fetch errors
    // since the next tick will just try again.
    const poll = useCallback(() => {
        API.get(`/trade/${id}/details`)
            .then((res) => {
                setTrade(res.data);
                setConflict(false);
                if (res.data.items?.length) resolveNames(res.data.items);
            })
            .catch(() => {});
    }, [id, resolveNames]);

    useEffect(load, [load]);

    useEffect(() => {
        API.get("/godown/my-godowns").then((res) => setMyGodowns(res.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (!trade || ['accepted', 'rejected', 'cancelled'].includes(trade.status)) return;
        const interval = setInterval(poll, 5000);
        return () => clearInterval(interval);
        // Depend on status (not `trade`) so each poll tick doesn't tear down
        // and recreate the interval — poll() itself changes `trade`'s identity.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trade?.status, poll]);

    const isInitiator = trade && user && trade.initiator_id === user.user_id;
    const isCounterparty = trade && user && trade.counterparty_id === user.user_id;
    const canEdit = trade && isInitiator && EDITABLE_STATUSES.includes(trade.status);

    const handleFromGodownChange = async (godown_id) => {
        setSellForm({ ...sellForm, from_godown_id: godown_id, product_id: "" });
        if (!godown_id) {
            setFromGodownStock([]);
            return;
        }
        try {
            const res = await API.get(`/godown/${godown_id}/stock`);
            setFromGodownStock(res.data);
        } catch {
            setFromGodownStock([]);
        }
    };

    const searchProducts = async (e) => {
        e?.preventDefault();
        try {
            const res = await API.get("/product/search", { params: { query: productQuery } });
            setProductResults(res.data);
        } catch {
            setProductResults([]);
        }
    };

    const handleAddSellItem = async (e) => {
        e.preventDefault();
        setAddBusy(true);
        try {
            await API.post(`/trade/${id}/items`, {
                items: [{
                    product_id: parseInt(sellForm.product_id),
                    quantity: parseInt(sellForm.quantity),
                    price: parseFloat(sellForm.price),
                    from_godown_id: parseInt(sellForm.from_godown_id)
                }]
            });
            setSellForm({ from_godown_id: "", product_id: "", quantity: "", price: "" });
            setFromGodownStock([]);
            load();
        } catch (err) {
            showToast(err.response?.data?.error || "Failed to add item");
        } finally {
            setAddBusy(false);
        }
    };

    const handleAddBuyItem = async (e) => {
        e.preventDefault();
        if (!selectedProduct) {
            showToast("Search for and select a product first");
            return;
        }
        setAddBusy(true);
        try {
            await API.post(`/trade/${id}/items`, {
                items: [{
                    product_id: selectedProduct.product_id,
                    quantity: parseInt(buyForm.quantity),
                    price: parseFloat(buyForm.price),
                    to_godown_id: parseInt(buyForm.to_godown_id)
                }]
            });
            setBuyForm({ to_godown_id: "", quantity: "", price: "" });
            setSelectedProduct(null);
            setProductQuery("");
            setProductResults([]);
            load();
        } catch (err) {
            showToast(err.response?.data?.error || "Failed to add item");
        } finally {
            setAddBusy(false);
        }
    };

    const handleRemoveItem = async (productId) => {
        setRemoveBusyId(productId);
        try {
            await API.delete(`/trade/${id}/items/${productId}`);
            load();
        } catch (err) {
            showToast(err.response?.data?.error || "Failed to remove item");
        } finally {
            setRemoveBusyId(null);
        }
    };

    const handleSend = async () => {
        setSendBusy(true);
        try {
            await API.post(`/trade/${id}/send`);
            load();
        } catch (err) {
            showToast(err.response?.data?.error || "Failed to send trade");
        } finally {
            setSendBusy(false);
        }
    };

    const handleCancel = async () => {
        if (!(await confirm("Cancel this trade?"))) return;
        setCancelBusy(true);
        try {
            await API.post(`/trade/${id}/cancel`);
            load();
        } catch (err) {
            showToast(err.response?.data?.error || "Failed to cancel trade");
        } finally {
            setCancelBusy(false);
        }
    };

    const handleRespond = async (response) => {
        setConflict(false);

        if (response === 'accept') {
            const missing = trade.items.some(i => !allocations[i.product_id]);
            if (missing) {
                showToast("Choose a godown for every item");
                return;
            }
        }

        setRespondBusy(true);
        try {
            await API.post(`/trade/${id}/respond`, {
                response,
                allocations: response === 'accept' ? trade.items.map(i => ({
                    product_id: i.product_id,
                    godown_id: parseInt(allocations[i.product_id])
                })) : undefined,
                expected_version: trade.version
            });
            load();
        } catch (err) {
            const msg = err.response?.data?.error || `Failed to ${response} trade`;
            if (msg.includes(CONFLICT_HINT)) {
                setConflict(true);
            } else {
                showToast(msg);
            }
        } finally {
            setRespondBusy(false);
        }
    };

    const handleCounterConfirm = async (items) => {
        setCounterError("");
        setCounterBusy(true);
        try {
            const res = await API.post(`/trade/${id}/counter`, { items });
            setShowCounterModal(false);
            navigate(`/trades/${res.data.trade_id}`);
        } catch (err) {
            setCounterError(err.response?.data?.error || "Failed to counter trade");
        } finally {
            setCounterBusy(false);
        }
    };

    if (loading) return <div className="page"><div className="loading-state"><span className="spinner" /> Loading trade...</div></div>;
    if (error) return <div className="page"><p className="error-text">{error}</p></div>;
    if (!trade) return null;

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>Trade #{trade.trade_id}</h1>
                    <p className="page-subtitle" style={{ textTransform: "capitalize" }}>{trade.trade_type} trade</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={statusClass(trade.status)}>{trade.status}</span>
                    <Link className="btn" to="/trades">Back</Link>
                </div>
            </div>

            {conflict && (
                <div className="conflict-banner">
                    <span>This trade was updated since you loaded it. Refresh to see the latest details before responding.</span>
                    <button className="btn btn-sm" onClick={load}>Refresh</button>
                </div>
            )}

            {trade.status === 'countered' && trade.countered_by_trade_id && (
                <div className="conflict-banner">
                    <span>This trade was countered with new terms.</span>
                    <Link className="btn btn-sm" to={`/trades/${trade.countered_by_trade_id}`}>View Counter-Offer</Link>
                </div>
            )}

            {trade.counter_of_trade_id && (
                <p className="muted" style={{ marginTop: -8 }}>
                    This is a counter-offer to <Link to={`/trades/${trade.counter_of_trade_id}`}>trade #{trade.counter_of_trade_id}</Link>.
                </p>
            )}

            <div className="section-title" style={{ marginTop: 0 }}>Items</div>
            {(!trade.items || trade.items.length === 0) && (
                <div className="empty-state"><IconInbox /><p>No items added yet.</p></div>
            )}
            <ul className="list">
                {trade.items?.map((i) => (
                    <li key={i.product_id} className="card">
                        <div className="card-row">
                            <div>
                                <strong>{productNames[i.product_id] || `Product #${i.product_id}`}</strong>
                                <div className="muted">
                                    {i.quantity} units @ {i.price} —{" "}
                                    from {i.from_godown_id ? (godownNames[i.from_godown_id] || i.from_godown_id) : "seller will choose"}
                                    {" → "}
                                    to {i.to_godown_id ? (godownNames[i.to_godown_id] || i.to_godown_id) : "buyer will choose"}
                                </div>
                            </div>
                            {canEdit && (
                                <button
                                    className="btn btn-sm btn-danger"
                                    disabled={removeBusyId === i.product_id}
                                    onClick={() => handleRemoveItem(i.product_id)}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            {canEdit && (
                <div className="card">
                    <div className="section-title" style={{ marginTop: 0 }}>Add Item</div>

                    {trade.trade_type === 'sell' ? (
                        <form onSubmit={handleAddSellItem}>
                            <div className="form-inline">
                                <div className="form-group" style={{ flex: 2, minWidth: 160 }}>
                                    <label htmlFor="sell_from_godown">From your godown</label>
                                    <select
                                        id="sell_from_godown"
                                        className="input"
                                        value={sellForm.from_godown_id}
                                        onChange={(e) => handleFromGodownChange(e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>Select godown</option>
                                        {myGodowns.map((g) => (
                                            <option key={g.godown_id} value={g.godown_id}>{g.godown_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 2, minWidth: 160 }}>
                                    <label htmlFor="sell_product">Product</label>
                                    <select
                                        id="sell_product"
                                        className="input"
                                        value={sellForm.product_id}
                                        onChange={(e) => setSellForm({ ...sellForm, product_id: e.target.value })}
                                        required
                                        disabled={!sellForm.from_godown_id}
                                    >
                                        <option value="" disabled>Select product</option>
                                        {fromGodownStock.map((s) => (
                                            <option key={s.product_id} value={s.product_id}>{s.product_name} ({s.available} available)</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1, minWidth: 90 }}>
                                    <label htmlFor="sell_qty">Quantity</label>
                                    <input
                                        id="sell_qty"
                                        className="input"
                                        type="number"
                                        min="1"
                                        value={sellForm.quantity}
                                        onChange={(e) => setSellForm({ ...sellForm, quantity: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1, minWidth: 90 }}>
                                    <label htmlFor="sell_price">Price / unit</label>
                                    <input
                                        id="sell_price"
                                        className="input"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={sellForm.price}
                                        onChange={(e) => setSellForm({ ...sellForm, price: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={addBusy}>Add Item</button>
                        </form>
                    ) : (
                        <>
                            <p className="muted" style={{ marginBottom: 12 }}>Search the product catalog for what you want to request.</p>
                            <form onSubmit={searchProducts} className="form-inline">
                                <div className="form-group" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
                                    <input
                                        className="input"
                                        placeholder="Search products"
                                        value={productQuery}
                                        onChange={(e) => setProductQuery(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="btn">Search</button>
                            </form>
                            {productResults.length > 0 && (
                                <ul className="list" style={{ marginTop: 10 }}>
                                    {productResults.map((p) => (
                                        <li key={p.product_id}>
                                            <button
                                                type="button"
                                                className="card clickable"
                                                style={{
                                                    display: "block",
                                                    width: "100%",
                                                    textAlign: "left",
                                                    padding: 10,
                                                    font: "inherit",
                                                    color: "inherit",
                                                    border: "1px solid var(--color-border)",
                                                    borderColor: selectedProduct?.product_id === p.product_id ? "var(--color-primary)" : undefined,
                                                    background: selectedProduct?.product_id === p.product_id ? "var(--color-primary-light)" : "var(--color-surface)"
                                                }}
                                                onClick={() => setSelectedProduct(p)}
                                            >
                                                {p.product_name} — {p.category}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {selectedProduct && (
                                <form onSubmit={handleAddBuyItem} style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
                                    <p style={{ margin: "0 0 10px" }}>Requesting: <span className="badge">{selectedProduct.product_name}</span></p>
                                    <div className="form-inline">
                                        <div className="form-group" style={{ flex: 2, minWidth: 160 }}>
                                            <label htmlFor="buy_to_godown">Receive into</label>
                                            <select
                                                id="buy_to_godown"
                                                className="input"
                                                value={buyForm.to_godown_id}
                                                onChange={(e) => setBuyForm({ ...buyForm, to_godown_id: e.target.value })}
                                                required
                                            >
                                                <option value="" disabled>Select your godown</option>
                                                {myGodowns.map((g) => (
                                                    <option key={g.godown_id} value={g.godown_id}>{g.godown_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ flex: 1, minWidth: 90 }}>
                                            <label htmlFor="buy_qty">Quantity</label>
                                            <input
                                                id="buy_qty"
                                                className="input"
                                                type="number"
                                                min="1"
                                                value={buyForm.quantity}
                                                onChange={(e) => setBuyForm({ ...buyForm, quantity: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group" style={{ flex: 1, minWidth: 100 }}>
                                            <label htmlFor="buy_price">Price you'll pay</label>
                                            <input
                                                id="buy_price"
                                                className="input"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={buyForm.price}
                                                onChange={(e) => setBuyForm({ ...buyForm, price: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary" disabled={addBusy}>Add Item</button>
                                </form>
                            )}
                        </>
                    )}

                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        {trade.status === 'created' && trade.items?.length > 0 && (
                            <button className="btn btn-primary" onClick={handleSend} disabled={sendBusy}>
                                Send Trade Request
                            </button>
                        )}
                        <button className="btn btn-danger" onClick={handleCancel} disabled={cancelBusy}>
                            Cancel Trade
                        </button>
                    </div>
                    {trade.status === 'pending' && (
                        <p className="muted" style={{ marginTop: 8 }}>
                            This trade is already with {trade.trade_type === 'sell' ? 'the buyer' : 'the seller'}. Any edits here will require them to refresh before responding.
                        </p>
                    )}
                </div>
            )}

            {isCounterparty && trade.status === 'pending' && (
                <div className="card">
                    <div className="section-title" style={{ marginTop: 0 }}>Respond To Trade</div>
                    <p className="muted">
                        {trade.trade_type === 'sell'
                            ? "Choose where each item should be stored if you accept."
                            : "Choose which of your godowns to ship each item from if you accept."}
                    </p>
                    {trade.items?.map((i) => (
                        <div key={i.product_id} className="card-row" style={{ marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
                            <span style={{ flex: 1, minWidth: 160 }}>
                                {productNames[i.product_id] || `Product #${i.product_id}`} — {i.quantity} units
                            </span>
                            <select
                                className="input"
                                style={{ flex: 1, minWidth: 160, margin: 0 }}
                                value={allocations[i.product_id] || ""}
                                onChange={(e) => setAllocations({ ...allocations, [i.product_id]: e.target.value })}
                            >
                                <option value="" disabled>
                                    {trade.trade_type === 'sell' ? 'Destination godown' : 'Source godown'}
                                </option>
                                {myGodowns.map((g) => (
                                    <option key={g.godown_id} value={g.godown_id}>{g.godown_name}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button className="btn btn-primary" onClick={() => handleRespond('accept')} disabled={respondBusy}>Accept</button>
                        <button className="btn btn-danger" onClick={() => handleRespond('reject')} disabled={respondBusy}>Reject</button>
                        <button className="btn" onClick={() => { setCounterError(""); setShowCounterModal(true); }} disabled={counterBusy}>
                            Counter Offer
                        </button>
                    </div>
                </div>
            )}

            {showCounterModal && (
                <CounterOfferModal
                    trade={trade}
                    productNames={productNames}
                    myGodowns={myGodowns}
                    busy={counterBusy}
                    error={counterError}
                    onConfirm={handleCounterConfirm}
                    onClose={() => setShowCounterModal(false)}
                />
            )}
        </div>
    );
};

export default TradeDetail;
