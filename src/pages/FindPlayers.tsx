import { useMemo, useState } from "react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import PageNotice from "../components/PageNotice";
import { useLiveEvent } from "../lib/useEvents";
import { useEventPlayers } from "../lib/useEventPlayers";

export default function FindPlayers() {
  const { event, live } = useLiveEvent();
  // The event's real sign-ups and players; only names and clubs are shown
  const { players, loaded } = useEventPlayers(event?.id);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(
    () =>
      normalizedQuery.length < 3
        ? []
        : players.filter((player) =>
            player.name.toLowerCase().includes(normalizedQuery),
          ),
    [normalizedQuery, players],
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
            {loaded && (
              <p className="find-players-count" aria-live="polite">
                {players.length === 0
                  ? "No one has signed up yet. Be the first!"
                  : `${players.length} player${players.length === 1 ? " has" : "s have"} signed up so far`}
              </p>
            )}
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
                  <article className="player-result" key={player.id}>
                    <p>{player.name}</p>
                    {player.homeClub && <span>{player.homeClub}</span>}
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
