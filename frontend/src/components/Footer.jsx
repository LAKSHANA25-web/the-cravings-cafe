import { Link, useLocation } from "react-router-dom";
import { MapPin, Phone } from "lucide-react";
import { cafeContact } from "../siteInfo";

export default function Footer() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="bg-[#171311] px-5 py-12 text-[#f7f1e8]">
      <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Link to="/" className="inline-block">
            <span className="block text-lg font-black tracking-[0.08em]">
              THE CRAVINGS
            </span>
            <span className="block text-[10px] font-semibold tracking-[0.35em] text-[#e9a17f]">
              CAFE
            </span>
          </Link>
          <p className="mt-4 max-w-sm leading-7 text-[#d7c9be]">
            Good food, refreshing drinks, and a welcoming pause for your day.
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <h2 className="font-bold">Explore</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[#d7c9be]">
            <Link className="hover:text-white" to="/menu">Menu</Link>
            <Link className="hover:text-white" to="/order">Order Online</Link>
            <Link className="hover:text-white" to="/book-table">Book a Table</Link>
            <Link className="hover:text-white" to="/reviews">Reviews</Link>
            <Link className="hover:text-white" to="/location">Location</Link>
            <Link className="hover:text-white" to="/contact">Contact</Link>
          </div>
        </nav>

        <div>
          <h2 className="font-bold">Find Us</h2>
          <a
            className="mt-4 flex items-center gap-2 text-sm text-[#d7c9be] hover:text-white"
            href={cafeContact.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapPin size={17} /> The Cravings Cafe, {cafeContact.address}
          </a>
          <a
            className="mt-3 flex items-center gap-2 text-sm text-[#d7c9be] hover:text-white"
            href={`tel:${cafeContact.phoneNumbers[0]}`}
          >
            <Phone size={17} /> {cafeContact.phoneNumbers[0]}
          </a>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-white/15 pt-5 text-xs text-[#bfaea2]">
        © {new Date().getFullYear()} The Cravings Cafe
      </div>
    </footer>
  );
}