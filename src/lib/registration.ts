// The choices on the Sign Up form, shared with the umpire's player rosters.
// "Either one" is first and the default: most players can play in either
export const EITHER = "Either one";
export const divisions = [EITHER, "Division 1", "Division 2"];
export const fridayTimes = [EITHER, "2:00 PM", "6:00 PM"];
export const levels = ["Beginner", "Intermediate", "Advanced", "Pro"];
export const homeClubs = ["Hudson Yards", "Upper East", "Another Club"];

// Where someone is in the event. "In a team" isn't stored: it comes from the
// event's teams. Order: signed-up -> accepted (or not-playing) ->
// payment-requested -> paid -> in a team.
export type PlayerStatus = "signed-up" | "accepted" | "not-playing" | "payment-requested" | "paid";

export type Person = {
  id: string;
  name: string;
  phone: string;
  division: string;
  fridayTime: string;
  level: string;
  homeClub: string;
  status?: PlayerStatus;
  notes?: string; // from the Sign Up form
};
