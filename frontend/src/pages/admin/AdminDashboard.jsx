import { useCallback, useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  RefreshCw,
  ShoppingBag,
  CheckCircle,
  IndianRupee,
  CalendarDays,
  LogOut,
  LockKeyhole,
  Eye,
  EyeOff,
  KeyRound,
  MessageSquare,
  Star,
  Users,
  Trash2,
  XCircle,
} from "lucide-react";

import "./AdminDashboard.css";
import { menuSections } from "../Menu";
import PageMeta from "../../components/PageMeta";
import { apiUrl } from "../../lib/api";

const TOKEN_KEY = "admin_token";

const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
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

const localDateString = (value) => {
  const date = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return date.toISOString().slice(0, 10);
};

async function apiRequest(path, token, options = {}) {
  let response;

  try {
    response = await fetch(apiUrl(path), {
      ...options,
      headers: {
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to server. Please make sure the backend is running."
    );
  }
  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && path !== "/admin/login") {
    throw new Error("SESSION_EXPIRED");
  }

  if (!response.ok) {
    const detail = data.detail || data.message;
    throw new Error(
      typeof detail === "string"
        ? detail
        : detail
          ? JSON.stringify(detail)
          : `The request failed (HTTP ${response.status}).`
    );
  }
  return data;
}

function AdminLogin({ onLogin }) {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/admin/login", null, {
        method: "POST",
        body: JSON.stringify({
          login: login.trim(),
          password,
        }),
      });

      if (!data.access_token) {
        throw new Error(
          "The server did not return an access token."
        );
      }

      localStorage.setItem("admin_token", data.access_token);
      onLogin(data.access_token);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-page">
      <PageMeta
        title="Admin Login | The Cravings Cafe"
        description="Secure administration access for The Cravings Cafe."
      />
      <section
        className="admin-login-card"
        aria-labelledby="admin-login-title"
      >
        <div className="admin-login-icon">
          <LockKeyhole size={30} />
        </div>

        <p className="admin-eyebrow">
          THE CRAVINGS CAFE
        </p>

        <h1 id="admin-login-title">Admin Login</h1>

        <p>
          Sign in to manage customer orders and table bookings.
        </p>

        {error && (
          <div className="admin-error" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="admin-login-form">
            <label htmlFor="admin-login">
              Email or username
            </label>

            <input
              id="admin-login"
              type="text"
              autoComplete="username"
              placeholder="Enter email or username"
              value={login}
              onChange={(event) =>
                setLogin(event.target.value)
              }
              required
            />

            <label htmlFor="admin-password">
              Password
            </label>

            <div className="admin-password-wrapper">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />

              <button
                type="button"
                className="admin-password-toggle"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            <button
              className="admin-login-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
        </form>

        <div className="admin-forgot-row">
          <Link
            to="/forgot-password"
            className="admin-forgot-button"
          >
            Forgot Password?
          </Link>
        </div>

        <p className="admin-note">
          Authorized cafe administrators only.
        </p>
      </section>
    </main>
  );
}

export function AdminForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setResetUrl("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid admin email address.");
      return;
    }
    setLoading(true);

    try {
      const result = await apiRequest("/auth/forgot-password", null, {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setMessage(result.message);
      if (result.reset_url) {
        setResetUrl(result.reset_url);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to request a password reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-page">
      <PageMeta
        title="Forgot Password | The Cravings Cafe"
        description="Request a secure password reset for The Cravings Cafe administrator account."
      />
      <section className="admin-login-card" aria-labelledby="forgot-title">
        <div className="admin-login-icon"><KeyRound size={30} /></div>
        <p className="admin-eyebrow">THE CRAVINGS CAFE</p>
        <h1 id="forgot-title">Forgot Password?</h1>
        <p>Enter the administrator email address to request a reset.</p>
        {error && <div className="admin-error" role="alert">{error}</div>}
        {message && <div className="admin-success" role="status">{message}</div>}
        {resetUrl && (
          <p className="admin-dev-reset-link">
            Development reset link:{" "}
            <a href={resetUrl}>Open password reset</a>
          </p>
        )}
        <form onSubmit={handleSubmit} className="admin-login-form">
          <label htmlFor="reset-email">Admin email</label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            minLength={6}
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button
            className="admin-login-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
          <Link className="admin-back-button" to="/admin/login">
            Back to Login
          </Link>
        </form>
      </section>
    </main>
  );
}

export function AdminResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const validTokenFormat = /^[A-Za-z0-9_-]{43}$/.test(token);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timeout = window.setTimeout(
      () => navigate("/admin/login", { replace: true }),
      2000
    );
    return () => window.clearTimeout(timeout);
  }, [navigate, success]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!validTokenFormat) {
      setError("This reset link is invalid or has expired. Request a new link.");
      return;
    }
    if (password.length < 12) {
      setError("Choose a password with at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/auth/reset-password", null, {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });
      localStorage.removeItem(TOKEN_KEY);
      navigate("/reset-password", { replace: true });
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(
        requestError.message?.startsWith("[")
          ? "This reset link is invalid or has expired. Request a new link."
          : requestError.message || "Unable to reset the password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-page">
      <PageMeta
        title="Reset Password | The Cravings Cafe"
        description="Set a new password for your The Cravings Cafe administrator account."
      />
      <section className="admin-login-card" aria-labelledby="reset-title">
        <div className="admin-login-icon"><KeyRound size={30} /></div>
        <p className="admin-eyebrow">THE CRAVINGS CAFE</p>
        <h1 id="reset-title">Reset Password</h1>
        {success ? (
          <>
            <div className="admin-success" role="status">
              Your admin password has been reset successfully.
            </div>
            <Link className="admin-login-button admin-login-link" to="/admin/login">
              Go to Admin Login
            </Link>
          </>
        ) : !validTokenFormat ? (
          <>
            <div className="admin-error" role="alert">
              This reset link is invalid or has expired. Request a new link.
            </div>
            <Link className="admin-back-button" to="/admin/forgot-password">
              Request a new reset link
            </Link>
          </>
        ) : (
          <>
            <p>Choose a new password of at least 12 characters.</p>
            {error && <div className="admin-error" role="alert">{error}</div>}
            <form onSubmit={handleSubmit} className="admin-login-form">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={200}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <label htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={200}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
                  <p className="admin-password-requirements">
                    Use at least 12 characters. Both entries must match.
              </p>
              <button
                className="admin-login-button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_KEY) || ""
  );

  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");
  const [orderSearch, setOrderSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("All");
  const [bookingDateFilter, setBookingDateFilter] = useState("");
  const [reviews, setReviews] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [menuForm, setMenuForm] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
    prices: "",
    option_labels: "",
    icon: "🍽️",
    available: true,
  });
  const [editingMenuKey, setEditingMenuKey] = useState("");
  const [salesData, setSalesData] = useState({ manual_sales: [] });
  const [dailySalesData, setDailySalesData] = useState({});
  const [weeklySalesData, setWeeklySalesData] = useState({ days: [] });
  const [monthlySalesData, setMonthlySalesData] = useState({});
  const [salesDate, setSalesDate] = useState(() =>
    localDateString(new Date())
  );
  const [saleForm, setSaleForm] = useState({
    amount: "",
    payment_type: "Cash",
    description: "",
    notes: "",
    sale_date: localDateString(new Date()),
  });
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updating, setUpdating] = useState("");

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setOrders([]);
    setBookings([]);
    setReviews([]);
    setCustomers([]);
    setMenuItems([]);
    setSalesData({ manual_sales: [] });
    setSummary({});
    setError("");
    setNotice("");
    navigate("/admin", { replace: true });
  }, [navigate]);

  useEffect(() => {
    const isAdminLoginRoute =
      location.pathname === "/admin" ||
      location.pathname === "/admin/login";

    if (!token && !isAdminLoginRoute) {
      navigate("/admin", { replace: true });
    } else if (token && isAdminLoginRoute) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [location.pathname, navigate, token]);

  const loadDashboard = useCallback(async (selectedSalesDate = salesDate) => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const [
        ordersData,
        bookingsData,
        summaryData,
        customersData,
        menuData,
        sales,
        dailySales,
        weeklySales,
        monthlySales,
      ] =
        await Promise.all([
          apiRequest("/admin/orders", token),
          apiRequest("/admin/bookings", token),
          apiRequest(
            `/admin/dashboard?sale_date=${selectedSalesDate}`,
            token
          ),
          apiRequest("/admin/customers", token),
          apiRequest("/admin/menu", token),
          apiRequest(
            `/admin/manual-sales?sale_date=${selectedSalesDate}`,
            token
          ),
          apiRequest(`/admin/sales/daily?sale_date=${selectedSalesDate}`, token),
          apiRequest(
            `/admin/sales/weekly?sale_date=${selectedSalesDate}`,
            token
          ),
          apiRequest(
            `/admin/sales/monthly?sale_date=${selectedSalesDate}`,
            token
          ),
        ]);

      setOrders(
        Array.isArray(ordersData)
          ? ordersData
          : ordersData?.orders || []
      );

      setBookings(
        Array.isArray(bookingsData)
          ? bookingsData
          : bookingsData?.bookings || []
      );

      setSummary(summaryData || {});
      setCustomers(
        Array.isArray(customersData)
          ? customersData
          : customersData?.customers || []
      );
      setMenuItems(Array.isArray(menuData) ? menuData : []);
      setSalesData(sales || { manual_sales: [] });
      setDailySalesData(dailySales || {});
      setWeeklySalesData(weeklySales || { days: [] });
      setMonthlySalesData(monthlySales || {});

      // Reviews load separately so a review API error
      // will not prevent orders and bookings from loading.
      try {
        const reviewsData = await apiRequest(
          "/admin/reviews",
          token
        );

        setReviews(
          Array.isArray(reviewsData)
            ? reviewsData
            : reviewsData?.reviews || []
        );
      } catch (reviewError) {
        console.error("Could not load reviews:", reviewError);
        setReviews([]);
        if (
          reviewError.message === "SESSION_EXPIRED" ||
          reviewError.message.includes("403")
        ) {
          logout();
          setError("Your session expired. Please log in again.");
        }
      }
    } catch (err) {
      if (
        err.message === "SESSION_EXPIRED" ||
        err.message.includes("401") ||
        err.message.includes("403")
      ) {
        logout();
        setError("Your session expired. Please log in again.");
      } else {
        setError(
          err.message || "Could not load dashboard data."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [token, logout, salesDate]);

  useEffect(() => {
  if (!token) return;

  const timer = window.setTimeout(() => {
    void loadDashboard();
  }, 0);

  return () => window.clearTimeout(timer);
}, [token, loadDashboard]);

  function handleLogin(accessToken) {
    setToken(accessToken);
    setError("");
  }

  function selectSalesDate(date) {
    const selectedDate = localDateString(date);
    setSalesDate(selectedDate);
    if (!editingSaleId) {
      setSaleForm((current) => ({
        ...current,
        sale_date: selectedDate,
      }));
    }
  }

  async function saveSale(event) {
    event.preventDefault();
    setUpdating("sale");
    setError("");
    setNotice("");

    try {
      await apiRequest(
        editingSaleId
          ? `/admin/sales/${editingSaleId}`
          : "/admin/sales",
        token,
        {
          method: editingSaleId ? "PATCH" : "POST",
          body: JSON.stringify({
            ...saleForm,
            amount: Number(saleForm.amount),
          }),
        }
      );
      setEditingSaleId(null);
      setSalesDate(saleForm.sale_date);
      setSaleForm({
        amount: "",
        payment_type: "Cash",
        description: "",
        notes: "",
        sale_date: saleForm.sale_date,
      });
      setNotice(
        editingSaleId
          ? "Manual sale updated successfully."
          : "Manual sale added successfully."
      );
      await loadDashboard(saleForm.sale_date);
    } catch (err) {
      setError(err.message || "Could not save the sale.");
    } finally {
      setUpdating("");
    }
  }

  function editSale(sale) {
    setEditingSaleId(sale.id);
    setSaleForm({
      amount: String(sale.amount),
      payment_type: sale.payment_type,
      description: sale.description,
      notes: sale.notes || "",
      sale_date: sale.sale_date,
    });
  }

  async function deleteSale(saleId) {
    if (!window.confirm("Delete this manual sale entry?")) return;

    setUpdating(`sale-${saleId}`);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/admin/sales/${saleId}`, token, {
        method: "DELETE",
      });
      setNotice("Sale deleted.");
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not delete the sale.");
    } finally {
      setUpdating("");
    }
  }

  async function saveMenuItem(event) {
    event.preventDefault();
    setUpdating("menu");
    setError("");
    setNotice("");
    try {
      await apiRequest(
        editingMenuKey
          ? `/admin/menu/${encodeURIComponent(editingMenuKey)}`
          : "/admin/menu",
        token,
        {
          method: editingMenuKey ? "PATCH" : "POST",
          body: JSON.stringify({
            ...menuForm,
            price: Number(menuForm.price),
            prices: menuForm.prices
              ? [
                  Number(menuForm.price),
                  ...menuForm.prices
                    .split(",")
                    .slice(1)
                    .map((value) => Number(value.trim())),
                ]
              : [Number(menuForm.price)],
            option_labels: menuForm.option_labels
              ? menuForm.option_labels
                  .split(",")
                  .map((value) => value.trim())
              : [],
          }),
        }
      );
      setMenuForm({
        name: "",
        category: "",
        description: "",
        price: "",
        prices: "",
        option_labels: "",
        icon: "🍽️",
        available: true,
      });
      setEditingMenuKey("");
      setNotice(
        editingMenuKey
          ? "Menu item updated successfully."
          : "Menu item added successfully."
      );
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not save menu item.");
    } finally {
      setUpdating("");
    }
  }

  function editMenuItem(item) {
    setEditingMenuKey(item.item_key);
    setMenuForm({
      name: item.name,
      category: item.category,
      description: item.description || "",
      price: String(item.price),
      prices: (item.prices || [item.price]).join(", "),
      option_labels: (item.option_labels || []).join(", "),
      icon: item.icon || "🍽️",
      available: item.available,
    });
  }

  async function deleteMenuItem(itemKey) {
    if (!window.confirm("Delete this menu item?")) return;
    setUpdating(`menu-${itemKey}`);
    setError("");
    try {
      await apiRequest(
        `/admin/menu/${encodeURIComponent(itemKey)}`,
        token,
        { method: "DELETE" }
      );
      setNotice("Menu item deleted successfully.");
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not delete menu item.");
    } finally {
      setUpdating("");
    }
  }

  async function importExistingMenu() {
    if (
      !window.confirm(
        "Import the current customer menu into admin management? This will not overwrite an existing managed menu."
      )
    ) {
      return;
    }

    setUpdating("menu-import");
    setError("");
    setNotice("");
    try {
      const items = menuSections.flatMap((section) =>
        section.items.map((item) => ({
          name: item.name,
          category: section.title,
          description: "",
          price: item.prices[0],
          prices: item.prices,
          option_labels: item.optionLabels || [],
          icon: item.icon || section.icon,
          available: true,
        }))
      );
      const result = await apiRequest("/admin/menu/import-existing", token, {
        method: "POST",
        body: JSON.stringify({ items }),
      });
      setNotice(`Imported ${result.imported_items} existing menu items.`);
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not import the existing menu.");
    } finally {
      setUpdating("");
    }
  }

  async function changeStatus(type, id, status) {
    const key = `${type}-${id}`;
    setUpdating(key);
    setError("");

    try {
      const endpoint =
        type === "order"
          ? `/admin/orders/${id}`
          : `/admin/bookings/${id}`;

      await apiRequest(endpoint, token, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setNotice(
        type === "order"
          ? "Order status updated."
          : "Booking status updated."
      );
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not update status.");
    } finally {
      setUpdating("");
    }
  }

  async function updateReview(id, status) {
    const key = `review-${id}`;
    setUpdating(key);
    setError("");

    try {
      await apiRequest(`/admin/reviews/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setNotice("Review updated.");
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not update review.");
    } finally {
      setUpdating("");
    }
  }

  async function deleteReview(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this review?"
    );

    if (!confirmed) return;

    setUpdating(`review-${id}`);
    setError("");

    try {
      await apiRequest(`/admin/reviews/${id}`, token, {
        method: "DELETE",
      });

      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not delete review.");
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

  const pendingBookings = bookings.filter(
    (booking) => booking.status === "Pending"
  ).length;

  const pendingReviews = reviews.filter(
    (review) => review.status === "Pending"
  ).length;
  const normalizedOrderSearch = orderSearch.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      orderStatusFilter === "All" || order.status === orderStatusFilter;
    const searchableText = [
      order.order_number,
      order.customer_name,
      order.phone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      matchesStatus &&
      (!normalizedOrderSearch ||
        searchableText.includes(normalizedOrderSearch))
    );
  });
  const filteredBookings = bookings.filter(
    (booking) =>
      (bookingStatusFilter === "All" ||
        booking.status === bookingStatusFilter) &&
      (!bookingDateFilter || booking.booking_date === bookingDateFilter)
  );

  return (
    <div className="admin-dashboard">
      <PageMeta
        title="Admin Dashboard | The Cravings Cafe"
        description="Manage cafe orders, bookings, reviews, menu, and sales."
      />
      <header className="admin-header">
        <div className="admin-brand">
          <div className="admin-brand-icon">🍽️</div>
          <div>
            <h1>The Cravings Cafe</h1>
            <p>Administration Dashboard</p>
          </div>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw size={16} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-danger"
            onClick={logout}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <nav className="admin-navigation" aria-label="Dashboard sections">
        {[
          ["Overview", "overview"],
          ["Orders", "orders"],
          ["Bookings", "bookings"],
          ["Reviews", "reviews"],
          ["Customers", "customers"],
          ["Menu Management", "menu"],
          ["Manual Sales", "manual-sales"],
          ["Sales / Revenue", "sales"],
        ].map(([label, target]) => (
          <a key={target} href={`#${target}`}>
            {label}
          </a>
        ))}
      </nav>

      <main className="admin-main">
        {error && (
          <div className="admin-alert admin-alert-error">
            {error}
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}
        {notice && (
          <div className="admin-success" role="status">
            {notice}
          </div>
        )}

        <div className="admin-welcome" id="overview">
          <div>
            <h2>Dashboard Overview</h2>
            <p>
              Manage your cafe orders, table bookings, and customer
              reviews.
            </p>
          </div>
          <span className="admin-live-status">
            <span className="admin-live-dot" />
            Admin Panel
          </span>
        </div>

        <section className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon stat-orange">
              <ShoppingBag size={22} />
            </div>
            <div>
              <p>Orders · {salesDate}</p>
              <h3>{loading ? "…" : summary.today_orders ?? 0}</h3>
              <span>{summary.total_orders ?? orders.length} all time</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon stat-green">
              <IndianRupee size={22} />
            </div>
            <div>
              <p>Online Sales · {salesDate}</p>
              <h3>
                {loading
                  ? "…"
                  : money(dailySalesData.online_orders_total ?? 0)}
              </h3>
              <span>Completed customer orders</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon stat-green">
              <IndianRupee size={22} />
            </div>
            <div>
              <p>Total Sales · {salesDate}</p>
              <h3>
                {loading ? "…" : money(dailySalesData.total_sales ?? 0)}
              </h3>
              <span>Online plus manual</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon stat-orange">
              <IndianRupee size={22} />
            </div>
            <div>
              <p>Manual Sales · {salesDate}</p>
              <h3>
                {loading
                  ? "…"
                  : money(dailySalesData.manual_sales_total ?? 0)}
              </h3>
              <span>Separately recorded sales</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon stat-purple">
              <MessageSquare size={22} />
            </div>
            <div>
              <p>Total Reviews</p>
              <h3>
                {loading ? "…" : summary.total_reviews ?? reviews.length}
              </h3>
              <span>{pendingReviews} awaiting review</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon stat-red">
              <ShoppingBag size={22} />
            </div>
            <div>
              <p>Pending Orders</p>
              <h3>{loading ? "…" : pendingOrders}</h3>
              <span>Awaiting preparation</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon stat-purple">
              <CalendarDays size={22} />
            </div>
            <div>
              <p>Bookings · {salesDate}</p>
              <h3>{loading ? "…" : summary.today_bookings ?? 0}</h3>
              <span>{pendingBookings} pending all dates</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon stat-orange">
              <Users size={22} />
            </div>
            <div>
              <p>Total Customers</p>
              <h3>
                {loading ? "…" : summary.total_customers ?? customers.length}
              </h3>
              <span>From orders and bookings</span>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon stat-green">
              <Star size={22} />
            </div>
            <div>
              <p>Average Rating</p>
              <h3>
                {loading
                  ? "…"
                  : `${Number(summary.average_rating ?? 0).toFixed(1)}/5`}
              </h3>
              <span>{reviews.length} customer reviews</span>
            </div>
          </div>
        </section>

        <section className="admin-section" id="menu">
          <div className="admin-section-heading">
            <div>
              <h2><ShoppingBag size={21} /> Menu Management</h2>
              <p>Changes are saved to the backend and shown on the customer menu.</p>
            </div>
            {menuItems.length === 0 && !loading ? (
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={updating === "menu-import"}
                onClick={importExistingMenu}
              >
                {updating === "menu-import"
                  ? "Importing..."
                  : "Import Existing Menu"}
              </button>
            ) : (
              <span className="admin-count">
                {menuItems.length} managed items
              </span>
            )}
          </div>

          <form
            className="admin-record-card"
            onSubmit={saveMenuItem}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <label className="admin-status-control">
              <span>Item name</span>
              <input
                required
                maxLength={150}
                value={menuForm.name}
                onChange={(event) =>
                  setMenuForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="admin-status-control">
              <span>Category</span>
              <input
                required
                maxLength={100}
                value={menuForm.category}
                onChange={(event) =>
                  setMenuForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              />
            </label>
            <label className="admin-status-control">
              <span>Description</span>
              <input
                maxLength={500}
                value={menuForm.description}
                onChange={(event) =>
                  setMenuForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <label className="admin-status-control">
              <span>Price</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={menuForm.price}
                onChange={(event) =>
                  setMenuForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
              />
            </label>
            <label className="admin-status-control">
              <span>Price variants (comma-separated)</span>
              <input
                value={menuForm.prices}
                placeholder="110, 150"
                onChange={(event) =>
                  setMenuForm((current) => ({
                    ...current,
                    prices: event.target.value,
                  }))
                }
              />
            </label>
            <label className="admin-status-control">
              <span>Option labels (comma-separated)</span>
              <input
                value={menuForm.option_labels}
                placeholder="Half, Full"
                onChange={(event) =>
                  setMenuForm((current) => ({
                    ...current,
                    option_labels: event.target.value,
                  }))
                }
              />
            </label>
            <label className="admin-status-control">
              <span>Icon</span>
              <input
                maxLength={20}
                value={menuForm.icon}
                onChange={(event) =>
                  setMenuForm((current) => ({
                    ...current,
                    icon: event.target.value,
                  }))
                }
              />
            </label>
            <label className="admin-status-control">
              <span>Availability</span>
              <select
                value={String(menuForm.available)}
                onChange={(event) =>
                  setMenuForm((current) => ({
                    ...current,
                    available: event.target.value === "true",
                  }))
                }
              >
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
            </label>
            <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
              <button
                className="admin-btn admin-btn-success"
                type="submit"
                disabled={updating === "menu"}
              >
                {updating === "menu"
                  ? "Saving..."
                  : editingMenuKey
                    ? "Save Changes"
                    : "Add Item"}
              </button>
              {editingMenuKey && (
                <button
                  className="admin-btn admin-btn-secondary"
                  type="button"
                  onClick={() => {
                    setEditingMenuKey("");
                    setMenuForm({
                      name: "",
                      category: "",
                      description: "",
                      price: "",
                      prices: "",
                      option_labels: "",
                      icon: "🍽️",
                      available: true,
                    });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {loading && menuItems.length === 0 ? (
            <div className="admin-empty"><p>Loading menu...</p></div>
          ) : menuItems.length ? (
            <div className="admin-card-list">
              {menuItems.map((item) => (
                <article className="admin-record-card" key={item.item_key}>
                  <div className="admin-record-top">
                    <div>
                      <h3>{item.icon} {item.name}</h3>
                      <p>{item.category}{item.description ? ` · ${item.description}` : ""}</p>
                    </div>
                    <span className={`admin-status ${item.available ? "status-approved" : "status-cancelled"}`}>
                      {item.available ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  <div className="admin-record-bottom">
                    <strong>
                      {(item.prices || [item.price]).map(money).join(" / ")}
                    </strong>
                    <div className="admin-review-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={() => editMenuItem(item)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        disabled={updating === `menu-${item.item_key}`}
                        onClick={() => deleteMenuItem(item.item_key)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty">
              <p>No managed menu entries yet. The existing customer menu remains available until items are added.</p>
            </div>
          )}
        </section>

        <section className="admin-section" id="sales">
          <div className="admin-section-heading">
            <div>
              <h2>
                <IndianRupee size={21} />
                Daily Sales
              </h2>
              <p>Customer orders and separately recorded manual sales.</p>
            </div>
            <div className="admin-header-actions">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => selectSalesDate(new Date())}
              >
                Today
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  selectSalesDate(yesterday);
                }}
              >
                Yesterday
              </button>
              <label className="admin-status-control">
                <span>Sales date</span>
                <input
                  type="date"
                  value={salesDate}
                  onChange={(event) => {
                    const selectedDate = event.target.value;
                    setSalesDate(selectedDate);
                    if (!editingSaleId) {
                      setSaleForm((current) => ({
                        ...current,
                        sale_date: selectedDate,
                      }));
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
            {[
              [
                "Customer orders",
                `${dailySalesData.order_count ?? 0} orders`,
              ],
              [
                "Online order sales",
                money(dailySalesData.online_orders_total ?? 0),
              ],
              [
                "Manual sales",
                money(dailySalesData.manual_sales_total ?? 0),
              ],
              [
                "Total sales",
                money(dailySalesData.total_sales ?? 0),
              ],
            ].map(([label, value]) => (
              <div className="admin-stat-card" key={label}>
                <div className="admin-stat-icon stat-green">
                  <IndianRupee size={22} />
                </div>
                <div>
                  <p>{label} · {salesDate}</p>
                  <h3>{value}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className="admin-stat-card" style={{ marginBottom: 20 }}>
            <div className="admin-stat-icon stat-orange">
              <IndianRupee size={22} />
            </div>
            <div>
              <p>Manual sales by payment type</p>
              <span>
                Cash {money(dailySalesData.manual_sales_by_payment?.Cash ?? 0)}
                {" · "}UPI {money(dailySalesData.manual_sales_by_payment?.UPI ?? 0)}
                {" · "}Card {money(dailySalesData.manual_sales_by_payment?.Card ?? 0)}
                {" · "}Other {money(dailySalesData.manual_sales_by_payment?.Other ?? 0)}
              </span>
            </div>
          </div>

          <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
            {[
              ["Weekly online sales", weeklySalesData.online_sales_total],
              ["Weekly manual sales", weeklySalesData.manual_sales_total],
              ["Weekly total sales", weeklySalesData.total_sales],
              ["Monthly online sales", monthlySalesData.online_sales_total],
              ["Monthly manual sales", monthlySalesData.manual_sales_total],
              ["Monthly total sales", monthlySalesData.total_sales],
            ].map(([label, amount]) => (
              <div className="admin-stat-card" key={label}>
                <div className="admin-stat-icon stat-green">
                  <IndianRupee size={22} />
                </div>
                <div>
                  <p>{label} · {salesDate}</p>
                  <h3>{money(amount ?? 0)}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className="admin-card-list" style={{ marginBottom: 20 }}>
            <article className="admin-record-card">
              <h3>Weekly daily breakdown</h3>
              {weeklySalesData.days?.map((day) => (
                <div
                  className="admin-record-bottom"
                  key={day.sale_date}
                >
                  <span>{day.sale_date}</span>
                  <span>Online {money(day.online_sales)}</span>
                  <span>Manual {money(day.manual_sales)}</span>
                  <strong>{money(day.total_sales)}</strong>
                </div>
              ))}
              {!weeklySalesData.days?.length && (
                <p className="admin-muted">No weekly sales data.</p>
              )}
              <div className="admin-record-bottom">
                <strong>Weekly total</strong>
                <strong>{money(weeklySalesData.total_sales ?? 0)}</strong>
              </div>
            </article>
          </div>

          <div className="admin-stat-card" style={{ marginBottom: 20 }}>
            <div className="admin-stat-icon stat-orange">
              <IndianRupee size={22} />
            </div>
            <div>
              <p>Monthly manual sales by payment type</p>
              <span>
                Cash {money(monthlySalesData.payment_breakdown?.Cash ?? 0)}
                {" · "}UPI {money(monthlySalesData.payment_breakdown?.UPI ?? 0)}
                {" · "}Card {money(monthlySalesData.payment_breakdown?.Card ?? 0)}
                {" · "}Other {money(monthlySalesData.payment_breakdown?.Other ?? 0)}
              </span>
            </div>
          </div>

          <form
            id="manual-sales"
            className="admin-record-card"
            onSubmit={saveSale}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <label className="admin-status-control">
              <span>Amount</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={saleForm.amount}
                onChange={(event) =>
                  setSaleForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
            </label>
            <label className="admin-status-control">
              <span>Payment type</span>
              <select
                value={saleForm.payment_type}
                onChange={(event) =>
                  setSaleForm((current) => ({
                    ...current,
                    payment_type: event.target.value,
                  }))
                }
              >
                {["Cash", "UPI", "Card", "Other"].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="admin-status-control">
              <span>Description (optional)</span>
              <input
                maxLength={250}
                value={saleForm.description}
                onChange={(event) =>
                  setSaleForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <label className="admin-status-control">
              <span>Notes (optional)</span>
              <input
                maxLength={1000}
                value={saleForm.notes}
                onChange={(event) =>
                  setSaleForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
            <label className="admin-status-control">
              <span>Date</span>
              <input
                type="date"
                required
                value={saleForm.sale_date}
                onChange={(event) =>
                  setSaleForm((current) => ({
                    ...current,
                    sale_date: event.target.value,
                  }))
                }
              />
            </label>
            <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
              <button
                className="admin-btn admin-btn-success"
                type="submit"
                disabled={updating === "sale"}
              >
                {updating === "sale"
                  ? "Saving..."
                  : editingSaleId
                    ? "Save Changes"
                    : "Add Sale"}
              </button>
              {editingSaleId && (
                <button
                  className="admin-btn admin-btn-secondary"
                  type="button"
                  onClick={() => {
                    setEditingSaleId(null);
                    setSaleForm({
                      amount: "",
                      payment_type: "Cash",
                      description: "",
                      notes: "",
                      sale_date: salesDate,
                    });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {loading && !salesData.manual_sales?.length ? (
            <div className="admin-empty"><p>Loading sales...</p></div>
          ) : salesData.manual_sales?.length ? (
            <div className="admin-card-list">
              {salesData.manual_sales.map((sale) => (
                <article className="admin-record-card" key={sale.id}>
                  <div className="admin-record-top">
                    <div>
                      <h3>{money(sale.amount)} · {sale.payment_type}</h3>
                      <p>
                        {sale.description || "Manual sale"} · {sale.sale_date}
                        {sale.notes ? ` · ${sale.notes}` : ""}
                      </p>
                    </div>
                    <div className="admin-review-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={() => editSale(sale)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        disabled={updating === `sale-${sale.id}`}
                        onClick={() => deleteSale(sale.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty">
              <p>No manual sales recorded for this date.</p>
            </div>
          )}
        </section>

        <section className="admin-section" id="customers">
          <div className="admin-section-heading">
            <div>
              <h2><Users size={21} /> Customers</h2>
              <p>Customers derived from real orders and bookings.</p>
            </div>
            <span className="admin-count">{customers.length} customers</span>
          </div>
          {loading && customers.length === 0 ? (
            <div className="admin-empty"><p>Loading customers...</p></div>
          ) : customers.length ? (
            <div className="admin-card-list">
              {customers.map((customer) => (
                <article className="admin-record-card" key={customer.phone}>
                  <div className="admin-record-top">
                    <div>
                      <h3>{customer.customer_name}</h3>
                      <p>{customer.phone}</p>
                    </div>
                  </div>
                  <div className="admin-record-bottom">
                    <span>{customer.order_count} orders</span>
                    <strong>{money(customer.total_spent)}</strong>
                    <span>
                      Last order: {customer.last_order_date || "No orders"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty"><p>No customers found yet.</p></div>
          )}
        </section>

        <section className="admin-section" id="orders">
          <div className="admin-section-heading">
            <div>
              <h2>
                <ShoppingBag size={21} />
                Customer Orders
              </h2>
              <p>View orders and update their status.</p>
            </div>
            <span className="admin-count">{orders.length} orders</span>
          </div>

          <div className="admin-filter-row">
            <label className="admin-status-control">
              <span>Search order ID, customer, or phone</span>
              <input
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
              />
            </label>
            <label className="admin-status-control">
              <span>Order status</span>
              <select
                value={orderStatusFilter}
                onChange={(event) => setOrderStatusFilter(event.target.value)}
              >
                <option value="All">All</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <span className="admin-count">
              Showing {filteredOrders.length} of {orders.length}
            </span>
          </div>

          {loading && orders.length === 0 ? (
            <div className="admin-empty">
              <RefreshCw className="admin-spin" size={25} />
              <p>Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="admin-empty">
              <p>No orders found.</p>
            </div>
          ) : (
            <div className="admin-card-list">
              {filteredOrders.map((order) => {
                const orderId = order.order_number || order.id;
                const orderItems =
                  order.items || order.order_items || [];

                return (
                  <article
                    className="admin-record-card"
                    key={orderId}
                  >
                    <div className="admin-record-top">
                      <div>
                        <h3>Order #{order.order_number || orderId}</h3>
                        <p>
                          {order.customer_name ||
                            order.name ||
                            "Customer"}
                          {order.created_at && (
                            <>
                              {" · "}
                              {new Date(
                                order.created_at
                              ).toLocaleString("en-IN")}
                            </>
                          )}
                        </p>
                      </div>

                      <span
                        className={`admin-status status-${String(
                          order.status || "pending"
                        )
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {order.status || "Pending"}
                      </span>
                    </div>

                    <div className="admin-record-details">
                      {(order.customer_phone || order.phone) && (
                        <p>
                          <strong>Phone:</strong>{" "}
                          {order.customer_phone || order.phone}
                        </p>
                      )}

                      {order.customer_email && (
                        <p>
                          <strong>Email:</strong>{" "}
                          {order.customer_email}
                        </p>
                      )}

                      {order.order_type && (
                        <p>
                          <strong>Order type:</strong>{" "}
                          {order.order_type}
                        </p>
                      )}

                      {(order.delivery_address || order.address) && (
                        <p>
                          <strong>Address:</strong>{" "}
                          {order.delivery_address || order.address}
                        </p>
                      )}

                      {orderItems.length > 0 && (
                        <div className="admin-order-items">
                          <strong>Items</strong>
                          <ul>
                            {orderItems.map((item, index) => (
                              <li key={item.id || index}>
                                {item.name ||
                                  item.item_name ||
                                  item.menu_item_name ||
                                  "Menu item"}{" "}
                                {item.variant ? `(${item.variant}) ` : ""}
                                × {item.quantity || 1}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="admin-record-bottom">
                      <strong className="admin-record-total">
                        {money(
                          order.total_amount ??
                            order.total ??
                            order.total_price ??
                            0
                        )}
                      </strong>

                      <label className="admin-status-control">
                        <span>Update status</span>
                        <select
                          value={order.status || "Pending"}
                          disabled={updating === `order-${orderId}`}
                          onChange={(event) =>
                            changeStatus(
                              "order",
                              orderId,
                              event.target.value
                            )
                          }
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="admin-section" id="bookings">
          <div className="admin-section-heading">
            <div>
              <h2>
                <CalendarDays size={21} />
                Table Bookings
              </h2>
              <p>Review reservations and update their status.</p>
            </div>
            <span className="admin-count">
              {bookings.length} bookings
            </span>
          </div>

          <div className="admin-filter-row">
            <label className="admin-status-control">
              <span>Booking date</span>
              <input
                type="date"
                value={bookingDateFilter}
                onChange={(event) => setBookingDateFilter(event.target.value)}
              />
            </label>
            <label className="admin-status-control">
              <span>Booking status</span>
              <select
                value={bookingStatusFilter}
                onChange={(event) => setBookingStatusFilter(event.target.value)}
              >
                <option value="All">All</option>
                {BOOKING_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <span className="admin-count">
              Showing {filteredBookings.length} of {bookings.length}
            </span>
          </div>

          {loading && bookings.length === 0 ? (
            <div className="admin-empty"><p>Loading bookings...</p></div>
          ) : filteredBookings.length === 0 ? (
            <div className="admin-empty">
              <p>No bookings found.</p>
            </div>
          ) : (
            <div className="admin-card-list">
              {filteredBookings.map((booking) => {
                const bookingId = booking.booking_number || booking.id;

                return (
                  <article
                    className="admin-record-card"
                    key={bookingId}
                  >
                    <div className="admin-record-top">
                      <div>
                        <h3>Booking #{booking.booking_number || bookingId}</h3>
                        <p>
                          {booking.customer_name ||
                            booking.name ||
                            "Customer"}
                        </p>
                      </div>

                      <span
                        className={`admin-status status-${String(
                          booking.status || "pending"
                        )
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {booking.status || "Pending"}
                      </span>
                    </div>

                    <div className="admin-record-details">
                      {(booking.customer_phone || booking.phone) && (
                        <p>
                          <strong>Phone:</strong>{" "}
                          {booking.customer_phone || booking.phone}
                        </p>
                      )}

                      {(booking.customer_email || booking.email) && (
                        <p>
                          <strong>Email:</strong>{" "}
                          {booking.customer_email || booking.email}
                        </p>
                      )}

                      {(booking.booking_date || booking.date) && (
                        <p>
                          <strong>Date:</strong>{" "}
                          {booking.booking_date || booking.date}
                        </p>
                      )}

                      {(booking.booking_time || booking.time) && (
                        <p>
                          <strong>Time:</strong>{" "}
                          {booking.booking_time || booking.time}
                        </p>
                      )}

                      {(booking.number_of_guests ||
                        booking.guests ||
                        booking.people_count) && (
                        <p>
                          <strong>Guests:</strong>{" "}
                          {booking.number_of_guests ||
                            booking.guests ||
                            booking.people_count}
                        </p>
                      )}

                      {(booking.special_requests || booking.special_request) && (
                        <p>
                          <strong>Special requests:</strong>{" "}
                          {booking.special_requests || booking.special_request}
                        </p>
                      )}

                      {booking.created_at && (
                        <p>
                          <strong>Requested:</strong>{" "}
                          {new Date(
                            booking.created_at
                          ).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>

                    <div className="admin-record-bottom">
                      <span className="admin-muted">
                        Reservation
                      </span>

                      <label className="admin-status-control">
                        <span>Update status</span>
                        <select
                          value={booking.status || "Pending"}
                          disabled={
                            updating === `booking-${bookingId}`
                          }
                          onChange={(event) =>
                            changeStatus(
                              "booking",
                              bookingId,
                              event.target.value
                            )
                          }
                        >
                          {BOOKING_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="admin-section" id="reviews">
          <div className="admin-section-heading">
            <div>
              <h2>
                <MessageSquare size={21} />
                Customer Reviews
              </h2>
              <p>
                Approve reviews to publish them, reject unsuitable
                reviews, or delete reviews permanently.
              </p>
            </div>

            <span className="admin-count">
              {pendingReviews} pending · {reviews.length} total
            </span>
          </div>

          {loading && reviews.length === 0 ? (
            <div className="admin-empty"><p>Loading reviews...</p></div>
          ) : reviews.length === 0 ? (
            <div className="admin-empty">
              <MessageSquare size={32} />
              <h3>No reviews found</h3>
              <p>
                Customer reviews will appear here when submitted.
              </p>
            </div>
          ) : (
            <div className="admin-card-list">
              {reviews.map((review) => {
                const reviewId = review.id;
                const reviewStatus = review.status || "Pending";
                const isUpdating =
                  updating === `review-${reviewId}`;

                return (
                  <article
                    className="admin-record-card admin-review-card"
                    key={reviewId}
                  >
                    <div className="admin-record-top">
                      <div>
                        <h3>
                          {review.customer_name ||
                            review.name ||
                            "Anonymous customer"}
                        </h3>

                        {review.created_at && (
                          <p>
                            {new Date(
                              review.created_at
                            ).toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>

                      <span
                        className={`admin-status status-${String(
                          reviewStatus
                        )
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {reviewStatus}
                      </span>
                    </div>

                    <div className="admin-review-rating">
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          size={18}
                          fill={
                            index < Number(review.rating || 0)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      ))}

                      <span>
                        {Number(review.rating || 0)}/5
                      </span>
                    </div>

                    <p className="admin-review-text">
                      {review.review_text ||
                        review.comment ||
                        "No review text provided."}
                    </p>

                    <div className="admin-review-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-success"
                        disabled={isUpdating}
                        onClick={() =>
                          updateReview(reviewId, "Approved")
                        }
                      >
                        <CheckCircle size={16} />
                        Approve
                      </button>

                      <button
                        type="button"
                        className="admin-btn admin-btn-warning"
                        disabled={isUpdating}
                        onClick={() =>
                          updateReview(reviewId, "Rejected")
                        }
                      >
                        <XCircle size={16} />
                        Reject
                      </button>

                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        disabled={isUpdating}
                        onClick={() => deleteReview(reviewId)}
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>

                      {isUpdating && (
                        <span className="admin-muted">
                          Updating...
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="admin-footer">
          <p>
            © {new Date().getFullYear()} The Cravings Cafe ·
            Administration Dashboard
          </p>
        </footer>
      </main>
    </div>
  );
}
