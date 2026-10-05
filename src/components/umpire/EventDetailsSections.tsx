import type { ReactNode } from "react";
import { uid } from "../../lib/tournament";
import { prizeDivisions, type EventDetails, type ScheduleDay, type ScheduleItem, type Venue } from "../../lib/useEvents";
import Dropdown from "../Dropdown";

const NO_VENUE = "No venue";

// Every day from start to end, as "YYYY-MM-DD"
function daysBetween(start: string, end: string): string[] {
  const parse = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return y && m && d ? new Date(y, m - 1, d) : null;
  };
  const a = parse(start);
  const b = parse(end || start);
  if (!a || !b) return [];
  const out: string[] = [];
  for (const d = new Date(a); d <= b && out.length < 31; d.setDate(d.getDate() + 1)) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}

const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
};

// Venues, Schedule and Prizes in the event's info tab. Changes go into the
// event's draft and are saved with its Save button.
export default function EventDetailsSections({
  details,
  onChange,
  startDate,
  endDate,
}: {
  details: EventDetails;
  onChange: (details: EventDetails) => void;
  startDate: string;
  endDate: string;
}) {
  const { venues, schedule, prizes } = details;
  const eventDays = daysBetween(startDate, endDate);

  const setVenue = (id: string, patch: Partial<Venue>) =>
    onChange({ ...details, venues: venues.map((v) => (v.id === id ? { ...v, ...patch } : v)) });
  const removeVenue = (id: string) =>
    onChange({
      ...details,
      venues: venues.filter((v) => v.id !== id),
      // items held there lose their location rather than pointing at nothing
      schedule: schedule.map((day) => ({
        ...day,
        items: day.items.map((i) => (i.venueId === id ? { ...i, venueId: "" } : i)),
      })),
    });

  const setDay = (id: string, patch: Partial<ScheduleDay>) =>
    onChange({ ...details, schedule: schedule.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
  const setItem = (day: ScheduleDay, id: string, patch: Partial<ScheduleItem>) =>
    setDay(day.id, { items: day.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const addDay = () => {
    // the first event day not in the schedule yet
    const next = eventDays.find((d) => !schedule.some((s) => s.date === d)) ?? "";
    onChange({
      ...details,
      schedule: [...schedule, { id: uid(), date: next, items: [{ id: uid(), time: "", title: "", venueId: "" }] }],
    });
  };

  const venueLabel = (id: string) => venues.find((v) => v.id === id)?.name || NO_VENUE;
  const venueOptions = [NO_VENUE, ...venues.filter((v) => v.name.trim()).map((v) => v.name)];

  return (
    <>
      <InfoSection title="Venues" hint="Where the event is played. Schedule items can be held at any of these.">
        <div className="ump-table-wrap details-table">
          {venues.map((v, index) => (
            <div className="details-row" key={v.id}>
              <span className="roster-table__num">{index + 1}</span>
              <Field label="Venue name" value={v.name} onChange={(name) => setVenue(v.id, { name })} />
              <Field label="Address" value={v.address} onChange={(address) => setVenue(v.id, { address })} wide />
              <RemoveButton label={`Remove ${v.name || "venue"}`} onClick={() => removeVenue(v.id)} />
            </div>
          ))}
          <AddRow
            label="Add venue"
            onClick={() => onChange({ ...details, venues: [...venues, { id: uid(), name: "", address: "" }] })}
          />
        </div>
      </InfoSection>

      <InfoSection title="Schedule" hint="What happens each day of the event.">
        {!eventDays.length && <p className="ump-warn">Set the event's dates in Overview to choose days here.</p>}
        <div className="schedule-days">
          {schedule.map((day) => {
            const taken = schedule.filter((s) => s.id !== day.id).map((s) => s.date);
            const options = eventDays.filter((d) => !taken.includes(d) || d === day.date).map(dayLabel);
            return (
              <div className="schedule-day" key={day.id}>
                <div className="schedule-day__head">
                  <Dropdown
                    label="Day"
                    name={`day-${day.id}`}
                    options={options}
                    value={day.date ? dayLabel(day.date) : ""}
                    onChange={(label) => setDay(day.id, { date: eventDays.find((d) => dayLabel(d) === label) ?? day.date })}
                  />
                  <RemoveButton
                    label="Remove day"
                    text="Remove day"
                    onClick={() => onChange({ ...details, schedule: schedule.filter((d) => d.id !== day.id) })}
                  />
                </div>
                <div className="details-table">
                  {day.items.map((item) => (
                    <div className="details-row schedule-item" key={item.id}>
                      <label className="form-field schedule-item__time">
                        <span>Time</span>
                        <input type="time" value={item.time} onChange={(e) => setItem(day, item.id, { time: e.target.value })} />
                      </label>
                      <Field label="Title" value={item.title} onChange={(title) => setItem(day, item.id, { title })} wide />
                      <Dropdown
                        label="Location"
                        name={`venue-${item.id}`}
                        options={venueOptions}
                        value={item.venueId ? venueLabel(item.venueId) : ""}
                        onChange={(name) =>
                          setItem(day, item.id, { venueId: venues.find((v) => v.name === name)?.id ?? "" })
                        }
                      />
                      <RemoveButton
                        label={`Remove ${item.title || "item"}`}
                        onClick={() => setDay(day.id, { items: day.items.filter((i) => i.id !== item.id) })}
                      />
                    </div>
                  ))}
                  <AddRow
                    label="Add time"
                    onClick={() => setDay(day.id, { items: [...day.items, { id: uid(), time: "", title: "", venueId: "" }] })}
                  />
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className="ump-btn schedule-add-day"
            disabled={!!eventDays.length && schedule.length >= eventDays.length}
            onClick={addDay}
          >
            <span aria-hidden="true">+</span> Add day
          </button>
        </div>
      </InfoSection>

      <InfoSection title="Prizes" hint="Prize money for each division. 3rd/4th is paid to each losing semi-finalist.">
        <div className="prizes">
          {prizeDivisions.map((div) => (
            <div className="prizes__division" key={div}>
              <div className="prizes__label">Division {div}</div>
              {(
                [
                  ["first", "1st"],
                  ["second", "2nd"],
                  ["third", "3rd / 4th"],
                ] as const
              ).map(([place, label]) => (
                <MoneyField
                  key={place}
                  label={label}
                  value={prizes[div]?.[place] ?? 0}
                  onChange={(amount) =>
                    onChange({ ...details, prizes: { ...prizes, [div]: { ...prizes[div], [place]: amount } } })
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </InfoSection>
    </>
  );
}

export function InfoSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="info-section">
      <div className="info-section__head">
        <div role="heading" aria-level={2}>
          {title}
        </div>
        {hint && <p className="ump-hint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  wide,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "form-field details-field--wide" : "form-field"}>
      <span>{label}</span>
      <input type="text" placeholder={label} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

// The site's text field with a $ before the amount
function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="form-field settings-number">
      <span>{label}</span>
      {/* A <div>, not a <span>: the field's floating-label styles target its spans */}
      <div className="settings-number__input">
        <i aria-hidden="true">$</i>
        <input
          type="number"
          min={0}
          step={100}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        />
      </div>
    </label>
  );
}

function RemoveButton({ label, text, onClick }: { label: string; text?: string; onClick: () => void }) {
  return (
    <button type="button" className={text ? "ump-btn ump-btn--quiet" : "details-remove"} aria-label={label} onClick={onClick}>
      {text}
    </button>
  );
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="roster-table__add details-add">
      <button type="button" onClick={onClick}>
        <span aria-hidden="true">+</span> {label}
      </button>
    </div>
  );
}
