import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Star } from "lucide-react";
import PageMeta from "../components/PageMeta";
import { useCart } from "../context/useCart.js";
import { cafeContact } from "../siteInfo";
import { apiUrl } from "../lib/api";

function formatPrice(item) {
  const prices = (item.prices?.length ? item.prices : [item.price])
    .map(Number)
    .filter((price) => Number.isFinite(price) && price > 0);
  if (!prices.length) return "";
  if (prices.length === 1) return `₹${prices[0]}`;
  return `₹${Math.min(...prices)} – ₹${Math.max(...prices)}`;
}

export default function Home() {
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [menuState, setMenuState] = useState("loading");
  const [reviewState, setReviewState] = useState("loading");
  const { addToCart } = useCart();

  useEffect(() => {
    const controller = new AbortController();

    async function loadHomeContent() {
      let menuResult;
      let reviewResult;
      try {
        [menuResult, reviewResult] = await Promise.allSettled([
          fetch(apiUrl("/menu"), { signal: controller.signal }).then(
            (response) => {
              if (!response.ok) {
                throw new Error(
                  `Menu request failed (HTTP ${response.status}).`
                );
              }
              return response.json();
            }
          ),
          fetch(apiUrl("/reviews"), { signal: controller.signal }).then(
            (response) => {
              if (!response.ok) {
                throw new Error(
                  `Reviews request failed (HTTP ${response.status}).`
                );
              }
              return response.json();
            }
          ),
        ]);
      } catch {
        if (!controller.signal.aborted) {
          setMenuState("error");
          setReviewState("error");
        }
        return;
      }

      if (controller.signal.aborted) return;

      if (menuResult.status === "fulfilled" && Array.isArray(menuResult.value)) {
        setMenuItems(
          menuResult.value
            .filter((item) => !item.deleted && item.available !== false)
            .slice(0, 4)
        );
        setMenuState("ready");
      } else {
        setMenuState("error");
      }

      if (
        reviewResult.status === "fulfilled" &&
        Array.isArray(reviewResult.value)
      ) {
        setReviews(reviewResult.value.slice(0, 3));
        setReviewState("ready");
      } else {
        setReviewState("error");
      }
    }

    void loadHomeContent();
    return () => controller.abort();
  }, []);

  function addFeaturedItem(item) {
    const price = Number(item.prices?.[0] ?? item.price);
    if (!Number.isFinite(price) || price <= 0) return;
    addToCart({
      id: `${item.item_key}__${price}`,
      menu_item_id: item.item_key,
      name: item.name,
      icon: item.icon || "🍽️",
      price,
      variant: item.option_labels?.[0] || null,
    });
  }

  return (
    <main className="bg-[#f7f1e8] text-[#241b17]">
      <PageMeta
        title="The Cravings Cafe | Eat, Sip, Relax"
        description="Discover the menu, order online, book a table, and visit The Cravings Cafe at Avinashi Bypass."
      />
      <section className="relative overflow-hidden">
        <div className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 px-5 py-16 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.3em] text-[#b84a2f]">
              THE CRAVINGS CAFE
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-tight text-[#171717] sm:text-6xl lg:text-7xl">
              Good food for
              <br />
              hungry miles.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#665b53]">
              Take a pause, settle in, and find something delicious for every
              craving at our cafe on Avinashi Bypass.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/menu"
                className="rounded-full bg-[#b84a2f] px-7 py-3.5 font-semibold text-white transition hover:bg-[#963a24]"
              >
                View Menu
              </Link>
              <Link
                to="/order"
                className="rounded-full border border-[#b9aa9b] px-7 py-3.5 font-semibold text-[#171717] transition hover:bg-[#171717] hover:text-white"
              >
                Order Now
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="flex aspect-square flex-col items-center justify-center rounded-[2rem] bg-[#ead8c7] p-10 text-center shadow-xl">
              <span aria-hidden="true" className="text-8xl">☕</span>
              <p className="mt-7 text-3xl font-black leading-tight text-[#40291f]">
                Eat.
                <br />
                Sip.
                <br />
                Relax.
              </p>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#8e442d]">
                Your cafe stop on Avinashi Bypass
              </p>
            </div>
            <div className="absolute -bottom-5 -left-3 rounded-2xl border border-[#ead8c7] bg-[#fffaf5] px-5 py-4 shadow-lg sm:-left-8">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#9a563b]">
                Good things
              </p>
              <p className="mt-1 font-bold text-[#40291f]">Made for your break</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#241b17] py-12 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:grid-cols-3 md:px-8">
          {[
            ["Fresh cravings", "Find a little something for every appetite."],
            ["Easy ordering", "Browse the current menu and order online."],
            ["A place to pause", "Stop by our cafe on Avinashi Bypass."],
          ].map(([title, description]) => (
            <article key={title}>
              <h2 className="text-xl font-bold text-[#e9a17f]">{title}</h2>
              <p className="mt-2 leading-7 text-[#f2e6db]">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#b84a2f]">
              FROM OUR CURRENT MENU
            </p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">A few to try</h2>
          </div>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 font-semibold text-[#a54029] hover:underline"
          >
            Browse the menu <ArrowRight size={17} />
          </Link>
        </div>

        {menuState === "loading" ? (
          <p className="rounded-2xl bg-[#fffaf5] p-8 text-center text-[#75665c]">
            Loading the latest menu...
          </p>
        ) : menuState === "error" ? (
          <p className="rounded-2xl border border-[#ead8c7] bg-[#fffaf5] p-8 text-center text-[#75665c]">
            We couldn&apos;t load the menu just now. Please visit the menu page
            to try again.
          </p>
        ) : menuItems.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#dfcbbb] bg-[#fffaf5] p-8 text-center text-[#75665c]">
            Our menu is being updated. Please check back shortly.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {menuItems.map((item) => (
              <article
                key={item.item_key}
                className="flex flex-col rounded-2xl border border-[#ead8c7] bg-[#fffaf5] p-5 shadow-sm"
              >
                <div
                  aria-hidden="true"
                  className="mb-4 grid aspect-[4/3] place-items-center rounded-xl bg-[#f5e7d9] text-6xl"
                >
                  {item.icon || "🍽️"}
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a54029]">
                  {item.category}
                </p>
                <h3 className="mt-2 text-lg font-bold">{item.name}</h3>
                {item.description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#75665c]">
                    {item.description}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <strong className="text-lg">{formatPrice(item)}</strong>
                  <button
                    type="button"
                    onClick={() => addFeaturedItem(item)}
                    className="rounded-full bg-[#b84a2f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#963a24]"
                    aria-label={`Add ${item.name} to cart`}
                  >
                    Add
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bg-[#efe2d4] px-5 py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#b84a2f]">
              YOUR CAFE EXPERIENCE
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Make room for a good pause.
            </h2>
            <p className="mt-5 max-w-xl leading-8 text-[#665b53]">
              Whether you&apos;re stopping in or planning a meal with friends,
              explore the menu, place an order, or request a table.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link
              to="/book-table"
              className="rounded-full bg-[#241b17] px-6 py-3 font-semibold text-white hover:bg-[#493126]"
            >
              Book a Table
            </Link>
            <Link
              to="/contact"
              className="rounded-full border border-[#b9aa9b] px-6 py-3 font-semibold text-[#241b17] hover:bg-[#fffaf5]"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#b84a2f]">
              CUSTOMER REVIEWS
            </p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Shared by our guests
            </h2>
          </div>
          <Link
            to="/reviews"
            className="inline-flex items-center gap-2 font-semibold text-[#a54029] hover:underline"
          >
            Read and write reviews <ArrowRight size={17} />
          </Link>
        </div>

        {reviewState === "loading" ? (
          <p className="rounded-2xl bg-[#fffaf5] p-8 text-center text-[#75665c]">
            Loading approved reviews...
          </p>
        ) : reviewState === "error" ? (
          <p className="rounded-2xl bg-[#fffaf5] p-8 text-center text-[#75665c]">
            Customer reviews are temporarily unavailable.
          </p>
        ) : reviews.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#dfcbbb] bg-[#fffaf5] p-8 text-center text-[#75665c]">
            Approved customer reviews will appear here.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-[#ead8c7] bg-[#fffaf5] p-6"
              >
                <div className="mb-4 flex gap-1" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: Math.min(5, Math.max(0, review.rating)) }, (_, index) => (
                    <Star key={index} size={17} fill="#d97706" color="#d97706" />
                  ))}
                </div>
                <p className="line-clamp-4 whitespace-pre-wrap break-words leading-7 text-[#514239]">
                  {review.review_text}
                </p>
                <p className="mt-5 border-t border-[#ead8c7] pt-4 font-bold">
                  {review.customer_name}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bg-[#241b17] px-5 py-14 text-center text-white">
        <MapPin className="mx-auto mb-3 text-[#e9a17f]" size={26} />
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#e9a17f]">
          FIND YOUR WAY HERE
        </p>
        <h2 className="mt-3 text-3xl font-bold">The Cravings Cafe</h2>
        <p className="mt-2 text-[#f2e6db]">{cafeContact.address}</p>
        <a
          href={cafeContact.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#b84a2f] px-6 py-3 font-semibold text-white hover:bg-[#963a24]"
        >
          Get Directions <ArrowRight size={17} />
        </a>
      </section>
    </main>
  );
}
