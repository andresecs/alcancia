import { useEffect } from "react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

// The legal pages. These are DRAFT OUTLINES, not finished legal text: each
// lists what the page needs to cover, with [brackets] for details only the
// organizers know. Have them completed and reviewed by a lawyer before launch.

type Section = { heading: string; points: string[] };
type Doc = { title: string; intro: string; sections: Section[] };

const docs: Record<string, Doc> = {
  privacy: {
    title: "Privacy Policy",
    intro: "How Reserve Pro-Am collects, uses and protects personal information.",
    sections: [
      {
        heading: "What we collect",
        points: [
          "Sign-up details: name, phone number, division, Friday time, level and home club.",
          "Umpire and judge sign-in: phone numbers, and one-time codes sent by text.",
          "Payments: how entries were paid. Card details are handled by [Stripe] and never stored on this site.",
          "Calcutta: names of bidders and the amounts bid.",
          "Technical data: [browser storage used to keep you signed in; any analytics, if added].",
        ],
      },
      {
        heading: "How we use it",
        points: [
          "To run the event: teams, groups, schedules, results and the Calcutta.",
          "To contact players about their entry, payments and match times.",
          "[Anything else, e.g. future event announcements, with a way to opt out].",
        ],
      },
      {
        heading: "Who we share it with",
        points: [
          "Service providers that run the site: [Google Firebase] (database and text messages), [Stripe] (payments), [hosting provider].",
          "Other participants see names, teams, results and Calcutta owners on the public pages.",
          "We do not sell personal information. [Confirm.]",
        ],
      },
      {
        heading: "How long we keep it",
        points: ["[Retention period for player records, payment records and Calcutta records]."],
      },
      {
        heading: "Your choices and rights",
        points: [
          "Ask to see, correct or delete your information by contacting [email].",
          "[State-specific rights that apply, e.g. California (CCPA/CPRA) or others, depending on where players live].",
          "Reply STOP to any text to stop receiving them.",
        ],
      },
      {
        heading: "Contact",
        points: ["[Organizer's legal name, address and privacy contact email]. Last updated: [date]."],
      },
    ],
  },
  terms: {
    title: "Terms of Use",
    intro: "The rules for using this site and taking part in Reserve Pro-Am events.",
    sections: [
      {
        heading: "Who can take part",
        points: ["[Age and eligibility requirements, membership requirements if any]."],
      },
      {
        heading: "Registration and entry fees",
        points: [
          "Signing up is a request; a place is confirmed when the organizers accept it and the entry fee is paid.",
          "Entry fees are per player. [Amount, deadline, accepted payment methods.] See the Refund Policy.",
        ],
      },
      {
        heading: "Text messages",
        points: [
          "By giving a phone number you agree to receive texts about sign-in codes and your event. [Frequency.] Message and data rates may apply. Reply STOP to opt out, HELP for help.",
        ],
      },
      {
        heading: "Conduct and the officials' decisions",
        points: ["[Code of conduct; that the umpire's and judges' decisions on scores and draws are final]."],
      },
      {
        heading: "Risk and liability",
        points: ["[Assumption of risk for physical activity, release/waiver language, and limits of liability, as advised by counsel]."],
      },
      {
        heading: "Photos and names",
        points: ["[Whether names, results and photos may appear on the site and in promotion, and how to opt out]."],
      },
      {
        heading: "Changes",
        points: ["We may update these terms; the date below shows the latest version. Last updated: [date]."],
      },
    ],
  },
  refunds: {
    title: "Refund Policy",
    intro: "When entry fees and Calcutta payments can be refunded.",
    sections: [
      { heading: "Withdrawing before the event", points: ["[Refund amount and deadline, e.g. full refund until X days before]."] },
      { heading: "Withdrawing after the deadline or no-shows", points: ["[Whether any refund or credit applies]."] },
      { heading: "If the event is cancelled or shortened", points: ["[Weather, venue or other cancellations: refund, credit or reschedule]."] },
      { heading: "Calcutta purchases", points: ["[Whether winning bids can be refunded, e.g. if a team withdraws before play]."] },
      { heading: "How refunds are paid", points: ["[Same method as payment; processing time]. Contact [email] to ask for a refund."] },
    ],
  },
  "calcutta-rules": {
    title: "Calcutta Rules & Disclaimer",
    intro: "How the Calcutta auction works, and the conditions for taking part.",
    sections: [
      {
        heading: "How it works",
        points: [
          "Each team is auctioned before play. The highest bid when bidding closes buys the team.",
          "The pot is the total of all winning bids and is paid out to the owners of the best-finishing teams, using the split published for the event.",
        ],
      },
      {
        heading: "Who can take part",
        points: [
          "[Minimum age, e.g. 21+, and any membership requirement].",
          "Only where taking part is lawful. [Counsel to confirm how Calcutta auctions are treated where the event is held, and whether a permit or other structure is needed.]",
        ],
      },
      {
        heading: "Payment and payouts",
        points: ["[When and how owners pay for teams, when payouts are made, and any amount the organizers keep]."],
      },
      {
        heading: "Disputes",
        points: ["[How disputes are handled; organizers' decision is final]."],
      },
      {
        heading: "Play responsibly",
        points: ["Only bid what you can afford. [Responsible gambling resources, as required]."],
      },
    ],
  },
  accessibility: {
    title: "Accessibility",
    intro: "Our commitment to making this site usable by everyone.",
    sections: [
      {
        heading: "Our goal",
        points: ["We aim for this site to meet the Web Content Accessibility Guidelines (WCAG) 2.1, level AA."],
      },
      {
        heading: "What we've done",
        points: [
          "Pages work with a keyboard and with screen readers, respect reduced-motion settings, and offer a dark mode.",
          "[Any known gaps, and when they'll be fixed].",
        ],
      },
      {
        heading: "Tell us about a problem",
        points: ["If something is hard to use, contact [email] and we'll help and work on a fix. Last reviewed: [date]."],
      },
    ],
  },
};

export default function Legal({ page }: { page: keyof typeof docs }) {
  const doc = docs[page];

  useEffect(() => {
    document.title = `${doc.title} · PRO-AM`;
  }, [doc.title]);

  return (
    <main className="legal-page">
      <SiteHeader />
      <article className="legal">
        <div className="legal__title" role="heading" aria-level={1}>
          {doc.title}
        </div>
        <p className="legal__intro">{doc.intro}</p>
        <p className="legal__draft" role="note">
          Draft: this page is an outline of what it needs to cover. Details in [brackets] are still to be filled
          in, and the final text should be reviewed by a lawyer.
        </p>
        {doc.sections.map((section) => (
          <section key={section.heading} className="legal__section">
            <h2>{section.heading}</h2>
            <ul>
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        ))}
      </article>
      <SiteFooter />
    </main>
  );
}
