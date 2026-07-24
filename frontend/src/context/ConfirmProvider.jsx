import { useCallback, useRef, useState } from "react";
import { ConfirmContext } from "./confirmContextValue";

export const ConfirmProvider = ({ children }) => {
    const [request, setRequest] = useState(null);
    const resolveRef = useRef(null);

    const confirm = useCallback((message, options = {}) => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setRequest({ message, options });
        });
    }, []);

    const respond = (result) => {
        setRequest(null);
        resolveRef.current?.(result);
        resolveRef.current = null;
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}

            {request && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(15, 23, 42, 0.45)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 100,
                        padding: 20
                    }}
                    onClick={() => respond(false)}
                >
                    <div
                        className="card"
                        style={{ maxWidth: 380, width: "100%", padding: 24, boxShadow: "var(--shadow-md)" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p style={{ margin: "0 0 20px", fontSize: 14.5 }}>{request.message}</p>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button className="btn" onClick={() => respond(false)}>
                                {request.options.cancelLabel || "Cancel"}
                            </button>
                            <button
                                className={`btn ${request.options.danger === false ? "btn-primary" : "btn-danger"}`}
                                onClick={() => respond(true)}
                                autoFocus
                            >
                                {request.options.confirmLabel || "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};
