import { useState } from "react";
import {
  acceptGuestBid,
  divisionPot,
  finishers,
  money,
  ownerLedger,
  payoutAmounts,
  teamName,
  type Settings,
  type Team,
  type Tournament,
} from "../../lib/tournament";
import { DivisionSwitch, NumberField, Section, Stat, type Update } from "./shared";
import Button from "../Button";

export default function CalcuttaPanel({ data, update }: { data: Tournament; update: Update }) {
  const [div, setDiv] = useState(data.divisions[0] ?? "I");
  const { settings } = data;
  const teams = data.teams.filter((t) => t.div === div);
  const pot = divisionPot(data, div);
  const payouts = payoutAmounts(pot.pot, settings.payout);
  const splitTotal =
    settings.payout.champion + settings.payout.finalist + settings.payout.semifinalist * 2;
  const pending = data.guestBids.filter((b) => b.status === "pending");
  const ledger = ownerLedger(data);
  const result = finishers(data, div);
  const byId = (id: string | null) => data.teams.find((t) => t.id === id);

  const patchTeam = (id: string, patch: Partial<Team>) =>
    update((t) => ({ ...t, teams: t.teams.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const setSettings = (patch: Partial<Settings>) =>
    update((t) => ({ ...t, settings: { ...t.settings, ...patch } }));
  const setPayout = (patch: Partial<Settings["payout"]>) =>
    setSettings({ payout: { ...settings.payout, ...patch } });

  return (
    <div className="ump-panel">
      <DivisionSwitch divisions={data.divisions} value={div} onChange={setDiv} />

      <div className="ump-stats">
        <Stat label={`Division ${div} pot`} value={money(pot.pot)} note={`${pot.sold} of ${pot.total} teams sold`} />
        <Stat label="If every team sells" value={money(pot.projected)} note="at the current prices" />
        <Stat
          label={`Champion · ${settings.payout.champion}%`}
          value={money(payouts.champion)}
          note={result.champion ? teamName(byId(result.champion)) : undefined}
        />
        <Stat
          label={`Finalist · ${settings.payout.finalist}%`}
          value={money(payouts.finalist)}
          note={result.finalist ? teamName(byId(result.finalist)) : undefined}
        />
        <Stat
          label={`Each semi-finalist · ${settings.payout.semifinalist}%`}
          value={money(payouts.semifinalist)}
        />
      </div>

      {pending.length > 0 && (
        <Section title={`Pending bids (${pending.length})`}>
          <div className="ump-list">
            {pending.map((b) => {
              const team = data.teams.find((t) => t.id === b.teamId);
              const stale = !!team && (team.sold || b.amount < team.bid + settings.minIncrement);
              return (
                <div className="ump-row" key={b.id}>
                  <div className="ump-grow">
                    <strong>{b.bidder}</strong> bids <strong>{money(b.amount)}</strong> on{" "}
                    {teamName(team)}
                    <small className="ump-sub">
                      Division {team?.div} · now {team ? money(team.bid) : "—"}
                      {stale && " · below the next valid bid"}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="ump-btn"
                    onClick={() =>
                      update((t) => ({
                        ...t,
                        guestBids: t.guestBids.map((x) =>
                          x.id === b.id ? { ...x, status: "dismissed" } : x,
                        ),
                      }))
                    }
                  >
                    Dismiss
                  </button>
                  <Button
                    disabled={team?.sold}
                    onClick={() => update((t) => acceptGuestBid(t, b.id))}
                  >
                    Accept
                  </Button>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section
        title="Auction"
        aside={
          <button
            type="button"
            className="ump-btn ump-btn--quiet"
            onClick={() => {
              if (window.confirm(`Reset every Division ${div} team to ${money(settings.minBid)}, no owner, unsold?`)) {
                update((t) => ({
                  ...t,
                  teams: t.teams.map((x) =>
                    x.div === div ? { ...x, bid: t.settings.minBid, owner: "", sold: false } : x,
                  ),
                }));
              }
            }}
          >
            Reset division
          </button>
        }
      >
        <div className="ump-list">
          {teams.length === 0 && <div className="ump-row ump-empty">Add teams in the Teams tab.</div>}
          {teams.map((team) => (
            <div className={team.sold ? "ump-row is-sold" : "ump-row"} key={team.id}>
              <div className="ump-grow">
                <strong>{teamName(team)}</strong>
                <small className="ump-sub">{team.group ? `Group ${team.group}` : "No group"}</small>
              </div>
              <label className="ump-money">
                <span>$</span>
                <input
                  type="number"
                  min={0}
                  step={settings.minIncrement || 1}
                  value={team.bid}
                  aria-label="Price"
                  disabled={team.sold}
                  onChange={(e) => patchTeam(team.id, { bid: Math.max(0, Number(e.target.value) || 0) })}
                />
              </label>
              <button
                type="button"
                className="ump-btn"
                disabled={team.sold}
                onClick={() => patchTeam(team.id, { bid: team.bid + settings.minIncrement })}
              >
                +{money(settings.minIncrement)}
              </button>
              <input
                className="ump-input ump-owner"
                value={team.owner}
                placeholder="Owner (players)"
                aria-label="Owner"
                disabled={team.sold}
                onChange={(e) => patchTeam(team.id, { owner: e.target.value })}
              />
              {team.sold ? (
                <Button onClick={() => patchTeam(team.id, { sold: false })} aria-pressed>
                  Sold
                </Button>
              ) : (
                <button
                  type="button"
                  className="ump-btn"
                  onClick={() => patchTeam(team.id, { sold: true })}
                  aria-pressed={false}
                >
                  Mark sold
                </button>
              )}
              <button
                type="button"
                className="ump-btn ump-btn--quiet"
                onClick={() => patchTeam(team.id, { bid: settings.minBid, owner: "", sold: false })}
              >
                Reset
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Settle up" aside={<small className="ump-sub">All divisions</small>}>
        <div className="ump-table-wrap">
          <table className="ump-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Teams</th>
                <th>Owes</th>
                <th>Wins</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={5}>Nothing sold yet.</td>
                </tr>
              )}
              {ledger.map((r) => (
                <tr key={r.owner}>
                  <td>{r.owner}</td>
                  <td>{r.teams.map((t) => `${t.amateur} (${t.div})`).join(", ")}</td>
                  <td>{money(r.owes)}</td>
                  <td>{money(r.wins)}</td>
                  <td className={r.wins - r.owes >= 0 ? "is-up" : "is-down"}>
                    {r.wins - r.owes >= 0 ? "+" : "−"}
                    {money(Math.abs(r.wins - r.owes))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Rules">
        <div className="ump-settings">
          <NumberField label="Starting price" value={settings.minBid} step={50} onChange={(minBid) => setSettings({ minBid })} />
          <NumberField
            label="Minimum raise"
            value={settings.minIncrement}
            step={50}
            onChange={(minIncrement) => setSettings({ minIncrement })}
          />
          <NumberField
            label="Champion %"
            value={settings.payout.champion}
            step={0.5}
            onChange={(champion) => setPayout({ champion })}
          />
          <NumberField
            label="Finalist %"
            value={settings.payout.finalist}
            step={0.5}
            onChange={(finalist) => setPayout({ finalist })}
          />
          <NumberField
            label="Each semi-finalist %"
            value={settings.payout.semifinalist}
            step={0.5}
            onChange={(semifinalist) => setPayout({ semifinalist })}
          />
          <label className="ump-check">
            <input
              type="checkbox"
              checked={settings.guestBidding}
              onChange={(e) => setSettings({ guestBidding: e.target.checked })}
            />
            Guests can bid from the Calcutta page
          </label>
          <label className="ump-check">
            <input
              type="checkbox"
              checked={settings.requireApproval}
              disabled={!settings.guestBidding}
              onChange={(e) => setSettings({ requireApproval: e.target.checked })}
            />
            Guest bids wait for approval
          </label>
        </div>
        {splitTotal !== 100 && (
          <p className="ump-warn">
            The payout split adds up to {splitTotal}% (champion + finalist + two semi-finalists).
          </p>
        )}
      </Section>
    </div>
  );
}
