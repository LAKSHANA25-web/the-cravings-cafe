
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, ShoppingBag, Search, X } from "lucide-react";
import { useCart } from "../context/useCart.js";

const menuSections = [
  {
    id: "shawarma",
    title: "Shawarma",
    icon: "🌯",
    items: [
      { name: "Classic Shawarma", prices: [110, 150], icon: "🌯" },
      { name: "Peri Peri Shawarma", prices: [130, 190], icon: "🌯" },
      { name: "Tandoori Shawarma", prices: [130, 190], icon: "🌯" },
      { name: "Schezwan Shawarma", prices: [130, 190], icon: "🌯" },
      { name: "1000 Island Shawarma", prices: [130, 190], icon: "🌯" },
      { name: "Mint Shawarma", prices: [130, 190], icon: "🌯" },
      { name: "Cravings Special Shawarma (Mexican)", prices: [140, 190], icon: "🌯" },
      { name: "More Chicken Shawarma", prices: [190, 240], icon: "🌯" },
    ],
  },
  {
    id: "snacks",
    title: "Snacks & Appetizers",
    icon: "🍟",
    items: [
      { name: "Classic Bread Omelette", prices: [60], icon: "🍳" },
      { name: "Masala Bread Omelette", prices: [80], icon: "🥪" },
      { name: "Cheese Bread Omelette", prices: [100], icon: "🧀" },
      { name: "Cheese Balls", prices: [120], icon: "🧀" },
      { name: "Mexican Loaded Veg Nachos", prices: [120], icon: "🌮" },
      { name: "Mexican Loaded Chicken Nachos", prices: [150], icon: "🌮" },
      { name: "Chicken Nuggets", prices: [120], icon: "🍗" },
      { name: "Chicken Bites", prices: [120], icon: "🍗" },
      { name: "Chicken Popcorn", prices: [120], icon: "🍿" },
      { name: "Fried Chicken (4 PCS)", prices: [150], icon: "🍗" },
      { name: "Chicken Strips (4 PCS)", prices: [150], icon: "🍗" },
      { name: "Honey BBQ Strips (4 PCS)", prices: [190], icon: "🍗" },
    ],
  },
  {
    id: "momos",
    title: "Momos",
    icon: "🥟",
    items: [
      { name: "Himalayan Veg Momos", prices: [100], icon: "🥟" },
      { name: "Cheese and Corn Momos", prices: [120], icon: "🥟" },
      { name: "Darjeeling Chicken Momos", prices: [120], icon: "🥟" },
      { name: "Darjeeling Chicken Tikka", prices: [120], icon: "🍗" },
      { name: "Fusion Momos", prices: [150], icon: "🥟" },
    ],
  },
  {
    id: "fries",
    title: "Fries",
    icon: "🍟",
    items: [
      { name: "French Fries", prices: [100], icon: "🍟" },
      { name: "Peri Peri Fries", prices: [110], icon: "🍟" },
      { name: "Cheese Fries", prices: [120], icon: "🍟" },
      { name: "Chicken Loaded Fries", prices: [150], icon: "🍟" },
    ],
  },
  {
    id: "sandwiches",
    title: "Sandwiches",
    icon: "🥪",
    items: [
      { name: "Spicy Veg Sandwich", prices: [100], icon: "🥪" },
      { name: "Cheesy Veg Sandwich", prices: [120], icon: "🥪" },
      { name: "Egg Sandwich", prices: [130], icon: "🥪" },
      { name: "Cheese & Corn Sandwich", prices: [130], icon: "🥪" },
      { name: "Paneer Sandwich", prices: [150], icon: "🥪" },
      { name: "Chicken Sandwich", prices: [150], icon: "🥪" },
    ],
  },
  {
    id: "burgers",
    title: "Burgers",
    icon: "🍔",
    items: [
      { name: "Veg Burger", prices: [100], icon: "🍔" },
      { name: "Chicken Burger", prices: [140], icon: "🍔" },
      { name: "Chicken Zinger Burger", prices: [170], icon: "🍔" },
    ],
  },
  {
    id: "veg-rice",
    title: "Veg Rice & Noodles",
    icon: "🍜",
    items: [
      { name: "Veg Fried Rice", prices: [100], icon: "🍚" },
      { name: "Veg Noodles", prices: [100], icon: "🍜" },
      { name: "Paneer Noodles", prices: [130], icon: "🍜" },
      { name: "Paneer Fried Rice", prices: [130], icon: "🍚" },
      { name: "Special Paneer Schezwan Rice", prices: [140], icon: "🍚" },
    ],
  },
  {
    id: "chicken-rice",
    title: "Chicken Rice & Noodles",
    icon: "🍗",
    items: [
      { name: "Egg Fried Rice", prices: [110], icon: "🍚" },
      { name: "Chicken Fried Rice", prices: [140], icon: "🍚" },
      { name: "Egg Noodles", prices: [110], icon: "🍜" },
      { name: "Chicken Noodles", prices: [140], icon: "🍜" },
      { name: "Special Schezwan Chicken Fried Rice", prices: [150], icon: "🍚" },
    ],
  },
  {
    id: "grill",
    title: "Grill",
    icon: "🍗",
    items: [
      { name: "Grill", prices: [240, 450], optionLabels: ["Half", "Full"], icon: "🍗" },
      { name: "Peri Peri Grill", prices: [240, 460], optionLabels: ["Half", "Full"], icon: "🍗" },
      { name: "Pepper Grill", prices: [290, 510], optionLabels: ["Half", "Full"], icon: "🍗" },
    ],
  },
  {
    id: "addons",
    title: "Add Ons",
    icon: "➕",
    items: [
      { name: "Kuboos", prices: [12], icon: "🫓" },
      { name: "Mayonnaise", prices: [20], icon: "🥣" },
      { name: "Chipotle Sauce", prices: [20], icon: "🌶️" },
    ],
  },
  {
    id: "maggi",
    title: "Maggi",
    icon: "🍜",
    items: [
      { name: "Veg Maggi", prices: [60], icon: "🍜" },
      { name: "Egg Maggi", prices: [80], icon: "🍜" },
      { name: "Chicken Maggi", prices: [110], icon: "🍜" },
      { name: "Cheese Maggi", prices: [80], icon: "🧀" },
    ],
  },
  {
    id: "juices",
    title: "Fresh Juices",
    icon: "🥤",
    items: [
      { name: "Lime", prices: [50], icon: "🍋" },
      { name: "Watermelon", prices: [60], icon: "🍉" },
      { name: "Mosambi", prices: [60], icon: "🍊" },
      { name: "Apple", prices: [90], icon: "🍎" },
      { name: "Pomegranate", prices: [100], icon: "🍎" },
    ],
  },
  {
    id: "milkshakes",
    title: "Milk Shakes",
    icon: "🥤",
    items: [
      { name: "Vanilla Sky Shake", prices: [120], icon: "🥤" },
      { name: "Strawberry Pop Shake", prices: [120], icon: "🍓" },
      { name: "Mango Wave Shake", prices: [140], icon: "🥭" },
      { name: "Chocolate Heaven Shake", prices: [150], icon: "🍫" },
      { name: "Butterscotch Glow Shake", prices: [150], icon: "🥤" },
      { name: "Black Currant Buzz Shake", prices: [150], icon: "🫐" },
      { name: "Creamy KitKat Shake", prices: [150], icon: "🍫" },
      { name: "Crazy Oreo Shake", prices: [150], icon: "🍪" },
      { name: "Italian Brownie Shake", prices: [160], icon: "🍫" },
      { name: "Lotus Biscoff Shake", prices: [180], icon: "🥤" },
    ],
  },
  {
    id: "cold",
    title: "Cravings Cold Edition",
    icon: "🧊",
    items: [
      { name: "Lemon Ice Tea", prices: [110], icon: "🍋" },
      { name: "Cold Coffee", prices: [110], icon: "☕" },
      { name: "Cold Boost", prices: [110], icon: "🥤" },
      { name: "Cold Milo", prices: [120], icon: "🥤" },
      { name: "Iced Choco Chill", prices: [120], icon: "🍫" },
    ],
  },
  {
    id: "falooda",
    title: "Falooda",
    icon: "🍨",
    items: [
      { name: "Classic Falooda", prices: [130], icon: "🍨" },
      { name: "Royal Falooda", prices: [160], icon: "🍨" },
    ],
  },
  {
    id: "mocktails",
    title: "Mocktails",
    icon: "🍹",
    items: [
      { name: "Lime Soda (Sweet / Salt)", prices: [60], icon: "🍋" },
      { name: "Mint & Lime Mojito", prices: [80], icon: "🍹" },
      { name: "Green Apple Mojito", prices: [80], icon: "🍏" },
      { name: "Blue Curacao Mojito", prices: [80], icon: "🧊" },
      { name: "Rose Mojito", prices: [80], icon: "🌹" },
      { name: "Watermelon Mojito", prices: [90], icon: "🍉" },
    ],
  },
  {
    id: "ice-creams",
    title: "Ice Creams",
    icon: "🍦",
    items: [
      { name: "Vanilla", prices: [50, 100], optionLabels: ["Single", "Double"], icon: "🍦" },
      { name: "Strawberry", prices: [50, 100], optionLabels: ["Single", "Double"], icon: "🍓" },
      { name: "Alphonsa Mango", prices: [50, 100], optionLabels: ["Single", "Double"], icon: "🥭" },
      { name: "Creamy Chocolate", prices: [60, 120], optionLabels: ["Single", "Double"], icon: "🍫" },
      { name: "Butterscotch", prices: [60, 120], optionLabels: ["Single", "Double"], icon: "🍨" },
      { name: "Black Currant", prices: [60, 120], optionLabels: ["Single", "Double"], icon: "🫐" },
      { name: "Cookies & Cream", prices: [60, 120], optionLabels: ["Single", "Double"], icon: "🍪" },
      { name: "Fig & Honey", prices: [70, 120], optionLabels: ["Single", "Double"], icon: "🍯" },
    ],
  },
  {
    id: "ice-cream-addons",
    title: "Ice Cream Add Ons",
    icon: "🍫",
    items: [
      { name: "Choco Chip", prices: [10], icon: "🍫" },
      { name: "Chocolate Sauce", prices: [10], icon: "🍫" },
    ],
  },
  {
    id: "dessert",
    title: "Dessert",
    icon: "🍰",
    items: [
      { name: "Brownie", prices: [100], icon: "🍫" },
      { name: "Brownie with Ice Cream", prices: [150], icon: "🍨" },
      { name: "Hot Sizzling Brownie", prices: [200], icon: "🍫" },
      { name: "Gulab Jamun (2 PCS) with Ice Cream", prices: [120], icon: "🍨" },
    ],
  },
  {
    id: "water",
    title: "Water",
    icon: "💧",
    items: [{ name: "Water Bottle", prices: [20], icon: "💧" }],
  },
];

export default function Menu() {
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [selectedPrices, setSelectedPrices] = useState({});
  const [cartOpen, setCartOpen] = useState(false);

  const {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    cartCount,
    cartTotal,
  } = useCart();

  const visibleSections = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return menuSections
      .filter(
        (section) =>
          activeCategory === "all" || section.id === activeCategory
      )
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          item.name.toLowerCase().includes(query)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [activeCategory, searchText]);

  const getSelectedPrice = (item) =>
    selectedPrices[item.name] ?? item.prices[0];

  const getCartKey = (item, price) => `${item.name}__${price}`;

  function addItem(item) {
    const price = getSelectedPrice(item);

    addToCart({
      id: getCartKey(item, price),
      name: item.name,
      icon: item.icon,
      price,
    });
  }

  return (
    <main className="menu-page">
      <section className="menu-header">
        <p className="menu-eyebrow">THE CRAVINGS CAFE</p>
        <h1>Our Menu</h1>
        <p>Good food. Great mood. Something delicious for every craving.</p>
      </section>

      <section className="menu-tools">
        <label className="menu-search">
          <Search size={18} />
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search your favourite food..."
            aria-label="Search menu"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText("")}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </label>
      </section>

      <nav className="menu-categories" aria-label="Menu categories">
        <button
          type="button"
          className={activeCategory === "all" ? "active" : ""}
          onClick={() => setActiveCategory("all")}
        >
          All Items
        </button>

        {menuSections.map((section) => (
          <button
            type="button"
            key={section.id}
            className={activeCategory === section.id ? "active" : ""}
            onClick={() => setActiveCategory(section.id)}
          >
            {section.title}
          </button>
        ))}
      </nav>

      <div className="menu-content">
        {visibleSections.length === 0 && (
          <div className="menu-empty">
            <span>🍽️</span>
            <h2>No items found</h2>
            <p>Try another search or select a different category.</p>
          </div>
        )}

        {visibleSections.map((section) => (
          <section className="menu-section" key={section.id}>
            <div className="menu-section-title">
              <span>{section.icon}</span>
              <h2>{section.title}</h2>
              <span className="section-count">
                {section.items.length} items
              </span>
            </div>

            <div className="menu-grid">
              {section.items.map((item) => {
                const selectedPrice = getSelectedPrice(item);
                const key = getCartKey(item, selectedPrice);
                const quantity =
                  cart.find((entry) => entry.id === key)?.quantity || 0;

                return (
                  <article className="menu-card" key={item.name}>
                    <div className="menu-image">
                      <span className="menu-emoji">{item.icon}</span>
                    </div>

                    <div className="menu-card-content">
                      <p className="menu-category">{section.title}</p>
                      <h2>{item.name}</h2>

                      {item.prices.length > 1 && (
                        <label className="price-option">
                          <span>Choose option</span>
                          <select
                            value={selectedPrice}
                            onChange={(event) =>
                              setSelectedPrices((previous) => ({
                                ...previous,
                                [item.name]: Number(event.target.value),
                              }))
                            }
                          >
                            {item.prices.map((price, index) => (
                              <option value={price} key={`${price}-${index}`}>
                                {item.optionLabels?.[index] ||
                                  `Option ${index + 1}`}{" "}
                                — ₹{price}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      <div className="menu-card-bottom">
                        <strong className="menu-price">₹{selectedPrice}</strong>

                        {quantity === 0 ? (
                          <button
                            type="button"
                            className="add-btn"
                            onClick={() => addItem(item)}
                          >
                            <Plus size={17} /> Add
                          </button>
                        ) : (
                          <div className="quantity-control">
                            <button
                              type="button"
                              onClick={() => removeFromCart(key)}
                              aria-label={`Remove one ${item.name}`}
                            >
                              <Minus size={16} />
                            </button>
                            <span>{quantity}</span>
                            <button
                              type="button"
                              onClick={() => addItem(item)}
                              aria-label={`Add one ${item.name}`}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {cartCount > 0 && (
        <div className="menu-cart-bar">
          <div className="cart-info">
            <ShoppingBag size={23} />
            <div>
              <strong>
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </strong>
              <span>Bill preview: ₹{cartTotal}</span>
            </div>
          </div>

          <button
            type="button"
            className="cart-view-btn"
            onClick={() => setCartOpen(true)}
          >
            View Bill
          </button>
        </div>
      )}

      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <section
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Bill preview"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cart-drawer-header">
              <div>
                <p className="menu-eyebrow">THE CRAVINGS CAFE</p>
                <h2>Your Bill Preview</h2>
              </div>

              <button
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="Close bill preview"
              >
                <X size={22} />
              </button>
            </div>

            <div className="cart-lines">
              {cart.map((item) => (
                <div className="cart-line" key={item.id}>
                  <span className="cart-line-icon">{item.icon}</span>

                  <div className="cart-line-details">
                    <strong>{item.name}</strong>
                    <span>
                      ₹{item.price} × {item.quantity}
                    </span>
                  </div>

                  <strong>₹{item.price * item.quantity}</strong>

                  <div className="cart-line-actions">
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      aria-label={`Remove one ${item.name}`}
                    >
                      <Minus size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        addToCart({
                          id: item.id,
                          name: item.name,
                          icon: item.icon,
                          price: item.price,
                        })
                      }
                      aria-label={`Add one ${item.name}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-total">
              <span>Estimated total</span>
              <strong>₹{cartTotal}</strong>
            </div>

            <p className="cart-disclaimer">
              This is a bill preview, not a confirmed order. Taxes or other
              charges, if applicable, are not included.
            </p>

            <button
              type="button"
              className="cart-clear"
              onClick={clearCart}
            >
              Clear cart
            </button>

            <button
              type="button"
              className="cart-view-btn"
              onClick={() => {
                setCartOpen(false);
                navigate("/order");
              }}
            >
              Continue to Order
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
