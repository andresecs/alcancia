import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useLeagueSettings, type LeagueSettings, type PaymentSettings } from "../../lib/leagueSettings";
import { EITHER, divisions, fridayTimes, homeClubs, levels, type Person } from "../../lib/registration";
import { money, uid } from "../../lib/tournament";
import Button from "../Button";
import Drawer from "../Drawer";
import Dropdown from "../Dropdown";
import EventNav from "./EventNav";
import TabNav from "../TabNav";
import { CheckCircleIcon } from "../icons";

type Section = "league" | "payments" | "calcutta" | "pros";

type PaymentMethod = "stripe" | "ach" | "venmo" | "zelle" | "check";
type PaymentTab = PaymentMethod | "instructions";
const paymentMethods: { id: PaymentMethod; label: string }[] = [
  { id: "stripe", label: "Stripe" },
  { id: "ach", label: "ACH" },
  { id: "venmo", label: "Venmo" },
  { id: "zelle", label: "Zelle" },
  { id: "check", label: "Check" },
];

const sections: { id: Section; label: string }[] = [
  { id: "league", label: "League" },
  { id: "payments", label: "Payments" },
  { id: "calcutta", label: "Calcutta" },
  { id: "pros", label: "Default pros" },
];

// The umpire's league-wide settings. Everything is edited in a draft and
// saved together with one Save button.
export default function SettingsPage() {
  const { settings, save, error } = useLeagueSettings();
  const [draft, setDraft] = useState<LeagueSettings | null>(settings);
  const [section, setSection] = useState<Section>("league");
  const [method, setMethod] = useState<PaymentTab>("stripe");
  const [saving, setSaving] = useState(false);
  const [pro, setPro] = useState<{ person: Person; isNew: boolean } | null>(null);

  useEffect(() => {
    if (settings && !draft) setDraft(settings);
  }, [settings, draft]);

  if (!draft || !settings) return <p className="ump-hint">Loading settings…</p>;

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const set = <K extends keyof LeagueSettings>(key: K, value: LeagueSettings[K]) => setDraft({ ...draft, [key]: value });
  const setPayments = (patch: Partial<PaymentSettings>) => set("payments", { ...draft.payments, ...patch });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    await save(draft);
    setSaving(false);
  };

  const savePro = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pro || !pro.person.name.trim()) return;
    const person = { ...pro.person, name: pro.person.name.trim() };
    set(
      "defaultPros",
      pro.isNew ? [...draft.defaultPros, person] : draft.defaultPros.map((p) => (p.id === person.id ? person : p)),
    );
    setPro(null);
  };

  const { calcutta, payments, league } = draft;
  const splitTotal = calcutta.payout.champion + calcutta.payout.finalist + calcutta.payout.semifinalist * 2;
  const secretKeyPasted = /^(sk|rk)_/.test(payments.stripe.publishableKey.trim());

  return (
    <section className="umpire-dashboard settings-page">
      <div className="umpire-dashboard__topline">
        <div role="heading" aria-level={1}>
          Settings
        </div>
      </div>

      <div className="event-editor__body settings-page__body">
        <EventNav label="Settings sections" sections={sections} value={section} onChange={setSection} />

        <form className="settings-form" onSubmit={submit}>
          {section === "league" && (
            <Group title="League" hint="Shown to players, and the starting point for new events.">
              <TextField label="League name" value={league.name} onChange={(name) => set("league", { ...league, name })} />
              <TextField
                label="Contact email"
                type="email"
                value={league.contactEmail}
                onChange={(contactEmail) => set("league", { ...league, contactEmail })}
              />
              <NumberField
                label="Entry fee per player"
                prefix="$"
                value={league.entryFee}
                step={50}
                onChange={(entryFee) => set("league", { ...league, entryFee })}
                note="Used for new events. Each team pays twice: once for the player, once for the pro."
              />
            </Group>
          )}

          {section === "payments" && (
            <>
              <p className="ump-hint">
                Go through each way players can pay and switch on the ones you accept. Players see the
                details of every method that's on when you request payment.
              </p>

              <TabNav
                className="payment-tabs"
                label="Payment methods"
                items={[
                  ...paymentMethods.map((m) => ({
                    id: m.id as PaymentTab,
                    label: m.label,
                    icon: payments[m.id].enabled ? <CheckCircleIcon label="On" /> : undefined,
                  })),
                  { id: "instructions" as const, label: "Instructions" },
                ]}
                value={method}
                onChange={setMethod}
              />

              {method === "stripe" && (
                <Method
                  title="Stripe"
                  note="Card payments online"
                  enabled={payments.stripe.enabled}
                  onToggle={(enabled) => setPayments({ stripe: { ...payments.stripe, enabled } })}
                >
                  <TextField
                    label="Publishable key"
                    placeholder="pk_live_…"
                    value={payments.stripe.publishableKey}
                    onChange={(publishableKey) => setPayments({ stripe: { ...payments.stripe, publishableKey } })}
                  />
                  {secretKeyPasted ? (
                    <p className="ump-warn">
                      That looks like a secret key. Don't paste it here: secret keys go in the server's secrets,
                      never in the site.
                    </p>
                  ) : (
                    <small className="settings-note">
                      Only the publishable key (pk_…) goes here. The secret key is set on the server, never in
                      the site.
                    </small>
                  )}
                  <TextField
                    label="Stripe account email"
                    type="email"
                    value={payments.stripe.accountEmail}
                    onChange={(accountEmail) => setPayments({ stripe: { ...payments.stripe, accountEmail } })}
                  />
                </Method>
              )}
              {method === "ach" && (
                <Method
                  title="ACH bank transfer"
                  note="Direct transfer to the club's bank account"
                  enabled={payments.ach.enabled}
                  onToggle={(enabled) => setPayments({ ach: { ...payments.ach, enabled } })}
                >
                  <TextField label="Bank name" value={payments.ach.bankName} onChange={(bankName) => setPayments({ ach: { ...payments.ach, bankName } })} />
                  <TextField
                    label="Account holder"
                    value={payments.ach.accountHolder}
                    onChange={(accountHolder) => setPayments({ ach: { ...payments.ach, accountHolder } })}
                  />
                  <TextField
                    label="Routing number"
                    inputMode="numeric"
                    value={payments.ach.routingNumber}
                    onChange={(v) => setPayments({ ach: { ...payments.ach, routingNumber: v.replace(/\D/g, "").slice(0, 9) } })}
                    note={payments.ach.routingNumber && payments.ach.routingNumber.length !== 9 ? "Routing numbers have 9 digits." : undefined}
                  />
                  <SecretField
                    label="Account number"
                    value={payments.ach.accountNumber}
                    onChange={(v) => setPayments({ ach: { ...payments.ach, accountNumber: v.replace(/\D/g, "").slice(0, 17) } })}
                  />
                </Method>
              )}
              {method === "venmo" && (
                <Method
                  title="Venmo"
                  enabled={payments.venmo.enabled}
                  onToggle={(enabled) => setPayments({ venmo: { ...payments.venmo, enabled } })}
                >
                  <TextField
                    label="Venmo handle"
                    placeholder="@reserve-proam"
                    value={payments.venmo.handle}
                    onChange={(handle) => setPayments({ venmo: { ...payments.venmo, handle } })}
                  />
                </Method>
              )}
              {method === "zelle" && (
                <Method
                  title="Zelle"
                  enabled={payments.zelle.enabled}
                  onToggle={(enabled) => setPayments({ zelle: { ...payments.zelle, enabled } })}
                >
                  <TextField
                    label="Zelle email or phone"
                    value={payments.zelle.contact}
                    onChange={(contact) => setPayments({ zelle: { ...payments.zelle, contact } })}
                  />
                </Method>
              )}
              {method === "check" && (
                <Method
                  title="Check"
                  enabled={payments.check.enabled}
                  onToggle={(enabled) => setPayments({ check: { ...payments.check, enabled } })}
                >
                  <TextField
                    label="Payable to"
                    value={payments.check.payableTo}
                    onChange={(payableTo) => setPayments({ check: { ...payments.check, payableTo } })}
                  />
                  <TextField
                    label="Mail to"
                    multiline
                    value={payments.check.mailTo}
                    onChange={(mailTo) => setPayments({ check: { ...payments.check, mailTo } })}
                  />
                </Method>
              )}

              {method === "instructions" && (
                <div className="settings-method is-on">
                  <div className="settings-method__head">
                    <span>
                      <strong>Instructions for players</strong>
                      <small>Shown with the payment details when you request payment</small>
                    </span>
                  </div>
                  <div className="settings-method__body">
                    <TextField
                      label="Anything else players should know when paying"
                      multiline
                      value={payments.instructions}
                      onChange={(instructions) => setPayments({ instructions })}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {section === "calcutta" && (
            <Group title="Calcutta" hint="Starting rules for new events. Each event can still change its own in its Calcutta tab.">
              <NumberField
                label="Starting price per team"
                prefix="$"
                step={50}
                value={calcutta.minBid}
                onChange={(minBid) => set("calcutta", { ...calcutta, minBid })}
              />
              <NumberField
                label="Minimum raise"
                prefix="$"
                step={50}
                value={calcutta.minIncrement}
                onChange={(minIncrement) => set("calcutta", { ...calcutta, minIncrement })}
              />
              <div className="settings-row">
                <NumberField
                  label="Champion"
                  suffix="%"
                  step={0.5}
                  value={calcutta.payout.champion}
                  onChange={(champion) => set("calcutta", { ...calcutta, payout: { ...calcutta.payout, champion } })}
                />
                <NumberField
                  label="Finalist"
                  suffix="%"
                  step={0.5}
                  value={calcutta.payout.finalist}
                  onChange={(finalist) => set("calcutta", { ...calcutta, payout: { ...calcutta.payout, finalist } })}
                />
                <NumberField
                  label="Each semi-finalist"
                  suffix="%"
                  step={0.5}
                  value={calcutta.payout.semifinalist}
                  onChange={(semifinalist) => set("calcutta", { ...calcutta, payout: { ...calcutta.payout, semifinalist } })}
                />
              </div>
              {splitTotal !== 100 ? (
                <p className="ump-warn">
                  The payout adds up to {splitTotal}% (champion + finalist + two semi-finalists); it should be 100%.
                </p>
              ) : (
                <small className="settings-note">
                  On a {money(10000)} pot: champion {money(100 * calcutta.payout.champion)}, finalist{" "}
                  {money(100 * calcutta.payout.finalist)}, each semi-finalist {money(100 * calcutta.payout.semifinalist)}.
                </small>
              )}
              <label className="ump-check">
                <input
                  type="checkbox"
                  checked={calcutta.guestBidding}
                  onChange={(e) => set("calcutta", { ...calcutta, guestBidding: e.target.checked })}
                />
                Guests can bid from the Calcutta page
              </label>
              <label className="ump-check">
                <input
                  type="checkbox"
                  checked={calcutta.requireApproval}
                  disabled={!calcutta.guestBidding}
                  onChange={(e) => set("calcutta", { ...calcutta, requireApproval: e.target.checked })}
                />
                Guest bids wait for approval
              </label>
            </Group>
          )}

          {section === "pros" && (
            <Group
              title="Default pros"
              hint="Pros who play most events. Add them all to an event's Pros tab in one click from that event's Players section."
            >
              <div className="ump-table-wrap roster-table">
                <table className="ump-table">
                  <thead>
                    <tr>
                      <th scope="col" className="roster-table__num">
                        #
                      </th>
                      <th scope="col">Name</th>
                      <th scope="col">Phone</th>
                      <th scope="col">Home club</th>
                      <th scope="col">
                        <span className="visually-hidden">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.defaultPros.map((p, index) => {
                      const open = () => setPro({ person: { ...p }, isNew: false });
                      return (
                        <tr key={p.id} className="is-clickable" onClick={open}>
                          <td className="roster-table__num">{index + 1}</td>
                          <td>{p.name}</td>
                          <td>{p.phone || "—"}</td>
                          <td>{p.homeClub || "—"}</td>
                          <td className="roster-table__more">
                            <button
                              type="button"
                              className="row-open"
                              aria-label={`Open ${p.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                open();
                              }}
                            >
                              <span className="row-open__chevron" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {draft.defaultPros.length === 0 && (
                      <tr className="roster-table__empty">
                        <td colSpan={5}>No default pros yet.</td>
                      </tr>
                    )}
                    <tr className="roster-table__add">
                      <td colSpan={5}>
                        <button
                          type="button"
                          onClick={() =>
                            setPro({
                              person: { id: uid(), name: "", phone: "", division: EITHER, fridayTime: EITHER, level: "Pro", homeClub: "", status: "accepted" },
                              isNew: true,
                            })
                          }
                        >
                          <span aria-hidden="true">+</span> Add pro
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Group>
          )}

          <div className="settings-actions">
            <Button type="submit" icon="check" disabled={!dirty || saving || secretKeyPasted}>
              {saving ? "Saving" : "Save changes"}
            </Button>
            {dirty && <small className="event-info-unsaved">Unsaved changes</small>}
            {dirty && (
              <Button variant="ghost" onClick={() => setDraft(settings)}>
                Discard
              </Button>
            )}
          </div>
          {error && <p className="ump-warn">{error}</p>}
        </form>
      </div>

      {pro && (
        <Drawer
          title={pro.isNew ? "Add default pro" : pro.person.name || "Edit pro"}
          description="Saved with the other settings when you press Save changes."
          onClose={() => setPro(null)}
          actions={
            <>
              {!pro.isNew && (
                <Button
                  key="remove"
                  variant="danger-ghost"
                  onClick={() => {
                    set("defaultPros", draft.defaultPros.filter((p) => p.id !== pro.person.id));
                    setPro(null);
                  }}
                >
                  Remove
                </Button>
              )}
              <Button key="save" type="submit" form="default-pro-form" icon="check" disabled={!pro.person.name.trim()}>
                {pro.isNew ? "Add pro" : "Done"}
              </Button>
            </>
          }
        >
          <form id="default-pro-form" className="roster-form" onSubmit={savePro}>
            <TextField
              label="Name"
              value={pro.person.name}
              onChange={(name) => setPro({ ...pro, person: { ...pro.person, name } })}
              autoFocus
            />
            <TextField
              label="Phone"
              type="tel"
              value={pro.person.phone}
              onChange={(phone) => setPro({ ...pro, person: { ...pro.person, phone } })}
            />
            {(
              [
                ["division", "Division", divisions],
                ["fridayTime", "Friday time", fridayTimes],
                ["level", "Level", levels],
                ["homeClub", "Home club", homeClubs],
              ] as const
            ).map(([key, label, options]) => (
              <Dropdown
                key={key}
                label={label}
                name={`pro-${key}`}
                options={options}
                value={pro.person[key]}
                onChange={(v) => setPro({ ...pro, person: { ...pro.person, [key]: v } })}
              />
            ))}
          </form>
        </Drawer>
      )}
    </section>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="settings-group">
      <legend>{title}</legend>
      {hint && <p className="ump-hint">{hint}</p>}
      {children}
    </fieldset>
  );
}

// A payment method: a switch in its header, and its details once it's on
function Method({
  title,
  note,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  note?: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className={enabled ? "settings-method is-on" : "settings-method"}>
      <label className="settings-method__head">
        <span>
          <strong>{title}</strong>
          {note && <small>{note}</small>}
        </span>
        <input
          type="checkbox"
          role="switch"
          className="switch"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          aria-label={`Accept ${title}`}
        />
      </label>
      {/* Collapsed until the method is switched on */}
      {enabled ? (
        <div className="settings-method__body">{children}</div>
      ) : (
        <p className="settings-method__off">Switch on to add the details players need.</p>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  multiline,
  inputMode,
  note,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  inputMode?: "numeric" | "text";
  note?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {multiline ? (
        <textarea placeholder={placeholder ?? label} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : (
        <input
          type={type}
          inputMode={inputMode}
          placeholder={placeholder ?? label}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {note && <small className="settings-note">{note}</small>}
    </label>
  );
}

// Bank details stay hidden unless you ask to see them
function SecretField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="settings-secret">
      <label className="form-field">
        <span>{label}</span>
        <input
          type={shown ? "text" : "password"}
          inputMode="numeric"
          autoComplete="off"
          placeholder={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <button type="button" className="ump-btn ump-btn--quiet" onClick={() => setShown((s) => !s)}>
        {shown ? "Hide" : "Show"}
      </button>
      {!shown && value.length > 4 && <small className="settings-note">Ends in {value.slice(-4)}</small>}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  prefix,
  suffix,
  note,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  prefix?: string;
  suffix?: string;
  note?: string;
}) {
  return (
    <label className="form-field settings-number">
      <span>{label}</span>
      {/* A <div>, not a <span>: the field's floating-label styles target its spans */}
      <div className="settings-number__input">
        {prefix && <i aria-hidden="true">{prefix}</i>}
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        />
        {suffix && <i aria-hidden="true">{suffix}</i>}
      </div>
      {note && <small className="settings-note">{note}</small>}
    </label>
  );
}
