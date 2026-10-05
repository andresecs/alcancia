import { useState } from "react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { useLiveEvent } from "../lib/useEvents";

const cards = [
  {
    title: "What it is",
    body: "A Calcutta is an auction. Before play starts every team goes under the hammer and guests buy the team they think will win.",
  },
  {
    title: "Starting Price",
    body: "Every team starts owned by its own players. Anyone can take it by bidding, from your phone, on this page.",
  },
  {
    title: "Bidding",
    body: "Each bid has to beat the top one, and the last bid standing when bidding closes wins the team.",
  },
  {
    title: "The Pot",
    body: "The pot is the sum of every winning bid, and it is split between the owners of the best teams.",
  },
  {
    title: "Anyone can play",
    body: "You do not have to be playing to buy a team, and you can own as many as you like.",
  },
  {
    title: "Settling up",
    body: "Owners settle with the club at the end of the weekend. This board is the record.",
  },
];

const divisionPayouts = {
  1: {
    total: "$2,500",
    champion: "$1,250",
    finalist: "$625",
    semifinalist: "$312.50",
  },
  2: {
    total: "$1,000",
    champion: "$500",
    finalist: "$250",
    semifinalist: "$125",
  },
};

export default function Calcutta() {
  // The live board only shows while an event is running; otherwise just how it works
  const { live } = useLiveEvent();
  const [division, setDivision] = useState<1 | 2>(1);
  const payouts = divisionPayouts[division];

  return (
    <main className="calcutta-page">
      <SiteHeader />

      {live && (
        <section className="calcutta-hero">
          <div className="calcutta-title" role="heading" aria-level={1}>
            Calcutta
          </div>
          <div className="division-toggle" role="group" aria-label="Division">
            <button
              className={division === 1 ? "is-active" : undefined}
              type="button"
              onClick={() => setDivision(1)}
              aria-pressed={division === 1}
            >
              Division 1
            </button>
            <button
              className={division === 2 ? "is-active" : undefined}
              type="button"
              onClick={() => setDivision(2)}
              aria-pressed={division === 2}
            >
              Division 2
            </button>
          </div>
          <div className="payout-board">
            <article className="payout-card payout-card--main">
              <div className="bidding-chip">
                <span className="bidding-chip__icon" aria-hidden="true" />
                <span>Bidding Open</span>
              </div>
              <p>Division {division}</p>
              <div className="payout-amount" role="heading" aria-level={1}>
                {payouts.total}
              </div>
            </article>
            <div className="payout-breakdown">
              <article className="payout-card payout-card--small">
                <p>Champion</p>
                <div className="payout-amount" role="heading" aria-level={1}>
                  {payouts.champion}
                </div>
                <span>50%</span>
              </article>
              <article className="payout-card payout-card--small">
                <p>Finalist</p>
                <div className="payout-amount" role="heading" aria-level={1}>
                  {payouts.finalist}
                </div>
                <span>25%</span>
              </article>
              <article className="payout-card payout-card--small">
                <p>Semifinalist</p>
                <div className="payout-amount" role="heading" aria-level={1}>
                  {payouts.semifinalist}
                </div>
                <span>12.5%</span>
              </article>
            </div>
          </div>
        </section>
      )}

      <section className="calcutta-how">
        <div className="calcutta-section-title" role="heading" aria-level={2}>
          How It Works
        </div>
        <div className="calcutta-card-grid">
          {cards.map((card) => (
            <article className="calcutta-card" key={card.title}>
              <p>{card.title}</p>
              <span>{card.body}</span>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
