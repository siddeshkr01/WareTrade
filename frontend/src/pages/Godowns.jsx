import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import { IconInbox, IconPlus } from "../components/Icons";
import UserContact from "../components/UserContact";
import { ConfirmContext } from "../context/confirmContextValue";

const emptyForm = { godown_name: "", location: "", capacity: "" };

const Godowns = () => {
    const confirm = useContext(ConfirmContext);
    const [tab, setTab] = useState("using");

    const [usingList, setUsingList] = useState([]);
    const [rentedOutList, setRentedOutList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        setError("");
        Promise.all([
            API.get("/godown/my-godowns"),
            API.get("/godown/rent/active")
        ])
            .then(([usingRes, rentedOutRes]) => {
                setUsingList(usingRes.data);
                setRentedOutList(rentedOutRes.data);
            })
            .catch((err) => setError(err.response?.data?.error || "Failed to load godowns"))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const startEdit = (g) => {
        setEditingId(g.godown_id);
        setForm({ godown_name: g.godown_name, location: g.location, capacity: g.capacity });
        setFormError("");
        setShowForm(true);
    };

    const startCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setFormError("");
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        setFormError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        setSaving(true);

        const payload = {
            godown_name: form.godown_name,
            location: form.location,
            capacity: parseInt(form.capacity)
        };

        try {
            if (editingId) {
                await API.put(`/godown/${editingId}`, payload);
            } else {
                await API.post("/godown", payload);
            }
            closeForm();
            load();
        } catch (err) {
            setFormError(err.response?.data?.error || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (godown_id) => {
        if (!(await confirm("Delete this godown?"))) return;
        try {
            await API.delete(`/godown/${godown_id}`);
            load();
        } catch (err) {
            setError(err.response?.data?.error || "Delete failed");
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>My Godowns</h1>
                    <p className="page-subtitle">Manage the godowns you own and the ones you're using.</p>
                </div>
                <button className="btn btn-primary" onClick={() => showForm ? closeForm() : startCreate()}>
                    <IconPlus width={15} height={15} />
                    {showForm ? "Cancel" : "Add Godown"}
                </button>
            </div>

            {showForm && (
                <div className="card">
                    <div className="section-title" style={{ marginTop: 0 }}>
                        {editingId ? "Edit Godown" : "New Godown"}
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-inline">
                            <div className="form-group" style={{ flex: 2, minWidth: 160 }}>
                                <label htmlFor="godown_name">Name</label>
                                <input
                                    id="godown_name"
                                    className="input"
                                    value={form.godown_name}
                                    onChange={(e) => setForm({ ...form, godown_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ flex: 2, minWidth: 160 }}>
                                <label htmlFor="location">Location</label>
                                <input
                                    id="location"
                                    className="input"
                                    value={form.location}
                                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1, minWidth: 100 }}>
                                <label htmlFor="capacity">Capacity</label>
                                <input
                                    id="capacity"
                                    className="input"
                                    type="number"
                                    min="1"
                                    value={form.capacity}
                                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {editingId ? "Save Changes" : "Create Godown"}
                            </button>
                            <button type="button" className="btn" onClick={closeForm}>Cancel</button>
                        </div>
                    </form>
                    {formError && <p className="error-text">{formError}</p>}
                </div>
            )}

            <div className="tabs">
                <button className={`tab ${tab === 'using' ? 'active' : ''}`} onClick={() => setTab('using')}>
                    Currently Using
                </button>
                <button className={`tab ${tab === 'rentedOut' ? 'active' : ''}`} onClick={() => setTab('rentedOut')}>
                    Rented Out
                </button>
            </div>

            {loading && <div className="loading-state"><span className="spinner" /> Loading godowns...</div>}
            {error && <p className="error-text">{error}</p>}

            {!loading && tab === 'using' && (
                usingList.length === 0 ? (
                    <div className="empty-state">
                        <IconInbox />
                        <p>Godowns you own (not currently rented out) and ones you're renting from others will show up here.</p>
                        <button className="btn btn-primary" onClick={startCreate}>Add your first godown</button>
                    </div>
                ) : (
                    <ul className="list">
                        {usingList.map((g) => (
                            <li key={g.godown_id} className="card">
                                <div className="card-row">
                                    <div>
                                        <Link to={`/godowns/${g.godown_id}`}><strong>{g.godown_name}</strong></Link>
                                        <div className="muted">#{g.godown_id} — {g.location} — capacity {g.capacity}</div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span className="badge">{g.type === 'own' ? 'owned' : 'rented in'}</span>
                                        {g.type === 'own' && (
                                            <>
                                                <button className="btn btn-sm" onClick={() => startEdit(g)}>Edit</button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(g.godown_id)}>Delete</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )
            )}

            {!loading && tab === 'rentedOut' && (
                rentedOutList.length === 0 ? (
                    <div className="empty-state">
                        <IconInbox />
                        <p>Godowns you own that are currently rented out to someone else will show up here.</p>
                    </div>
                ) : (
                    <ul className="list">
                        {rentedOutList.map((r) => (
                            <li key={r.rental_id} className="card">
                                <div className="card-row">
                                    <div>
                                        <strong>{r.godown_name}</strong>
                                        <div className="muted">#{r.godown_id} — {r.location} — capacity {r.capacity}</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div>tenant: <UserContact userId={r.tenant_id} name={r.tenant_name} /></div>
                                        <div className="muted">rent: {r.rent_cost}</div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )
            )}
        </div>
    );
};

export default Godowns;
