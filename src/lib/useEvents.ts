import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDocs, onSnapshot, query, where, writeBatch } from "firebase/firestore";
import { db, errorText } from "./firebase";

export type EventStatus = "Active" | "Scheduled" | "Draft" | "Completed";

// What's in an event beyond its overview: where, when and what's at stake
export type Venue = { id: string; name: string; address: string };
export type ScheduleItem = { id: string; time: string; title: string; venueId: string };
export type ScheduleDay = { id: string; date: string; items: ScheduleItem[] };
export type Prize = { first: number; second: number; third: number }; // third = each 3rd/4th place
export type EventDetails = {
  venues: Venue[];
  schedule: ScheduleDay[];
  prizes: Record<string, Prize>; // by division, e.g. "I", "II"
};

export const prizeDivisions = ["I", "II"];

export const emptyDetails = (): EventDetails => ({
  venues: [],
  schedule: [],
  prizes: Object.fromEntries(prizeDivisions.map((d) => [d, { first: 0, second: 0, third: 0 }])),
});

export type EventItem = {
  id: number;
  title: string;
  status: EventStatus;
  subtitle: string; // a line under the name, e.g. "Member Appreciation Weekend"
  location: string;
  startDate: string; // YYYY-MM-DD, "" if not set
  endDate: string; // YYYY-MM-DD, "" for a one-day event
  dates: string; // the readable range, made from the two dates
  image: string; // cover photo URL, "" for none
  details: EventDetails;
  players: number;
  notifications: number;
  newSignups: number;
};

const demoEvents: EventItem[] = [
  {
    id: 1,
    title: "New York",
    subtitle: "",
    status: "Active",
    location: "New York, NY",
    startDate: "2027-10-22",
    endDate: "2027-10-24",
    dates: "October 22–24, 2027",
    image: "",
    details: emptyDetails(),
    players: 32,
    notifications: 4,
    newSignups: 3,
  },
  {
    id: 2,
    title: "Miami",
    subtitle: "",
    status: "Scheduled",
    location: "Miami, FL",
    startDate: "2028-04-14",
    endDate: "2028-04-16",
    dates: "April 14–16, 2028",
    image: "",
    details: emptyDetails(),
    players: 24,
    notifications: 2,
    newSignups: 2,
  },
  {
    id: 3,
    title: "Los Angeles",
    subtitle: "",
    status: "Draft",
    location: "Los Angeles, CA",
    startDate: "2028-09-15",
    endDate: "2028-09-17",
    dates: "September 15–17, 2028",
    image: "",
    details: emptyDetails(),
    players: 18,
    notifications: 0,
    newSignups: 1,
  },
];

const monthDay = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric" });

const parseDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};

// "2027-10-22" + "2027-10-24" -> "October 22–24, 2027"
// Across months: "October 30 – November 1, 2027"; across years: both years.
export function formatDates(start: string, end: string): string {
  const a = parseDay(start);
  const b = parseDay(end);
  if (!a) return "";
  if (!b || b.getTime() === a.getTime()) return `${monthDay(a)}, ${a.getFullYear()}`;
  if (a.getFullYear() !== b.getFullYear()) return `${monthDay(a)}, ${a.getFullYear()} – ${monthDay(b)}, ${b.getFullYear()}`;
  if (a.getMonth() !== b.getMonth()) return `${monthDay(a)} – ${monthDay(b)}, ${b.getFullYear()}`;
  return `${monthDay(a)}–${b.getDate()}, ${b.getFullYear()}`;
}

// Fill in fields older saves don't have
const withEventDefaults = (e: Partial<EventItem> & Pick<EventItem, "id" | "title">): EventItem => {
  const startDate = e.startDate ?? "";
  const endDate = e.endDate ?? "";
  return {
    status: "Draft",
    location: "",
    image: "",
    players: 0,
    notifications: 0,
    newSignups: 0,
    ...e,
    subtitle: e.subtitle ?? "",
    startDate,
    endDate,
    dates: formatDates(startDate, endDate) || e.dates || "",
    details: {
      ...emptyDetails(),
      ...e.details,
      prizes: { ...emptyDetails().prizes, ...e.details?.prizes },
    },
  };
};

// Without Firebase, events are kept in this browser so the home page can show
// what the Umpire page saved.
const localKey = "reserve-events";

function loadLocalEvents(): EventItem[] {
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) return (JSON.parse(raw) as EventItem[]).map(withEventDefaults);
  } catch {
    // fall back to the demo events
  }
  return demoEvents;
}

// An event as stored in Firestore: events/{id}
type EventDoc = {
  id: number;
  title: string;
  subtitle?: string;
  status: EventStatus;
  location?: string;
  dates?: string;
  startDate?: string;
  endDate?: string;
  image?: string;
  details?: Partial<EventDetails>;
};

const fromDoc = ({ details, ...e }: EventDoc) =>
  withEventDefaults({ ...e, details: { ...emptyDetails(), ...details }, players: 0, notifications: 0, newSignups: 0 });

const toDoc = (e: EventItem): EventDoc => ({
  id: e.id,
  title: e.title,
  subtitle: e.subtitle,
  status: e.status,
  location: e.location,
  dates: e.dates,
  startDate: e.startDate,
  endDate: e.endDate,
  image: e.image,
  details: e.details,
});

// Only one event runs at a time: activating one ends the old one (Completed).
// The Umpire page asks first, before saving an event as Active.
const demoteOthers = (list: EventItem[], active: EventItem) =>
  active.status === "Active"
    ? list.map((e) => (e.id !== active.id && e.status === "Active" ? { ...e, status: "Completed" as const } : e))
    : list;

// Team, pending-bid and sign-up counts for the Umpire's event cards
async function eventCounts(id: number) {
  const snap = await getDocs(
    query(collection(db!, "events", String(id), "items"), where("kind", "in", ["team", "guestBid", "signup"])),
  );
  const values = snap.docs.map((d) => d.data() as { kind: string; value: { status?: string } });
  return {
    players: values.filter((v) => v.kind === "team").length * 2,
    notifications: values.filter((v) => v.kind === "guestBid" && v.value?.status === "pending").length,
    newSignups: values.filter((v) => v.kind === "signup").length,
  };
}

export function useEvents(enabled: boolean) {
  const [events, setEvents] = useState<EventItem[]>(db ? [] : loadLocalEvents);
  const [error, setError] = useState("");

  useEffect(() => {
    if (db) return;
    try {
      localStorage.setItem(localKey, JSON.stringify(events));
    } catch {
      // storage full (large photos) or blocked
    }
  }, [events]);

  useEffect(() => {
    if (!db || !enabled) return;
    let stale = false;
    const stop = onSnapshot(
      collection(db, "events"),
      async (snap) => {
        const list = snap.docs.map((d) => fromDoc(d.data() as EventDoc)).sort((a, b) => a.id - b.id);
        setEvents(list);
        setError("");
        try {
          const counts = await Promise.all(list.map((e) => eventCounts(e.id)));
          if (!stale) setEvents(list.map((e, i) => ({ ...e, ...counts[i] })));
        } catch (e) {
          if (!stale) setError(errorText(e));
        }
      },
      (e) => setError(errorText(e)),
    );
    return () => {
      stale = true;
      stop();
    };
  }, [enabled]);

  // Returns the saved event (with its real id when new), or null on failure
  const saveEvent = useCallback(
    async (event: EventItem, isNew: boolean): Promise<EventItem | null> => {
      if (!db) {
        setEvents((list) => {
          const next = demoteOthers(list, event);
          return isNew ? [...next, event] : next.map((e) => (e.id === event.id ? event : e));
        });
        return event;
      }
      try {
        const saved = isNew
          ? { ...event, id: Math.max(0, ...events.map((e) => e.id)) + 1 }
          : event;
        const batch = writeBatch(db);
        if (saved.status === "Active") {
          const active = await getDocs(query(collection(db, "events"), where("status", "==", "Active")));
          active.docs
            .filter((d) => d.id !== String(saved.id))
            .forEach((d) => batch.update(d.ref, { status: "Completed" }));
        }
        batch.set(doc(db, "events", String(saved.id)), toDoc(saved));
        await batch.commit();
        setError("");
        return saved;
      } catch (e) {
        setError(errorText(e));
        return null;
      }
    },
    [events],
  );

  // Changes that live only on this page
  const patchLocal = useCallback((id: number, patch: Partial<EventItem>) => {
    setEvents((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  return { events, error, saveEvent, patchLocal };
}

// The event the home page features: the active one, else the next scheduled one.
export function useFeaturedEvent() {
  const pick = (list: EventItem[]) =>
    list.find((e) => e.status === "Active") ?? list.find((e) => e.status === "Scheduled") ?? null;
  const [event, setEvent] = useState<EventItem | null>(() => (db ? null : pick(loadLocalEvents())));
  const [loaded, setLoaded] = useState(!db);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      query(collection(db, "events"), where("status", "in", ["Active", "Scheduled"])),
      (snap) => {
        const list = snap.docs.map((d) => fromDoc(d.data() as EventDoc)).sort((a, b) => a.id - b.id);
        setEvent(pick(list));
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, []);

  return { event, loaded };
}

// Whether an event is running right now. While it's still loading, `live` is
// undefined so pages can wait instead of flashing the "no event" state.
export function useLiveEvent() {
  const { event, loaded } = useFeaturedEvent();
  const live = loaded ? event?.status === "Active" : undefined;
  return { event: live ? event : null, live, loaded };
}
