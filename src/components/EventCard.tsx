import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router";

// The featured-event card from the home page: "Upcoming event" chip on top,
// then the event name, dates and "Sign Up" at the bottom, over the event's
// photo (darkened) when it has one. With `to` it is a link; without it, it is
// a static preview (used in the umpire event editor).
export default function EventCard({
  title,
  subtitle,
  dates,
  image,
  to,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  dates: ReactNode;
  image?: string;
  to?: string;
  className?: string;
}) {
  const classes = ["hero-card", "hero-card--event", image && "has-image", !to && "hero-card--preview", className]
    .filter(Boolean)
    .join(" ");
  const style: CSSProperties | undefined = image ? { backgroundImage: `url("${image}")` } : undefined;
  const content = (
    <>
      <span className="hero-card__eyebrow">Upcoming event</span>
      <div className="hero-card__body">
        <div className="hero-card__title" role={to ? "heading" : undefined} aria-level={to ? 2 : undefined}>
          {title}
        </div>
        {subtitle && <p className="hero-card__subtitle">{subtitle}</p>}
        <div className="hero-card__footer">
          <p className="hero-card__date">{dates}</p>
          <span className="hero-card__cta">Sign Up</span>
        </div>
      </div>
    </>
  );

  return to ? (
    <Link to={to} className={classes} style={style}>
      {content}
    </Link>
  ) : (
    <div className={classes} style={style}>
      {content}
    </div>
  );
}
