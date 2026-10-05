import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, errorText } from "./firebase";
import type { Person } from "./registration";
import { uid } from "./tournament";
import { itemDocId } from "./tournamentItems";

export type SignupForm = Omit<Person, "id" | "status">;

const clean = (text: string, max = 80) => text.replace(/[<>]/g, "").trim().slice(0, max);

// Files a sign-up for review in the event's Players tab. Throws a message
// fit to show the player when it can't be saved.
export async function submitSignup(eventId: number, form: SignupForm) {
  const signup: Person = {
    id: uid(),
    status: "signed-up",
    name: clean(form.name),
    phone: clean(form.phone),
    division: clean(form.division),
    fridayTime: clean(form.fridayTime),
    level: clean(form.level),
    homeClub: clean(form.homeClub),
    notes: clean(form.notes ?? "", 1000),
  };
  if (!signup.name) throw new Error("Please enter your name.");
  if (signup.phone.replace(/\D/g, "").length < 7) throw new Error("Please enter a phone number.");

  if (db) {
    try {
      const event = await getDoc(doc(db, "events", String(eventId)));
      if (event.data()?.status !== "Active") throw new Error("There's no event to sign up for right now.");
      await setDoc(doc(db, "events", String(eventId), "items", itemDocId("signup", signup.id)), {
        kind: "signup",
        key: signup.id,
        value: { ...signup, submittedAt: new Date().toISOString() },
        updatedAt: Date.now(),
      });
    } catch (e) {
      throw new Error(errorText(e));
    }
    return;
  }

  // Without Firebase: into this browser's copy of the event
  const key = `reserve-tournament-${eventId}`;
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "{}") as { signups?: Person[] };
    localStorage.setItem(key, JSON.stringify({ ...saved, signups: [...(saved.signups ?? []), signup] }));
  } catch {
    throw new Error("Your sign-up couldn't be saved. Please try again.");
  }
}
