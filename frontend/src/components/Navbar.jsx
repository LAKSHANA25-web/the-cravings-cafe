import { Link } from "react-router-dom";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";

function Navbar() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#e5d8c8] bg-[#f7f1e8]/95 backdrop-blur-md">
      
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">

        {/* Logo */}
        <Link to="/" className="group">
          <div className="text-xl font-black tracking-[0.08em] text-[#171717]">
            THE CRAVINGS
          </div>

          <div className="text-[10px] font-semibold tracking-[0.35em] text-[#b84a2f]">
            CAFE
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 md:flex">

          <Link
            to="/"
            className="text-sm font-medium text-[#3d342e] transition hover:text-[#b84a2f]"
          >
            Home
          </Link>

          <Link
            to="/menu"
            className="text-sm font-medium text-[#3d342e] transition hover:text-[#b84a2f]"
          >
            Menu
          </Link>

          <Link
            to="/order"
            className="text-sm font-medium text-[#3d342e] transition hover:text-[#b84a2f]"
          >
            Order
          </Link>

          <Link
            to="/booking"
            className="text-sm font-medium text-[#3d342e] transition hover:text-[#b84a2f]"
          >
            Book a Table
          </Link>

          <Link
            to="/reviews"
            className="text-sm font-medium text-[#3d342e] transition hover:text-[#b84a2f]"
          >
            Reviews
          </Link>

          <Link
            to="/location"
            className="text-sm font-medium text-[#3d342e] transition hover:text-[#b84a2f]"
          >
            Location
          </Link>

        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">

          <Link
            to="/order"
            className="hidden items-center gap-2 rounded-full bg-[#171717] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b84a2f] sm:flex"
          >
            <ShoppingBag size={17} />
            Order Now
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="rounded-full border border-[#d8cabb] p-2 md:hidden"
          >
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>

        </div>

      </div>

      {/* Mobile Navigation */}
      {mobileMenu && (
        <nav className="border-t border-[#e5d8c8] bg-[#f7f1e8] px-5 py-5 md:hidden">

          <div className="flex flex-col gap-4">

            <Link
              onClick={() => setMobileMenu(false)}
              to="/"
              className="font-medium"
            >
              Home
            </Link>

            <Link
              onClick={() => setMobileMenu(false)}
              to="/menu"
              className="font-medium"
            >
              Menu
            </Link>

            <Link
              onClick={() => setMobileMenu(false)}
              to="/order"
              className="font-medium"
            >
              Order Online
            </Link>

            <Link
              onClick={() => setMobileMenu(false)}
              to="/booking"
              className="font-medium"
            >
              Book a Table
            </Link>

            <Link
              onClick={() => setMobileMenu(false)}
              to="/reviews"
              className="font-medium"
            >
              Reviews
            </Link>

            <Link
              onClick={() => setMobileMenu(false)}
              to="/location"
              className="font-medium"
            >
              Location
            </Link>

          </div>

        </nav>
      )}

    </header>
  );
}

export default Navbar;