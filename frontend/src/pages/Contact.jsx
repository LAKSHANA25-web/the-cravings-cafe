import { Phone, Mail, MapPin, ExternalLink } from "lucide-react";
import "./Contact.css";
import PageMeta from "../components/PageMeta";
import { cafeContact } from "../siteInfo";

export default function Contact() {
  return (
    <main className="contact-page">
      <PageMeta
        title="Contact | The Cravings Cafe"
        description="Contact The Cravings Cafe about our menu, orders, and table bookings."
      />
      <section className="contact-heading">
        <p className="contact-eyebrow">THE CRAVINGS CAFE</p>
        <h1>Let's Get in Touch</h1>
        <p>
          Questions about our menu, orders, or table bookings?
          We'd love to hear from you.
        </p>
      </section>

      <section className="contact-grid">
        <article className="contact-card">
          <Phone size={28} />
          <h2>Call Us</h2>
          <p>Reach us on either of our phone numbers.</p>
          {cafeContact.phoneNumbers.map((phone) => (
            <a key={phone} href={`tel:${phone}`}>
              {phone}
            </a>
          ))}
        </article>

        <article className="contact-card">
          <Mail size={28} />
          <h2>Email Us</h2>
          <p>Send us your questions and feedback.</p>
          <a href={`mailto:${cafeContact.email}`}>{cafeContact.email}</a>
        </article>

        <article className="contact-card">
          <MapPin size={28} />
          <h2>Visit Us</h2>
          <p>The Cravings Cafe, {cafeContact.address}</p>
          <a href={cafeContact.mapsUrl} target="_blank" rel="noopener noreferrer">
            Get Directions <ExternalLink size={16} />
          </a>
        </article>
      </section>
    </main>
  );
}