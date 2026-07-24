import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setSessionExpiredHandler } from "../api/axios";
import { AuthContext } from "./authContextValue";

export const SessionExpiredProvider = ({ children }) => {
    const [expired, setExpired] = useState(false);
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        setSessionExpiredHandler(() => setExpired(true));
        return () => setSessionExpiredHandler(null);
    }, []);

    const handleAcknowledge = () => {
        setExpired(false);
        logout();
        navigate("/");
    };

    return (
        <>
            {children}
            {expired && (
                <div
                    style={{
                        position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)",
                        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20
                    }}
                >
                    <div className="card" style={{ maxWidth: 380, width: "100%", padding: 24, boxShadow: "var(--shadow-md)" }}>
                        <p style={{ margin: "0 0 20px", fontSize: 14.5 }}>
                            Your session has expired. Please log in again.
                        </p>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button className="btn btn-primary" onClick={handleAcknowledge} autoFocus>OK</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
