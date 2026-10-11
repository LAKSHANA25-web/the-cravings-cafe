
import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  ShoppingBag,
  Clock,
  CheckCircle,
  IndianRupee,
  CalendarDays,
  Users,
  LogOut,
  LockKeyhole,
} from "lucide-react";
import "./AdminDashboard.css";

const API = "https://the-cravings-cafe-api.onrender.com";
const TOKEN_KEY = "cravings_admin_token";

const ORDER_STATUSES = [
  "Pending",
  "Preparing",
  "Ready",
  "Completed",
  "Cancelled",
];

const BOOKING_STATUSES = [
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
];

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

async function apiRequest(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    throw new Error("SESSION_EXPIRED");
  }

  if (!response.ok) {
    throw new Error(
      data.detail || data.message || "The request failed."
    );
  }

  return data;
}

function AdminLogin({ onLogin }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/admin/login", null, {
        method: "POST",
        body: JSON.stringify({ login, password }),
      });

      if (!result.access_token) {
        throw new Error("The server did not return an access token.");
      }

      onLogin(result.access_token);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the cafe server. Check the API and try again."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-page">
      <section
        className="admin-login-card"
        aria-labelledby="admin-login-title"
      >
        <div className="admin-login-icon">
          <LockKeyhole size={30} />
        </div>

        <p className="admin-eyebrow">THE CRAVINGS CAFE</p>
        <h1 id="admin-login-title">Admin Login</h1>
        <p>Sign in to manage customer orders and table bookings.</p>

        {error && (
          <div className="admin-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-login-form">
          <label htmlFor="admin-login">Email or username</label>
          <input
            id="admin-login"
            type="text"
            autoComplete="username"
            placeholder="Enter email or username"
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            required
          />

          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button
            className="admin-login-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="admin-note">
          Authorized cafe administrators only.
        </p>
      </section>
    </main>
  );
}

export default function AdminDashboard() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem(TOKEN_KEY) || ""
  );
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setOrders([]);
    setBookings([]);
    setSummary({});
    setError("");
    setUpdating("");
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const [ordersData, bookingsData, summaryData] =
        await Promise.all([
          apiRequest("/orders", token),
          apiRequest("/bookings", token),
          apiRequest("/admin/summary", token),
        ]);

      setOrders(Array.isArray(ordersData) ? ordersData : ordersData.orders || []);
      setBookings(
        Array.isArray(bookingsData)
          ? bookingsData
          : bookingsData.bookings || []
      );
      setSummary(summaryData);
    } catch (err) {
      if (err.message === "SESSION_EXPIRED") {
        logout();
        setError("Your session expired. Please sign in again.");
      } else {
        setError(
          err.message === "Failed to fetch"
            ? "Cannot connect to the API. Check the server and try again."
            : err.message
        );
      }
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token, loadDashboard]);

  function handleLogin(accessToken) {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
  }

  async function changeStatus(type, number, status) {
    const key = `${type}-${number}`;
    setUpdating(key);
    setError("");

    try {
      const endpoint =
        type === "order" ? "/orders" : "/bookings";

      await apiRequest(
        `${endpoint}/${encodeURIComponent(number)}/status`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );

      await loadDashboard();
    } catch (err) {
      if (err.message === "SESSION_EXPIRED") {
        logout();
        setError("Your session expired. Please sign in again.");
      } else {
        setError(err.message || "Could not update status.");
      }
    } finally {
      setUpdating("");
    }
  }

  if (!token) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const pendingOrders = orders.filter(
    (order) => order.status === "Pending"
  ).length;

  const completedOrders = orders.filter(
    (order) => order.status === "Completed"
  ).length;

  if (loading && orders.length === 0 && bookings.length === 0) {
    return (
      <main className="admin-page">
        <p>Loading cafe dashboard...</p>
        {error && <div className="admin-error">{error}</div>}
        <button type="button" onClick={loadDashboard}>
          Try again
        </button>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">THE CRAVINGS CAFE</p>
          <h1>Admin Dashboard</h1>
          <p>Manage customer orders and table reservations.</p>
        </div>

        <div className="admin-actions">
          <button
            className="admin-refresh"
            type="button"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw size={17} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            className="admin-logout"
            type="button"
            onClick={logout}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>

      {error && (
        <div className="admin-error" role="alert">
          {error}
        </div>
      )}

      <section className="admin-stats">
        <article className="admin-stat">
          <ShoppingBag />
          <span>Total Orders</span>
          <strong>{summary.total_orders ?? orders.length}</strong>
        </article>

        <article className="admin-stat">
          <Clock />
          <span>Pending Orders</span>
          <strong>{summary.pending_orders ?? pendingOrders}</strong>
        </article>

        <article className="admin-stat">
          <CheckCircle />
          <span>Completed Orders</span>
          <strong>{summary.completed_orders ?? completedOrders}</strong>
        </article>

        <article className="admin-stat">
          <IndianRupee />
          <span>Completed Sales</span>
          <strong>{money(summary.completed_sales)}</strong>
        </article>
      </section>

      {/* CUSTOMER ORDERS */}
      <section className="admin-orders">
        <div className="admin-section-heading">
          <h2>Customer Orders</h2>
          <span>{orders.length} records</span>
        </div>

        {orders.length === 0 ? (
          <div className="admin-empty">No orders found.</div>
        ) : (
          orders.map((order) => {
            const number = order.order_number;
            const key = `order-${number}`;

            return (
              <article className="admin-order-card" key={number}>
                <div className="admin-order-top">
                  <div>
                    <p className="admin-order-number">{number}</p>
                    <h3>{order.customer_name || "Customer"}</h3>
                    <p>{order.phone}</p>
                  </div>

                  <strong className="admin-order-total">
                    {money(order.total ?? order.total_amount)}
                  </strong>
                </div>

                <div className="admin-order-details">
                  <span>{order.order_type || "Pickup"}</span>
                  <span>Status: {order.status}</span>
                </div>

                {order.address && (
                  <p className="admin-address">
                    Delivery address: {order.address}
                  </p>
                )}

                <div className="admin-item-list">
                  {(Array.isArray(order.items) ? order.items : []).map(
                    (item, index) => (
                      <div
                        className="admin-item"
                        key={`${item.id || item.name}-${index}`}
                      >
                        <span>
                          {item.icon || "🍽️"} {item.name} × {item.quantity}
                        </span>
                        <strong>
                          {money(
                            (Number(item.price) || 0) *
                              (Number(item.quantity) || 0)
                          )}
                        </strong>
                      </div>
                    )
                  )}
                </div>

                <div className="admin-status-row">
                  <label htmlFor={`status-${number}`}>
                    Update order status
                  </label>

                  <select
                    id={`status-${number}`}
                    value={order.status || "Pending"}
                    disabled={updating === key || loading}
                    onChange={(event) =>
                      changeStatus("order", number, event.target.value)
                    }
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  {updating === key && <span>Updating...</span>}
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* TABLE BOOKINGS */}
      <section className="admin-orders admin-bookings">
        <div className="admin-section-heading">
          <h2>
            <CalendarDays size={21} /> Table Bookings
          </h2>
          <span>{bookings.length} reservations</span>
        </div>

        {bookings.length === 0 ? (
          <div className="admin-empty">No table bookings found.</div>
        ) : (
          bookings.map((booking) => {
            const number = booking.booking_number;
            const key = `booking-${number}`;

            return (
              <article className="admin-order-card" key={number}>
                <div className="admin-order-top">
                  <div>
                    <p className="admin-order-number">{number}</p>
                    <h3>{booking.customer_name || "Customer"}</h3>
                    <p>{booking.phone}</p>
                  </div>

                  <strong className="admin-guest-count">
                    <Users size={18} />
                    {booking.guests} guests
                  </strong>
                </div>

                <div className="admin-order-details">
                  <span>
                    <strong>Date:</strong> {booking.booking_date}
                  </span>
                  <span>
                    <strong>Time:</strong>{" "}
                    {String(booking.booking_time || "").slice(0, 5)}
                  </span>
                </div>

                {booking.special_request && (
                  <p className="admin-address">
                    Special request: {booking.special_request}
                  </p>
                )}

                <p className="admin-booking-status">
                  Status: {booking.status}
                </p>

                <div className="admin-status-row">
                  <label htmlFor={`booking-status-${number}`}>
                    Update booking status
                  </label>

                  <select
                    id={`booking-status-${number}`}
                    value={booking.status || "Pending"}
                    disabled={updating === key || loading}
                    onChange={(event) =>
                      changeStatus("booking", number, event.target.value)
                    }
                  >
                    {BOOKING_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  {updating === key && <span>Updating...</span>}
                </div>
              </article>
            );
          })
        )}
      </section>

      <p className="admin-note">
        Admin access is protected by backend authentication.
      </p>
    </main>
  );
}
