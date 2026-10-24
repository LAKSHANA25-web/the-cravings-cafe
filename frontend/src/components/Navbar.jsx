import { Link } from "react-router-dom";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "../context/useCart.js";

function Navbar() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const { cartCount } = useCart();

  const linkClass =
    "text-sm font-medium text-[#3d342e] transition hover:text-[#b84a2f]";

  const mobileLinkClass =
    "font-medium text-[#3d342e] transition hover:text-[#b84a2f]";

  return (
    <header className="sticky top-0 z-50 border-b border-[#e5d8c8] bg-[#f7f1e8]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">

        {/* Logo */}
        <Link to="/" className="group" onClick={() => setMobileMenu(false)}>
          <div className="text-xl font-black tracking-[0.08em] text-[#171717]">
            THE CRAVINGS
          </div>
          <div className="text-[10px] font-semibold tracking-[0.35em] text-[#b84a2f]">
            CAFE
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 xl:flex">
          <Link to="/" className={linkClass}>Home</Link>
          <Link to="/menu" className={linkClass}>Menu</Link>
          <Link to="/order" className={linkClass}>Order</Link>
          <Link to="/book-table" className={linkClass}>Book a Table</Link>
          <Link to="/reviews" className={linkClass}>Reviews</Link>
          <Link to="/location" className={linkClass}>Location</Link>
          <Link to="/contact" className={linkClass}>Contact</Link>
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <Link
            to="/cart"
            aria-label={`Cart, ${cartCount} items`}
            className="relative inline-flex items-center gap-2 rounded-full border border-[#d8cabb] px-3 py-2 text-sm font-semibold text-[#3d342e] transition hover:border-[#b84a2f] hover:text-[#b84a2f]"
          >
            <ShoppingBag size={18} />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-[#b84a2f] px-1.5 py-0.5 text-xs font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <Link
            to="/order"
            className="hidden items-center gap-2 rounded-full bg-[#171717] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b84a2f] 2xl:flex"
          >
            <ShoppingBag size={17} />
            Order Now
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            aria-label={mobileMenu ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenu}
            onClick={() => setMobileMenu(!mobileMenu)}
            className="rounded-full border border-[#d8cabb] p-2 xl:hidden"
          >
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenu && (
        <nav className="border-t border-[#e5d8c8] bg-[#f7f1e8] px-5 py-5 xl:hidden">
          <div className="flex flex-col gap-4">
            <Link onClick={() => setMobileMenu(false)} to="/" className={mobileLinkClass}>
              Home
            </Link>
            <Link onClick={() => setMobileMenu(false)} to="/menu" className={mobileLinkClass}>
              Menu
            </Link>
            <Link onClick={() => setMobileMenu(false)} to="/order" className={mobileLinkClass}>
              Order Online
            </Link>
            <Link onClick={() => setMobileMenu(false)} to="/book-table" className={mobileLinkClass}>
              Book a Table
            </Link>
            <Link onClick={() => setMobileMenu(false)} to="/reviews" className={mobileLinkClass}>
              Reviews
            </Link>
            <Link onClick={() => setMobileMenu(false)} to="/location" className={mobileLinkClass}>
              Location
            </Link>
            <Link onClick={() => setMobileMenu(false)} to="/contact" className={mobileLinkClass}>
              Contact
            </Link>
            <Link onClick={() => setMobileMenu(false)} to="/cart" className={mobileLinkClass}>
              Cart {cartCount > 0 ? `(${cartCount})` : ""}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

export default Navbar;
