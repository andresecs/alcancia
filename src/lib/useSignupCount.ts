import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";

// How many sign-ups are waiting for review in an event, kept up to date as
// players sign up and the umpire converts or removes them. `refresh` re-reads
// browser storage when the site isn't connected to Firebase.
export function useSignupCount(eventId: number | undefined, refresh?: unknown) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (eventId === undefined) return;
    if (!db) {
      try {
        const saved = JSON.parse(localStorage.getItem(`reserve-tournament-${eventId}`) ?? "{}") as {
          signups?: unknown[];
        };
        setCount(saved.signups?.length ?? 0);
      } catch {
        setCount(0);
      }
      return;
    }
    return onSnapshot(
      query(collection(db, "events", String(eventId), "items"), where("kind", "==", "signup")),
      (snap) => setCount(snap.size),
      () => setCount(0),
    );
  }, [eventId, refresh]);

  return count;
}
