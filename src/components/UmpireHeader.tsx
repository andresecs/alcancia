import { useState } from "react";
import { Link } from "react-router";
import ReserveLogo from "./ReserveLogo";

export type UmpirePage = "events" | "settings";

// The umpire area's header: the logo with who is signed in centered under it,
// and the admin menu. `label` is "Admin" or the judge's name; omit it when
// nobody is signed in.
export default function UmpireHeader({
  label,
  onSignOut,
  page,
  onNavigate,
}: {
  label?: string;
  onSignOut?: () => void;
  page?: UmpirePage; // the admin page showing, to highlight it in the menu
  onNavigate?: (page: UmpirePage) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <>
      <header className="signup-header umpire-header">
        <div className="umpire-brand">
          <Link className="wordmark" to="/" aria-label="Reserve Pro-Am, return home">
            <ReserveLogo />
          </Link>
          {label && <span>{label}</span>}
        </div>
        <button
          className={menuOpen ? "menu-toggle is-open" : "menu-toggle"}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="umpire-site-menu"
        >
          <span />
          <span />
        </button>
      </header>

      {menuOpen && (
        <>
          <button className="menu-backdrop menu-backdrop--admin" onClick={close} aria-label="Close menu" />
          <nav className="menu-panel menu-panel--admin" id="umpire-site-menu" aria-label="Admin menu">
            <button
              className={page === "events" || !page ? "is-selected" : undefined}
              onClick={() => {
                close();
                onNavigate?.("events");
              }}
            >
              Events
            </button>
            <button onClick={close}>Officials</button>
            <button
              className={page === "settings" ? "is-selected" : undefined}
              onClick={() => {
                close();
                onNavigate?.("settings");
              }}
            >
              Settings
            </button>
            {onSignOut && (
              <button
                onClick={() => {
                  close();
                  onSignOut();
                }}
              >
                Sign out
              </button>
            )}
            <Link className="menu-panel__umpire" to="/" onClick={close}>
              Back to game
            </Link>
          </nav>
        </>
      )}
    </>
  );
}
