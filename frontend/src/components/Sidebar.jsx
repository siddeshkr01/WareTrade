import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authContextValue";
import { IconDashboard, IconGodown, IconRental, IconProduct, IconTrade, IconLoan, IconHistory, IconLogout } from "./Icons";
import NotificationBell from "./NotificationBell";

const links = [
    { to: "/dashboard", label: "Dashboard", icon: IconDashboard },
    { to: "/godowns", label: "Godowns", icon: IconGodown },
    { to: "/rentals", label: "Rentals", icon: IconRental },
    { to: "/products", label: "Products", icon: IconProduct },
    { to: "/trades", label: "Trades", icon: IconTrade },
    { to: "/loans", label: "Loans", icon: IconLoan },
    { to: "/transactions", label: "Transactions", icon: IconHistory }
];

const initials = (name) => {
    if (!name) return "?";
    return name.trim().slice(0, 2).toUpperCase();
};

const Sidebar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const displayName = user?.display_name || user?.user_name;

    return (
        <nav className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-label">
                    <span className="brand-mark">
                        <IconGodown width={16} height={16} />
                    </span>
                    WareTrade
                </div>
                <NotificationBell />
            </div>

            <div className="sidebar-nav">
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                    >
                        <link.icon />
                        <span className="label">{link.label}</span>
                    </NavLink>
                ))}
            </div>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <span className="avatar">{initials(displayName)}</span>
                    <span className="sidebar-user-name">{displayName}</span>
                </div>
                <button className="btn btn-sm" style={{ width: "100%" }} onClick={handleLogout}>
                    <IconLogout width={14} height={14} />
                    Log out
                </button>
            </div>
        </nav>
    );
};

export default Sidebar;
