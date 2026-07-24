import { useState, useEffect, useRef, useSyncExternalStore, useId } from "react";
import API from "../api/axios";

// Module-level singleton so any number of UserContact instances across the
// page can agree on which one (if any) is currently open -- opening one
// closes whichever other one was open, with no prop drilling needed.
let activeId = null;
const listeners = new Set();

const setActiveId = (id) => {
    activeId = id;
    listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const getActiveId = () => activeId;

const UserContact = ({ userId, name }) => {
    const instanceId = useId();
    const currentActiveId = useSyncExternalStore(subscribe, getActiveId);
    const open = currentActiveId === instanceId;

    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");
    const containerRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        const handleOutsideClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setActiveId(null);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [open]);

    const toggle = async () => {
        if (open) {
            setActiveId(null);
            return;
        }
        setActiveId(instanceId);
        if (!profile && !error) {
            try {
                const res = await API.get(`/user/${userId}/profile`);
                setProfile(res.data);
            } catch (err) {
                setError(err.response?.data?.error || "Failed to load contact details");
            }
        }
    };

    return (
        <span ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
            <button
                type="button"
                onClick={toggle}
                className="btn-link"
            >
                {name}
            </button>

            {open && (
                <div
                    className="card"
                    style={{ position: "absolute", zIndex: 20, top: "100%", left: 0, marginTop: 6, minWidth: 220, boxShadow: "var(--shadow-md)" }}
                >
                    {error && <p className="error-text" style={{ margin: 0 }}>{error}</p>}
                    {!profile && !error && <p className="muted" style={{ margin: 0 }}>Loading...</p>}
                    {profile && (
                        <>
                            <div style={{ fontWeight: 700 }}>{profile.display_name || profile.user_name}</div>
                            <div className="muted">@{profile.user_name}</div>
                            <div style={{ marginTop: 8, fontSize: 13.5 }}>Phone: {profile.phone_number}</div>
                            {profile.address && (
                                <div className="muted" style={{ marginTop: 4, fontSize: 13.5 }}>{profile.address}</div>
                            )}
                        </>
                    )}
                </div>
            )}
        </span>
    );
};

export default UserContact;
