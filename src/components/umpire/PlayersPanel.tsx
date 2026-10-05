import { FormEvent, useId, useState } from "react";
import {
  EITHER,
  divisions,
  fridayTimes,
  homeClubs,
  levels,
  type Person,
  type PlayerStatus,
} from "../../lib/registration";
import type { EventItem } from "../../lib/useEvents";
import { useLeagueSettings } from "../../lib/leagueSettings";
import { sampleTournament } from "../../lib/sampleTournament";
import { uid } from "../../lib/tournament";
import { useTournament } from "../../lib/useTournament";
import { StatusChip, nextSteps, personStatus, type ShownStatus } from "./PlayerStatus";
import Button from "../Button";
import Drawer from "../Drawer";
import Dropdown from "../Dropdown";
import TabNav from "../TabNav";
import { ChevronDown, SearchIcon } from "../icons";

type Roster = "players" | "pros";

const blankPerson = (): Person => ({
  id: uid(),
  name: "",
  phone: "",
  division: EITHER,
  fridayTime: EITHER,
  level: "",
  homeClub: "",
  status: "accepted",
});

const columns: { key: keyof Person; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "division", label: "Division" },
  { key: "fridayTime", label: "Friday time" },
  { key: "level", label: "Level" },
  { key: "homeClub", label: "Home club" },
];

// The roster filters; "All" (or nothing chosen) means no filter
const ALL = "All";
type Filters = { search: string; division: string; fridayTime: string; level: string; homeClub: string };
const noFilters: Filters = { search: "", division: "", fridayTime: "", level: "", homeClub: "" };

const matches = (p: Person, f: Filters) => {
  const q = f.search.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const pick = (value: string, wanted: string) => !wanted || wanted === ALL || value === wanted;
  return (
    (!q || p.name.toLowerCase().includes(q) || (digits.length > 0 && p.phone.replace(/\D/g, "").includes(digits))) &&
    pick(p.division, f.division) &&
    pick(p.fridayTime, f.fridayTime) &&
    pick(p.level, f.level) &&
    pick(p.homeClub, f.homeClub)
  );
};

// The event's Players tab: new sign-ups to review, then the player and pro
// rosters. Render with `key={event.id}` so each event starts fresh.
export default function PlayersPanel({
  event,
  onChange,
}: {
  event: EventItem;
  onChange: (patch: Partial<EventItem>) => void;
}) {
  // Signups and rosters are saved with the event's tournament data
  const { data: tournament, update } = useTournament(event.id, { role: "admin" });
  const signups = tournament?.signups ?? [];
  const rosters: Record<Roster, Person[]> = { players: tournament?.players ?? [], pros: tournament?.pros ?? [] };
  const setSignups = (list: Person[]) => update((t) => ({ ...t, signups: list }));
  const setRosters = (fn: (r: Record<Roster, Person[]>) => Record<Roster, Person[]>) =>
    update((t) => {
      const next = fn({ players: t.players, pros: t.pros });
      return { ...t, players: next.players, pros: next.pros };
    });
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Roster>("players");
  // The person in the drawer: shown read-only ("view") or as a form ("edit")
  const [editing, setEditing] = useState<{ person: Person; isNew: boolean; mode: "view" | "edit" } | null>(null);
  // A pending signup open in the drawer
  const [reviewing, setReviewing] = useState<Person | null>(null);
  const listId = useId();
  const shownStatus = (p: Person): ShownStatus => personStatus(tournament, p);
  // Default pros from Settings that aren't in this event yet
  const { settings: league } = useLeagueSettings();
  const missingPros = (league?.defaultPros ?? []).filter(
    (d) => !(tournament?.pros ?? []).some((p) => p.name.trim().toLowerCase() === d.name.trim().toLowerCase()),
  );
  const addDefaultPros = () =>
    update((t) => ({ ...t, pros: [...t.pros, ...missingPros.map((d) => ({ ...d, id: uid(), status: "accepted" as const }))] }));

  // Moves someone in the current roster to a new status (and keeps the drawer in step)
  const setStatus = (person: Person, status: PlayerStatus) => {
    const updated = { ...person, status };
    setRosters((r) => ({ ...r, [tab]: r[tab].map((p) => (p.id === person.id ? updated : p)) }));
    setEditing((e) => (e && e.person.id === person.id ? { ...e, person: updated } : e));
  };

  const resolve = (signup: Person, convert: boolean) => {
    setReviewing(null);
    const left = signups.filter((s) => s.id !== signup.id);
    setSignups(left);
    if (convert) setRosters((r) => ({ ...r, players: [...r.players, { ...signup, status: "accepted" }] }));
    if (!left.length) setOpen(false);
    onChange({ newSignups: left.length, players: event.players + (convert ? 1 : 0) });
  };

  const save = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!editing || !editing.person.name.trim()) return;
    const person = { ...editing.person, name: editing.person.name.trim() };
    setRosters((r) => ({
      ...r,
      [tab]: editing.isNew ? [...r[tab], person] : r[tab].map((p) => (p.id === person.id ? person : p)),
    }));
    if (editing.isNew && tab === "players") onChange({ players: event.players + 1 });
    setEditing(editing.isNew ? null : { person, isNew: false, mode: "view" });
  };

  const remove = () => {
    if (!editing) return;
    setRosters((r) => ({ ...r, [tab]: r[tab].filter((p) => p.id !== editing.person.id) }));
    if (tab === "players") onChange({ players: Math.max(0, event.players - 1) });
    setEditing(null);
  };

  // Cancel on a new person closes the drawer; on an existing one it goes back
  // to their saved details
  const cancelEdit = () => {
    if (!editing || editing.isNew) return setEditing(null);
    const saved = rosters[tab].find((p) => p.id === editing.person.id);
    setEditing(saved ? { person: { ...saved }, isNew: false, mode: "view" } : null);
  };

  const set = (field: keyof Person) => (value: string) =>
    setEditing((e) => (e ? { ...e, person: { ...e.person, [field]: value } } : e));

  const noun = tab === "players" ? "player" : "pro";
  const [filters, setFilters] = useState<Filters>(noFilters);
  const filtering = JSON.stringify(filters) !== JSON.stringify(noFilters);
  const setFilter = (field: keyof Filters) => (value: string) => setFilters((f) => ({ ...f, [field]: value }));
  const roster = rosters[tab].filter((p) => matches(p, filters));

  if (!tournament) return <p className="ump-hint">Loading players…</p>;

  const nothingYet = !signups.length && !rosters.players.length && !rosters.pros.length && !tournament.teams.length;

  return (
    <div className="event-players">
      {nothingYet && (
        <div className="ump-row ump-list">
          <span className="ump-grow ump-sub">
            No players yet. Load the Hamptons 2026 field (players, pros, teams and a few signups) to try
            everything out.
          </span>
          <button type="button" className="ump-btn" onClick={() => update(() => sampleTournament())}>
            Load sample field
          </button>
        </div>
      )}

      <button
        className={open ? "signup-review-card is-open" : "signup-review-card"}
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={signups.length === 0}
        aria-expanded={open}
        aria-controls={listId}
      >
        <div>
          <span>
            {signups.length} new signup{signups.length === 1 ? "" : "s"}
          </span>
          <small>{signups.length > 0 ? "Review pending players" : "All signups reviewed"}</small>
        </div>
        {signups.length > 0 && <ChevronDown />}
      </button>

      {open && signups.length > 0 && (
        <div className="ump-table-wrap roster-table signup-table" id={listId}>
          <table className="ump-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col">
                    {c.label}
                  </th>
                ))}
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {signups.map((s) => (
                // The whole row opens the signup; the buttons inside handle their own clicks
                <tr key={s.id} className="is-clickable" onClick={() => setReviewing(s)}>
                  {columns.map((c) => (
                    <td key={c.key}>{s[c.key] || "—"}</td>
                  ))}
                  <td className="roster-table__more">
                    <div className="signup-table__actions">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          resolve(s, true);
                        }}
                      >
                        Convert to player
                      </Button>
                      <button
                        type="button"
                        className="row-open"
                        aria-label={`Open ${s.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setReviewing(s);
                        }}
                      >
                        <span className="row-open__chevron" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TabNav
        className="roster-tabs"
        label="Roster"
        items={[
          { id: "players", label: "Players", badge: rosters.players.length },
          { id: "pros", label: "Pros", badge: rosters.pros.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "pros" && missingPros.length > 0 && (
        <div className="default-pros-note">
          <span>
            {missingPros.length} default pro{missingPros.length === 1 ? " isn't" : "s aren't"} in this event yet.
          </span>
          <Button variant="secondary" onClick={addDefaultPros}>
            Add default pros
          </Button>
        </div>
      )}

      <div className="roster-filters" role="search" aria-label={`Filter ${tab}`}>
        <label className="form-field roster-filters__search">
          <span>Search</span>
          {/* Not a <span>: the field's floating-label styles target its spans */}
          <i className="roster-filters__icon" aria-hidden="true">
            <SearchIcon />
          </i>
          <input
            type="search"
            placeholder="Search"
            value={filters.search}
            onChange={(e) => setFilter("search")(e.target.value)}
          />
        </label>
        <Dropdown label="Division" name="filterDivision" options={[ALL, ...divisions]} value={filters.division} onChange={setFilter("division")} />
        <Dropdown label="Friday time" name="filterFridayTime" options={[ALL, ...fridayTimes]} value={filters.fridayTime} onChange={setFilter("fridayTime")} />
        <Dropdown label="Level" name="filterLevel" options={[ALL, ...levels]} value={filters.level} onChange={setFilter("level")} />
        <Dropdown label="Home club" name="filterHomeClub" options={[ALL, ...homeClubs]} value={filters.homeClub} onChange={setFilter("homeClub")} />
        {filtering && (
          <button type="button" className="roster-filters__clear" onClick={() => setFilters(noFilters)}>
            Clear
          </button>
        )}
      </div>

      <div className="ump-table-wrap roster-table">
        <table className="ump-table">
          <thead>
            <tr>
              <th scope="col" className="roster-table__num">
                #
              </th>
              {columns.map((c) => (
                <th key={c.key} scope="col">
                  {c.label}
                </th>
              ))}
              <th scope="col">Status</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {roster.map((person, index) => (
              <tr
                key={person.id}
                className="is-clickable"
                onClick={() => setEditing({ person: { ...person }, isNew: false, mode: "view" })}
              >
                <td className="roster-table__num">{index + 1}</td>
                {columns.map((c) => (
                  <td key={c.key}>{person[c.key] || "—"}</td>
                ))}
                <td>
                  <StatusChip status={shownStatus(person)} />
                </td>
                <td className="roster-table__more">
                  <button
                    type="button"
                    className="row-open"
                    aria-label={`Open ${person.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing({ person: { ...person }, isNew: false, mode: "view" });
                    }}
                  >
                    <span className="row-open__chevron" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
            {roster.length === 0 && (
              <tr className="roster-table__empty">
                <td colSpan={columns.length + 3}>
                  {filtering ? `No ${tab} match these filters.` : `No ${tab} yet.`}
                </td>
              </tr>
            )}
            <tr className="roster-table__add">
              <td colSpan={columns.length + 3}>
                <button type="button" onClick={() => setEditing({ person: blankPerson(), isNew: true, mode: "edit" })}>
                  <span aria-hidden="true">+</span> Add {noun}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {reviewing && (
        <Drawer
          title={reviewing.name}
          description="Details"
          onClose={() => setReviewing(null)}
          actions={
            <>
              <Button key="dismiss" variant="danger-ghost" onClick={() => resolve(reviewing, false)}>
                Dismiss
              </Button>
              <Button key="convert" icon="check" onClick={() => resolve(reviewing, true)}>
                Convert to player
              </Button>
            </>
          }
        >
          <dl className="roster-details">
            <div>
              <dt>Status</dt>
              <dd>
                <StatusChip status="signed-up" />
              </dd>
            </div>
            {columns.map((c) => (
              <div key={c.key}>
                <dt>{c.label}</dt>
                <dd>{reviewing[c.key] || "—"}</dd>
              </div>
            ))}
          </dl>
        </Drawer>
      )}

      {editing && (
        // One drawer for both views, so switching to Edit doesn't slide in again
        <Drawer
          title={
            editing.mode === "view" ? editing.person.name : editing.isNew ? `Add ${noun}` : `Edit ${noun}`
          }
          description={
            editing.mode === "view"
              ? "Details"
              : editing.isNew
                ? `Add a ${noun} to this event's roster.`
                : `Update ${editing.person.name || `this ${noun}`}'s details.`
          }
          onClose={() => setEditing(null)}
          actions={
            editing.mode === "view" ? (
              <>
                <Button key="remove" variant="danger-ghost" onClick={remove}>
                  Remove
                </Button>
                {/* Distinct keys: otherwise React reuses this button as the
                    form's submit button and the same click submits the form */}
                <Button key="edit" onClick={() => setEditing({ ...editing, mode: "edit" })}>
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button key="cancel" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button
                  key="save"
                  type="submit"
                  form="roster-person-form"
                  icon="check"
                  disabled={!editing.person.name.trim()}
                >
                  {editing.isNew ? `Add ${noun}` : "Save"}
                </Button>
              </>
            )
          }
        >
          {editing.mode === "view" ? (
            <dl className="roster-details">
              <div>
                <dt>Status</dt>
                <dd className="status-cell">
                  <StatusChip status={shownStatus(editing.person)} />
                  {shownStatus(editing.person) !== "in-team" && (
                    <span className="status-steps">
                      {nextSteps[editing.person.status ?? "accepted"].map((step) => (
                        <Button
                          key={step.to}
                          variant={step.primary ? "secondary" : "ghost"}
                          onClick={() => setStatus(editing.person, step.to)}
                        >
                          {step.label}
                        </Button>
                      ))}
                    </span>
                  )}
                  {shownStatus(editing.person) === "paid" && (
                    <small className="status-hint">Next: add them to a team in Teams.</small>
                  )}
                </dd>
              </div>
              {columns.map((c) => (
                <div key={c.key}>
                  <dt>{c.label}</dt>
                  <dd>{editing.person[c.key] || "—"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <form id="roster-person-form" className="roster-form" onSubmit={save}>
              <label className="form-field">
                <span>Name</span>
                <input
                  type="text"
                  placeholder="Name"
                  value={editing.person.name}
                  onChange={(e) => set("name")(e.target.value)}
                  autoFocus
                  required
                />
              </label>
              <label className="form-field">
                <span>Phone</span>
                <input
                  type="tel"
                  placeholder="Phone"
                  value={editing.person.phone}
                  onChange={(e) => set("phone")(e.target.value)}
                />
              </label>
              <Dropdown label="Division" name="division" options={divisions} value={editing.person.division} onChange={set("division")} />
              <Dropdown label="Friday time" name="fridayTime" options={fridayTimes} value={editing.person.fridayTime} onChange={set("fridayTime")} />
              <Dropdown label="Level" name="level" options={levels} value={editing.person.level} onChange={set("level")} />
              <Dropdown label="Home club" name="homeClub" options={homeClubs} value={editing.person.homeClub} onChange={set("homeClub")} />
            </form>
          )}
        </Drawer>
      )}
    </div>
  );
}
