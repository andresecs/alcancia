import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import CountBadge from "./CountBadge";
import { ChevronDown } from "./icons";
import type { TabNavItem } from "./TabNav";

// A compact menu for switching sections on small screens: a bar showing the
// current section that opens a list of all of them. Same items as TabNav,
// so a page can show TabNav on desktop and MenuBar on phones.
export default function MenuBar<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: TabNavItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string; // accessible name, e.g. "Event sections"
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const current = items.find((i) => i.id === value);
  const enabled = items.map((item, i) => (item.disabled ? -1 : i)).filter((i) => i >= 0);

  const focusItem = (index: number) => itemRefs.current[index]?.focus();

  useEffect(() => {
    if (!open) return;
    focusItem(Math.max(0, items.findIndex((i) => i.id === value)));
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]); // runs on open/close only; the current item is read once when opening

  const choose = (id: T) => {
    onChange(id);
    setOpen(false);
    bar.current?.focus();
  };

  const onMenuKey = (event: KeyboardEvent<HTMLUListElement>) => {
    const at = itemRefs.current.findIndex((el) => el === document.activeElement);
    const pos = enabled.indexOf(at);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      focusItem(enabled[(pos + step + enabled.length) % enabled.length]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      bar.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={root} className={["menubar", open && "is-open", className].filter(Boolean).join(" ")}>
      <button
        ref={bar}
        type="button"
        className="menubar__bar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${label}: ${current?.label ?? ""}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="menubar__current">{current?.label}</span>
        <ChevronDown />
      </button>

      {open && (
        <ul className="menubar__menu" id={menuId} role="menu" aria-label={label} onKeyDown={onMenuKey}>
          {items.map((item, i) => (
            <li key={item.id} role="none">
              <button
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={item.id === value}
                className={item.id === value ? "is-active" : undefined}
                disabled={item.disabled}
                onClick={() => choose(item.id)}
              >
                <span>{item.label}</span>
                {item.disabled && item.hint && <small>{item.hint}</small>}
                {item.badge !== undefined && <CountBadge count={item.badge} label={item.badgeLabel} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
