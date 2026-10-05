import { useState } from "react";
import { Link, useLocation } from "react-router";
import ReserveLogo from "./ReserveLogo";
import { useFeaturedEvent } from "../lib/useEvents";

const links = [
  { to: "/", label: "Home" },
  { to: "/calcutta", label: "Calcutta" },
  { to: "/sign-up", label: "Sign Up" },
  { to: "/champions", label: "Champions" },
  { to: "/rules", label: "Rules" }, // under construction for now
  { to: "/find-players", label: "Find Players" },
];

// The public site header: logo home, menu toggle and the slide-in menu.
// `fixed` keeps it pinned over the home page's full-screen slides; every other
// page lets it stick to the top of the page as it scrolls.
export default function SiteHeader({ fixed = false }: { fixed?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname, search } = useLocation();
  const close = () => setMenuOpen(false);
  const { event, loaded } = useFeaturedEvent();
  const live = event?.status === "Active";
  const title = live ? event.title : "PRO-AM";
  const current = (to: string) => {
    const [path, query = ""] = to.split("?");
    if (path !== pathname) return false;
    // On the home page, "Rules" is a slide: only one of Home / Rules is selected
    return query ? search === `?${query}` : search !== "?slide=1";
  };

  return (
    <>
      <header className={fixed ? "signup-header signup-header--fixed" : "signup-header"}>
        <div className="site-brand">
          <Link className="wordmark" to="/" aria-label="Reserve Pro-Am, return home" onClick={close}>
            <ReserveLogo />
          </Link>
          {/* The event that's running, or the series name when none is */}
          {loaded && <span className="site-brand__title">{title}</span>}
        </div>
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
