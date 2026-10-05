import { fridayTimes, homeClubs, type Person } from "./registration";
import { defaultSettings, type Team, type Tournament } from "./tournament";

// The Hamptons Invitational field, used to pre-fill the demo event so every
// tab has real data to work with.
const field: [string, string, string, string, string][] = [
  ["t00", "I", "Scott Bruckmann", "Valentin Lang", "D"],
  ["t01", "I", "Luis Rodriguez", "Carlos Rodriguez", "A"],
  ["t02", "I", "Ricardo Garcia", "Nico Warnholtz", "C"],
  ["t03", "I", "Eric Rubin", "Pablo Casado", "C"],
  ["t04", "I", "Mark Groussman", "Quito Santibanez", "D"],
  ["t05", "I", "Tim Taylor", "Gio Lappenti", "D"],
  ["t06", "I", "Noah Bachow", "Augusto Stortini", "B"],
  ["t07", "I", "Shawn Ankari", "Tyler Pasko", "A"],
  ["t08", "I", "Ryan Schinman", "Gianki Rodriguez", "C"],
  ["t09", "I", "Patrick Dovigi", "Pablo Diaz", "A"],
  ["t10", "I", "Sean Lambert", "Raleigh Smith", "A"],
  ["t11", "I", "Peter Zink", "Pablo Rodriguez", "D"],
  ["t12", "I", "Christophe Browne", "Max Mora", "C"],
  ["t13", "I", "Stu Schwadron", "Diego Valderrama", "B"],
  ["t14", "I", "Tony Imbesi", "Daniel Wulff", "B"],
  ["t15", "I", "Felipe MacLean", "Willy Canas", "B"],
  ["t16", "II", "Matt Low", "Israel Rodriguez", "Group 4"],
  ["t17", "II", "Joey Low", "Shoval Malik", "Group 2"],
  ["t18", "II", "Jeff Lipsitz", "Cooper Sakaguchi", "Group 2"],
  ["t19", "II", "Jack Berney", "Agustin Velasco", "Group 4"],
  ["t20", "II", "Larry Edelstein", "Juan Scardino", "Group 2"],
  ["t21", "II", "Jamie Horowitz", "Adri Casado", "Group 1"],
  ["t22", "II", "Ricky Parikh", "Roy Tabet", "Group 5"],
  ["t23", "II", "Jason Gallus", "Gabi Meana", "Group 1"],
  ["t24", "II", "Brad Melshenker", "Guga Vazquez", "Group 5"],
  ["t25", "II", "Matt Lill", "Pepo Zurro", "Group 3"],
  ["t26", "II", "Dean Lazer", "Pablo Ibanez", "Group 6"],
  ["t27", "II", "Josh Fox", "Sergio Conde", "Group 6"],
  ["t28", "II", "Matthew Weinstein", "Alvaro Llaneza", "Group 6"],
  ["t29", "II", "Jon Friedman", "Gero Barrios", "Group 4"],
  ["t30", "II", "Nam Bui", "Juan Martin Diaz", "Group 1"],
  ["t31", "II", "Alex Pellegrini", "Maxi Rozas", "Group 6"],
  ["t32", "II", "Keith Menin", "Guille Cagigas", "Group 2"],
  ["t33", "II", "Chet Gupta", "Maty Marina", "Group 4"],
  ["t34", "II", "Perry Weitz", "Juanpi Andrada", "Group 3"],
  ["t35", "II", "Jay Rittberg", "Alejandro Soriano", "Group 1"],
  ["t36", "II", "Jeff Altman", "Alberto Ibanez", "Group 5"],
  ["t37", "II", "Ben Shirazi", "Cayetano Rocafort", "Group 5"],
  ["t38", "II", "Scott Stackman", "Balta Parra", "Group 3"],
  ["t39", "II", "Leerom Segal", "Dani Diaz", "Group 3"],
];

// A made-up but steady phone number and details for each sample person
const samplePerson = (id: string, name: string, div: string, level: string, i: number, status: Person["status"]): Person => ({
  id,
  name,
  phone: `(212) 555-${String(100 + i).padStart(4, "0")}`,
  division: div === "I" ? "Division 1" : "Division 2",
  fridayTime: fridayTimes[i % fridayTimes.length],
  level,
  homeClub: homeClubs[i % homeClubs.length],
  status,
});

export function sampleTournament(): Tournament {
  const teams: Team[] = field.map(([id, div, amateur, pro, group]) => ({
    id,
    div,
    amateur,
    pro,
    group,
    amateurPaid: false,
    proPaid: false,
    bid: defaultSettings.minBid,
    owner: "",
    sold: false,
  }));

  return {
    divisions: ["I", "II"],
    groups: {
      I: [
        { name: "A", venue: "379 Ocean Road, Bridgehampton, NY 11932" },
        { name: "B", venue: "478 Noyac Path, Water Mill, NY" },
        { name: "C", venue: "636/634 North Sea Mecox Road, Southampton, NY 11968" },
        { name: "D", venue: "636/634 North Sea Mecox Road, Southampton, NY 11968" },
      ],
      II: [
        { name: "Group 1", venue: "379 Ocean Road, Bridgehampton, NY 11932" },
        { name: "Group 2", venue: "74 Little Noyac Path" },
        { name: "Group 3", venue: "43 Robertson Drive, Sag Harbor, NY 11963" },
        { name: "Group 4", venue: "180 Springy Banks Road, East Hampton, NY" },
        { name: "Group 5", venue: "19 Ambleside Lane" },
        { name: "Group 6", venue: "10 Morgan Hill Way, Bridgehampton, NY" },
      ],
    },
    crossGroups: { I: true },
    teams,
    guestBids: [
      {
        id: "g1",
        teamId: "t00",
        bidder: "Josh Keller",
        amount: 1500,
        time: new Date().toISOString(),
        status: "pending",
      },
      {
        id: "g2",
        teamId: "t32",
        bidder: "Seth Lambert",
        amount: 1000,
        time: new Date().toISOString(),
        status: "pending",
      },
    ],
    // Everyone on a team, plus a few people still waiting for one
    players: [
      ...field.map(([id, div, amateur], i) => samplePerson(`a-${id}`, amateur, div, "Advanced", i, "paid")),
      samplePerson("a-x1", "Jane Doe", "I", "Intermediate", 41, "accepted"),
      samplePerson("a-x2", "John Doe", "II", "Beginner", 42, "payment-requested"),
    ],
    pros: [
      ...field.map(([id, div, , pro], i) => samplePerson(`p-${id}`, pro, div, "Pro", i + 50, "paid")),
      samplePerson("p-x1", "Adarsh Arun", "II", "Pro", 91, "accepted"),
    ],
    signups: [
      samplePerson("s-1", "Daniel Ortega", "I", "Advanced", 60, "signed-up"),
      samplePerson("s-2", "Priya Shah", "II", "Intermediate", 61, "signed-up"),
      samplePerson("s-3", "Marcus Lee", "I", "Advanced", 62, "signed-up"),
    ],
    scores: {},
    matchMeta: {},
    matchOrder: {},
    seedOverride: {},
    bracketSeeds: {},
    settings: defaultSettings,
  };
}
