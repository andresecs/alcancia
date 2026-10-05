import { FormEvent, useState } from "react";
import type { Person } from "../../lib/registration";
import { sampleTournament } from "../../lib/sampleTournament";
import {
  amateurHasPaid,
  money,
  proHasPaid,
  randomDraw,
  uid,
  updateGroup,
  type GroupInfo,
  type Team,
  type Tournament,
} from "../../lib/tournament";
import { Stat, groupLabel, type Update } from "./shared";
import Button from "../Button";
import Chip from "../Chip";
import { PaidIcon, SearchIcon } from "../icons";
import PersonPicker, { type PickerOption } from "../PersonPicker";
import Tooltip from "../Tooltip";
import { StatusChip, personStatus } from "./PlayerStatus";
import Drawer from "../Drawer";
import Dropdown from "../Dropdown";
import MenuButton from "../MenuButton";
import TabNav from "../TabNav";

const ALL = "all";

// The filters over the groups & teams table; "All" (or nothing chosen) means no filter
const ANY = "All";
type TeamFilters = { search: string; group: string; entry: string };
const noTeamFilters: TeamFilters = { search: "", group: "", entry: "" };
const divisionLabel = (d: string) => `Division ${d}`;
// "A" -> "Group A", but "Group 1" stays "Group 1"

// The paid / unpaid icon, with a tooltip saying what it means
function PaidMark({ name, paid }: { name: string; paid: boolean }) {
  return (
    <Tooltip text={paid ? `${name} has paid their entry` : `${name} hasn't paid their entry yet`} arrow="bottom">
      <PaidIcon paid={paid} />
    </Tooltip>
  );
}

function PaidChip({ paid }: { paid: boolean }) {
  return (
    <Chip type="soft" size="sm" mode={paid ? "success" : "danger"}>
      {paid ? "Paid" : "Unpaid"}
    </Chip>
  );
}

export default function TeamsPanel({ data, update }: { data: Tournament; update: Update }) {
  // "all" or one division
  const [view, setView] = useState<string>(ALL);
  // The team open in the drawer
  const [teamDrawer, setTeamDrawer] = useState<{ team: Team; isNew: boolean; mode: "view" | "edit" } | null>(null);
  // The group open in the drawer: `original` is its saved name ("" when new)
  const [groupDrawer, setGroupDrawer] = useState<{
    div: string;
    original: string;
    draft: GroupInfo;
    mode: "view" | "edit";
  } | null>(null);

  const isAll = view === ALL;
  const [filters, setFilters] = useState(noTeamFilters);
  const filtering = JSON.stringify(filters) !== JSON.stringify(noTeamFilters);
  const setFilter = (field: keyof TeamFilters) => (value: string) => setFilters((f) => ({ ...f, [field]: value }));
  const teamMatches = (t: Team) => {
    const q = filters.search.trim().toLowerCase();
    const paidUp = amateurHasPaid(t) && proHasPaid(t);
    return (
      (!q || t.amateur.toLowerCase().includes(q) || t.pro.toLowerCase().includes(q)) &&
      (!filters.group || filters.group === ANY || (filters.group === "No group" ? !t.group : t.group === filters.group)) &&
      (!filters.entry || filters.entry === ANY || (filters.entry === "Paid" ? paidUp : !paidUp))
    );
  };
  const shownDivisions = isAll ? data.divisions : [view];
  const teams = data.teams.filter((t) => shownDivisions.includes(t.div));
  const groupRows = shownDivisions.flatMap((d) => (data.groups[d] ?? []).map((g) => ({ div: d, ...g })));
  // Entries are per person: every team has a player and a pro
  const people = teams.length * 2;
  const paid = teams.reduce((n, t) => n + (amateurHasPaid(t) ? 1 : 0) + (proHasPaid(t) ? 1 : 0), 0);

  const newTeam = (div: string, group: string): Team => ({
    id: uid(),
    div,
    amateur: "",
    pro: "",
    group,
    amateurPaid: false,
    proPaid: false,
    bid: data.settings.minBid,
    owner: "",
    sold: false,
  });

  const teamReady = !!teamDrawer && !!teamDrawer.team.amateur.trim() && !!teamDrawer.team.pro.trim();

  const saveTeam = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!teamDrawer || !teamReady) return;
    const team = { ...teamDrawer.team, amateur: teamDrawer.team.amateur.trim(), pro: teamDrawer.team.pro.trim() };
    update((t) => ({
      ...t,
      teams: teamDrawer.isNew ? [...t.teams, team] : t.teams.map((x) => (x.id === team.id ? team : x)),
    }));
    setTeamDrawer(teamDrawer.isNew ? null : { team, isNew: false, mode: "view" });
  };

  const removeTeam = (team: Team) => {
    update((t) => ({ ...t, teams: t.teams.filter((x) => x.id !== team.id) }));
    setTeamDrawer(null);
  };

  const removeGroup = (div: string, name: string) => {
    update((t) => ({
      ...t,
      groups: { ...t.groups, [div]: (t.groups[div] ?? []).filter((g) => g.name !== name) },
      teams: t.teams.map((x) => (x.div === div && x.group === name ? { ...x, group: "" } : x)),
    }));
    setGroupDrawer(null);
  };

  const drawerTeams = groupDrawer
    ? data.teams.filter((t) => t.div === groupDrawer.div && t.group === groupDrawer.original)
    : [];
  const draftName = groupDrawer?.draft.name.trim() ?? "";
  const nameTaken =
    !!groupDrawer &&
    draftName !== groupDrawer.original &&
    (data.groups[groupDrawer.div] ?? []).some((g) => g.name === draftName);

  const saveGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!groupDrawer || !draftName || nameTaken) return;
    const { div, original } = groupDrawer;
    const next = { name: draftName, venue: groupDrawer.draft.venue.trim() };
    if (!original) {
      update((t) => ({ ...t, groups: { ...t.groups, [div]: [...(t.groups[div] ?? []), next] } }));
      setGroupDrawer(null);
    } else {
      update((t) => updateGroup(t, div, original, next));
      setGroupDrawer({ div, original: next.name, draft: next, mode: "view" });
    }
  };

  // People for the Player / Pro pickers: their status, crossed off when another team has them
  const pickerOptions = (people: Person[], teamId: string): PickerOption[] =>
    people.map((p) => {
      const other = data.teams.find(
        (t) => t.id !== teamId && (t.amateur.trim() === p.name.trim() || t.pro.trim() === p.name.trim()),
      );
      return {
        id: p.id,
        name: p.name,
        status: <StatusChip status={personStatus(data, p)} />,
        taken: !!other,
        takenNote: other ? `On ${other.amateur} / ${other.pro}` : undefined,
      };
    });

  // Each group's block in the table; teams without a group get a final block per division.
  // While filtering, only blocks with a matching team (or the chosen group) stay.
  const blocks = shownDivisions
    .flatMap((d) => [
      ...(data.groups[d] ?? []).map((g) => ({ div: d, group: g as GroupInfo | null, name: g.name })),
      ...(data.teams.some((t) => t.div === d && !t.group) ? [{ div: d, group: null, name: "" }] : []),
    ])
    .filter(
      (b) =>
        !filtering ||
        data.teams.some((t) => t.div === b.div && t.group === b.name && teamMatches(t)) ||
        (filters.group === b.name && !filters.search && (!filters.entry || filters.entry === ANY)),
    );
  const groupNames = [...new Set(shownDivisions.flatMap((d) => (data.groups[d] ?? []).map((g) => g.name)))];

  const addTeam = () =>
    setTeamDrawer({ team: newTeam(isAll ? (data.divisions[0] ?? "I") : view, ""), isNew: true, mode: "edit" });
  const addGroup = () =>
    setGroupDrawer({ div: isAll ? (data.divisions[0] ?? "I") : view, original: "", draft: { name: "", venue: "" }, mode: "edit" });

  return (
    <div className="ump-panel">
      <div className="teams-bar">
      <TabNav
        className="teams-tabs"
        label="Division"
        items={[
          { id: ALL, label: "All", badge: data.teams.length },
          ...data.divisions.map((d) => ({
            id: d,
            label: divisionLabel(d),
            badge: data.teams.filter((t) => t.div === d).length,
          })),
        ]}
        value={view}
        onChange={setView}
      />
        <MenuButton
          label="Add"
          items={[
            { id: "team", label: "Add team", onSelect: addTeam },
            { id: "group", label: "Add group", onSelect: addGroup },
          ]}
        />
      </div>

      <div className="ump-stats">
        <Stat label="Teams" value={teams.length} note={isAll ? "All divisions" : divisionLabel(view)} />
        <Stat label="Entries paid" value={`${paid} / ${people}`} note="Players and pros" />
        <Stat
          label="Entry fees collected"
          value={money(paid * data.settings.entryFee)}
          note={`of ${money(people * data.settings.entryFee)}`}
        />
      </div>

      {data.teams.length === 0 && (
        <div className="ump-row ump-list">
          <span className="ump-grow ump-sub">
            Starting from scratch? Load the Hamptons 2026 field (40 teams, groups and venues) to try
            everything out, then edit or remove it.
          </span>
          <button type="button" className="ump-btn" onClick={() => update(() => sampleTournament())}>
            Load sample field
          </button>
        </div>
      )}

      {/* Draws work one division at a time, so they only show for a division */}
      {!isAll && (
        <div className="teams-toolbar">
          <label className="ump-check" title="Each group winner plays the other group's runner-up (1st group with 2nd, 3rd with 4th)">
            <input
              type="checkbox"
              checked={!!data.crossGroups[view]}
              onChange={(e) => update((t) => ({ ...t, crossGroups: { ...t.crossGroups, [view]: e.target.checked } }))}
            />
            Cross-group draw
          </label>
          <button
            type="button"
            className="ump-btn"
            disabled={!groupRows.length || !teams.length}
            onClick={() => {
              if (window.confirm(`Shuffle every ${divisionLabel(view)} team into a random group?`)) {
                update((t) => randomDraw(t, view));
              }
            }}
          >
            Random draw
          </button>
        </div>
      )}

      <div className="roster-filters teams-filters" role="search" aria-label="Filter teams">
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
        <Dropdown label="Group" name="filterGroup" options={[ANY, ...groupNames, "No group"]} value={filters.group} onChange={setFilter("group")} />
        <Dropdown label="Entry" name="filterEntry" options={[ANY, "Paid", "Not paid"]} value={filters.entry} onChange={setFilter("entry")} />
        {filtering && (
          <button type="button" className="roster-filters__clear" onClick={() => setFilters(noTeamFilters)}>
            Clear
          </button>
        )}
      </div>

      <div className="ump-table-wrap roster-table teams-table">
        <table className="ump-table">
          <thead>
            <tr>
              <th scope="col" className="roster-table__num">
                #
              </th>
              <th scope="col">Player / Pro</th>
              <th scope="col">
                <span className="visually-hidden">Open</span>
              </th>
            </tr>
          </thead>
          {blocks.map((block) => {
            const blockTeams = data.teams.filter((t) => t.div === block.div && t.group === block.name && teamMatches(t));
            const openGroup = () =>
              block.group &&
              setGroupDrawer({
                div: block.div,
                original: block.group.name,
                draft: { name: block.group.name, venue: block.group.venue },
                mode: "view",
              });
            return (
              // One <tbody> per group keeps its rows together
              <tbody key={`${block.div}|${block.name}`} className="teams-table__group">
                <tr
                  className={block.group ? "teams-table__group-row is-clickable" : "teams-table__group-row"}
                  onClick={openGroup}
                >
                  <td colSpan={2}>
                    <span className="teams-table__label">
                      <strong>{block.group ? groupLabel(block.group.name) : "No group"}</strong>
                      {isAll && <small className="teams-table__division">{divisionLabel(block.div)}</small>}
                    </span>
                  </td>
                  <td className="roster-table__more">
                    {block.group && (
                      <button
                        type="button"
                        className="row-open"
                        aria-label={`Open ${groupLabel(block.group.name)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openGroup();
                        }}
                      >
                        <span className="row-open__chevron" aria-hidden="true" />
                      </button>
                    )}
                  </td>
                </tr>
                {blockTeams.map((team, index) => {
                  const openTeam = () => setTeamDrawer({ team: { ...team }, isNew: false, mode: "view" });
                  return (
                    <tr key={team.id} className="teams-table__team is-clickable" onClick={openTeam}>
                      <td className="roster-table__num">{index + 1}</td>
                      <td>
                        <span className="teams-table__label">
                          <span className="teams-table__person">
                            {team.amateur}
                            <PaidMark name={team.amateur} paid={amateurHasPaid(team)} />
                          </span>
                          <span className="teams-table__slash">/</span>
                          <span className="teams-table__person">
                            {team.pro}
                            <PaidMark name={team.pro} paid={proHasPaid(team)} />
                          </span>
                        </span>
                      </td>
                      <td className="roster-table__more">
                        <button
                          type="button"
                          className="row-open"
                          aria-label={`Open ${team.amateur} & ${team.pro}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openTeam();
                          }}
                        >
                          <span className="row-open__chevron" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {block.group && !filtering && (
                  <tr className="roster-table__add teams-table__add-team">
                    <td colSpan={3}>
                      <button
                        type="button"
                        onClick={() => setTeamDrawer({ team: newTeam(block.div, block.name), isNew: true, mode: "edit" })}
                      >
                        <span aria-hidden="true">+</span> Add team
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
          <tbody>
            {blocks.length === 0 && (
              <tr className="roster-table__empty">
                <td colSpan={3}>{filtering ? "No teams match these filters." : "No groups yet."}</td>
              </tr>
            )}
            <tr className="roster-table__add">
              <td colSpan={3}>
                <button
                  type="button"
                  onClick={addGroup}
                >
                  <span aria-hidden="true">+</span> Add group
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {groupDrawer && (
        <Drawer
          title={
            groupDrawer.mode === "view"
              ? groupLabel(groupDrawer.original)
              : groupDrawer.original
                ? `Edit ${groupLabel(groupDrawer.original)}`
                : "Add group"
          }
          description={groupDrawer.mode === "view" ? "Details" : divisionLabel(groupDrawer.div)}
          onClose={() => setGroupDrawer(null)}
          actions={
            groupDrawer.mode === "view" ? (
              <>
                <Button
                  key="remove"
                  variant="danger-ghost"
                  onClick={() => {
                    const n = drawerTeams.length;
                    if (!n || window.confirm(`Remove ${groupLabel(groupDrawer.original)}? Its ${n} teams will have no group.`)) {
                      removeGroup(groupDrawer.div, groupDrawer.original);
                    }
                  }}
                >
                  Remove
                </Button>
                <Button key="edit" onClick={() => setGroupDrawer({ ...groupDrawer, mode: "edit" })}>
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button
                  key="cancel"
                  variant="ghost"
                  onClick={() => {
                    const saved = (data.groups[groupDrawer.div] ?? []).find((g) => g.name === groupDrawer.original);
                    setGroupDrawer(
                      saved ? { div: groupDrawer.div, original: saved.name, draft: { ...saved }, mode: "view" } : null,
                    );
                  }}
                >
                  Cancel
                </Button>
                <Button key="save" type="submit" form="group-form" icon="check" disabled={!draftName || nameTaken}>
                  {groupDrawer.original ? "Save" : "Add group"}
                </Button>
              </>
            )
          }
        >
          {groupDrawer.mode === "view" ? (
            <dl className="roster-details">
              <div>
                <dt>Division</dt>
                <dd>{divisionLabel(groupDrawer.div)}</dd>
              </div>
              <div>
                <dt>Group</dt>
                <dd>{groupDrawer.original}</dd>
              </div>
              <div>
                <dt>Venue</dt>
                <dd>{groupDrawer.draft.venue || "—"}</dd>
              </div>
              <div>
                <dt>Teams</dt>
                <dd>
                  {drawerTeams.length === 0 ? (
                    "—"
                  ) : (
                    <ol className="group-team-list">
                      {drawerTeams.map((t) => (
                        <li key={t.id}>
                          {t.amateur} & {t.pro}
                        </li>
                      ))}
                    </ol>
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <form id="group-form" className="roster-form" onSubmit={saveGroup}>
              {/* A new group picks its division; an existing one stays where it is */}
              {!groupDrawer.original && data.divisions.length > 1 && (
                <Dropdown
                  label="Division"
                  name="groupDivision"
                  options={data.divisions.map(divisionLabel)}
                  value={divisionLabel(groupDrawer.div)}
                  onChange={(label) =>
                    setGroupDrawer({
                      ...groupDrawer,
                      div: data.divisions.find((d) => divisionLabel(d) === label) ?? groupDrawer.div,
                    })
                  }
                />
              )}
              <label className="form-field">
                <span>Group name</span>
                <input
                  type="text"
                  placeholder="Group name"
                  value={groupDrawer.draft.name}
                  onChange={(e) => setGroupDrawer({ ...groupDrawer, draft: { ...groupDrawer.draft, name: e.target.value } })}
                  autoFocus
                  required
                />
              </label>
              {nameTaken && (
                <p className="ump-warn">
                  {divisionLabel(groupDrawer.div)} already has a group called {draftName}.
                </p>
              )}
              <label className="form-field">
                <span>Venue</span>
                <input
                  type="text"
                  placeholder="Venue"
                  value={groupDrawer.draft.venue}
                  onChange={(e) => setGroupDrawer({ ...groupDrawer, draft: { ...groupDrawer.draft, venue: e.target.value } })}
                />
              </label>
            </form>
          )}
        </Drawer>
      )}

      {teamDrawer && (
        <Drawer
          title={
            teamDrawer.mode === "view"
              ? `${teamDrawer.team.amateur} & ${teamDrawer.team.pro}`
              : teamDrawer.isNew
                ? "Add team"
                : "Edit team"
          }
          description={
            teamDrawer.mode === "view"
              ? "Details"
              : `${divisionLabel(teamDrawer.team.div)}${teamDrawer.team.group ? ` · ${groupLabel(teamDrawer.team.group)}` : ""}`
          }
          onClose={() => setTeamDrawer(null)}
          actions={
            teamDrawer.mode === "view" ? (
              <>
                <Button
                  key="remove"
                  variant="danger-ghost"
                  onClick={() => {
                    if (window.confirm(`Remove ${teamDrawer.team.amateur} & ${teamDrawer.team.pro}?`)) {
                      removeTeam(teamDrawer.team);
                    }
                  }}
                >
                  Remove
                </Button>
                <Button key="edit" onClick={() => setTeamDrawer({ ...teamDrawer, mode: "edit" })}>
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button
                  key="cancel"
                  variant="ghost"
                  onClick={() => {
                    const saved = data.teams.find((x) => x.id === teamDrawer.team.id);
                    setTeamDrawer(saved ? { team: { ...saved }, isNew: false, mode: "view" } : null);
                  }}
                >
                  Cancel
                </Button>
                <Button key="save" type="submit" form="team-form" icon="check" disabled={!teamReady}>
                  {teamDrawer.isNew ? "Add team" : "Save"}
                </Button>
              </>
            )
          }
        >
          {teamDrawer.mode === "view" ? (
            <dl className="roster-details">
              <div>
                <dt>Player</dt>
                <dd className="status-cell">
                  {teamDrawer.team.amateur}
                  <PaidChip paid={amateurHasPaid(teamDrawer.team)} />
                </dd>
              </div>
              <div>
                <dt>Pro</dt>
                <dd className="status-cell">
                  {teamDrawer.team.pro}
                  <PaidChip paid={proHasPaid(teamDrawer.team)} />
                </dd>
              </div>
              <div>
                <dt>Division</dt>
                <dd>{divisionLabel(teamDrawer.team.div)}</dd>
              </div>
              <div>
                <dt>Group</dt>
                <dd>{teamDrawer.team.group || "—"}</dd>
              </div>
            </dl>
          ) : (
            <form id="team-form" className="roster-form" onSubmit={saveTeam}>
              <PersonPicker
                label="Player"
                name="teamPlayer"
                options={pickerOptions(data.players, teamDrawer.team.id)}
                value={teamDrawer.team.amateur}
                onChange={(amateur) => setTeamDrawer({ ...teamDrawer, team: { ...teamDrawer.team, amateur } })}
                emptyNote="No players yet. Add them in the Players tab."
              />
              <PersonPicker
                label="Pro"
                name="teamPro"
                options={pickerOptions(data.pros, teamDrawer.team.id)}
                value={teamDrawer.team.pro}
                onChange={(pro) => setTeamDrawer({ ...teamDrawer, team: { ...teamDrawer.team, pro } })}
                emptyNote="No pros yet. Add them in the Players tab."
              />
              {teamDrawer.isNew && data.divisions.length > 1 && (
                <Dropdown
                  label="Division"
                  name="teamDivision"
                  options={data.divisions.map(divisionLabel)}
                  value={divisionLabel(teamDrawer.team.div)}
                  onChange={(label) => {
                    const div = data.divisions.find((d) => divisionLabel(d) === label) ?? teamDrawer.team.div;
                    // a group belongs to one division, so changing division clears it
                    setTeamDrawer({ ...teamDrawer, team: { ...teamDrawer.team, div, group: div === teamDrawer.team.div ? teamDrawer.team.group : "" } });
                  }}
                />
              )}
              <Dropdown
                label="Group"
                name="teamGroup"
                options={["No group", ...(data.groups[teamDrawer.team.div] ?? []).map((g) => g.name)]}
                value={teamDrawer.team.group || "No group"}
                onChange={(g) =>
                  setTeamDrawer({ ...teamDrawer, team: { ...teamDrawer.team, group: g === "No group" ? "" : g } })
                }
              />
              <div className="roster-form__checks">
                <label className="ump-check">
                  <input
                    type="checkbox"
                    checked={amateurHasPaid(teamDrawer.team)}
                    onChange={(e) =>
                      setTeamDrawer({ ...teamDrawer, team: { ...teamDrawer.team, amateurPaid: e.target.checked } })
                    }
                  />
                  Player paid
                </label>
                <label className="ump-check">
                  <input
                    type="checkbox"
                    checked={proHasPaid(teamDrawer.team)}
                    onChange={(e) => setTeamDrawer({ ...teamDrawer, team: { ...teamDrawer.team, proPaid: e.target.checked } })}
                  />
                  Pro paid
                </label>
              </div>
            </form>
          )}
        </Drawer>
      )}
    </div>
  );
}
