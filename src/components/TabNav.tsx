import type { ReactNode } from "react";
import CountBadge from "./CountBadge";

export type TabNavItem<T extends string> = {
  id: T;
  label: string;
  disabled?: boolean;
  hint?: string; // shown on hover, e.g. why an item is disabled
  badge?: number; // a small counter after the label
  badgeLabel?: string; // what the counter means, for screen readers ("3 new signups")
  icon?: ReactNode; // a small mark after the label, e.g. a check when something is on
};

// A list of tabs or nav links with a 3px brand indicator on the selected one
// (the Ives "Tabs" component, Figma node 479:3403, in any orientation).
// - orientation: "horizontal" for a row of tabs, "vertical" for a side nav
// - indicator: which edge the selected bar sits on (top, right, bottom, left);
//   a thin divider runs along that same edge
export default function TabNav<T extends string>({
  items,
  value,
  onChange,
  orientation = "horizontal",
  indicator = orientation === "horizontal" ? "bottom" : "left",
  label,
  className,
}: {
  items: TabNavItem<T>[];
  value: T;
  onChange: (id: T) => void;
  orientation?: "horizontal" | "vertical";
  indicator?: "top" | "right" | "bottom" | "left";
  label: string; // accessible name, e.g. "Event sections"
  className?: string;
}) {
  return (
    <nav
      className={["tabnav", `tabnav--${orientation}`, `tabnav--indicator-${indicator}`, className]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
    >
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={item.id === value ? "is-active" : undefined}
              aria-current={item.id === value ? "page" : undefined}
              disabled={item.disabled}
              title={item.disabled ? item.hint : undefined}
              onClick={() => onChange(item.id)}
            >
              {/* data-label reserves the bold width so selecting doesn't shift the row */}
              <span className="tabnav__label" data-label={item.label}>
                {item.label}
              </span>
              {item.icon}
              {item.badge !== undefined && <CountBadge count={item.badge} label={item.badgeLabel} />}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
