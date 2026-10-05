import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";

type Shared = {
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "danger-ghost";
  // "right": chevron after the label. "down": a down chevron after it (opens
  // a menu). "check": checkmark before the label.
  icon?: "none" | "right" | "down" | "check";
  className?: string;
  children: ReactNode;
};

type AsButton = Shared &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    to?: undefined;
    selected?: boolean;
  };

type AsLink = Shared & { to: string; onClick?: () => void };

// The Ives "Button" component (Figma node 159:371): Primary (filled),
// Secondary (outlined), Tertiary (soft fill), Ghost (text only) and Danger
// Ghost (red text), each with Regular, Hover, Pressed, Selected and
// Disabled states and an optional chevron. Pass `to` to render a link that
// looks like a button. Pass `selected` only for toggle buttons; it also sets
// aria-pressed.
export default function Button(props: AsButton | AsLink) {
  const { variant = "primary", icon = "none", className, children } = props;
  const selected = props.to === undefined ? props.selected : undefined;
  const classes = ["btn", `btn--${variant}`, selected && "is-selected", className]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      {icon === "check" && <span className="btn__icon btn__icon--check" aria-hidden="true" />}
      <span>{children}</span>
      {icon === "right" && <span className="btn__icon" aria-hidden="true" />}
      {icon === "down" && <span className="btn__icon btn__icon--down" aria-hidden="true" />}
    </>
  );

  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={classes} onClick={props.onClick}>
        {content}
      </Link>
    );
  }

  const { variant: _v, icon: _i, className: _c, children: _ch, selected: _s, to: _t, type = "button", ...rest } = props;
  return (
    <button type={type} className={classes} aria-pressed={selected} {...rest}>
      {content}
    </button>
  );
}
