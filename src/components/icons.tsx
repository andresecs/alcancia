// Small inline icons drawn in the current text color.

export function ChevronDown() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function Checkmark() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// Paid / unpaid marks: a filled circle with a check or a cross
export function PaidIcon({ paid }: { paid: boolean }) {
  return (
    <svg
      className={paid ? "paid-icon is-paid" : "paid-icon is-unpaid"}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      role="img"
      aria-label={paid ? "Paid" : "Unpaid"}
    >
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      {paid ? (
        <polyline points="7 12.5 10.5 16 17 8.5" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
      )}
    </svg>
  );
}

// A small green check in a circle, e.g. "this is switched on"
export function CheckCircleIcon({ label }: { label: string }) {
  return (
    <svg className="check-circle-icon" width="16" height="16" viewBox="0 0 24 24" role="img" aria-label={label}>
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <polyline
        points="7 12.5 10.5 16 17 8.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
