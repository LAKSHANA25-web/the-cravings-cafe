
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Order from "./pages/Order";
import Booking from "./pages/Booking";
import Location from "./pages/Location";
import Contact from "./pages/Contact";
import Reviews from "./pages/Reviews";

import AdminDashboard, {
  AdminForgotPassword,
  AdminResetPassword,
} from "./pages/admin/AdminDashboard";

import "./App.css";


export default function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* Customer Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/forgot-password" element={<AdminForgotPassword />} />
        <Route path="/reset-password" element={<AdminResetPassword />} />

        <Route path="/menu" element={<Menu />} />

        <Route path="/order" element={<Order />} />
        <Route path="/cart" element={<Order />} />

        <Route path="/booking" element={<Booking />} />
        <Route path="/book-table" element={<Booking />} />

        <Route path="/reviews" element={<Reviews />} />

        <Route path="/location" element={<Location />} />

        <Route path="/contact" element={<Contact />} />

        {/* Admin Dashboard */}
        <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
        <Route path="/admin/reset-password" element={<AdminResetPassword />} />
        <Route path="/admin/login" element={<AdminDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Unknown routes redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
