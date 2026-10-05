import { emptyTournament, type Tournament } from "./tournament";

// A Tournament is stored as many small documents (events/{id}/items, see
// firebase/README.md) so two people editing different things never overwrite
// each other.
export type Item = { kind: string; key: string; value: unknown };

export const itemId = (kind: string, key: string) => `${kind}\u0000${key}`;

// The item's document name in Firestore: "score:G%7CI%7CA%7Ct1~t2". Keys can
// hold characters a document name can't (like "/"), so they're encoded.
export const itemDocId = (kind: string, key: string) => `${kind}:${encodeURIComponent(key)}`;

const keyed: [kind: string, field: "scores" | "matchMeta" | "matchOrder" | "seedOverride" | "bracketSeeds"][] = [
  ["score", "scores"],
  ["meta", "matchMeta"],
  ["order", "matchOrder"],
  ["seedOverride", "seedOverride"],
  ["bracketSeeds", "bracketSeeds"],
];

export function toItems(t: Tournament): Map<string, Item> {
  const out = new Map<string, Item>();
  const put = (kind: string, key: string, value: unknown) =>
    out.set(itemId(kind, key), { kind, key, value });

  put("config", "main", {
    divisions: t.divisions,
    groups: t.groups,
    crossGroups: t.crossGroups,
    settings: t.settings,
  });
  t.teams.forEach((x) => put("team", x.id, x));
  t.guestBids.forEach((x) => put("guestBid", x.id, x));
  t.players.forEach((x) => put("player", x.id, x));
  t.pros.forEach((x) => put("pro", x.id, x));
  t.signups.forEach((x) => put("signup", x.id, x));
  for (const [kind, field] of keyed) {
    for (const [key, value] of Object.entries(t[field])) put(kind, key, value);
  }
  return out;
}

export function fromItems(items: Iterable<Item>): Tournament {
  const t = emptyTournament();
  const teams: Tournament["teams"] = [];
  const bids: Tournament["guestBids"] = [];
  const people: Record<"player" | "pro" | "signup", Tournament["players"]> = { player: [], pro: [], signup: [] };
  for (const { kind, key, value } of items) {
    if (kind === "config") {
      const c = value as Partial<Tournament>;
      t.divisions = c.divisions ?? t.divisions;
      t.groups = c.groups ?? t.groups;
      t.crossGroups = c.crossGroups ?? t.crossGroups;
      t.settings = { ...t.settings, ...c.settings };
    } else if (kind === "team") teams.push(value as Tournament["teams"][number]);
    else if (kind === "guestBid") bids.push(value as Tournament["guestBids"][number]);
    else if (kind === "player" || kind === "pro" || kind === "signup")
      people[kind].push(value as Tournament["players"][number]);
    else {
      const field = keyed.find(([k]) => k === kind)?.[1];
      if (field) (t[field] as Record<string, unknown>)[key] = value;
    }
  }
  // Team ids sort in the order the teams were added
  t.teams = teams.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  t.guestBids = bids.sort((a, b) => a.time.localeCompare(b.time));
  const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id, undefined, { numeric: true });
  t.players = people.player.sort(byId);
  t.pros = people.pro.sort(byId);
  t.signups = people.signup.sort(byId);
  return t;
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

export function diffItems(prev: Map<string, Item>, next: Map<string, Item>) {
  const upserts: Item[] = [];
  const deletes: Item[] = [];
  for (const [id, item] of next) {
    const old = prev.get(id);
    if (!old || !same(old.value, item.value)) upserts.push(item);
  }
  for (const [id, item] of prev) if (!next.has(id)) deletes.push(item);
  return { upserts, deletes };
}
