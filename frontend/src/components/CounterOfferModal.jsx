import { useState } from "react";

// Lets the counterparty adjust quantity/price/godown on the existing items
// before the counter-offer is created, instead of closing out the original
// trade first and figuring out terms afterward on a blank page — nothing is
// touched on the server until "Send Counter-Offer" is confirmed here.
const CounterOfferModal = ({ trade, productNames, myGodowns, busy, error, onConfirm, onClose }) => {
    const newType = trade.trade_type === 'sell' ? 'buy' : 'sell';
    const godownLabel = newType === 'sell' ? "Provide from" : "Receive into";

    const [rows, setRows] = useState(
        trade.items.map((i) => ({
            product_id: i.product_id,
            quantity: String(i.quantity),
            price: String(i.price),
            godown_id: ""
        }))
    );
    const [formError, setFormError] = useState("");

    const updateRow = (productId, field, value) => {
        setRows((prev) => prev.map((r) => (r.product_id === productId ? { ...r, [field]: value } : r)));
    };

    const removeRow = (productId) => {
        setRows((prev) => prev.filter((r) => r.product_id !== productId));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError("");

        if (rows.length === 0) {
            setFormError("At least one item is required");
            return;
        }
        for (const r of rows) {
            if (!r.godown_id) {
                setFormError("Choose a godown for every item");
                return;
            }
            if (!Number.isInteger(Number(r.quantity)) || Number(r.quantity) <= 0) {
                setFormError("Quantity must be a positive whole number");
                return;
            }
            if (!Number.isFinite(Number(r.price)) || Number(r.price) < 0) {
                setFormError("Price must be a valid, non-negative number");
                return;
            }
        }

        const items = rows.map((r) => ({
            product_id: r.product_id,
            quantity: parseInt(r.quantity),
            price: parseFloat(r.price),
            ...(newType === 'sell' ? { from_godown_id: parseInt(r.godown_id) } : { to_godown_id: parseInt(r.godown_id) })
        }));

        onConfirm(items);
    };

    return (
        <div
            style={{
                position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)",
                display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20
            }}
            onClick={() => !busy && onClose()}
        >
            <div
                className="card"
                style={{ maxWidth: 520, width: "100%", padding: 24, boxShadow: "var(--shadow-md)", maxHeight: "85vh", overflowY: "auto" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="section-title" style={{ marginTop: 0 }}>Counter This Trade</div>
                <p className="muted" style={{ marginTop: 0 }}>
                    Adjust quantity, price, and your godown for each item, then send. Nothing changes until you confirm.
                </p>

                <form onSubmit={handleSubmit}>
                    {rows.map((r) => (
                        <div key={r.product_id} className="card" style={{ marginBottom: 10 }}>
                            <div className="card-row" style={{ marginBottom: 8 }}>
                                <strong>{productNames[r.product_id] || `Product #${r.product_id}`}</strong>
                                {rows.length > 1 && (
                                    <button type="button" className="btn btn-sm" onClick={() => removeRow(r.product_id)}>
                                        Remove
                                    </button>
                                )}
                            </div>
                            <div className="form-inline">
                                <div className="form-group" style={{ flex: 1, minWidth: 90, marginBottom: 0 }}>
                                    <label>Quantity</label>
                                    <input
                                        className="input"
                                        type="number"
                                        min="1"
                                        value={r.quantity}
                                        onChange={(e) => updateRow(r.product_id, "quantity", e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1, minWidth: 90, marginBottom: 0 }}>
                                    <label>Price / unit</label>
                                    <input
                                        className="input"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={r.price}
                                        onChange={(e) => updateRow(r.product_id, "price", e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 2, minWidth: 160, marginBottom: 0 }}>
                                    <label>{godownLabel}</label>
                                    <select
                                        className="input"
                                        value={r.godown_id}
                                        onChange={(e) => updateRow(r.product_id, "godown_id", e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>Select godown</option>
                                        {myGodowns.map((g) => (
                                            <option key={g.godown_id} value={g.godown_id}>{g.godown_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}

                    {(formError || error) && <p className="error-text">{formError || error}</p>}

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                        <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={busy}>
                            {busy ? "Sending..." : "Send Counter-Offer"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CounterOfferModal;
