import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api/axios";
import { IconInbox } from "../components/Icons";
import UserContact from "../components/UserContact";

const GodownDetail = () => {
    const { id } = useParams();

    const [godown, setGodown] = useState(null);
    const [stock, setStock] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const [addForm, setAddForm] = useState({ product_name: "", category: "", quantity: "" });
    const [addError, setAddError] = useState("");
    const [addBusy, setAddBusy] = useState(false);

    const [removeForm, setRemoveForm] = useState({ product_id: "", quantity: "" });
    const [removeError, setRemoveError] = useState("");
    const [removeBusy, setRemoveBusy] = useState(false);

    const load = () => {
        setLoading(true);
        setError("");
        Promise.all([
            API.get(`/godown/${id}`),
            API.get(`/godown/${id}/stock`)
        ])
            .then(([godownRes, stockRes]) => {
                setGodown(godownRes.data);
                setStock(stockRes.data);
            })
            .catch((err) => setError(err.response?.data?.error || "Failed to load godown"))
            .finally(() => setLoading(false));
    };

    useEffect(load, [id]);

    const handleAddStock = async (e) => {
        e.preventDefault();
        setAddError("");
        setAddBusy(true);
        try {
            await API.post("/godown/stock/add", {
                godown_id: id,
                product_name: addForm.product_name,
                category: addForm.category,
                quantity: parseInt(addForm.quantity)
            });
            setAddForm({ product_name: "", category: "", quantity: "" });
            load();
        } catch (err) {
            setAddError(err.response?.data?.error || "Failed to add stock");
        } finally {
            setAddBusy(false);
        }
    };

    const handleRemoveStock = async (e) => {
        e.preventDefault();
        setRemoveError("");
        setRemoveBusy(true);
        try {
            await API.post("/godown/stock/remove", {
                godown_id: id,
                product_id: parseInt(removeForm.product_id),
                quantity: parseInt(removeForm.quantity)
            });
            setRemoveForm({ product_id: "", quantity: "" });
            load();
        } catch (err) {
            setRemoveError(err.response?.data?.error || "Failed to remove stock");
        } finally {
            setRemoveBusy(false);
        }
    };

    if (loading) return <div className="page"><div className="loading-state"><span className="spinner" /> Loading godown...</div></div>;
    if (error) return <div className="page"><p className="error-text">{error}</p></div>;
    if (!godown) return null;

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>{godown.godown_name}</h1>
                    <div className="page-subtitle">
                        {godown.location} — capacity {godown.capacity} — owned by <UserContact userId={godown.owner_id} name={godown.owner_name} />
                    </div>
                </div>
                <Link className="btn" to="/godowns">Back</Link>
            </div>

            <div className="section-title" style={{ marginTop: 0 }}>Products In This Godown</div>
            {stock.length === 0 ? (
                <div className="empty-state">
                    <IconInbox />
                    <p>No products stored here yet — add some below.</p>
                </div>
            ) : (
                <ul className="list">
                    {stock.map((s) => (
                        <li key={s.product_id} className="card">
                            <div className="card-row">
                                <div>
                                    <strong>{s.product_name}</strong>
                                    <div className="muted">#{s.product_id} — {s.category}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <span className="badge">{s.quantity} total</span>
                                    {s.reserved > 0 && (
                                        <div className="muted" style={{ marginTop: 4 }}>
                                            {s.reserved} reserved for pending trades — {s.available} available
                                        </div>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <div className="card">
                <div className="section-title" style={{ marginTop: 0 }}>Add Stock</div>
                <form onSubmit={handleAddStock}>
                    <div className="form-inline">
                        <div className="form-group" style={{ flex: 2, minWidth: 140 }}>
                            <label htmlFor="product_name">Product name</label>
                            <input
                                id="product_name"
                                className="input"
                                value={addForm.product_name}
                                onChange={(e) => setAddForm({ ...addForm, product_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                            <label htmlFor="category">Category</label>
                            <input
                                id="category"
                                className="input"
                                value={addForm.category}
                                onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1, minWidth: 100 }}>
                            <label htmlFor="add_quantity">Quantity</label>
                            <input
                                id="add_quantity"
                                className="input"
                                type="number"
                                min="1"
                                value={addForm.quantity}
                                onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={addBusy}>Add Stock</button>
                </form>
                {addError && <p className="error-text">{addError}</p>}
            </div>

            {stock.length > 0 && (
                <div className="card">
                    <div className="section-title" style={{ marginTop: 0 }}>Remove Stock</div>
                    <form onSubmit={handleRemoveStock}>
                        <div className="form-inline">
                            <div className="form-group" style={{ flex: 2, minWidth: 160 }}>
                                <label htmlFor="remove_product">Product</label>
                                <select
                                    id="remove_product"
                                    className="input"
                                    value={removeForm.product_id}
                                    onChange={(e) => setRemoveForm({ ...removeForm, product_id: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Select product</option>
                                    {stock.map((s) => (
                                        <option key={s.product_id} value={s.product_id}>{s.product_name} ({s.available} available)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1, minWidth: 100 }}>
                                <label htmlFor="remove_quantity">Quantity</label>
                                <input
                                    id="remove_quantity"
                                    className="input"
                                    type="number"
                                    min="1"
                                    value={removeForm.quantity}
                                    onChange={(e) => setRemoveForm({ ...removeForm, quantity: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-danger" disabled={removeBusy}>Remove Stock</button>
                    </form>
                    {removeError && <p className="error-text">{removeError}</p>}
                </div>
            )}
        </div>
    );
};

export default GodownDetail;
