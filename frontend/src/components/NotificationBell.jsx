import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { IconBell } from "./Icons";

const DROPDOWN_WIDTH = 320;
const VIEWPORT_MARGIN = 12;

const timeAgo = (dateStr) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

const NotificationBell = () => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [coords, setCoords] = useState(null);
    const containerRef = useRef(null);
    const buttonRef = useRef(null);

    const updatePosition = useCallback(() => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const width = Math.min(DROPDOWN_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
        let left = rect.left;
        if (left + width > window.innerWidth - VIEWPORT_MARGIN) {
            left = window.innerWidth - width - VIEWPORT_MARGIN;
        }
        if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
        setCoords({ top: rect.bottom + 8, left, width });
    }, []);

    const refreshCount = useCallback(() => {
        API.get("/notification/unread-count")
            .then((res) => setUnreadCount(res.data.count))
            .catch(() => {});
    }, []);

    const loadList = useCallback(() => {
        API.get("/notification")
            .then((res) => setNotifications(res.data))
            .catch(() => {});
    }, []);

    useEffect(() => {
        refreshCount();
        const interval = setInterval(refreshCount, 5000);
        return () => clearInterval(interval);
    }, [refreshCount]);

    useEffect(() => {
        if (!open) return;
        loadList();
        const interval = setInterval(loadList, 5000);
        return () => clearInterval(interval);
    }, [open, loadList]);

    useEffect(() => {
        if (!open) return;
        const handleOutsideClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [open]);

    useLayoutEffect(() => {
        if (!open) return;
        updatePosition();
        window.addEventListener("resize", updatePosition);
        return () => window.removeEventListener("resize", updatePosition);
    }, [open, updatePosition]);

    const handleClickNotification = async (n) => {
        setOpen(false);
        if (!n.is_read) {
            try {
                await API.post(`/notification/${n.notification_id}/read`);
            } catch {
                /* non-fatal */
            }
            refreshCount();
        }
        if (n.link) navigate(n.link);
    };

    const handleMarkAllRead = async (e) => {
        e.stopPropagation();
        try {
            await API.post("/notification/read-all");
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
            setUnreadCount(0);
        } catch {
            /* non-fatal */
        }
    };

    return (
        <div className="notif-bell-wrap" ref={containerRef}>
            <button ref={buttonRef} className="notif-bell-btn" onClick={() => setOpen((prev) => !prev)} aria-label="Notifications">
                <IconBell width={18} height={18} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>

            {open && coords && (
                <div
                    className="notif-dropdown card"
                    style={{ top: coords.top, left: coords.left, width: coords.width }}
                >
                    <div className="notif-dropdown-header">
                        <strong>Notifications</strong>
                        {unreadCount > 0 && (
                            <button className="btn-link" onClick={handleMarkAllRead}>Mark all read</button>
                        )}
                    </div>
                    {notifications.length === 0 ? (
                        <p className="muted" style={{ padding: "12px 0" }}>No notifications yet.</p>
                    ) : (
                        <ul className="notif-list">
                            {notifications.map((n) => (
                                <li
                                    key={n.notification_id}
                                    className={`notif-item ${n.is_read ? "" : "unread"}`}
                                    onClick={() => handleClickNotification(n)}
                                >
                                    <div>{n.message}</div>
                                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{timeAgo(n.created_at)}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
