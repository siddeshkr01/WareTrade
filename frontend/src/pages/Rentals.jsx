import { useContext, useEffect, useState } from "react";
import API from "../api/axios";
import { IconInbox, IconSearch } from "../components/Icons";
import UserContact from "../components/UserContact";
import { ConfirmContext } from "../context/confirmContextValue";
import { markNotificationsReadByLink } from "../utils/notifications";

const Rentals = () => {
    const confirm = useContext(ConfirmContext);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchError, setSearchError] = useState("");
    const [rentCosts, setRentCosts] = useState({});
    const [requesting, setRequesting] = useState(null);
    const [searched, setSearched] = useState(false);

    const [incoming, setIncoming] = useState([]);
    const [active, setActive] = useState([]);
    const [rented, setRented] = useState([]);
    const [listsError, setListsError] = useState("");
    const [listsLoading, setListsLoading] = useState(true);

    const [message, setMessage] = useState("");

    const loadLists = () => {
        setListsError("");
        setListsLoading(true);
        Promise.all([
            API.get("/godown/rent/requests"),
            API.get("/godown/rent/active"),
            API.get("/godown/rented")
        ])
            .then(([reqRes, activeRes, rentedRes]) => {
                setIncoming(reqRes.data);
                setActive(activeRes.data);
                setRented(rentedRes.data);
                markNotificationsReadByLink("/rentals");
            })
            .catch((err) => setListsError(err.response?.data?.error || "Failed to load rentals"))
            .finally(() => setListsLoading(false));
    };

    useEffect(loadLists, []);

    const runSearch = async (e) => {
        e?.preventDefault();
        setSearchError("");
        setSearched(true);
        try {
            const res = await API.get("/godown/search", { params: { query: searchTerm } });
            setSearchResults(res.data);
        } catch (err) {
            setSearchError(err.response?.data?.error || "Search failed");
        }
    };

    useEffect(() => { runSearch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const requestRental = async (godown_id) => {
        const rent_cost = parseFloat(rentCosts[godown_id]);
        if (!rent_cost || rent_cost <= 0) {
            setSearchError("Enter a valid rent offer before requesting");
            return;
        }
        setRequesting(godown_id);
        setSearchError("");
        setMessage("");
        try {
            await API.post("/godown/rent/request", { godown_id, rent_cost });
            setMessage("Rental request sent");
            runSearch();
        } catch (err) {
            setSearchError(err.response?.data?.error || "Request failed");
        } finally {
            setRequesting(null);
        }
    };

    const respond = async (rental_id, status) => {
        setListsError("");
        try {
            await API.post("/godown/rent/respond", { rental_id, status });
            loadLists();
        } catch (err) {
            setListsError(err.response?.data?.error || "Action failed");
        }
    };

    const endRental = async (rental_id) => {
        if (!(await confirm("End this rental?"))) return;
        setListsError("");
        try {
            await API.post("/godown/rent/end", { rental_id });
            loadLists();
        } catch (err) {
            setListsError(err.response?.data?.error || "Failed to end rental");
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>Rentals</h1>
                    <p className="page-subtitle">Rent godown space from others, or manage what you've rented out.</p>
                </div>
            </div>

            <div className="card">
                <div className="section-title" style={{ marginTop: 0 }}>Browse Godowns To Rent</div>
                <form onSubmit={runSearch} className="form-inline">
                    <input
                        className="input"
                        style={{ flex: 1, minWidth: 200 }}
                        placeholder="Search by name or location"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="btn">
                        <IconSearch width={14} height={14} />
                        Search
                    </button>
                </form>
                {searchError && <p className="error-text">{searchError}</p>}
                {message && <p className="success-text">{message}</p>}

                {searched && searchResults.length === 0 ? (
                    <p className="muted" style={{ marginTop: 12 }}>No godowns found.</p>
                ) : (
                    <ul className="list" style={{ marginTop: 12 }}>
                        {searchResults.map((g) => (
                            <li key={g.godown_id} className="card">
                                <div className="card-row">
                                    <div>
                                        <strong>{g.godown_name}</strong>
                                        <div className="muted">{g.location} — capacity {g.capacity} — owner <UserContact userId={g.owner_id} name={g.owner_name} /></div>
                                    </div>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        <input
                                            className="input"
                                            style={{ width: 110 }}
                                            type="number"
                                            min="1"
                                            placeholder="Rent offer"
                                            value={rentCosts[g.godown_id] || ""}
                                            onChange={(e) => setRentCosts({ ...rentCosts, [g.godown_id]: e.target.value })}
                                        />
                                        <button
                                            className="btn btn-primary btn-sm"
                                            disabled={requesting === g.godown_id}
                                            onClick={() => requestRental(g.godown_id)}
                                        >
                                            Request
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {listsLoading && <div className="loading-state"><span className="spinner" /> Loading rentals...</div>}
            {listsError && <p className="error-text">{listsError}</p>}

            {!listsLoading && (
                <>
                    <div className="section-title">Incoming Requests (on my godowns)</div>
                    {incoming.length === 0 ? (
                        <div className="empty-state"><IconInbox /><p>No pending requests.</p></div>
                    ) : (
                        <ul className="list">
                            {incoming.map((r) => (
                                <li key={r.rental_id} className="card">
                                    <div className="card-row">
                                        <div>
                                            <strong>{r.godown_name}</strong>
                                            <div className="muted">{r.location} — from <UserContact userId={r.tenant_id} name={r.tenant_name} /></div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <span className="badge">rent: {r.rent_cost}</span>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button className="btn btn-sm btn-primary" onClick={() => respond(r.rental_id, 'accepted')}>Accept</button>
                                                <button className="btn btn-sm btn-danger" onClick={() => respond(r.rental_id, 'rejected')}>Reject</button>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="section-title">Godowns I've Rented Out</div>
                    {active.length === 0 ? (
                        <div className="empty-state"><IconInbox /><p>None currently rented out.</p></div>
                    ) : (
                        <ul className="list">
                            {active.map((r) => (
                                <li key={r.rental_id} className="card">
                                    <div className="card-row">
                                        <div>
                                            <strong>{r.godown_name}</strong>
                                            <div className="muted">{r.location} — tenant <UserContact userId={r.tenant_id} name={r.tenant_name} /> — rent {r.rent_cost}</div>
                                        </div>
                                        <button className="btn btn-sm btn-danger" onClick={() => endRental(r.rental_id)}>End Rental</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="section-title">Godowns I'm Renting</div>
                    {rented.length === 0 ? (
                        <div className="empty-state"><IconInbox /><p>You aren't renting any godowns.</p></div>
                    ) : (
                        <ul className="list">
                            {rented.map((g) => (
                                <li key={g.godown_id} className="card">
                                    <strong>{g.godown_name}</strong>
                                    <div className="muted">
                                        {g.location} — capacity {g.capacity} — owner <UserContact userId={g.owner_id} name={g.owner_name} /> — rent {g.rent_cost}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
};

export default Rentals;
