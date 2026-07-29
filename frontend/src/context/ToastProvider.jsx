import { useCallback, useRef, useState } from "react";
import { ToastContext } from "./toastContextValue";

const DURATION_MS = 5000;

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const nextId = useRef(0);

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message, type = "error") => {
        const id = ++nextId.current;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => dismiss(id), DURATION_MS);
    }, [dismiss]);

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div
                style={{
                    position: "fixed", top: 16, right: 16, zIndex: 400,
                    display: "flex", flexDirection: "column", gap: 8, maxWidth: 340
                }}
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className="card"
                        style={{
                            padding: "12px 14px",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            boxShadow: "var(--shadow-md)",
                            borderLeft: `3px solid ${t.type === "success" ? "var(--color-success)" : "var(--color-danger)"}`
                        }}
                    >
                        <span style={{ flex: 1, fontSize: 13.5, color: "var(--color-text)" }}>{t.message}</span>
                        <button
                            type="button"
                            onClick={() => dismiss(t.id)}
                            aria-label="Dismiss"
                            style={{
                                background: "none", border: "none", cursor: "pointer",
                                color: "var(--color-text-muted)", fontSize: 16, lineHeight: 1, padding: 0
                            }}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
