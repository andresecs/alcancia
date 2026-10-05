import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { db, errorText } from "../../lib/firebase";
import { useTournament } from "../../lib/useTournament";
import { Section, groupLabel } from "./shared";
import Button from "../Button";

// Stored as judges/{code}, so knowing the code is what lets a judge in
type JudgeRow = { code: string; eventId: number; name: string; div: string; grp: string };

// 8 random digits: easy to read out over the phone, hard to guess
function newCode() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(n[0] % 100_000_000).padStart(8, "0");
}

// One scoring code per group. A judge signs in with it on the Umpire page and
// can only enter scores, times and match order for that group.
export default function JudgesPanel({ eventId }: { eventId: number }) {
  const { data } = useTournament(eventId, { role: "admin" });
  const [judges, setJudges] = useState<JudgeRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      query(collection(db, "judges"), where("eventId", "==", eventId)),
      (snap) => setJudges(snap.docs.map((d) => ({ ...(d.data() as Omit<JudgeRow, "code">), code: d.id }))),
      (e) => setError(errorText(e)),
    );
  }, [eventId]);

  const run = async (op: Promise<unknown>) => {
    try {
      await op;
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  };

  // A new code replaces the old one, so the old one stops working
  const issue = (div: string, grp: string, existing?: JudgeRow) => {
    const batch = writeBatch(db!);
    if (existing) batch.delete(doc(db!, "judges", existing.code));
    batch.set(doc(db!, "judges", newCode()), {
      eventId,
      name: existing?.name || `Judge · Division ${div} ${groupLabel(grp)}`,
      div,
      grp,
    });
    return run(batch.commit());
  };

  const rename = (code: string, name: string) => {
    setJudges((list) => list.map((j) => (j.code === code ? { ...j, name } : j)));
  };

  if (!data) return <p className="ump-hint">Loading…</p>;

  return (
    <div className="ump-panel">
      <p className="ump-hint">
        Give each group's judge their code. They open the Umpire page, tap "Judge? Use your scoring
        code", and can then enter results for their own group only. Issuing a new code stops the
        old one working.
      </p>
      {error && <p className="ump-warn">{error}</p>}
      {data.divisions.map((div) => (
        <Section key={div} title={`Division ${div}`}>
          <div className="ump-list">
            {(data.groups[div] ?? []).length === 0 && (
              <div className="ump-row ump-empty">No groups yet. Add them in the Teams tab.</div>
            )}
            {(data.groups[div] ?? []).map((g) => {
              const judge = judges.find((j) => j.div === div && j.grp === g.name);
              return (
                <div className="ump-row" key={g.name}>
                  <strong className="ump-row__label">{g.name}</strong>
                  {judge ? (
                    <>
                      <input
                        className="ump-input ump-grow"
                        value={judge.name}
                        aria-label="Judge name"
                        onChange={(e) => rename(judge.code, e.target.value)}
                        onBlur={(e) =>
                          void run(updateDoc(doc(db!, "judges", judge.code), { name: e.target.value }))
                        }
                      />
                      <code className="ump-code">{judge.code}</code>
                      <button type="button" className="ump-btn" onClick={() => void issue(div, g.name, judge)}>
                        New code
                      </button>
                      <button
                        type="button"
                        className="ump-btn ump-btn--quiet"
                        onClick={() => void run(deleteDoc(doc(db!, "judges", judge.code)))}
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="ump-grow ump-sub">No judge yet</span>
                      <Button onClick={() => void issue(div, g.name)}>
                        Create code
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      ))}
    </div>
  );
}
