import type { PlayerStatus, Person } from "../../lib/registration";
import type { Tournament } from "../../lib/tournament";
import Chip from "../Chip";

// Where someone stands in an event, and the steps that move them along.

// Someone is on a team when a team in the tournament names them
export const teamOf = (tournament: Tournament | null | undefined, name: string) =>
  tournament?.teams.find((t) => t.amateur.trim() === name.trim() || t.pro.trim() === name.trim());

export const personStatus = (tournament: Tournament | null | undefined, p: Person): ShownStatus =>
  teamOf(tournament, p.name) ? "in-team" : (p.status ?? "accepted");

// "In a team" isn't stored: it's worked out from the event's teams
export type ShownStatus = PlayerStatus | "in-team";

export const statusInfo: Record<ShownStatus, { label: string; mode: "default" | "accent" | "warning" | "success" | "danger"; type?: "soft" | "primary" }> = {
  "signed-up": { label: "Signed up", mode: "default" },
  accepted: { label: "Accepted", mode: "accent" },
  "not-playing": { label: "Not playing", mode: "danger" },
  "payment-requested": { label: "Requested payment", mode: "warning" },
  paid: { label: "Collected payment", mode: "success" },
  "in-team": { label: "In a team", mode: "success", type: "primary" },
};

// Where someone stands in this event, as a chip
export function StatusChip({ status }: { status: ShownStatus }) {
  const info = statusInfo[status];
  return (
    <Chip type={info.type ?? "soft"} mode={info.mode} size="sm">
      {info.label}
    </Chip>
  );
}

// The next steps available from each status, shown as buttons in the drawer
export const nextSteps: Record<PlayerStatus, { to: PlayerStatus; label: string; primary?: boolean }[]> = {
  "signed-up": [{ to: "accepted", label: "Accept", primary: true }, { to: "not-playing", label: "Not playing" }],
  accepted: [{ to: "payment-requested", label: "Request payment", primary: true }, { to: "not-playing", label: "Not playing" }],
  "not-playing": [{ to: "accepted", label: "Mark as playing", primary: true }],
  "payment-requested": [{ to: "paid", label: "Collected payment", primary: true }, { to: "accepted", label: "Undo request" }],
  paid: [],
};

