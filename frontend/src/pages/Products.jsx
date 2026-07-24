import { useEffect, useState } from "react";
import API from "../api/axios";
import { IconInbox, IconPlus } from "../components/Icons";

const emptyForm = { product_name: "", category: "", quantity: "", godown_id: "" };

const Products = () => {
    const [products, setProducts] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const [expandedId, setExpandedId] = useState(null);
    const [breakdown, setBreakdown] = useState(null);
    const [breakdownError, setBreakdownError] = useState("");

    const [showAddForm, setShowAddForm] = useState(false);
    const [myGodowns, setMyGodowns] = useState([]);
    const [addForm, setAddForm] = useState(emptyForm);
    const [addError, setAddError] = useState("");
    const [addBusy, setAddBusy] = useState(false);

    const loadProducts = () => {
        setLoading(true);
        API.get("/product/my-products")
            .then((res) => setProducts(res.data))
            .catch((err) => setError(err.response?.data?.error || "Failed to load products"))
            .finally(() => setLoading(false));
    };

    useEffect(loadProducts, []);

    const toggleExpand = async (product_id) => {
        if (expandedId === product_id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(product_id);
        setBreakdown(null);
        setBreakdownError("");
        try {
            const res = await API.get(`/product/godowns-with-products/${product_id}`);
            setBreakdown(res.data);
        } catch (err) {
            setBreakdownError(err.response?.data?.error || "Failed to load breakdown");
        }
    };

    const openAddForm = () => {
        setShowAddForm(true);
        setAddError("");
        if (myGodowns.length === 0) {
            API.get("/godown/my-godowns").then((res) => setMyGodowns(res.data)).catch(() => {});
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        setAddError("");
        setAddBusy(true);
        try {
            await API.post("/godown/stock/add", {
                godown_id: parseInt(addForm.godown_id),
                product_name: addForm.product_name,
                category: addForm.category,
                quantity: parseInt(addForm.quantity)
            });
            setAddForm(emptyForm);
            setShowAddForm(false);
            loadProducts();
        } catch (err) {
            setAddError(err.response?.data?.error || "Failed to add product");
        } finally {
            setAddBusy(false);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>My Products</h1>
                    <p className="page-subtitle">Everything you currently have stored, across every godown you use.</p>
                </div>
                <button className="btn btn-primary" onClick={() => showAddForm ? setShowAddForm(false) : openAddForm()}>
                    <IconPlus width={15} height={15} />
                    {showAddForm ? "Cancel" : "Add Product"}
                </button>
            </div>

            {showAddForm && (
                <div className="card">
                    <div className="section-title" style={{ marginTop: 0 }}>Add Product</div>
                    <p className="muted" style={{ marginBottom: 14 }}>
                        Products are a shared catalog — if the name/category already exists it'll be reused.
                    </p>
                    <form onSubmit={handleAddProduct}>
                        <div className="form-inline">
                            <div className="form-group" style={{ flex: 2, minWidth: 140 }}>
                                <label htmlFor="p_name">Product name</label>
                                <input
                                    id="p_name"
                                    className="input"
                                    value={addForm.product_name}
                                    onChange={(e) => setAddForm({ ...addForm, product_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                                <label htmlFor="p_category">Category</label>
                                <input
                                    id="p_category"
                                    className="input"
                                    value={addForm.category}
                                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1, minWidth: 100 }}>
                                <label htmlFor="p_qty">Quantity</label>
                                <input
                                    id="p_qty"
                                    className="input"
                                    type="number"
                                    min="1"
                                    value={addForm.quantity}
                                    onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ flex: 2, minWidth: 160 }}>
                                <label htmlFor="p_godown">Store in godown</label>
                                <select
                                    id="p_godown"
                                    className="input"
                                    value={addForm.godown_id}
                                    onChange={(e) => setAddForm({ ...addForm, godown_id: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Select godown</option>
                                    {myGodowns.map((g) => (
                                        <option key={g.godown_id} value={g.godown_id}>{g.godown_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={addBusy}>Add Product</button>
                    </form>
                    {addError && <p className="error-text">{addError}</p>}
                </div>
            )}

            {loading && <div className="loading-state"><span className="spinner" /> Loading products...</div>}
            {error && <p className="error-text">{error}</p>}

            {!loading && !error && products.length === 0 && (
                <div className="empty-state">
                    <IconInbox />
                    <p>You don't have any products stored yet.</p>
                    <button className="btn btn-primary" onClick={openAddForm}>Add your first product</button>
                </div>
            )}

            <ul className="list">
                {products.map((p) => (
                    <li key={p.product_id} className="card clickable" onClick={() => toggleExpand(p.product_id)}>
                        <div className="card-row">
                            <div>
                                <strong>{p.product_name}</strong>
                                <div className="muted">#{p.product_id} — {p.category}</div>
                            </div>
                            <span className="badge">{p.total_quantity} total</span>
                        </div>

                        {expandedId === p.product_id && (
                            <div
                                style={{ marginTop: 12, borderTop: "1px solid var(--color-border)", paddingTop: 12 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {breakdownError && <p className="error-text">{breakdownError}</p>}
                                {!breakdown && !breakdownError && (
                                    <div className="loading-state" style={{ padding: 12 }}>
                                        <span className="spinner" /> Loading breakdown...
                                    </div>
                                )}
                                {breakdown && (
                                    <>
                                        {breakdown.owned_godowns.length > 0 && (
                                            <>
                                                <div className="muted" style={{ marginBottom: 4 }}>Owned godowns</div>
                                                {breakdown.owned_godowns.map((g) => (
                                                    <div key={g.godown_id} className="card-row" style={{ padding: "4px 0" }}>
                                                        <span>{g.godown_name} ({g.location})</span>
                                                        <span className="badge">{g.quantity}</span>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                        {breakdown.rented_godowns.length > 0 && (
                                            <>
                                                <div className="muted" style={{ margin: "8px 0 4px" }}>Rented godowns</div>
                                                {breakdown.rented_godowns.map((g) => (
                                                    <div key={g.godown_id} className="card-row" style={{ padding: "4px 0" }}>
                                                        <span>{g.godown_name} ({g.location})</span>
                                                        <span className="badge">{g.quantity}</span>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                        {breakdown.owned_godowns.length === 0 && breakdown.rented_godowns.length === 0 && (
                                            <p className="muted">No godown breakdown available.</p>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Products;
