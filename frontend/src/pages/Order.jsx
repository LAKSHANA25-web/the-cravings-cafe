
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  CheckCircle,
  Minus,
  Plus,
} from "lucide-react";

import { useCart } from "../context/useCart.js";
import PageMeta from "../components/PageMeta";
import { apiUrl } from "../lib/api";
import "./Order.css";

export default function Order() {
  const {
    cart,
    cartCount,
    cartTotal,
    addToCart,
    removeFromCart,
    removeItem,
    clearCart,
  } = useCart();

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const [orderType, setOrderType] = useState("Pickup");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (cart.length === 0) {
      setError("Your cart is empty. Please add items from the menu.");
      return;
    }

    if (!customer.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(customer.phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (orderType === "Delivery" && !customer.address.trim()) {
      setError("Please enter your delivery address.");
      return;
    }

    const orderData = {
      customer_name: customer.name.trim(),
      phone: customer.phone,
      email: customer.email.trim() || null,
      order_type: orderType,
      address:
        orderType === "Delivery"
          ? customer.address.trim()
          : null,
      items: cart.map((item) => ({
        id: String(item.id),
        menu_item_id: item.menu_item_id || null,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        variant: item.variant || null,
        icon: item.icon || "🍽️",
      })),
    };

    setLoading(true);

    try {
      const response = await fetch(apiUrl("/orders"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = data.detail;
        const detailMessage = Array.isArray(detail)
          ? detail
              .map((issue) => issue.msg)
              .filter(Boolean)
              .join(" ")
          : detail;

        const message =
          typeof detailMessage === "string" && detailMessage
            ? detailMessage
            : `Unable to place your order (HTTP ${response.status}). Please check your details.`;

        throw new Error(message);
      }

      if (
        typeof data.order_number !== "string" ||
        !data.order_number.trim()
      ) {
        throw new Error(
          "The server did not confirm your order. Your cart has been kept."
        );
      }

      setOrderNumber(data.order_number);
      setMessage(
        `Your order has been saved successfully! Order number: ${data.order_number}`
      );

      clearCart();
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the cafe server. Please check that the backend is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  if (orderNumber) {
    return (
      <main className="order-page">
        <PageMeta
          title="Order Confirmed | The Cravings Cafe"
          description="Your online order was submitted to The Cravings Cafe."
        />
        <div className="order-heading">
          <span className="order-eyebrow">
            THE CRAVINGS CAFE
          </span>
          <h1>Order Received!</h1>
          <p>Thank you for ordering with us.</p>
        </div>

        <div
          className="order-form"
          style={{ textAlign: "center" }}
        >
          <CheckCircle
            size={55}
            color="#b84a2f"
            style={{ margin: "0 auto 20px" }}
          />

          <h2 style={{ justifyContent: "center" }}>
            Order Confirmation
          </h2>

          <p>Your order number is</p>

          <h2
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              margin: "18px 0",
            }}
          >
            {orderNumber}
          </h2>

          <p>{message}</p>

          <p style={{ marginTop: "12px" }}>
            Your order is currently Pending.
          </p>

          <p className="order-note">
            Please keep your order number for reference.
            Payment and fulfilment arrangements are not
            handled by this website yet.
          </p>

          <Link
            to="/menu"
            className="place-order-btn"
            style={{
              display: "block",
              textAlign: "center",
              textDecoration: "none",
              marginTop: "24px",
            }}
          >
            Back to Menu
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="order-page">
      <PageMeta
        title="Cart & Checkout | The Cravings Cafe"
        description="Review your cafe order, update quantities, and submit your order."
      />
      <div className="order-heading">
        <span className="order-eyebrow">
          THE CRAVINGS CAFE
        </span>

        <h1>Let's Get You Fed!</h1>

        <p>Fresh cravings, made just for you.</p>
      </div>

      <div
        className="order-layout"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "30px",
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "20px",
          alignItems: "start",
        }}
      >
        <form className="order-form" onSubmit={handleSubmit}>
          <h2>
            <ShoppingBag size={22} />
            Your Details
          </h2>

          <label htmlFor="customer-name">
            Full Name
          </label>

          <input
            id="customer-name"
            required
            placeholder="Enter your full name"
            value={customer.name}
            onChange={(e) =>
              setCustomer({
                ...customer,
                name: e.target.value,
              })
            }
          />

          <label htmlFor="customer-email">Email (optional)</label>
          <input
            id="customer-email"
            type="email"
            maxLength={254}
            placeholder="you@example.com"
            value={customer.email}
            onChange={(event) =>
              setCustomer({
                ...customer,
                email: event.target.value,
              })
            }
          />

          <label htmlFor="customer-phone">
            Mobile Number
          </label>

          <input
            id="customer-phone"
            required
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit mobile number"
            value={customer.phone}
            onChange={(e) =>
              setCustomer({
                ...customer,
                phone: e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10),
              })
            }
          />

          <label>Order Type</label>

          <div className="order-type-options">
            {["Pickup", "Delivery"].map((type) => (
              <button
                key={type}
                type="button"
                className={
                  orderType === type ? "selected" : ""
                }
                onClick={() => setOrderType(type)}
              >
                {type === "Pickup" ? "🏃" : "🛵"}{" "}
                {type}
              </button>
            ))}
          </div>

          {orderType === "Delivery" && (
            <>
              <label htmlFor="customer-address">
                Delivery Address
              </label>

              <textarea
                id="customer-address"
                required
                placeholder="Enter complete delivery address"
                value={customer.address}
                onChange={(e) =>
                  setCustomer({
                    ...customer,
                    address: e.target.value,
                  })
                }
              />
            </>
          )}

          <button
            className="place-order-btn"
            type="submit"
            disabled={loading || cart.length === 0}
          >
            {loading ? (
              "Placing Order..."
            ) : (
              <>
                Place Order
                <CheckCircle size={18} />
              </>
            )}
          </button>

          {error && (
            <p className="order-message" role="alert">
              {error}
            </p>
          )}

          <p className="order-note">
            Orders are saved to the cafe backend.
            Payment is not collected online.
          </p>
        </form>

        <div className="order-form">
          <h2>Your Order ({cartCount})</h2>

          {cart.length === 0 ? (
            <div>
              <p>
                Your cart is empty. Visit the Menu page
                to add items.
              </p>

              <Link to="/menu">
                Browse Menu
              </Link>
            </div>
          ) : (
            <>
              {cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "15px 0",
                    borderBottom: "1px solid #ead8c8",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>
                      {item.icon || "🍽️"}
                    </span>

                    <div style={{ flex: 1 }}>
                      <strong>{item.name}</strong>
                      {item.variant && <span> · {item.variant}</span>}

                      <p
                        style={{
                          fontSize: "13px",
                          marginTop: "5px",
                        }}
                      >
                        ₹{item.price} each
                      </p>
                    </div>

                    <strong>
                      ₹{item.price * item.quantity}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginTop: "10px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        removeFromCart(item.id)
                      }
                      aria-label={`Remove one ${item.name}`}
                    >
                      <Minus size={16} />
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      disabled={item.quantity >= 100}
                      aria-label={`Add one ${item.name}`}
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.name} from cart`}
                      className="ml-auto text-sm font-semibold text-[#a54029] underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="mt-5 flex justify-between border-t border-[#ead8c5] pt-5">
                <span>Subtotal</span>
                <span>₹{cartTotal}</span>
              </div>
              <div className="mt-2 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>₹{cartTotal}</span>
              </div>
              <button
                type="button"
                onClick={clearCart}
                className="mt-4 text-sm font-semibold text-[#a54029] underline"
              >
                Clear cart
              </button>

              <p className="order-note">
                Final charges, if applicable, are not
                included in this estimate.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
