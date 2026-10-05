import { useState } from "react";
import { Link } from "react-router";
import SiteTabs, { siteLinks as links, useIsCurrent } from "./SiteTabs";
import ReserveLogo from "./ReserveLogo";
import { useFeaturedEvent } from "../lib/useEvents";

// The public site header: logo home, then the pages as a row of tabs on
// desktop, or a menu toggle and the slide-in menu on smaller screens (CSS
// shows one or the other).
// `fixed` keeps it pinned over the home page's full-screen slides; every other
// page lets it stick to the top of the page as it scrolls.
export default function SiteHeader({ fixed = false }: { fixed?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const current = useIsCurrent();
  const close = () => setMenuOpen(false);
  const { event, loaded } = useFeaturedEvent();
  const live = event?.status === "Active";
  const title = live ? event.title : "PRO-AM";

  return (
    <>
      <header className={fixed ? "signup-header site-header signup-header--fixed" : "signup-header site-header"}>
        <div className="site-brand">
          <Link className="wordmark" to="/" aria-label="Reserve Pro-Am, return home" onClick={close}>
            <ReserveLogo />
          </Link>
          {/* The event that's running, or the series name when none is */}
          {loaded && <span className="site-brand__title">{title}</span>}
        </div>
        <SiteTabs />
        <button
          className={menuOpen ? "menu-toggle is-open" : "menu-toggle"}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
        >
          <span />
          <span />
        </button>
      </header>

      {menuOpen && (
        <>
          <button className="menu-backdrop" onClick={close} aria-label="Close menu" />
          <nav className="menu-panel" id="site-menu" aria-label="Main menu">
            {links.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={current(link.to) ? "is-selected" : undefined}
                aria-current={current(link.to) ? "page" : undefined}
                onClick={close}
              >
                {link.label}
              </Link>
            ))}
            <Link className="menu-panel__umpire" to="/umpire" onClick={close}>
              Umpire
            </Link>
          </nav>
        </>
      )}
    </>
  );
}
