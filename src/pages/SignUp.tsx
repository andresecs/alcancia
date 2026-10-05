import { FormEvent, useState } from "react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import Button from "../components/Button";
import Dropdown from "../components/Dropdown";
import { divisions, fridayTimes, homeClubs, levels } from "../lib/registration";
import PageNotice from "../components/PageNotice";
import { useLiveEvent } from "../lib/useEvents";
import { submitSignup } from "../lib/signups";

export default function SignUp() {
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Remounts the form after sending, which also resets its dropdowns
  const [formKey, setFormKey] = useState(0);
  const { event: featured, live } = useLiveEvent();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!featured || busy) return;
    const data = new FormData(event.currentTarget);
    const field = (name: string) => String(data.get(name) ?? "").trim();
    setBusy(true);
    setError("");
    try {
      await submitSignup(featured.id, {
        name: field("fullName"),
        phone: field("phone"),
        division: field("division"),
        fridayTime: field("fridayTime"),
        level: field("level"),
        homeClub: field("homeClub"),
        notes: field("notes"),
      });
      setSubmitted(true);
      setFormKey((k) => k + 1);
    } catch (e) {
      setSubmitted(false);
      setError(e instanceof Error ? e.message : "Your sign-up couldn't be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="signup-page">
      <SiteHeader />

      {live === false ? (
        <PageNotice
          title="Sign Up"
          message="There's no event to sign up for right now. Check back soon for the next Pro-Am."
          action={{ label: "View past events", to: "/champions" }}
        />
      ) : (
        <section className="signup-layout">
          <div className="signup-intro">
            <div className="signup-title" role="heading" aria-level={1}>
              Sign Up
            </div>
            <p>
              Leave your details and we will come back to you with your spot and
              your partner.
            </p>
          </div>

          <div className="signup-main">
            {featured && (
              <aside className="signup-event" aria-label="Event you are signing up for">
                <div className="signup-event__text">
                  <div className="signup-event__title" role="heading" aria-level={2}>
                    {featured.title}
                  </div>
                  {featured.subtitle && <p className="signup-event__subtitle">{featured.subtitle}</p>}
                  {featured.dates && <p className="signup-event__dates">{featured.dates}</p>}
                </div>
                <Button variant="secondary" icon="right" to="/find-players">
                  View players
                </Button>
              </aside>
            )}
            <form key={formKey} className="signup-form" onSubmit={handleSubmit}>
              <label className="form-field">
                <span>Full Name</span>
                <input
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Full Name"
                  required
                />
              </label>

              <label className="form-field">
                <span>Phone</span>
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="Phone"
                  required
                />
              </label>

              <Dropdown
                label="Division"
                name="division"
                options={divisions}
              />

              <Dropdown
                label="Friday Time"
                name="fridayTime"
                options={fridayTimes}
              />

              <Dropdown
                label="Level"
                name="level"
                options={levels}
              />

              <Dropdown
                label="Home Club"
                name="homeClub"
                options={homeClubs}
              />

              <label className="form-field form-field--wide">
                <span>Anything else we should know?</span>
                <textarea
                  name="notes"
                  placeholder="Anything else we should know?"
                />
              </label>

              <div className="form-actions form-field--wide">
                <Button type="submit" icon="right" disabled={busy || !featured}>
                  {busy ? "Sending…" : "Submit registration"}
                </Button>
                {error && (
                  <p role="alert" className="form-error">
                    {error}
                  </p>
                )}
                {submitted && !error && (
                  <p role="status">
                    Thank you. The membership team will be in touch soon.
                  </p>
                )}
              </div>
            </form>
          </div>
        </section>
      )}
      <SiteFooter />
    </main>
  );
}
