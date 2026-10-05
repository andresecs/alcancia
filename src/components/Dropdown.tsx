import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { Checkmark, ChevronDown } from "./icons";

type DropdownProps = {
  label: string;
  name: string;
  options: string[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
};

// A form field with a floating label whose options open in a list directly
// under it. Submits its value through a hidden input named `name`.
// Pass `value` + `onChange` to control it, or leave both out.
export default function Dropdown({
  label,
  name,
  options,
  value: controlled,
  defaultValue = "",
  onChange,
  className,
}: DropdownProps) {
  const [own, setOwn] = useState(defaultValue);
  const value = controlled ?? own;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();

  const choose = (option: string) => {
    if (controlled === undefined) setOwn(option);
    onChange?.(option);
    setOpen(false);
    trigger.current?.focus();
  };

  const openAt = (index: number) => {
    setActive(Math.max(0, Math.min(options.length - 1, index)));
    setOpen(true);
  };

  // Close when clicking or tapping anywhere outside the field
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Move focus to the highlighted option and keep it in view
  useEffect(() => {
    if (!open) return;
    const el = optionRefs.current[active];
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onTriggerKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      const selected = options.indexOf(value);
      openAt(selected >= 0 ? selected : event.key === "ArrowUp" ? options.length - 1 : 0);
    }
  };

  const onListKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(options.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation(); // close just the list, not a drawer around it
      setOpen(false);
      trigger.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={root}
      className={[
        "form-field",
        "form-field--dropdown",
        open && "is-open",
        value && "is-filled",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{label}</span>
      <input type="hidden" name={name} value={value} />
      <button
        ref={trigger}
        className="dropdown-trigger"
        type="button"
        onClick={() => (open ? setOpen(false) : openAt(Math.max(0, options.indexOf(value))))}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={value ? `${label}: ${value}` : label}
      >
        <span className="dropdown-value">{value || label}</span>
        <ChevronDown />
      </button>

      {open && (
        <div className="dropdown-menu" id={listId} role="listbox" aria-label={label} onKeyDown={onListKey}>
          {options.map((option, i) => (
            <button
              key={option}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              type="button"
              role="option"
              aria-selected={value === option}
              tabIndex={i === active ? 0 : -1}
              className={value === option ? "is-selected" : undefined}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(option)}
            >
              <span>{option}</span>
              {value === option && <Checkmark />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
