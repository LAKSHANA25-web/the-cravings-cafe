
import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  ShoppingBag,
  Clock,
  CheckCircle,
  IndianRupee,
} from "lucide-react";
import "./AdminDashboard.css";

const API = "https://the-cravings-cafe-api.onrender.com";

const STATUSES = [
  "Pending",
  "Preparing",
  "Ready",
  "Completed",
  "Cancelled",
];

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");

  const loadDashboard = useCallback(async () => {
    setError("");

    try {
      const [ordersResponse, summaryResponse] = await Promise.all([
        fetch(`${API}/orders`),
        fetch(`${API}/admin/summary`),
      ]);

      if (!ordersResponse.ok) {
        throw new Error("Unable to load orders.");
      }

      if (!summaryResponse.ok) {
        throw new Error(
          "Unable to load the admin summary. Check the backend endpoint."
        );
      }

      const ordersData = await ordersResponse.json();
      const summaryData = await summaryResponse.json();

      setOrders(
        Array.isArray(ordersData)
          ? ordersData
          : ordersData.orders || []
      );
      setSummary(summaryData);
    } catch (err) {
      setError(
        err.message ||
          "Cannot connect to the backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const [ordersResponse, summaryResponse] = await Promise.all([
          fetch(`${API}/orders`),
          fetch(`${API}/admin/summary`),
        ]);

        if (!ordersResponse.ok || !summaryResponse.ok) {
          throw new Error("Unable to load dashboard data.");
        }

        const ordersData = await ordersResponse.json();
        const summaryData = await summaryResponse.json();

        if (active) {
          setOrders(
            Array.isArray(ordersData)
              ? ordersData
              : ordersData.orders || []
          );
          setSummary(summaryData);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err.message ||
              "Cannot connect to the backend. Check that FastAPI is running."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, []);

  async function changeStatus(orderNumber, status) {
    setUpdating(orderNumber);
    setError("");

    try {
      const response = await fetch(
        `${API}/orders/${encodeURIComponent(orderNumber)}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || "Status update failed."
        );
      }

      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not update order status.");
    } finally {
      setUpdating("");
    }
  }

  const pendingCount = orders.filter(
    (order) => order.status === "Pending"
  ).length;

  const completedCount = orders.filter(
    (order) => order.status === "Completed"
  ).length;

  if (loading) {
    return (
      <main className="admin-page">
        <p>Loading cafe dashboard...</p>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">THE CRAVINGS CAFE</p>
          <h1>Admin Dashboard</h1>
          <p>Manage customer orders and their status.</p>
        </div>

        <button
          className="admin-refresh"
          type="button"
          onClick={loadDashboard}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
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
          <strong>
            {summary.total_orders ?? orders.length}
          </strong>
        </article>

        <article className="admin-stat">
          <Clock />
          <span>Pending Orders</span>
          <strong>
            {summary.pending_orders ?? pendingCount}
          </strong>
        </article>

        <article className="admin-stat">
          <CheckCircle />
          <span>Completed Orders</span>
          <strong>
            {summary.completed_orders ?? completedCount}
          </strong>
        </article>

        <article className="admin-stat">
          <IndianRupee />
          <span>Completed Sales</span>
          <strong>
            {money(summary.completed_sales)}
          </strong>
        </article>
      </section>

      <section className="admin-orders">
        <div className="admin-section-heading">
          <h2>Customer Orders</h2>
          <span>{orders.length} records</span>
        </div>

        {orders.length === 0 ? (
          <div className="admin-empty">
            No orders found.
          </div>
        ) : (
          orders.map((order) => (
            <article
              className="admin-order-card"
              key={order.order_number}
            >
              <div className="admin-order-top">
                <div>
                  <p className="admin-order-number">
                    {order.order_number}
                  </p>

                  <h3>
                    {order.customer_name || order.name || "Customer"}
                  </h3>

                  <p>{order.phone || order.customer_phone || ""}</p>
                </div>

                <strong className="admin-order-total">
                  {money(order.total)}
                </strong>
              </div>

              <div className="admin-order-details">
                <span>{order.order_type || "Pickup"}</span>
                <span>Status: {order.status || "Pending"}</span>
              </div>

              {order.address && (
                <p className="admin-address">
                  Delivery address: {order.address}
                </p>
              )}

              <div className="admin-item-list">
                {(order.items || []).map((item, index) => (
                  <div
                    className="admin-item"
                    key={`${item.id || item.name}-${index}`}
                  >
                    <span>
                      {item.icon || "🍽️"} {item.name} ×{" "}
                      {item.quantity}
                    </span>

                    <strong>
                      {money(
                        (Number(item.price) || 0) *
                          (Number(item.quantity) || 0)
                      )}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="admin-status-row">
                <label htmlFor={`status-${order.order_number}`}>
                  Update status
                </label>

                <select
                  id={`status-${order.order_number}`}
                  value={order.status || "Pending"}
                  disabled={updating === order.order_number}
                  onChange={(event) =>
                    changeStatus(
                      order.order_number,
                      event.target.value
                    )
                  }
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                {updating === order.order_number && (
                  <span>Updating...</span>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      <p className="admin-note">
        Development dashboard. Secure the admin endpoints with
        authentication before public deployment.
      </p>
    </main>
  );
}
