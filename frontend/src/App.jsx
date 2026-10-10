
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Order from "./pages/Order";
import Booking from "./pages/Booking";
import Location from "./pages/Location";
import AdminDashboard from "./pages/admin/AdminDashboard";

import "./App.css";

function Placeholder({ title }) {
  return (
    <main className="placeholder-page">
      <p className="placeholder-eyebrow">THE CRAVINGS CAFE</p>
      <h1>{title}</h1>
      <p>This page is coming soon.</p>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/order" element={<Order />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/reviews" element={<Placeholder title="Customer Reviews" />} />
        <Route path="/location" element={<Location />} />
        <Route path="/admin" element={<AdminDashboard />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
