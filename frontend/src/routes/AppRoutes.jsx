import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Godowns from "../pages/Godowns";
import GodownDetail from "../pages/GodownDetail";
import Rentals from "../pages/Rentals";
import Products from "../pages/Products";
import Trades from "../pages/Trades";
import TradeDetail from "../pages/TradeDetail";
import Loans from "../pages/Loans";
import LoanDetail from "../pages/LoanDetail";
import LoanCounterparty from "../pages/LoanCounterparty";
import Transactions from "../pages/Transactions";
import ProtectedRoute from "./ProtectedRoute";
import { SessionExpiredProvider } from "../context/SessionExpiredProvider";

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <SessionExpiredProvider>
                <Routes>
                    <Route path="/" element={<Login />} />

                    <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/godowns" element={<Godowns />} />
                        <Route path="/godowns/:id" element={<GodownDetail />} />
                        <Route path="/rentals" element={<Rentals />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/trades" element={<Trades />} />
                        <Route path="/trades/:id" element={<TradeDetail />} />
                        <Route path="/loans" element={<Loans />} />
                        <Route path="/loans/with/:counterpartyId" element={<LoanCounterparty />} />
                        <Route path="/loans/:id" element={<LoanDetail />} />
                        <Route path="/transactions" element={<Transactions />} />
                    </Route>
                </Routes>
            </SessionExpiredProvider>
        </BrowserRouter>
    );
};

export default AppRoutes;
