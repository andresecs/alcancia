import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { Person } from "./registration";

// Who has signed up to play in an event: the sign-ups waiting for review and
// the players the umpire has accepted (pros aren't included). Anyone the
// umpire marked "Not playing" is left out. Kept up to date as people sign up.
export function useEventPlayers(eventId: number | undefined) {
  const [players, setPlayers] = useState<Person[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (eventId === undefined) return;
    const keep = (list: Person[]) => list.filter((p) => p.name?.trim() && p.status !== "not-playing");

    if (!db) {
      try {
        const saved = JSON.parse(localStorage.getItem(`reserve-tournament-${eventId}`) ?? "{}") as {
          players?: Person[];
          signups?: Person[];
        };
        setPlayers(keep([...(saved.players ?? []), ...(saved.signups ?? [])]));
      } catch {
        setPlayers([]);
      }
      setLoaded(true);
      return;
    }

    return onSnapshot(
      query(collection(db, "events", String(eventId), "items"), where("kind", "in", ["player", "signup"])),
      (snap) => {
        setPlayers(keep(snap.docs.map((d) => d.data().value as Person)));
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, [eventId]);

  return { players, loaded };
}
