import { KeyboardEvent, ReactNode, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, SearchIcon } from "./icons";

export type PickerOption = {
  id: string;
  name: string;
  status?: ReactNode; // e.g. a status chip
  taken?: boolean; // crossed off and can't be picked
  takenNote?: string; // why, e.g. "On a team"
};

// A form field that picks a person from a list: opens under the field with a
// search box, shows each person's status, and crosses off anyone taken.
// The chosen name is submitted through a hidden input named `name`.
export default function PersonPicker({
  label,
  name,
  options,
  value,
  onChange,
  emptyNote,
}: {
  label: string;
  name: string;
  options: PickerOption[];
  value: string; // the chosen person's name
  onChange: (name: string) => void;
  emptyNote?: string; // shown when there is nobody to pick
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();

  const q = query.trim().toLowerCase();
  const shown = options.filter((o) => !q || o.name.toLowerCase().includes(q));
  const pickable = shown.map((o, i) => (o.taken ? -1 : i)).filter((i) => i >= 0);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    search.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Keep the highlight on something pickable as the search narrows the list
  // (deliberately keyed on the query and opening, not on the derived list)
  useEffect(() => {
    setActive(pickable[0] ?? -1);
  }, [query, open]);

  const choose = (option: PickerOption) => {
    if (option.taken) return;
    onChange(option.name);
    setOpen(false);
    trigger.current?.focus();
  };

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    const pos = pickable.indexOf(active);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!pickable.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive(pickable[(pos + step + pickable.length) % pickable.length]);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (shown[active]) choose(shown[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation(); // close the list, not a drawer around it
      setOpen(false);
      trigger.current?.focus();
    }
  };

  return (
    <div
      ref={root}
      className={["form-field", "form-field--dropdown", "person-picker", open && "is-open", value && "is-filled"]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{label}</span>
      <input type="hidden" name={name} value={value} />
      <button
        ref={trigger}
        type="button"
        className="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={value ? `${label}: ${value}` : label}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="dropdown-value">{value || label}</span>
        <ChevronDown />
      </button>

      {open && (
        <div className="dropdown-menu person-picker__menu">
          <label className="person-picker__search">
            <SearchIcon />
            <input
              ref={search}
              type="search"
              placeholder={`Search ${label.toLowerCase()}s`}
              aria-label={`Search ${label.toLowerCase()}s`}
              aria-controls={listId}
              aria-activedescendant={shown[active] ? `${listId}-${shown[active].id}` : undefined}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
            />
          </label>
          <ul id={listId} role="listbox" aria-label={label}>
            {shown.map((o, i) => (
              <li
                key={o.id}
                id={`${listId}-${o.id}`}
                role="option"
                aria-selected={o.name === value}
                aria-disabled={o.taken || undefined}
                className={[o.taken && "is-taken", i === active && "is-active", o.name === value && "is-selected"]
                  .filter(Boolean)
                  .join(" ")}
                onMouseEnter={() => !o.taken && setActive(i)}
                onClick={() => choose(o)}
              >
                <span className="person-picker__name">{o.name}</span>
                {o.taken && o.takenNote ? <small>{o.takenNote}</small> : o.status}
              </li>
            ))}
            {shown.length === 0 && (
              <li className="person-picker__empty" aria-disabled>
                {options.length ? `Nobody matches "${query}"` : emptyNote ?? "Nobody to choose from yet."}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
