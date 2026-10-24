import { ExternalLink, MapPin } from "lucide-react";
import PageMeta from "../components/PageMeta";
import { cafeContact } from "../siteInfo";

export default function Location() {
  return (
    <main className="min-h-[70vh] bg-[#f7f1e8] px-5 py-16 text-[#241b17] md:py-24">
      <PageMeta
        title="Find Us | The Cravings Cafe"
        description="Find The Cravings Cafe at Avinashi Bypass and get directions."
      />
      <section className="mx-auto max-w-4xl rounded-3xl border border-[#ead8c7] bg-[#fffaf5] p-8 text-center shadow-sm md:p-14">
        <MapPin className="mx-auto mb-5 text-[#b84a2f]" size={38} />
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#b84a2f]">
          THE CRAVINGS CAFE
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Visit Our Cafe</h1>
        <p className="mt-5 text-lg text-[#75665c]">{cafeContact.address}</p>
        <p className="mt-2 text-[#75665c]">
          We look forward to welcoming you.
        </p>
        <a
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#b84a2f] px-7 py-3.5 font-semibold text-white transition hover:bg-[#963a24]"
          href={cafeContact.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get Directions <ExternalLink size={17} />
        </a>
      </section>
    </main>
  );
}
