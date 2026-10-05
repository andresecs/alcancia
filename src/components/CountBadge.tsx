// The small counter from the Ives tabs: a number in a brand-colored box,
// shown after a label (tab totals, new sign-ups waiting, …).
export default function CountBadge({ count, label }: { count: number; label?: string }) {
  return (
    <span className="tab-count" aria-label={label ?? `${count} total`}>
      {count}
    </span>
  );
}
