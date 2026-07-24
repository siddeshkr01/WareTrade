import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { AuthContext } from "../context/authContextValue";
import { IconGodown } from "../components/Icons";

const Login = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const [mode, setMode] = useState("login");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
    const [registerForm, setRegisterForm] = useState({
        user_name: "",
        phone_number: "",
        password: "",
        display_name: "",
        address: ""
    });

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await API.post("/user/login", loginForm);
            login(res.data.token, res.data.user);
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.error || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await API.post("/user/register", registerForm);
            setMode("login");
            setLoginForm({ identifier: registerForm.phone_number, password: "" });
        } catch (err) {
            setError(err.response?.data?.error || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
        }}>
            <div style={{ width: "100%", maxWidth: 380 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
                    <span className="avatar" style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 12 }}>
                        <IconGodown width={22} height={22} />
                    </span>
                    <h1 style={{ fontSize: 22, margin: 0 }}>WareTrade</h1>
                    <p className="muted" style={{ marginTop: 4 }}>Warehouse rentals & inter-trader stock exchange</p>
                </div>

                <div className="card" style={{ padding: 24 }}>
                    <div className="tabs" style={{ marginBottom: 20 }}>
                        <button
                            type="button"
                            className={`tab ${mode === 'login' ? 'active' : ''}`}
                            style={{ flex: 1, textAlign: "center" }}
                            onClick={() => { setMode('login'); setError(''); }}
                        >
                            Log in
                        </button>
                        <button
                            type="button"
                            className={`tab ${mode === 'register' ? 'active' : ''}`}
                            style={{ flex: 1, textAlign: "center" }}
                            onClick={() => { setMode('register'); setError(''); }}
                        >
                            Register
                        </button>
                    </div>

                    {mode === "login" ? (
                        <form onSubmit={handleLogin}>
                            <div className="form-group">
                                <label htmlFor="identifier">Phone number or username</label>
                                <input
                                    id="identifier"
                                    className="input"
                                    value={loginForm.identifier}
                                    onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    className="input"
                                    type="password"
                                    value={loginForm.password}
                                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
                                {loading ? "Logging in..." : "Log in"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister}>
                            <div className="form-group">
                                <label htmlFor="user_name">Username</label>
                                <input
                                    id="user_name"
                                    className="input"
                                    value={registerForm.user_name}
                                    onChange={(e) => setRegisterForm({ ...registerForm, user_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone_number">Phone number</label>
                                <input
                                    id="phone_number"
                                    className="input"
                                    value={registerForm.phone_number}
                                    onChange={(e) => setRegisterForm({ ...registerForm, phone_number: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="display_name">Business / display name</label>
                                <input
                                    id="display_name"
                                    className="input"
                                    value={registerForm.display_name}
                                    onChange={(e) => setRegisterForm({ ...registerForm, display_name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="address">Address</label>
                                <input
                                    id="address"
                                    className="input"
                                    value={registerForm.address}
                                    onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="reg_password">Password</label>
                                <input
                                    id="reg_password"
                                    className="input"
                                    type="password"
                                    value={registerForm.password}
                                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
                                {loading ? "Registering..." : "Create account"}
                            </button>
                        </form>
                    )}

                    {error && <p className="error-text">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default Login;
