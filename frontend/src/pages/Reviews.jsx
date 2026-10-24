
import { useCallback, useEffect, useState } from "react";
import { Star, MessageSquare, Send, LoaderCircle } from "lucide-react";
import PageMeta from "../components/PageMeta";
import { apiUrl } from "../lib/api";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadReviews = useCallback(async () => {
    try {
      const response = await fetch(apiUrl("/reviews"));
      if (!response.ok) {
        throw new Error("Unable to load reviews.");
      }
      const data = await response.json();
      setReviews(Array.isArray(data) ? data : []);
      setError("");
    } catch {
      setError("We couldn't load reviews right now. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReviews();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadReviews]);


  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!customerName.trim() || reviewText.trim().length < 5) {
      setError("Enter your name and a review of at least 5 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(apiUrl("/reviews"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          rating,
          review_text: reviewText.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to submit your review."
        );
      }

      setMessage(
        "Thank you for sharing your experience! Your review is pending admin approval."
      );
      setCustomerName("");
      setRating(5);
      setReviewText("");
    } catch (err) {
      setError(err.message || "Unable to submit your review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] px-5 py-14 text-[#241b16] md:py-20">
      <PageMeta
        title="Customer Reviews | The Cravings Cafe"
        description="Read approved customer reviews and share your experience at The Cravings Cafe."
      />
      <section className="mx-auto max-w-5xl">
        {/* Page heading */}
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#b84a2f]">
            The Cravings Cafe
          </p>

          <h1 className="mb-4 text-4xl font-bold md:text-5xl">
            Your Words Matter
          </h1>

          <p className="mx-auto max-w-xl text-[#78685d]">
            Had a lovely meal with us? Share your experience and help us make
            every visit special.
          </p>
        </div>

        {/* Review form */}
        <div className="mx-auto mb-16 max-w-2xl rounded-3xl border border-[#ead8c7] bg-[#fffaf5] p-6 shadow-sm md:p-9">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-[#f8e5d9] p-3 text-[#b84a2f]">
              <MessageSquare size={23} />
            </div>

            <div>
              <h2 className="text-xl font-bold">Write a Review</h2>
              <p className="text-sm text-[#78685d]">
                Tell us about your cafe experience.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="customerName"
                className="mb-2 block text-sm font-semibold"
              >
                Your Name
              </label>

              <input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                maxLength={100}
                required
                placeholder="Enter your name"
                className="w-full rounded-xl border border-[#e5d4c5] bg-white px-4 py-3 outline-none transition focus:border-[#b84a2f] focus:ring-2 focus:ring-[#b84a2f]/15"
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">
                Your Rating
              </legend>

              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} star${value > 1 ? "s" : ""}`}
                    aria-pressed={rating === value}
                    onClick={() => setRating(value)}
                    className="rounded-lg p-1 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#b84a2f]"
                  >
                    <Star
                      size={30}
                      fill={value <= rating ? "#d97706" : "transparent"}
                      color={value <= rating ? "#d97706" : "#c9b8a8"}
                    />
                  </button>
                ))}

                <span className="ml-2 text-sm text-[#78685d]">
                  {rating} out of 5
                </span>
              </div>
            </fieldset>

            <div>
              <label
                htmlFor="reviewText"
                className="mb-2 block text-sm font-semibold"
              >
                Your Experience
              </label>

              <textarea
                id="reviewText"
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                minLength={5}
                maxLength={1000}
                rows={5}
                required
                placeholder="What did you enjoy about your visit?"
                className="w-full resize-y rounded-xl border border-[#e5d4c5] bg-white px-4 py-3 outline-none transition focus:border-[#b84a2f] focus:ring-2 focus:ring-[#b84a2f]/15"
              />

              <p className="mt-1 text-right text-xs text-[#78685d]">
                {reviewText.length}/1000 characters
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="rounded-xl bg-green-50 p-3 text-sm text-green-800"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#b84a2f] px-6 py-3.5 font-semibold text-white transition hover:bg-[#963a25] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit Review
                </>
              )}
            </button>

            <p className="text-center text-xs text-[#78685d]">
              Reviews appear publicly only after approval by our cafe team.
            </p>
          </form>
        </div>

        {/* Approved customer reviews */}
        <section>
          <div className="mb-7 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#b84a2f]">
              From Our Customers
            </p>
            <h2 className="text-3xl font-bold">Customer Love</h2>
          </div>

          {loading ? (
            <p className="py-10 text-center text-[#78685d]">
              Loading customer reviews...
            </p>
          ) : error && reviews.length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-4 text-[#78685d]">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  void loadReviews();
                }}
                className="font-semibold text-[#b84a2f] underline"
              >
                Try again
              </button>
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dfcbbb] px-6 py-12 text-center">
              <MessageSquare
                size={30}
                className="mx-auto mb-3 text-[#b84a2f]"
              />
              <h3 className="mb-2 font-semibold">
                Be the first to share your experience!
              </h3>
              <p className="text-sm text-[#78685d]">
                Approved customer reviews will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl border border-[#ead8c7] bg-[#fffaf5] p-6 shadow-sm"
                >
                  <div
                    className="mb-4 flex gap-1"
                    aria-label={`${review.rating} out of 5 stars`}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        size={17}
                        fill={value <= review.rating ? "#d97706" : "transparent"}
                        color={value <= review.rating ? "#d97706" : "#c9b8a8"}
                      />
                    ))}
                  </div>

                  <p className="mb-5 whitespace-pre-wrap break-words leading-7 text-[#514239]">
                    {review.review_text}
                  </p>

                  <div className="border-t border-[#ead8c7] pt-4">
                    <p className="font-bold">{review.customer_name}</p>
                    <p className="mt-1 text-xs text-[#78685d]">
                      Verified publication ·{" "}
                      {review.created_at
                        ? new Date(review.created_at).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
