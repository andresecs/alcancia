import { Link } from "react-router";
import { cachedLeagueSettings } from "../lib/leagueSettings";
import ReserveLogo from "./ReserveLogo";

export const legalLinks = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Use" },
  { to: "/refunds", label: "Refund Policy" },
  { to: "/calcutta-rules", label: "Calcutta Rules & Disclaimer" },
  { to: "/accessibility", label: "Accessibility" },
];

// The public site footer: the same look as the header (logo, PRO-AM, a
// divider, here along the top), the legal pages and a way to get in touch.
export default function SiteFooter() {
  const contact = cachedLeagueSettings().league.contactEmail;
  return (
    <footer className="site-footer">
      <div className="site-brand">
        <Link className="wordmark" to="/" aria-label="Reserve Pro-Am, return home">
          <ReserveLogo />
        </Link>
        <span className="site-brand__title">PRO-AM</span>
      </div>
      <nav className="site-footer__links" aria-label="Legal and contact">
        {legalLinks.map((link) => (
          <Link key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
        {contact && <a href={`mailto:${contact}`}>Contact</a>}
      </nav>
      <small className="site-footer__copy">© {new Date().getFullYear()} Reserve Pro-Am</small>
    </footer>
  );
}
