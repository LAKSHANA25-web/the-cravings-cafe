
import { useEffect, useState } from "react";
import { CartContext } from "./CartContext.js";

const CART_STORAGE_KEY = "cravings_cafe_cart";

function readStoredCart() {
  try {
    const storedCart = JSON.parse(
      localStorage.getItem(CART_STORAGE_KEY) || "[]"
    );
    if (!Array.isArray(storedCart)) return [];

    return storedCart.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        Number.isFinite(item.price) &&
        item.price > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= 100
    );
  } catch (error) {
    console.error("Could not restore the saved cart:", error);
    return [];
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(readStoredCart);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error("Could not save the current cart:", error);
    }
  }, [cart]);

  function addToCart(item) {
    if (!Number.isFinite(item.price) || item.price <= 0) {
      console.error("A cart item needs a positive, valid price.");
      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find(
        (entry) => entry.id === item.id
      );

      if (existing) {
        if (existing.quantity >= 100) return currentCart;
        return currentCart.map((entry) =>
          entry.id === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }

      return [...currentCart, { ...item, quantity: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(id) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== id)
    );
  }

  function clearCart() {
    setCart([]);
  }

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const cartCount = cart.reduce(
    (count, item) => count + item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        removeItem,
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
