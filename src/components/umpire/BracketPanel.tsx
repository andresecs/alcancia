import { useState } from "react";
import {
  bracket,
  drawBracket,
  groupMatches,
  groupStandings,
  moveMatch,
  seedList,
  teamName,
  type KoMatch,
  type Tournament,
} from "../../lib/tournament";
import { DivisionSwitch, ScoreEntry, Section, groupLabel, type Update } from "./shared";
import Button from "../Button";

// `only` limits the view to one group, for a judge scoring that group
export default function BracketPanel({
  data,
  update,
  only,
}: {
  data: Tournament;
  update: Update;
  only?: { div: string; grp: string };
}) {
  const [chosenDiv, setDiv] = useState(data.divisions[0] ?? "I");
  const [error, setError] = useState("");
  const div = only?.div ?? chosenDiv;
  const groups = (data.groups[div] ?? []).filter((g) => !only || g.name === only.grp);
  const seeds = seedList(data, div);
  const ko = bracket(data, div);
  const team = (id: string) => data.teams.find((t) => t.id === id);
  const short = (id: string) => {
    const t = team(id);
    return t ? `${t.amateur} / ${t.pro}` : "TBD";
  };

  const saveScore = (key: string, a: string, b: string, ga: number, gb: number) =>
    update((t) => ({ ...t, scores: { ...t.scores, [key]: { a, b, ga, gb, by: "Admin" } } }));
  const clearScore = (key: string) =>
    update((t) => {
      const scores = { ...t.scores };
      delete scores[key];
      return { ...t, scores };
    });
  const setTime = (key: string, time: string) =>
    update((t) => ({ ...t, matchMeta: { ...t.matchMeta, [key]: { time: time.slice(0, 20) } } }));

  const moveSeed = (i: number, dir: -1 | 1) => {
    if (!seeds) return;
    const ids = seeds.map((s) => s.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    update((t) => ({ ...t, seedOverride: { ...t.seedOverride, [div]: ids } }));
  };

  const build = () => {
    if (ko && !window.confirm("Rebuild the bracket? Knockout scores already entered will no longer apply.")) {
      return;
    }
    try {
      const draw = drawBracket(data, div);
      setError("");
      update((t) => ({ ...t, bracketSeeds: { ...t.bracketSeeds, [div]: draw } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const koMatch = (m: KoMatch, label?: string) => (
    <div className={m.winner ? "ump-ko is-done" : "ump-ko"} key={m.key}>
      {label && <small className="ump-sub">{label}</small>}
      <div className={m.winner && m.winner === m.a ? "ump-ko__team is-winner" : "ump-ko__team"}>
        {m.a ? short(m.a) : m.bye ? "Bye" : "Waiting"}
      </div>
      <div className={m.winner && m.winner === m.b ? "ump-ko__team is-winner" : "ump-ko__team"}>
        {m.b ? short(m.b) : m.bye ? "Bye" : "Waiting"}
      </div>
      {!m.bye && (
        <>
          <ScoreEntry
            key={`${m.key}-${m.a}-${m.b}-${m.score?.ga}-${m.score?.gb}`}
            score={m.score}
            disabled={!m.a || !m.b}
            onSave={(ga, gb) => saveScore(m.key, m.a, m.b, ga, gb)}
            onClear={() => clearScore(m.key)}
          />
          <input
            className="ump-input ump-time"
            value={m.time}
            placeholder="Time / court"
            onChange={(e) => setTime(m.key, e.target.value)}
          />
        </>
      )}
    </div>
  );

  const final = ko?.rounds[ko.rounds.length - 1]?.matches[0];

  return (
    <div className="ump-panel">
      {!only && <DivisionSwitch divisions={data.divisions} value={div} onChange={setDiv} />}

      {groups.length === 0 && (
        <div className="ump-row ump-empty">
          {only ? `Group ${only.grp} is not set up yet.` : "Create groups and assign teams in the Teams tab."}
        </div>
      )}

      <Section title={only ? `Division ${div}` : "Group stage"}>
        <div className="ump-groups">
          {groups.map((g) => {
            const st = groupStandings(data, div, g.name);
            const matches = groupMatches(data, div, g.name);
            return (
              <article className="ump-group" key={g.name}>
                <header>
                  <strong>{groupLabel(g.name)}</strong>
                  <small>
                    {st.played}/{st.total} played{g.venue && ` · ${g.venue}`}
                  </small>
                </header>
                <table className="ump-table ump-table--compact">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Team</th>
                      <th>W–L</th>
                      <th>Games</th>
                      <th>+/−</th>
                    </tr>
                  </thead>
                  <tbody>
                    {st.rows.map((r, i) => (
                      <tr key={r.id} className={i < data.settings.advance ? "is-through" : undefined}>
                        <td>{i + 1}</td>
                        <td>{short(r.id)}</td>
                        <td>
                          {r.w}–{r.l}
                        </td>
                        <td>
                          {r.gf}–{r.ga}
                        </td>
                        <td>{r.gf - r.ga > 0 ? `+${r.gf - r.ga}` : r.gf - r.ga}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="ump-matches">
                  {matches.map((m, i) => (
                    <div className="ump-match" key={m.key}>
                      <div className="ump-match__order">
                        <button
                          type="button"
                          aria-label="Play earlier"
                          disabled={i === 0}
                          onClick={() => update((t) => moveMatch(t, div, g.name, m.key, -1))}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label="Play later"
                          disabled={i === matches.length - 1}
                          onClick={() => update((t) => moveMatch(t, div, g.name, m.key, 1))}
                        >
                          ↓
                        </button>
                      </div>
                      <div className="ump-grow">
                        <div className="ump-match__teams">
                          <span>{short(m.a)}</span>
                          <small>v</small>
                          <span>{short(m.b)}</span>
                        </div>
                        <div className="ump-match__controls">
                          <ScoreEntry
                            key={`${m.key}-${m.score?.ga}-${m.score?.gb}`}
                            score={m.score}
                            onSave={(ga, gb) => saveScore(m.key, m.a, m.b, ga, gb)}
                            onClear={() => clearScore(m.key)}
                          />
                          <input
                            className="ump-input ump-time"
                            value={m.time}
                            placeholder="Time / court"
                            onChange={(e) => setTime(m.key, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      {!only && (
      <Section
        title="Seeding"
        aside={
          <Button disabled={!seeds} onClick={build}>
            {ko ? "Rebuild bracket" : "Build bracket"}
          </Button>
        }
      >
        {error && <p className="ump-error">{error}</p>}
        {!seeds ? (
          <p className="ump-hint">
            Seeding appears once every group in Division {div} is finished. Group winners rank above
            runners-up; then matches won, game difference and games won.
          </p>
        ) : (
          <div className="ump-list">
            {seeds.map((s, i) => (
              <div className="ump-row" key={s.id}>
                <strong className="ump-row__label">{i + 1}</strong>
                <div className="ump-grow">
                  {teamName(team(s.id))}
                  <small className="ump-sub">
                    {s.pos === 1 ? "Winner" : `#${s.pos}`} {groupLabel(s.grp)} · {s.w} wins ·{" "}
                    {s.d > 0 ? `+${s.d}` : s.d} games
                    {s.tiedWithNext && " · level with the next team, order by hand"}
                  </small>
                </div>
                <button type="button" className="ump-btn ump-btn--quiet" disabled={i === 0} onClick={() => moveSeed(i, -1)}>
                  ↑
                </button>
                <button
                  type="button"
                  className="ump-btn ump-btn--quiet"
                  disabled={i === seeds.length - 1}
                  onClick={() => moveSeed(i, 1)}
                >
                  ↓
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
      )}

      {ko && !only && (
        <Section title="Knockout">
          {final?.winner && (
            <div className="ump-champion">
              <small>Division {div} champions</small>
              <strong>{teamName(team(final.winner))}</strong>
            </div>
          )}
          <div className="ump-bracket">
            {ko.rounds.map((r) => (
              <div className="ump-round" key={r.name}>
                <div className="ump-round__title">{r.name}</div>
                {r.matches.filter((m) => !m.bye).map((m) => koMatch(m))}
              </div>
            ))}
            {ko.third && (
              <div className="ump-round">
                <div className="ump-round__title">Third place</div>
                {koMatch(ko.third)}
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}
