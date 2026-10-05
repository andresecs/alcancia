import { cachedLeagueSettings } from "./leagueSettings";
import type { Person } from "./registration";

// Everything the umpire tools need to run a pro-am: teams, the Calcutta
// auction, round-robin groups and the knockout bracket. All of it is plain
// data plus pure functions, so the storage layer (this browser, or
// Firebase when connected) only has to load and save one Tournament object.

export type Team = {
  id: string;
  div: string;
  amateur: string;
  pro: string;
  group: string; // "" until the draw
  // Each person pays their own entry
  amateurPaid?: boolean;
  proPaid?: boolean;
  entryPaid?: boolean; // older saves: one flag for the whole team
  bid: number;
  owner: string; // "" means the team's own players hold it
  sold: boolean;
};

export type GuestBid = {
  id: string;
  teamId: string;
  bidder: string;
  amount: number;
  time: string;
  status: "pending" | "accepted" | "dismissed" | "outbid";
};

export type GroupInfo = { name: string; venue: string };

export type Score = { a: string; b: string; ga: number; gb: number; by: string };

export type MatchMeta = { time: string };

export type PayoutSplit = {
  champion: number;
  finalist: number;
  semifinalist: number; // paid to each losing semi-finalist
};

export type Settings = {
  entryFee: number;
  minBid: number;
  minIncrement: number;
  guestBidding: boolean;
  requireApproval: boolean;
  advance: number; // teams out of each group
  payout: PayoutSplit;
};

export type Tournament = {
  divisions: string[];
  groups: Record<string, GroupInfo[]>;
  // Divisions whose first knockout round crosses paired groups (A1 v B2, B1 v A2)
  crossGroups: Record<string, boolean>;
  teams: Team[];
  guestBids: GuestBid[];
  scores: Record<string, Score>; // group matches and knockout matches, by match key
  matchMeta: Record<string, MatchMeta>;
  matchOrder: Record<string, string[]>; // "div|group" -> match keys in play order
  seedOverride: Record<string, string[]>; // div -> team ids, manual seeding order
  bracketSeeds: Record<string, string[]>; // div -> the frozen draw, by bracket position
  // The people taking part, from the Players tab
  players: Person[];
  pros: Person[];
  signups: Person[]; // waiting for review
  settings: Settings;
};

export const defaultSettings: Settings = {
  entryFee: 1000,
  minBid: 500,
  minIncrement: 250,
  guestBidding: false,
  requireApproval: true,
  advance: 2,
  payout: { champion: 50, finalist: 25, semifinalist: 12.5 },
};

// New events start from the league's entry fee and Calcutta rules
function leagueStartingSettings(): Settings {
  const league = cachedLeagueSettings();
  return {
    ...defaultSettings,
    entryFee: league.league.entryFee,
    minBid: league.calcutta.minBid,
    minIncrement: league.calcutta.minIncrement,
    guestBidding: league.calcutta.guestBidding,
    requireApproval: league.calcutta.requireApproval,
    payout: league.calcutta.payout,
  };
}

export function emptyTournament(): Tournament {
  return {
    divisions: ["I", "II"],
    groups: { I: [], II: [] },
    crossGroups: {},
    teams: [],
    guestBids: [],
    scores: {},
    matchMeta: {},
    matchOrder: {},
    seedOverride: {},
    bracketSeeds: {},
    players: [],
    pros: [],
    signups: [],
    settings: leagueStartingSettings(),
  };
}

// Starts with the time so ids sort in the order things were added
export const uid = () => "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const money = (n: number) =>
  "$" +
  n.toLocaleString("en-US", {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });

export const amateurHasPaid = (t: Team) => t.amateurPaid ?? t.entryPaid ?? false;
export const proHasPaid = (t: Team) => t.proPaid ?? t.entryPaid ?? false;

export const teamName = (t: Team | undefined) =>
  t ? `${t.amateur} & ${t.pro}` : "TBD";

export const ownerOf = (t: Team) => t.owner.trim() || `${t.amateur} (players)`;

/* ------------------------------------------------------------------ */
/*  Calcutta                                                           */
/* ------------------------------------------------------------------ */

export function divisionPot(t: Tournament, div: string) {
  const teams = t.teams.filter((x) => x.div === div);
  const sold = teams.filter((x) => x.sold);
  return {
    pot: sold.reduce((s, x) => s + x.bid, 0),
    projected: teams.reduce((s, x) => s + x.bid, 0),
    sold: sold.length,
    total: teams.length,
  };
}

export function payoutAmounts(pot: number, split: PayoutSplit) {
  return {
    champion: (pot * split.champion) / 100,
    finalist: (pot * split.finalist) / 100,
    semifinalist: (pot * split.semifinalist) / 100,
  };
}

export type LedgerRow = {
  owner: string;
  teams: Team[];
  owes: number;
  wins: number;
};

// What every buyer owes for the teams they bought and what they collect back.
export function ownerLedger(t: Tournament): LedgerRow[] {
  const rows = new Map<string, LedgerRow>();
  const row = (owner: string) => {
    let r = rows.get(owner);
    if (!r) {
      r = { owner, teams: [], owes: 0, wins: 0 };
      rows.set(owner, r);
    }
    return r;
  };

  for (const team of t.teams) {
    if (!team.sold) continue;
    const r = row(ownerOf(team));
    r.teams.push(team);
    r.owes += team.bid;
  }

  for (const div of t.divisions) {
    const { pot } = divisionPot(t, div);
    const amounts = payoutAmounts(pot, t.settings.payout);
    const result = finishers(t, div);
    const pay = (id: string | null, amount: number) => {
      const team = t.teams.find((x) => x.id === id);
      if (team?.sold) row(ownerOf(team)).wins += amount;
    };
    pay(result.champion, amounts.champion);
    pay(result.finalist, amounts.finalist);
    result.semifinalists.forEach((id) => pay(id, amounts.semifinalist));
  }

  return [...rows.values()].sort((a, b) => b.owes - a.owes);
}

// Records a pending guest bid as the new price, and marks anything it beats.
export function acceptGuestBid(t: Tournament, bidId: string): Tournament {
  const bid = t.guestBids.find((b) => b.id === bidId);
  if (!bid || bid.status !== "pending") return t;
  return {
    ...t,
    teams: t.teams.map((x) =>
      x.id === bid.teamId ? { ...x, bid: bid.amount, owner: bid.bidder } : x,
    ),
    guestBids: t.guestBids.map((b) => {
      if (b.id === bidId) return { ...b, status: "accepted" };
      if (b.status === "pending" && b.teamId === bid.teamId && b.amount <= bid.amount) {
        return { ...b, status: "outbid" };
      }
      return b;
    }),
  };
}

/* ------------------------------------------------------------------ */
/*  Group stage                                                        */
/* ------------------------------------------------------------------ */

export type GroupMatch = {
  key: string;
  div: string;
  grp: string;
  a: string;
  b: string;
  score: Score | null;
  time: string;
};

const groupKey = (div: string, grp: string) => `${div}|${grp}`;
const pairKey = (div: string, grp: string, a: string, b: string) =>
  `G|${div}|${grp}|${[a, b].sort().join("~")}`;

// Round-robin order. Groups of four use the classic 1v2, 3v4, 1v3, 2v4, 1v4, 2v3.
function roundRobin(ids: string[]): [string, string][] {
  if (ids.length === 4) {
    return [
      [ids[0], ids[1]],
      [ids[2], ids[3]],
      [ids[0], ids[2]],
      [ids[1], ids[3]],
      [ids[0], ids[3]],
      [ids[1], ids[2]],
    ];
  }
  // Circle method for any other size
  const list: (string | null)[] = [...ids];
  if (list.length % 2) list.push(null);
  const out: [string, string][] = [];
  const n = list.length;
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a && b) out.push([a, b]);
    }
    list.splice(1, 0, list.pop()!);
  }
  return out;
}

export const groupTeams = (t: Tournament, div: string, grp: string) =>
  t.teams.filter((x) => x.div === div && x.group === grp);

// A score only counts while it was entered for the two teams now in that match.
const validScore = (s: Score | undefined, a: string, b: string) =>
  s && s.a === a && s.b === b ? s : null;

export function groupMatches(t: Tournament, div: string, grp: string): GroupMatch[] {
  const ids = groupTeams(t, div, grp).map((x) => x.id);
  const matches = roundRobin(ids).map(([a, b]) => {
    const key = pairKey(div, grp, a, b);
    return {
      key,
      div,
      grp,
      a,
      b,
      score: validScore(t.scores[key], a, b),
      time: t.matchMeta[key]?.time ?? "",
    };
  });
  const order = t.matchOrder[groupKey(div, grp)] ?? [];
  const rank = (k: string) => {
    const i = order.indexOf(k);
    return i < 0 ? 999 : i;
  };
  return matches
    .map((m, i) => ({ m, i }))
    .sort((x, y) => rank(x.m.key) - rank(y.m.key) || x.i - y.i)
    .map(({ m }) => m);
}

export function moveMatch(t: Tournament, div: string, grp: string, key: string, dir: -1 | 1) {
  const keys = groupMatches(t, div, grp).map((m) => m.key);
  const at = keys.indexOf(key);
  const to = at + dir;
  if (at < 0 || to < 0 || to >= keys.length) return t;
  [keys[at], keys[to]] = [keys[to], keys[at]];
  return { ...t, matchOrder: { ...t.matchOrder, [groupKey(div, grp)]: keys } };
}

export type StandingRow = {
  id: string;
  played: number;
  w: number;
  l: number;
  gf: number;
  ga: number;
};

// Matches won, then game difference, then head to head, then games won.
export function groupStandings(t: Tournament, div: string, grp: string) {
  const matches = groupMatches(t, div, grp);
  const rec = new Map<string, StandingRow>();
  for (const team of groupTeams(t, div, grp)) {
    rec.set(team.id, { id: team.id, played: 0, w: 0, l: 0, gf: 0, ga: 0 });
  }
  for (const m of matches) {
    if (!m.score) continue;
    const A = rec.get(m.a)!;
    const B = rec.get(m.b)!;
    A.played++;
    B.played++;
    A.gf += m.score.ga;
    A.ga += m.score.gb;
    B.gf += m.score.gb;
    B.ga += m.score.ga;
    if (m.score.ga > m.score.gb) {
      A.w++;
      B.l++;
    } else {
      B.w++;
      A.l++;
    }
  }
  const h2h = (x: string, y: string) => {
    for (const m of matches) {
      if (!m.score) continue;
      if (m.a === x && m.b === y) return m.score.ga > m.score.gb ? -1 : 1;
      if (m.a === y && m.b === x) return m.score.gb > m.score.ga ? -1 : 1;
    }
    return 0;
  };
  const rows = [...rec.values()].sort(
    (A, B) =>
      B.w - A.w ||
      B.gf - B.ga - (A.gf - A.ga) ||
      h2h(A.id, B.id) ||
      B.gf - A.gf,
  );
  return {
    rows,
    complete: matches.length > 0 && matches.every((m) => m.score),
    played: matches.filter((m) => m.score).length,
    total: matches.length,
  };
}

/* ------------------------------------------------------------------ */
/*  Seeding                                                            */
/* ------------------------------------------------------------------ */

export type Seed = {
  id: string;
  grp: string;
  pos: number;
  w: number;
  d: number;
  gf: number;
  tiedWithNext: boolean;
};

// Every group winner is seeded above every runner-up; within each tier it is
// matches won, then game difference, then games won. Returns null until every
// group in the division is finished.
export function seedList(t: Tournament, div: string): Seed[] | null {
  const groups = t.groups[div] ?? [];
  if (!groups.length) return null;
  const seeds: Seed[] = [];
  for (const g of groups) {
    const st = groupStandings(t, div, g.name);
    if (!st.complete) return null;
    st.rows.slice(0, t.settings.advance).forEach((r, i) =>
      seeds.push({
        id: r.id,
        grp: g.name,
        pos: i + 1,
        w: r.w,
        d: r.gf - r.ga,
        gf: r.gf,
        tiedWithNext: false,
      }),
    );
  }
  seeds.sort((A, B) => A.pos - B.pos || B.w - A.w || B.d - A.d || B.gf - A.gf);

  // A manual order from the umpire wins, as long as it still names the same teams.
  const manual = t.seedOverride[div];
  if (manual && manual.length === seeds.length && seeds.every((s) => manual.includes(s.id))) {
    seeds.sort((A, B) => manual.indexOf(A.id) - manual.indexOf(B.id));
  }
  seeds.forEach((s, i) => {
    const n = seeds[i + 1];
    s.tiedWithNext = !!n && n.pos === s.pos && n.w === s.w && n.d === s.d && n.gf === s.gf;
  });
  return seeds;
}

/* ------------------------------------------------------------------ */
/*  Knockout bracket                                                   */
/* ------------------------------------------------------------------ */

// Standard bracket positions: 8 -> 1,8,4,5,2,7,3,6
function bracketOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order;
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr.slice()];
  return arr.flatMap((head, i) =>
    permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((tail) => [head, ...tail]),
  );
}

// Builds the first-round draw, as team ids by bracket position ("" = bye).
// Teams from the same group are kept apart in their first knockout match while
// straying as little as possible from the seeding.
export function drawBracket(t: Tournament, div: string): string[] {
  const seeds = seedList(t, div);
  if (!seeds) throw new Error(`Every group in Division ${div} must be finished first.`);
  if (seeds.length < 2) throw new Error("Not enough qualifiers for a bracket.");

  const groups = t.groups[div] ?? [];
  if (t.crossGroups[div]) {
    if (t.settings.advance !== 2 || groups.length % 2 || ![2, 4, 8].includes(groups.length)) {
      throw new Error("Cross-group draws need an even number of groups (2, 4 or 8) and two qualifiers each.");
    }
    const at = (grp: string, pos: number) => seeds.find((s) => s.grp === grp && s.pos === pos)!.id;
    const first: string[] = [];
    const second: string[] = [];
    // Each pair of groups produces two matches placed in opposite halves of
    // the draw, so two teams from one group cannot meet again before the final.
    for (let i = 0; i < groups.length; i += 2) {
      const A = groups[i].name;
      const B = groups[i + 1].name;
      first.push(at(A, 1), at(B, 2));
      second.push(at(B, 1), at(A, 2));
    }
    return [...first, ...second];
  }

  let size = 2;
  while (size < seeds.length) size *= 2;
  const order = bracketOrder(size);
  const byes = size - seeds.length;
  const grp = (seedNo: number) => seeds[seedNo - 1]?.grp;

  // Seeds 1..byes sit out the first round. Of the rest, the better half host
  // a first-round match and the other half are shuffled among them.
  const playing = seeds.length - byes;
  const hosts = Array.from({ length: playing / 2 }, (_, i) => byes + 1 + i);
  const challengers = Array.from({ length: playing / 2 }, (_, i) => seeds.length - i);

  // The bye-holder waiting for the winner of a host's first-round match
  const feedsInto = (host: number) => {
    const neighbour = Math.floor(order.indexOf(host) / 2) ^ 1;
    return [order[neighbour * 2], order[neighbour * 2 + 1]].find((s) => s <= byes);
  };

  let best: number[] | null = null;
  let bestCost = Infinity;
  const tryAll = challengers.length <= 8;
  const candidates = tryAll ? permutations(challengers) : [challengers];
  for (const perm of candidates) {
    let clashes = 0;
    let drift = 0;
    hosts.forEach((h, i) => {
      const c = perm[i];
      if (grp(h) === grp(c)) clashes++;
      const bye = feedsInto(h);
      if (bye && (grp(bye) === grp(h) || grp(bye) === grp(c))) clashes++;
      drift += Math.abs(c - challengers[i]);
    });
    const cost = clashes * 1000 + drift;
    if (cost < bestCost) {
      bestCost = cost;
      best = perm;
    }
  }

  const opponentOf = new Map<number, number>();
  hosts.forEach((h, i) => opponentOf.set(h, best![i]));
  const positions: string[] = new Array(size).fill("");
  for (let p = 0; p < size; p += 2) {
    const top = order[p];
    const bottom = order[p + 1];
    if (top <= byes) {
      positions[p] = seeds[top - 1].id;
    } else {
      positions[p] = seeds[top - 1].id;
      positions[p + 1] = seeds[(opponentOf.get(top) ?? bottom) - 1].id;
    }
  }
  return positions;
}

export type KoMatch = {
  key: string;
  round: number;
  slot: number;
  a: string;
  b: string;
  bye: boolean;
  score: Score | null;
  winner: string;
  loser: string;
  time: string;
};

export type KoRound = { name: string; matches: KoMatch[] };

function roundName(matches: number, first: boolean, hasByes: boolean) {
  if (matches === 1) return "Final";
  if (matches === 2) return "Semi-finals";
  if (matches === 4) return first && hasByes ? "Qualifying round" : "Quarter-finals";
  if (first && hasByes) return "Qualifying round";
  return `Round of ${matches * 2}`;
}

// Works the whole bracket out from the frozen draw and the scores entered so
// far: winners move forward on their own, and the semi-final losers meet in
// the third-place match.
export function bracket(t: Tournament, div: string) {
  const draw = t.bracketSeeds[div];
  if (!draw?.length) return null;
  const hasByes = draw.some((x) => !x);
  const rounds: KoRound[] = [];
  let entrants = draw;
  let r = 0;
  let semis: KoMatch[] = [];
  while (entrants.length >= 2) {
    const matches: KoMatch[] = [];
    for (let i = 0; i < entrants.length; i += 2) {
      const a = entrants[i];
      const b = entrants[i + 1];
      const key = `K|${div}|${r}|${i / 2}`;
      const bye = r === 0 && (!a || !b);
      const score = !bye && a && b ? validScore(t.scores[key], a, b) : null;
      let winner = "";
      let loser = "";
      if (bye) winner = a || b;
      else if (score) {
        winner = score.ga > score.gb ? a : b;
        loser = score.ga > score.gb ? b : a;
      }
      matches.push({
        key,
        round: r,
        slot: i / 2,
        a,
        b,
        bye,
        score,
        winner,
        loser,
        time: t.matchMeta[key]?.time ?? "",
      });
    }
    rounds.push({ name: roundName(matches.length, r === 0, hasByes), matches });
    if (matches.length === 2) semis = matches;
    entrants = matches.map((m) => m.winner);
    r++;
  }

  let third: KoMatch | null = null;
  if (semis.length === 2) {
    const a = semis[0].loser;
    const b = semis[1].loser;
    const key = `K|${div}|3P`;
    const score = a && b ? validScore(t.scores[key], a, b) : null;
    third = {
      key,
      round: r,
      slot: 0,
      a,
      b,
      bye: false,
      score,
      winner: score ? (score.ga > score.gb ? a : b) : "",
      loser: score ? (score.ga > score.gb ? b : a) : "",
      time: t.matchMeta[key]?.time ?? "",
    };
  }
  return { rounds, third };
}

export function finishers(t: Tournament, div: string) {
  const b = bracket(t, div);
  const out = {
    champion: null as string | null,
    finalist: null as string | null,
    semifinalists: [] as string[],
  };
  if (!b) return out;
  const final = b.rounds[b.rounds.length - 1]?.matches[0];
  if (final?.score) {
    out.champion = final.winner;
    out.finalist = final.loser;
  }
  const semis = b.rounds.find((r) => r.matches.length === 2);
  semis?.matches.forEach((m) => m.loser && out.semifinalists.push(m.loser));
  return out;
}

/* ------------------------------------------------------------------ */
/*  Groups                                                             */
/* ------------------------------------------------------------------ */

// Shuffles every team in a division into its groups as evenly as possible.
export function randomDraw(t: Tournament, div: string): Tournament {
  const groups = t.groups[div] ?? [];
  if (!groups.length) return t;
  const ids = t.teams.filter((x) => x.div === div).map((x) => x.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const assign = new Map(ids.map((id, i) => [id, groups[i % groups.length].name]));
  return {
    ...t,
    teams: t.teams.map((x) => (assign.has(x.id) ? { ...x, group: assign.get(x.id)! } : x)),
  };
}

export function scoreError(ga: number, gb: number) {
  if ([ga, gb].some((n) => !Number.isInteger(n) || n < 0 || n > 99)) return "Invalid score.";
  if (ga === gb) return "A set cannot end level.";
  return "";
}

// Renames a group (and/or changes its venue), moving its teams, scores,
// match times and match order over to the new name.
export function updateGroup(
  t: Tournament,
  div: string,
  oldName: string,
  next: GroupInfo,
): Tournament {
  const name = next.name.trim();
  const groups = (t.groups[div] ?? []).map((g) => (g.name === oldName ? { name, venue: next.venue } : g));
  if (name === oldName) return { ...t, groups: { ...t.groups, [div]: groups } };

  const oldPrefix = `G|${div}|${oldName}|`;
  const newPrefix = `G|${div}|${name}|`;
  const moveKeys = <V,>(record: Record<string, V>) =>
    Object.fromEntries(
      Object.entries(record).map(([k, v]) => [k.startsWith(oldPrefix) ? newPrefix + k.slice(oldPrefix.length) : k, v]),
    );
  const order = { ...t.matchOrder };
  const oldOrderKey = `${div}|${oldName}`;
  if (order[oldOrderKey]) {
    order[`${div}|${name}`] = order[oldOrderKey].map((k) =>
      k.startsWith(oldPrefix) ? newPrefix + k.slice(oldPrefix.length) : k,
    );
    delete order[oldOrderKey];
  }
  return {
    ...t,
    groups: { ...t.groups, [div]: groups },
    teams: t.teams.map((x) => (x.div === div && x.group === oldName ? { ...x, group: name } : x)),
    scores: moveKeys(t.scores),
    matchMeta: moveKeys(t.matchMeta),
    matchOrder: order,
  };
}
