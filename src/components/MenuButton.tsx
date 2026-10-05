import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import Button from "./Button";

export type MenuItem = { id: string; label: string; onSelect: () => void };

// A button with a down chevron that opens a short menu of actions under it,
// in the same list style as the Dropdown. Arrow keys move through the items,
// Enter picks one, Escape or a click outside closes it.
export default function MenuButton({
  label,
  items,
  variant = "primary",
  align = "right",
}: {
  label: string;
  items: MenuItem[];
  variant?: "primary" | "secondary";
  align?: "left" | "right"; // which edge of the button the menu lines up with
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const button = () => root.current?.querySelector<HTMLButtonElement>(".menu-button__trigger");
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button()?.focus();
  };

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    // Escape closes just the menu, never a drawer around it
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      close(true);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const onMenuKey = (event: KeyboardEvent<HTMLUListElement>) => {
    const at = itemRefs.current.findIndex((el) => el === document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      itemRefs.current[(at + step + items.length) % items.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      itemRefs.current[event.key === "Home" ? 0 : items.length - 1]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={root} className={`menu-button menu-button--${align}`}>
      <Button
        variant={variant}
        icon="down"
        className={open ? "menu-button__trigger is-open" : "menu-button__trigger"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {label}
      </Button>
      {open && (
        <ul className="dropdown-menu menu-button__menu" id={menuId} role="menu" aria-label={label} onKeyDown={onMenuKey}>
          {items.map((item, i) => (
            <li key={item.id} role="none">
              <button
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitem"
                onClick={() => {
                  close(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
