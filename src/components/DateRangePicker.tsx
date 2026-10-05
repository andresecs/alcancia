import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "./icons";

// Dates are "YYYY-MM-DD" strings in local time, "" when not set.
const pad = (n: number) => String(n).padStart(2, "0");
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};
const addDays = (iso: string, n: number) => {
  const d = fromISO(iso)!;
  d.setDate(d.getDate() + n);
  return toISO(d);
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Month = { year: number; month: number }; // month 0-11
const shift = ({ year, month }: Month, by: number): Month => {
  const d = new Date(year, month + by, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};

// The Ives "Double Calendar" date picker (Figma node 256:897) as a form field.
// The field shows the chosen range; it opens two months side by side (one on
// phones). Click a start day, then an end day; the days between are shaded.
// Arrow keys move between days, Page Up / Page Down change month, Escape closes.
export default function DateRangePicker({
  label,
  start,
  end,
  onChange,
  format,
}: {
  label: string;
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  format: (start: string, end: string) => string; // how the field shows the range
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Month>(() => {
    const d = fromISO(start) ?? new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [focused, setFocused] = useState(start || toISO(new Date()));
  const [hovered, setHovered] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const id = useId();
  const picking = !!start && !end; // waiting for the end day

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    // Escape closes the calendar from anywhere in it (even a focused select),
    // and stops there so a drawer around it stays open
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  // Keep keyboard focus on the focused day as it moves
  useEffect(() => {
    if (open) grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [open, focused, view]);

  const openPicker = () => {
    const d = fromISO(start) ?? new Date();
    setView({ year: d.getFullYear(), month: d.getMonth() });
    setFocused(start || toISO(new Date()));
    setOpen(true);
  };

  const pick = (iso: string) => {
    if (!start || end || iso < start) {
      // a new range starts here
      onChange(iso, "");
    } else {
      onChange(start, iso);
      setOpen(false);
      trigger.current?.focus();
    }
    setFocused(iso);
  };

  const moveFocus = (iso: string) => {
    const d = fromISO(iso)!;
    const shown = [view, shift(view, 1)];
    if (!shown.some((m) => m.year === d.getFullYear() && m.month === d.getMonth())) {
      setView(iso < focused ? { year: d.getFullYear(), month: d.getMonth() } : shift({ year: d.getFullYear(), month: d.getMonth() }, -1));
    }
    setFocused(iso);
  };

  const onGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    // Arrow keys belong to the month/year selects while they have focus
    const onDay = !!(event.target as HTMLElement).dataset.date;
    if (onDay && event.key in steps) {
      event.preventDefault();
      moveFocus(addDays(focused, steps[event.key]));
    } else if (onDay && (event.key === "PageUp" || event.key === "PageDown")) {
      event.preventDefault();
      const d = fromISO(focused)!;
      d.setMonth(d.getMonth() + (event.key === "PageUp" ? -1 : 1));
      moveFocus(toISO(d));
    }
  };

  // The range to shade: the chosen one, or start..hovered while picking the end
  const rangeEnd = end || (picking && hovered > start ? hovered : "");
  const today = toISO(new Date());
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 9 }, (_, i) => thisYear - 2 + i);

  const renderMonth = (m: Month, side: "left" | "right") => {
    const first = new Date(m.year, m.month, 1);
    const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();
    const cells: (string | null)[] = [
      ...Array.from({ length: first.getDay() }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => toISO(new Date(m.year, m.month, i + 1))),
    ];
    // Changing the month or year in either pane moves both
    const setMonth = (next: Month) => setView(side === "left" ? next : shift(next, -1));
    return (
      <div className={`date-picker__month date-picker__month--${side}`} key={side}>
        <div className="date-picker__head">
          {side === "left" ? (
            <button type="button" className="date-picker__nav is-prev" aria-label="Previous month" onClick={() => setView(shift(view, -1))} />
          ) : (
            <span />
          )}
          <div className="date-picker__selects">
            <label className="date-picker__select">
              <span className="visually-hidden">Month</span>
              <select value={m.month} onChange={(e) => setMonth({ year: m.year, month: Number(e.target.value) })}>
                {MONTHS.map((name, i) => (
                  <option key={name} value={i}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown />
            </label>
            <label className="date-picker__select">
              <span className="visually-hidden">Year</span>
              <select value={m.year} onChange={(e) => setMonth({ year: Number(e.target.value), month: m.month })}>
                {(years.includes(m.year) ? years : [...years, m.year].sort()).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown />
            </label>
          </div>
          {side === "right" ? (
            <button type="button" className="date-picker__nav is-next" aria-label="Next month" onClick={() => setView(shift(view, 1))} />
          ) : (
            <span />
          )}
        </div>
        <div className="date-picker__grid" role="grid" aria-label={`${MONTHS[m.month]} ${m.year}`}>
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="date-picker__weekday" role="columnheader" aria-label={WEEKDAY_NAMES[i]}>
              {w}
            </span>
          ))}
          {cells.map((iso, i) => {
            if (!iso) return <span key={`blank-${i}`} className="date-picker__cell" />;
            const isStart = iso === start;
            const isEnd = iso === end || (!end && iso === rangeEnd);
            const inRange = !!start && !!rangeEnd && iso > start && iso < rangeEnd;
            const banded = !!start && !!rangeEnd && rangeEnd !== start && (isStart || isEnd || inRange);
            return (
              <span
                key={iso}
                className={[
                  "date-picker__cell",
                  banded && "is-banded",
                  banded && isStart && "is-band-start",
                  banded && isEnd && "is-band-end",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <button
                  type="button"
                  data-date={iso}
                  tabIndex={iso === focused ? 0 : -1}
                  className={[
                    "date-picker__day",
                    (isStart || isEnd) && "is-selected",
                    inRange && "is-in-range",
                    iso === today && "is-today",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={isStart || isEnd}
                  aria-label={fromISO(iso)!.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  onMouseEnter={() => setHovered(iso)}
                  onClick={() => pick(iso)}
                >
                  {Number(iso.slice(8))}
                </button>
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const shown = format(start, end);

  return (
    <div
      ref={root}
      className={["form-field", "form-field--dropdown", "date-range-field", open && "is-open", shown && "is-filled"]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{label}</span>
      <input type="hidden" name={`${id}-start`} value={start} />
      <input type="hidden" name={`${id}-end`} value={end} />
      <button
        ref={trigger}
        type="button"
        className="dropdown-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={shown ? `${label}: ${shown}` : label}
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        <span className="dropdown-value">{shown || label}</span>
        <ChevronDown />
      </button>

      {open && (
        <div className="date-picker" role="dialog" aria-label={`Choose ${label.toLowerCase()}`} ref={grid} onKeyDown={onGridKey} onMouseLeave={() => setHovered("")}>
          <div className="date-picker__months">
            {renderMonth(view, "left")}
            {renderMonth(shift(view, 1), "right")}
          </div>
          <div className="date-picker__foot">
            <small>{picking ? "Now pick the last day." : start ? "Pick a new first day to start over." : "Pick the first day."}</small>
            {start && (
              <button type="button" className="ump-btn ump-btn--quiet" onClick={() => onChange("", "")}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
