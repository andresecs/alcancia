import { useMemo, useState } from "react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import PageNotice from "../components/PageNotice";
import { useLiveEvent } from "../lib/useEvents";

const players = [
  { name: "Guille Cagigas", club: "Hudson Yards" },
  { name: "Jane Doe", club: "Upper East" },
  { name: "John Doe", club: "Hudson Yards" },
  { name: "Maria Santos", club: "Another Club" },
  { name: "Alex Morgan", club: "Upper East" },
  { name: "Sam Taylor", club: "Another Club" },
  { name: "Andres Castellanos", club: "" },
  { name: "Adarsh Arun", club: "" },
  { name: "Peter Parker", club: "" },
];

export default function FindPlayers() {
  const { live } = useLiveEvent();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(
    () =>
      normalizedQuery.length < 3
        ? []
        : players.filter((player) =>
            player.name.toLowerCase().includes(normalizedQuery),
          ),
    [normalizedQuery],
  );

  return (
    <main className="find-players-page">
      <SiteHeader />

      {live === false ? (
        <PageNotice
          title="Find Players"
          message="No event is live right now. Once the next Pro-Am opens, you'll find players here."
          action={{ label: "View past events", to: "/champions" }}
        />
      ) : (
        <section
          className={
            query.length > 0
              ? "find-players-content has-query"
              : "find-players-content"
          }
        >
          <div className="find-players-search-wrap">
            <div className="find-players-title" role="heading" aria-level={1}>
              Find Players
            </div>
            <label className="form-field find-player-search">
              <span>Search players</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search players"
                autoComplete="off"
              />
            </label>
            {normalizedQuery.length > 0 && normalizedQuery.length < 3 && (
              <p className="find-players-help">
                Enter at least 3 characters to search.
              </p>
            )}
          </div>

          {normalizedQuery.length >= 3 && (
            <div className="player-results" aria-live="polite">
              {results.length > 0 ? (
                results.map((player) => (
                  <article className="player-result" key={player.name}>
                    <p>{player.name}</p>
                    {player.club && <span>{player.club}</span>}
                  </article>
                ))
              ) : (
                <p className="player-results__empty">No players found.</p>
              )}
            </div>
          )}
        </section>
      )}
      <SiteFooter />
    </main>
  );
}
