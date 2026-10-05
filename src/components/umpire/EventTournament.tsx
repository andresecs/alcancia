import { useTournament, type Writer } from "../../lib/useTournament";
import BracketPanel from "./BracketPanel";
import CalcuttaPanel from "./CalcuttaPanel";
import TeamsPanel from "./TeamsPanel";

// Loads one event's tournament data and shows the requested tab.
// Render with `key={eventId}` (see useTournament).
export default function EventTournament({
  eventId,
  tab,
  writer,
  only,
}: {
  eventId: number;
  tab: "teams" | "calcutta" | "bracket";
  writer: Writer;
  only?: { div: string; grp: string };
}) {
  const { data, update, error } = useTournament(eventId, writer);

  if (!data) {
    return <p className="ump-hint">{error || "Loading tournament…"}</p>;
  }

  return (
    <>
      {error && <p className="ump-warn ump-banner">{error}</p>}
      {tab === "teams" && <TeamsPanel data={data} update={update} />}
      {tab === "calcutta" && <CalcuttaPanel data={data} update={update} />}
      {tab === "bracket" && <BracketPanel data={data} update={update} only={only} />}
    </>
  );
}
