
import { useState } from "react";
import { CartContext } from "./CartContext.js";

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  function addToCart(item) {
    setCart((currentCart) => {
      const existing = currentCart.find(
        (entry) => entry.id === item.id
      );

      if (existing) {
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
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
