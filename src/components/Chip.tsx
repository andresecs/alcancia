import type { ReactNode } from "react";

export type ChipMode = "accent" | "default" | "success" | "warning" | "danger";
export type ChipType = "primary" | "secondary" | "tertiary" | "soft";

// The Ives "Chips (Sentiment)" component (Figma node 162:984).
// - mode: the sentiment colour (accent is the site's brand green)
// - type: primary = solid fill, secondary = neutral fill, tertiary = text
//   only, soft = a light tint of the mode colour
// - size: "md" is the Figma size; "sm" for tight spots like drawer headers
// - leftIcon / rightIcon: optional icons either side of the label
export default function Chip({
  children,
  mode = "accent",
  type = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  className,
}: {
  children: ReactNode;
  mode?: ChipMode;
  type?: ChipType;
  size?: "sm" | "md";
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
}) {
  return (
    <span className={["chip", `chip--${mode}`, `chip--${type}`, `chip--${size}`, className].filter(Boolean).join(" ")}>
      {leftIcon && <span className="chip__icon">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="chip__icon">{rightIcon}</span>}
    </span>
  );
}
