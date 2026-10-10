
import { useState } from "react";
import { CalendarDays, Clock, Users, CheckCircle } from "lucide-react";

const API = "http://127.0.0.1:8000";

export default function Booking() {
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    booking_date: "",
    booking_time: "19:00",
    guests: "2",
    special_request: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          customer_name: form.customer_name.trim(),
          phone: form.phone,
          guests: Number(form.guests),
          special_request: form.special_request.trim() || null,
          booking_time: `${form.booking_time}:00`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail || "Booking failed")
        );
      }

      setResult(data);
      setForm({
        customer_name: "",
        phone: "",
        booking_date: "",
        booking_time: "19:00",
        guests: "2",
        special_request: "",
      });
    } catch (err) {
      setError(err.message || "Cannot connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="booking-page">
      <header className="booking-heading">
        <span className="booking-eyebrow">THE CRAVINGS CAFE</span>
        <h1>Book Your Table</h1>
        <p>Make time for good food and great company.</p>
      </header>

      {result ? (
        <section className="booking-card booking-success">
          <CheckCircle size={48} />
          <h2>Booking Request Received!</h2>
          <p>Your booking request has been saved.</p>
          <div className="booking-number">
            Booking Number
            <strong>{result.booking_number}</strong>
          </div>
          <p>Date: {result.booking_date}</p>
          <p>Time: {result.booking_time}</p>
          <p>Guests: {result.guests}</p>
          <p>Status: {result.status}</p>
          <p className="booking-note">
            Your reservation is pending confirmation by the cafe.
          </p>
          <button
            className="booking-submit"
            onClick={() => setResult(null)}
          >
            Make Another Booking
          </button>
        </section>
      ) : (
        <form className="booking-card" onSubmit={submit}>
          <h2>Your Reservation</h2>

          <label htmlFor="customer_name">Full Name</label>
          <input
            id="customer_name"
            name="customer_name"
            value={form.customer_name}
            onChange={change}
            placeholder="Enter your name"
            maxLength={100}
            required
          />

          <label htmlFor="phone">Mobile Number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone: e.target.value.replace(/\D/g, "").slice(0, 10),
              })
            }
            placeholder="10-digit mobile number"
            pattern="[6-9][0-9]{9}"
            title="Enter a valid 10-digit Indian mobile number"
            required
          />

          <div className="booking-row">
            <div>
              <label htmlFor="booking_date">
                <CalendarDays size={16} /> Booking Date
              </label>
              <input
                id="booking_date"
                name="booking_date"
                type="date"
                min={minDate}
                value={form.booking_date}
                onChange={change}
                required
              />
            </div>

            <div>
              <label htmlFor="booking_time">
                <Clock size={16} /> Booking Time
              </label>
              <select
                id="booking_time"
                name="booking_time"
                value={form.booking_time}
                onChange={change}
              >
                {[
                  "11:00", "11:30", "12:00", "12:30",
                  "13:00", "13:30", "14:00", "14:30",
                  "17:00", "17:30", "18:00", "18:30",
                  "19:00", "19:30", "20:00", "20:30",
                  "21:00", "21:30",
                ].map((time) => (
                  <option key={time} value={time}>
                    {new Date(`2000-01-01T${time}:00`).toLocaleTimeString(
                      "en-IN",
                      { hour: "numeric", minute: "2-digit" }
                    )}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label htmlFor="guests">
            <Users size={16} /> Number of Guests
          </label>
          <select
            id="guests"
            name="guests"
            value={form.guests}
            onChange={change}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "Guest" : "Guests"}
              </option>
            ))}
          </select>

          <label htmlFor="special_request">
            Special Request (Optional)
          </label>
          <textarea
            id="special_request"
            name="special_request"
            value={form.special_request}
            onChange={change}
            placeholder="Birthday celebration, preferred seating, etc."
            maxLength={500}
            rows={3}
          />

          {error && (
            <p className="booking-error" role="alert">{error}</p>
          )}

          <button
            type="submit"
            className="booking-submit"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Request a Table"}
          </button>

          <p className="booking-note">
            Your booking remains pending until confirmed by the cafe.
          </p>
        </form>
      )}
    </main>
  );
}
