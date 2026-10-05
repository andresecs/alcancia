import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import EventCard from "../components/EventCard";
import ReserveLogo from "../components/ReserveLogo";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { prizeDivisions, useLiveEvent, type EventItem } from "../lib/useEvents";
import { useEventConfig } from "../lib/useEventConfig";
import { money, type Tournament } from "../lib/tournament";
import Button from "../components/Button";

type SlideProps = {
  children: React.ReactNode;
  eyebrow: string;
  number: string;
  tone?: "light" | "dark" | "red";
};

const slides = [
  "Home",
  "Details",
  "Schedule",
  "Locations",
  "Prizes",
  "Partners",
];

function Slide({
  children,
  eyebrow,
  number,
  tone = "light",
}: SlideProps) {
  return (
    <section className={`slide slide--${tone}`} data-slide>
      <div className="slide__topline">
        <span className="slide__heading" role="heading" aria-level={2}>
          {eyebrow}
        </span>
        <span>{number} / 06</span>
      </div>
      <div className="slide__content">{children}</div>
    </section>
  );
}

const parseDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};

// "14:00" -> "2:00 PM"
function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// Division "I" reads as D1 on the page
const romanNumbers: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
const divisionShort = (d: string) => (romanNumbers[d] ? `D${romanNumbers[d]}` : d);
const countWords = ["No", "One", "Two", "Three", "Four", "Five", "Six"];

const joinAnd = (list: string[]) =>
  list.length < 2 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;

const places = [
  ["first", "1st"],
  ["second", "2nd"],
  ["third", "3rd/4th"],
] as const;

export default function Home() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  // Only the running event is featured; with none, the home page is just the
  // title, a "No upcoming events" card and the way to past events
  const { event: featured, live } = useLiveEvent();
  // Entry fee, divisions and payout from the event's setup in the Umpire page
  const config = useEventConfig(featured?.id);

  // The browser tab names the event that's running; plain PRO-AM otherwise
  useEffect(() => {
    document.title = featured ? `${featured.title} · PRO-AM` : "PRO-AM";
  }, [featured]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      const slideElements = Array.from(
        track.querySelectorAll<HTMLElement>("[data-slide]"),
      );
      const marker = track.scrollTop + track.clientHeight * 0.4;
      const next = slideElements.reduce(
        (current, slide, index) =>
          slide.offsetTop <= marker ? index : current,
        0,
      );
      setActiveSlide(next);
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (index: number) => {
    const target = trackRef.current?.querySelectorAll<HTMLElement>("[data-slide]")[
      index
    ];
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const requestedSlide = Number(
      new URLSearchParams(location.search).get("slide"),
    );
    if (
      Number.isInteger(requestedSlide) &&
      requestedSlide >= 0 &&
      requestedSlide < slides.length
    ) {
      requestAnimationFrame(() => goTo(requestedSlide));
    }
    // location.key changes on every menu click, even to the same slide
  }, [location.key, location.search]);

  const openSignup = () => navigate("/sign-up");

  return (
    <main className="app-shell">
      <SiteHeader fixed />

      <div className="slide-track" ref={trackRef}>
        <section className="slide hero" data-slide>
          <div className="slide__topline" aria-hidden="true" />
          <div className="hero__content">
            <div className="hero__title" role="heading" aria-level={1}>
              Pro-Am
            </div>
            <div className="hero-cards">
              {live !== false ? (
                <EventCard
                  to="/sign-up"
                  title={featured?.title ?? "\u00a0"}
                  subtitle={featured?.subtitle}
                  dates={featured?.dates ?? "\u00a0"}
                  image={featured?.image}
                />
              ) : (
                <div className="hero-card hero-card--event hero-card--empty">
                  <div className="hero-card__body">
                    <div className="hero-card__title" role="heading" aria-level={2}>
                      No upcoming events
                    </div>
                    <p className="hero-card__subtitle">Check back soon for the next Pro-Am.</p>
                  </div>
                </div>
              )}
              <Link to="/champions" className="hero-card hero-card--past">
                <span className="hero-card__cta">View past events</span>
              </Link>
            </div>
          </div>
        </section>

        {/* The rest of the weekend's details only while an event is running */}
        {live && (
          <>
            <Slide eyebrow="Details" number="02">
              <DetailsCards config={config} />
            </Slide>

            <Slide eyebrow="Schedule" number="03" tone="dark">
              {featured && <ScheduleCards event={featured} />}
            </Slide>

            <Slide eyebrow="Where" number="04">
              {featured && <VenueCards event={featured} />}
            </Slide>

            <Slide eyebrow="Prizes" number="05" tone="red">
              {featured && <PrizeCards event={featured} />}
            </Slide>

            <Slide eyebrow="Partners" number="06">
              <div className="partner-grid">
                {/* TODO: swap the wordmark for Amber Room's logo once we have it */}
                <a
                  className="partner-card"
                  href="https://www.instagram.com/amberroomnyc"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="partner-logo">
                    <p className="partner-logo__wordmark">
                      Amber Room
                      <br />
                      NYC
                    </p>
                  </div>
                  <div className="partner-copy">
                    <p>Amber Room NYC</p>
                    <span>@amberroomnyc on Instagram</span>
                  </div>
                </a>
                <a
                  className="partner-card"
                  href="https://www.instagram.com/reservepadel"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="partner-logo partner-logo--reserve">
                    <ReserveLogo />
                  </div>
                  <div className="partner-copy">
                    <p>Reserve Padel</p>
                    <span>@reservepadel on Instagram</span>
                  </div>
                </a>
              </div>
              <div className="partner-footer">
                <p>We’ll see you on the court.</p>
                <Button icon="right" onClick={openSignup}>
                  Reserve your place
                </Button>
              </div>
            </Slide>
          </>
        )}
        <SiteFooter />
      </div>

      {live && (
      <nav className="slide-nav" aria-label="Slide navigation">
        {slides.map((slide, index) => (
          <button
            key={slide}
            className={index === activeSlide ? "nav-dot is-active" : "nav-dot"}
            onClick={() => goTo(index)}
            aria-label={`Go to ${slide}`}
            aria-current={index === activeSlide ? "page" : undefined}
          >
            <span>{slide}</span>
          </button>
        ))}
      </nav>
      )}
    </main>
  );
}

function DetailsCards({ config }: { config: Pick<Tournament, "divisions" | "settings"> }) {
  const { divisions, settings } = config;
  const { champion, finalist, semifinalist } = settings.payout;
  return (
    <div className="detail-grid">
      <article className="info-card info-card--feature">
        <p className="card-label">Entry</p>
        <div className="info-card__content">
          <p className="card-value">{money(settings.entryFee)}</p>
          <p className="card-note">Per player</p>
        </div>
      </article>
      <article className="info-card">
        <p className="card-label">The field</p>
        <div className="info-card__content">
          <p className="card-value">
            {countWords[divisions.length] ?? divisions.length} division{divisions.length === 1 ? "" : "s"}
          </p>
          <p className="card-note">
            {divisions.length > 1
              ? `${joinAnd(divisions.map(divisionShort))}, each with its own groups, bracket and Calcutta`
              : "Groups, a knockout bracket and a Calcutta"}
          </p>
        </div>
      </article>
      <article className="info-card">
        <p className="card-label">Calcutta</p>
        <div className="info-card__content">
          <p className="card-value">Bid from your phone</p>
          <p className="card-note">Teams auctioned from your phone; the pot goes to the owners of the best teams</p>
        </div>
      </article>
      <article className="info-card info-card--dark">
        <p className="card-label">The payoff</p>
        <div className="info-card__content">
          <p className="card-value">Back the best</p>
          <p className="card-note">
            The champion's owner takes {champion}% of the pot, the finalist's {finalist}% and each
            semi-finalist's {semifinalist}%
          </p>
        </div>
      </article>
    </div>
  );
}

// The days and times set in the Umpire page's event info
function ScheduleCards({ event }: { event: EventItem }) {
  const venueName = (id: string) => event.details.venues.find((v) => v.id === id)?.name ?? "";
  const days = [...event.details.schedule]
    .filter((day) => day.date && day.items.some((i) => i.title.trim()))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!days.length) {
    return (
      <div className="schedule-grid">
        <article className="schedule-card">
          <div className="schedule-card__header">
            <p>Schedule coming soon</p>
            {event.dates && <span>{event.dates}</span>}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="schedule-grid">
      {days.map((day) => {
        const date = parseDay(day.date);
        const items = day.items
          .filter((i) => i.title.trim())
          // timed items in order, untimed ones after them
          .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
        return (
          <article className="schedule-card" key={day.id}>
            <div className="schedule-card__header">
              <p>{date?.toLocaleDateString("en-US", { weekday: "long" })}</p>
              <span>{date?.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</span>
            </div>
            <div className="schedule-rows">
              {items.map((item) => (
                <div className="schedule-row" key={item.id}>
                  <time>{item.time ? formatTime(item.time) : "TBA"}</time>
                  <div>
                    <p>{item.title}</p>
                    {item.venueId && <span>{venueName(item.venueId)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}

// The venues set in the Umpire page's event info, each with a map link
function VenueCards({ event }: { event: EventItem }) {
  const venues = event.details.venues.filter((v) => v.name.trim());

  if (!venues.length) {
    return (
      <div className="location-grid location-grid--single">
        <article className="location-card">
          <CourtArt />
          <div className="location-copy">
            <span>Venue</span>
            <p>To be announced</p>
            {event.location && <small>{event.location}</small>}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className={venues.length === 1 ? "location-grid location-grid--single" : "location-grid"}>
      {venues.map((venue, index) => (
        <article className="location-card" key={venue.id}>
          {index % 2 === 0 ? <CourtArt /> : <CityArt />}
          <div className="location-copy">
            <span>Venue</span>
            <p>{venue.name}</p>
            {venue.address && (
              <small>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name}, ${venue.address}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {venue.address}
                </a>
              </small>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

const CourtArt = () => (
  <div className="location-art location-art--court" aria-hidden="true">
    <span className="court-line court-line--vertical" />
    <span className="court-line court-line--horizontal" />
    <span className="court-ball" />
  </div>
);

const CityArt = () => (
  <div className="location-art location-art--city" aria-hidden="true">
    <span className="building building--one" />
    <span className="building building--two" />
    <span className="building building--three" />
  </div>
);

// The prize money set in the Umpire page's event info, as one set of cards:
// the first division with amounts set (divisions aren't shown separately).
function PrizeCards({ event }: { event: EventItem }) {
  const prize = prizeDivisions
    .map((div) => event.details.prizes[div])
    .find((p) => p && (p.first || p.second || p.third));

  if (!prize) {
    return (
      <>
        <div className="prize-grid">
          <article className="prize-card prize-card--winner">
            <p className="prize-place">Prize purse</p>
            <p className="prize-amount">To be announced</p>
          </article>
        </div>
        <p className="prize-footnote">Calcutta proceeds distributed separately.</p>
      </>
    );
  }

  return (
    <>
      <div className="prize-grid">
        {places.map(([place, label], i) => (
          <article className={i === 0 ? "prize-card prize-card--winner" : "prize-card"} key={place}>
            <p className="prize-place">{label}</p>
            <p className="prize-amount">{prize[place] ? money(prize[place]) : "TBA"}</p>
          </article>
        ))}
      </div>
      <p className="prize-footnote">
        3rd/4th is paid to each losing semi-finalist. Calcutta proceeds distributed separately.
      </p>
    </>
  );
}
