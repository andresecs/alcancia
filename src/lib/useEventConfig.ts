import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import type { LeagueSettings } from "./leagueSettings";
import { emptyTournament, type Tournament } from "./tournament";
import { itemDocId } from "./tournamentItems";

export type EventConfig = Pick<Tournament, "divisions" | "settings">;

// What the public pages need from an event's tournament setup (entry fee,
// divisions, Calcutta payout) without loading every team and player. Until
// the umpire has set the event up, it uses the league's settings.
export function useEventConfig(eventId: number | undefined): EventConfig {
  const [config, setConfig] = useState<EventConfig>(() => {
    const t = emptyTournament();
    return { divisions: t.divisions, settings: t.settings };
  });

  useEffect(() => {
    if (eventId === undefined) return;

    if (!db) {
      try {
        const raw = localStorage.getItem(`reserve-tournament-${eventId}`);
        const saved = raw ? (JSON.parse(raw) as Partial<Tournament>) : {};
        setConfig((c) => ({
          divisions: saved.divisions ?? c.divisions,
          settings: { ...c.settings, ...saved.settings },
        }));
      } catch {
        // keep the defaults
      }
      return;
    }

    let stale = false;
    const stop = onSnapshot(
      doc(db, "events", String(eventId), "items", itemDocId("config", "main")),
      async (snap) => {
        const stored = snap.data()?.value as Partial<EventConfig> | undefined;
        if (stored) {
          setConfig((c) => ({
            divisions: stored.divisions ?? c.divisions,
            settings: { ...c.settings, ...stored.settings },
          }));
          return;
        }
        // Not set up yet: the league's entry fee and payout
        const league = (await getDoc(doc(db!, "settings", "main")).catch(() => null))?.data() as
          | Partial<LeagueSettings>
          | undefined;
        if (stale || !league) return;
        setConfig((c) => ({
          ...c,
          settings: {
            ...c.settings,
            entryFee: league.league?.entryFee ?? c.settings.entryFee,
            payout: league.calcutta?.payout ?? c.settings.payout,
          },
        }));
      },
      () => {
        // unreadable: keep the defaults
      },
    );
    return () => {
      stale = true;
      stop();
    };
  }, [eventId]);

  return config;
}
