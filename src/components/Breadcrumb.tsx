import { Fragment } from "react";
import { Link } from "react-router";

export type Crumb = {
  label: string;
  to?: string; // a route, rendered as a link
  onClick?: () => void; // or an action, rendered as a button
};

// The Ives "Breadcrumb" component (Figma node 164:474).
// - One crumb and no `current`: the "1 step" back link, "‹ Label".
// - Otherwise: "Link › Link › Current page". With five or more links (6+ steps)
//   the middle collapses to "…", keeping the first two and last two links.
export default function Breadcrumb({
  items,
  current,
  className,
}: {
  items: Crumb[];
  current?: string;
  className?: string;
}) {
  const back = items.length === 1 && !current;
  const collapsed = items.length >= 5;
  const shown: (Crumb | "more")[] = collapsed
    ? [items[0], items[1], "more", items[items.length - 2], items[items.length - 1]]
    : items;

  return (
    <nav className={["breadcrumb", className].filter(Boolean).join(" ")} aria-label="Breadcrumb">
      <ol>
        {shown.map((item, i) =>
          item === "more" ? (
            <li key="more" className="breadcrumb__more" aria-hidden="true">
              <span>…</span>
              <span className="breadcrumb__chevron breadcrumb__chevron--more" />
            </li>
          ) : (
            <li key={`${item.label}-${i}`}>
              <CrumbLink item={item} back={back} />
            </li>
          ),
        )}
        {current && (
          <li>
            <span className="breadcrumb__current" aria-current="page">
              {current}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}

function CrumbLink({ item, back }: { item: Crumb; back: boolean }) {
  const content = (
    <Fragment>
      {back && <span className="breadcrumb__chevron breadcrumb__chevron--left" aria-hidden="true" />}
      <span>{item.label}</span>
      {!back && <span className="breadcrumb__chevron" aria-hidden="true" />}
    </Fragment>
  );
  return item.to !== undefined ? (
    <Link className="breadcrumb__link" to={item.to} onClick={item.onClick}>
      {content}
    </Link>
  ) : (
    <button type="button" className="breadcrumb__link" onClick={item.onClick}>
      {content}
    </button>
  );
}
