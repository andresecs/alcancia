import { useCallback, useEffect, useRef, useState } from "react";
import { collection, doc, getDocs, onSnapshot, writeBatch, type Firestore } from "firebase/firestore";
import { db as firestore, errorText } from "./firebase";
import { emptyTournament, type Tournament } from "./tournament";
import { diffItems, fromItems, itemDocId, itemId, toItems, type Item } from "./tournamentItems";

// Admins write anything. Judges write only scores, times and match order;
// their name goes on the results they enter.
export type Writer = { role: "admin" } | { role: "judge"; code: string; name: string };

export type TournamentStore = {
  data: Tournament | null;
  update: (fn: (t: Tournament) => Tournament) => void;
  error: string;
  live: boolean;
};

// Render the caller with `key={eventId}` so switching events remounts it.
export const useTournament: (eventId: number, writer: Writer) => TournamentStore = firestore
  ? useRemoteTournament
  : useLocalTournament;

/* ------------------------------------------------------------------ */
/*  Without Firebase: this browser only                                */
/* ------------------------------------------------------------------ */

const storageKey = (eventId: number) => `reserve-tournament-${eventId}`;

function loadLocal(eventId: number): Tournament {
  try {
    const raw = localStorage.getItem(storageKey(eventId));
    if (raw) return { ...emptyTournament(), ...JSON.parse(raw) };
  } catch {
    // fall through to a fresh tournament
  }
  return emptyTournament();
}

function useLocalTournament(eventId: number): TournamentStore {
  const [data, setData] = useState(() => loadLocal(eventId));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(eventId), JSON.stringify(data));
    } catch {
      // storage full or blocked; the data still lives for this session
    }
  }, [eventId, data]);

  const update = useCallback((fn: (t: Tournament) => Tournament) => setData(fn), []);
  return { data, update, error: "", live: false };
}

/* ------------------------------------------------------------------ */
/*  With Firebase: shared and live                                     */
/* ------------------------------------------------------------------ */

type Queued = { item: Item; remove: boolean };

const SAVE_DELAY = 350; // ms; typing in a field becomes one write, not one per key
const BATCH_LIMIT = 450; // Firestore takes at most 500 writes per batch

const hhmm = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function useRemoteTournament(eventId: number, writer: Writer): TournamentStore {
  const db = firestore as Firestore;
  const [data, setData] = useState<Tournament | null>(null);
  const [error, setError] = useState("");
  const items = useRef(new Map<string, Item>());
  const current = useRef<Tournament | null>(null);
  const queue = useRef(new Map<string, Queued>());
  const inFlight = useRef(new Map<string, number>());
  const timer = useRef<number | undefined>(undefined);
  const writerRef = useRef(writer);
  writerRef.current = writer;

  const show = useCallback(() => {
    current.current = fromItems(items.current.values());
    setData(current.current);
  }, []);

  // After a failed save: back to what's really stored, plus unsaved edits
  const reload = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "events", String(eventId), "items"));
      items.current = new Map(
        snap.docs.map((d) => {
          const { kind, key, value } = d.data() as Item;
          return [itemId(kind, key), { kind, key, value }];
        }),
      );
      for (const [id, q] of queue.current) {
        if (q.remove) items.current.delete(id);
        else items.current.set(id, q.item);
      }
      show();
    } catch (e) {
      setError(errorText(e));
    }
  }, [db, eventId, show]);

  const write = useCallback(
    async (list: Queued[]) => {
      const w = writerRef.current;
      if (w.role === "judge" && list.some(({ item }) => !["score", "meta", "order"].includes(item.kind))) {
        throw new Error("Judges can only enter scores, times and match order.");
      }
      for (let i = 0; i < list.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        for (const { item, remove } of list.slice(i, i + BATCH_LIMIT)) {
          const ref = doc(db, "events", String(eventId), "items", itemDocId(item.kind, item.key));
          if (remove) {
            batch.delete(ref);
            continue;
          }
          let value = item.value;
          // Results say who entered them, as the sheet did
          if (w.role === "judge" && item.kind === "score" && value && typeof value === "object") {
            value = { ...value, by: `${w.name} · ${hhmm()}` };
          }
          batch.set(ref, {
            kind: item.kind,
            key: item.key,
            value,
            updatedAt: Date.now(),
          });
        }
        await batch.commit();
      }
    },
    [db, eventId],
  );

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (!queue.current.size) return;
    const batch = [...queue.current.entries()];
    queue.current.clear();
    const ids = batch.map(([id]) => id);
    ids.forEach((id) => inFlight.current.set(id, (inFlight.current.get(id) ?? 0) + 1));
    try {
      await write(batch.map(([, q]) => q));
      setError("");
    } catch (e) {
      setError(`Not saved: ${errorText(e)}`);
      await reload();
    } finally {
      ids.forEach((id) => {
        const n = (inFlight.current.get(id) ?? 1) - 1;
        if (n > 0) inFlight.current.set(id, n);
        else inFlight.current.delete(id);
      });
    }
  }, [reload, write]);

  useEffect(() => {
    // The first snapshot is everything; after that, only what changed
    const stop = onSnapshot(
      collection(db, "events", String(eventId), "items"),
      (snap) => {
        for (const change of snap.docChanges()) {
          const { kind, key, value } = change.doc.data() as Item;
          const id = itemId(kind, key);
          // This page's own newer edit wins over the echo of an older one
          if (queue.current.has(id) || inFlight.current.has(id)) continue;
          if (change.type === "removed") items.current.delete(id);
          else items.current.set(id, { kind, key, value });
        }
        show();
      },
      (e) => setError(errorText(e)),
    );
    return () => {
      void flush();
      stop();
    };
  }, [db, eventId, flush, show]);

  const update = useCallback(
    (fn: (t: Tournament) => Tournament) => {
      const prev = current.current;
      if (!prev) return;
      const next = fn(prev);
      if (next === prev) return;
      const { upserts, deletes } = diffItems(toItems(prev), toItems(next));
      for (const item of upserts) {
        const id = itemId(item.kind, item.key);
        items.current.set(id, item);
        queue.current.set(id, { item, remove: false });
      }
      for (const item of deletes) {
        const id = itemId(item.kind, item.key);
        items.current.delete(id);
        queue.current.set(id, { item, remove: true });
      }
      current.current = next;
      setData(next);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), SAVE_DELAY);
    },
    [flush],
  );

  return { data, update, error, live: true };
}
