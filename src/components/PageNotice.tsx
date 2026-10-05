import type { ReactNode } from "react";
import Button from "./Button";

// A whole-page message for when there's nothing to show yet, e.g. no event is
// running: a big title, a line of explanation and an optional way onward.
export default function PageNotice({
  title,
  message,
  action,
}: {
  title: string;
  message: ReactNode;
  action?: { label: string; to: string };
}) {
  return (
    <section className="page-notice">
      <div className="page-notice__title" role="heading" aria-level={1}>
        {title}
      </div>
      <p className="page-notice__message">{message}</p>
      {action && (
        <Button variant="secondary" icon="right" to={action.to}>
          {action.label}
        </Button>
      )}
    </section>
  );
}
