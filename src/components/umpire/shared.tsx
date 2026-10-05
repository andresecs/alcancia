import { useState, type ReactNode } from "react";
import { scoreError, type Score, type Tournament } from "../../lib/tournament";
import Button from "../Button";

export type Update = (fn: (t: Tournament) => Tournament) => void;

// "Group 1" stays as is; "A" becomes "Group A"
export const groupLabel = (name: string) => (/^group\b/i.test(name) ? name : `Group ${name}`);

export function DivisionSwitch({
  divisions,
  value,
  onChange,
}: {
  divisions: string[];
  value: string;
  onChange: (div: string) => void;
}) {
  return (
    <div
      className="division-toggle ump-division"
      role="group"
      aria-label="Division"
      style={{ gridTemplateColumns: `repeat(${divisions.length}, minmax(0, 1fr))` }}
    >
      {divisions.map((d) => (
        <button
          key={d}
          type="button"
          className={d === value ? "is-active" : undefined}
          aria-pressed={d === value}
          onClick={() => onChange(d)}
        >
          Division {d}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="ump-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

export function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ump-section">
      <div className="ump-section__head">
        <div role="heading" aria-level={2}>
          {title}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

// Two game boxes and a save button. Keeps its own draft until saved.
export function ScoreEntry({
  score,
  disabled,
  onSave,
  onClear,
}: {
  score: Score | null;
  disabled?: boolean;
  onSave: (ga: number, gb: number) => void;
  onClear: () => void;
}) {
  const [ga, setGa] = useState(score ? String(score.ga) : "");
  const [gb, setGb] = useState(score ? String(score.gb) : "");
  const [error, setError] = useState("");
  const dirty = ga !== (score ? String(score.ga) : "") || gb !== (score ? String(score.gb) : "");

  const save = () => {
    const a = Number(ga);
    const b = Number(gb);
    const problem = ga === "" || gb === "" ? "Enter both scores." : scoreError(a, b);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    onSave(a, b);
  };

  return (
    <div className="ump-score">
      <input
        aria-label="Games for first team"
        inputMode="numeric"
        value={ga}
        disabled={disabled}
        onChange={(e) => setGa(e.target.value.replace(/\D/g, "").slice(0, 2))}
      />
      <span aria-hidden="true">–</span>
      <input
        aria-label="Games for second team"
        inputMode="numeric"
        value={gb}
        disabled={disabled}
        onChange={(e) => setGb(e.target.value.replace(/\D/g, "").slice(0, 2))}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
      {dirty ? (
        <Button onClick={save} disabled={disabled}>
          Save
        </Button>
      ) : score ? (
        <button
          type="button"
          className="ump-btn"
          onClick={() => {
            setGa("");
            setGb("");
            onClear();
          }}
        >
          Clear
        </button>
      ) : null}
      {error && <small className="ump-error">{error}</small>}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label className="ump-field">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
    </label>
  );
}
