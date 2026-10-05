import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import OtpBoxes from "../components/OtpBoxes";
import UmpireHeader, { type UmpirePage } from "../components/UmpireHeader";
import SiteHeader from "../components/SiteHeader";
import SettingsPage from "../components/umpire/SettingsPage";
import EventDetailsSections, { InfoSection } from "../components/umpire/EventDetailsSections";
import EventNav from "../components/umpire/EventNav";
import EventTournament from "../components/umpire/EventTournament";
import PlayersPanel from "../components/umpire/PlayersPanel";
import JudgesPanel from "../components/umpire/JudgesPanel";
import { groupLabel } from "../components/umpire/shared";
import { uploadEventImage } from "../lib/eventImage";
import { doc, getDoc } from "firebase/firestore";
import { db, errorText } from "../lib/firebase";
import { useSignupCount } from "../lib/useSignupCount";
import { emptyDetails, formatDates, useEvents, type EventItem, type EventStatus } from "../lib/useEvents";
import Breadcrumb from "../components/Breadcrumb";
import Button from "../components/Button";
import Chip from "../components/Chip";
import DateRangePicker from "../components/DateRangePicker";
import Dropdown from "../components/Dropdown";
import Modal from "../components/Modal";
import EventCard from "../components/EventCard";
import { UploadIcon } from "../components/icons";

type EventTab = "info" | "players" | "teams" | "calcutta" | "bracket" | "judges";
type AuthStep = "loading" | "phone" | "otp" | "judge" | "dashboard" | "judging";
type Judge = { code: string; eventId: number; name: string; div: string; grp: string };

// Long names don't fit the home page card or the editor heading
const EVENT_NAME_MAX = 15;

const eventStatuses: EventStatus[] = ["Active", "Scheduled", "Draft", "Completed"];

// Demo sign-in for now (code 123456). Real text-message sign-in comes later
// with Firebase Authentication (see firebase/README.md).
const demoPhones = new Set(["6194848005", "6782004156"]);

export default function Umpire() {
  const [authStep, setAuthStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [judgeCode, setJudgeCode] = useState("");
  const [judge, setJudge] = useState<Judge | null>(null);
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isNewEvent, setIsNewEvent] = useState(false);
  const [eventTab, setEventTab] = useState<EventTab>("info");
  // The event as last saved, to tell whether the editor has unsaved changes
  const [savedEvent, setSavedEvent] = useState<EventItem | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [imageError, setImageError] = useState("");

  const signedIn = authStep === "dashboard";
  const [adminPage, setAdminPage] = useState<UmpirePage>("events");
  const { events, error: eventsError, saveEvent: storeEvent, patchLocal } = useEvents(signedIn);
  // Sign-ups waiting in the open event, for the Players counter
  const newSignups = useSignupCount(isNewEvent ? undefined : editingEvent?.id, eventTab);

  const submitPhone = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!demoPhones.has(phone.replace(/\D/g, ""))) {
      setAuthError("That phone number is not authorized.");
      return;
    }
    setAuthError("");
    setAuthStep("otp");
  };

  const submitOtp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp !== "123456") {
      setAuthError("Enter the valid 6-digit code.");
      return;
    }
    setAuthError("");
    setAuthStep("dashboard");
  };

  const submitJudgeCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db) {
      setAuthError("Judge codes work once the site is connected to Firebase.");
      return;
    }
    const code = judgeCode.trim();
    // Codes are digits only; anything else can't be one (or a document name)
    if (!/^\d{6,12}$/.test(code)) {
      setAuthError("That code is not valid.");
      return;
    }
    setBusy(true);
    const found = await getDoc(doc(db, "judges", code)).catch(() => null);
    setBusy(false);
    if (!found?.exists()) {
      setAuthError("That code is not valid.");
      return;
    }
    setAuthError("");
    setJudge({ code, ...(found.data() as Omit<Judge, "code">) });
    setAuthStep("judging");
  };

  const signOut = async () => {
    setEditingEvent(null);
    setJudge(null);
    setJudgeCode("");
    setOtp("");
    setAuthStep("phone");
  };

  const openEvent = (event: EventItem) => {
    setImageError("");
    setIsNewEvent(false);
    setEventTab("info");
    setEditingEvent({ ...event });
    setSavedEvent(event);
  };

  const openNewEvent = () => {
    setIsNewEvent(true);
    setEventTab("info");
    setImageError("");
    const blank: EventItem = {
      id: Date.now(),
      title: "",
      subtitle: "",
      status: "Draft",
      location: "",
      startDate: "",
      endDate: "",
      dates: "",
      image: "",
      details: emptyDetails(),
      players: 0,
      notifications: 0,
      newSignups: 0,
    };
    setEditingEvent(blank);
    setSavedEvent(blank);
  };

  const editableFields = ["title", "subtitle", "location", "startDate", "endDate", "status", "image", "details"] as const;
  const hasChanges =
    !!editingEvent &&
    !!savedEvent &&
    editableFields.some((field) => JSON.stringify(editingEvent[field]) !== JSON.stringify(savedEvent[field]));

  // Changing either date rebuilds the readable range ("October 22–24, 2027")
  const setDates = (startDate: string, endDate: string) =>
    editingEvent && setEditingEvent({ ...editingEvent, startDate, endDate, dates: formatDates(startDate, endDate) });
  const datesBackwards = !!editingEvent?.startDate && !!editingEvent.endDate && editingEvent.endDate < editingEvent.startDate;

  // Another event that's already Active, which saving this one as Active would replace
  const activeToReplace =
    editingEvent?.status === "Active"
      ? events.find((e) => e.id !== editingEvent.id && e.status === "Active")
      : undefined;

  const saveEvent = async (event?: FormEvent<HTMLFormElement>, confirmed = false) => {
    event?.preventDefault();
    if (!editingEvent?.title.trim() || !editingEvent.startDate || datesBackwards) return;
    if (activeToReplace && !confirmed) {
      setConfirmReplace(true);
      return;
    }
    setConfirmReplace(false);
    setBusy(true);
    const saved = await storeEvent(editingEvent, isNewEvent);
    setBusy(false);
    // Stay on the event; a new one now has its real id and the other tabs open up
    if (saved) {
      setEditingEvent(saved);
      setSavedEvent(saved);
      setIsNewEvent(false);
    }
  };

  const chooseImage = async (file: File | undefined) => {
    if (!file || !editingEvent) return;
    setImageBusy(true);
    setImageError("");
    try {
      const image = await uploadEventImage(file);
      setEditingEvent((current) => (current ? { ...current, image } : current));
    } catch (e) {
      setImageError(errorText(e));
    }
    setImageBusy(false);
  };

  const openEventFromKeyboard = (
    event: KeyboardEvent<HTMLElement>,
    item: EventItem,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEvent(item);
    }
  };

  return (
    <main className="umpire-page">
      {/* Signing in is still part of the public site; the admin header comes after */}
      {!signedIn && authStep !== "judging" ? (
        <SiteHeader />
      ) : (
      <UmpireHeader
        label={signedIn ? "Admin" : authStep === "judging" ? judge?.name : undefined}
        onSignOut={signedIn || authStep === "judging" ? () => void signOut() : undefined}
        page={adminPage}
        onNavigate={
          signedIn
            ? (next) => {
                setEditingEvent(null);
                setAdminPage(next);
              }
            : undefined
        }
      />
      )}

      {authStep === "phone" && (
        <section className="umpire-auth">
          <div className="umpire-auth__content">
            <div role="heading" aria-level={1}>
              Sign In
            </div>
            <p>Enter your authorized phone number to manage tournament events.</p>
            <form onSubmit={submitPhone}>
              <label className="form-field">
                <span>Phone number</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setAuthError("");
                  }}
                  required
                />
              </label>
              {authError && <p className="umpire-auth__error">{authError}</p>}
              <div className="umpire-auth__actions">
                <Button type="submit" icon="right" disabled={busy}>
                  {busy ? "Sending code" : "Continue"}
                </Button>
                <button
                  className="umpire-text-button"
                  type="button"
                  onClick={() => {
                    setAuthStep("judge");
                    setAuthError("");
                  }}
                >
                  Judge? Use your scoring code
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {authStep === "loading" && (
        <section className="umpire-auth">
          <div className="umpire-auth__content">
            <p>Loading…</p>
          </div>
        </section>
      )}

      {authStep === "judge" && (
        <section className="umpire-auth">
          <div className="umpire-auth__content">
            <p>Group judges</p>
            <div role="heading" aria-level={1}>
              Score
            </div>
            <p>Enter the scoring code the umpire gave you. It lets you enter results for your group only.</p>
            <form onSubmit={submitJudgeCode}>
              <label className="form-field">
                <span>Scoring code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Scoring code"
                  value={judgeCode}
                  onChange={(event) => {
                    setJudgeCode(event.target.value);
                    setAuthError("");
                  }}
                  required
                />
              </label>
              {authError && <p className="umpire-auth__error">{authError}</p>}
              <div className="umpire-auth__actions">
                <Button type="submit" icon="right" disabled={busy}>
                  Open my group
                </Button>
                <button
                  className="umpire-text-button"
                  type="button"
                  onClick={() => {
                    setAuthStep("phone");
                    setAuthError("");
                  }}
                >
                  Umpire sign in
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {authStep === "judging" && judge && (
        <section className="umpire-dashboard">
          <div className="umpire-dashboard__topline">
            <div role="heading" aria-level={1}>
              {groupLabel(judge.grp)}
            </div>
            <button type="button" onClick={() => void signOut()}>
              Done
            </button>
          </div>
          <EventTournament
            key={judge.eventId}
            eventId={judge.eventId}
            tab="bracket"
            writer={{ role: "judge", code: judge.code, name: judge.name }}
            only={{ div: judge.div, grp: judge.grp }}
          />
        </section>
      )}

      {authStep === "otp" && (
        <section className="umpire-auth">
          <div className="umpire-auth__content">
            <p>Verification</p>
            <div role="heading" aria-level={1}>
              Enter Code
            </div>
            <p>Enter the 6-digit code sent to your phone.</p>
            <form onSubmit={submitOtp}>
<OtpBoxes
                value={otp}
                disabled={busy}
                onChange={(code) => {
                  setOtp(code);
                  setAuthError("");
                }}
              />
              {authError && <p className="umpire-auth__error">{authError}</p>}
              <div className="umpire-auth__actions">
                <Button type="submit" icon="right" disabled={busy || otp.length < 6}>
                  Sign in
                </Button>
                <button
                  className="umpire-text-button"
                  type="button"
                  onClick={() => {
                    setAuthStep("phone");
                    setOtp("");
                    setAuthError("");
                  }}
                >
                  Change number
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {signedIn && adminPage === "settings" && <SettingsPage />}

      {signedIn && adminPage === "events" && (
        <section className="umpire-dashboard">
          <div className="umpire-dashboard__topline">
            <div role="heading" aria-level={1}>
              Events
            </div>
            <Button onClick={openNewEvent}>
              <span aria-hidden="true">+ </span>Add event
            </Button>
          </div>
          {eventsError && <p className="ump-warn">{eventsError}</p>}

          <div className="umpire-event-list">
            {events.map((item) => (
              <article
                className="umpire-event-card"
                key={item.id}
                onClick={() => openEvent(item)}
                onKeyDown={(event) => openEventFromKeyboard(event, item)}
                role="button"
                tabIndex={0}
              >
                {/* Square photo at the card's height; the event's initial when there's none */}
                <div
                  className={item.image ? "umpire-event-card__thumb has-image" : "umpire-event-card__thumb"}
                  style={item.image ? { backgroundImage: `url("${item.image}")` } : undefined}
                  aria-hidden="true"
                >
                  {!item.image && <span>{item.title.trim().charAt(0) || "?"}</span>}
                </div>
                <div className="umpire-event-card__main">
                  <div className="umpire-event-card__top">
                    <div className="umpire-event-card__title">
                      <p>{item.title}</p>
                      {item.status === "Active" && (
                        <Chip type="soft" mode="success" size="sm">
                          Active
                        </Chip>
                      )}
                    </div>
                    <button
                      type="button"
                      className="row-open"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEvent(item);
                      }}
                      aria-label={`Open ${item.title}`}
                    >
                      <span className="row-open__chevron" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="umpire-event-card__meta">
                    {item.subtitle && <span className="umpire-event-card__subtitle">{item.subtitle}</span>}
                    <span>{item.dates}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {editingEvent && (
        <div className="event-editor-layer">
          <div className="event-editor">
            <div className="event-editor__header">
              <div>
                <Breadcrumb items={[{ label: "Back", onClick: () => setEditingEvent(null) }]} />
                <div role="heading" aria-level={1}>
                  {editingEvent.title || (isNewEvent ? "New event" : "Untitled event")}
                </div>
              </div>
            </div>

            <div className="event-editor__body">
              <EventNav
                sections={[
                  { id: "info", label: "Event info" },
                  {
                    id: "players",
                    label: "Players",
                    // only when there's someone to review
                    ...(newSignups > 0 && {
                      badge: newSignups,
                      badgeLabel: `${newSignups} new signup${newSignups === 1 ? "" : "s"}`,
                    }),
                  },
                  { id: "teams", label: "Teams" },
                  { id: "calcutta", label: "Calcutta" },
                  {
                    id: "bracket",
                    label: "Bracket",
                    disabled: editingEvent.status !== "Active",
                    hint: "Set the event to Active to open the bracket",
                  },
                  ...(db ? [{ id: "judges" as const, label: "Judges" }] : []),
                ]}
                value={eventTab}
                onChange={setEventTab}
              />

            <div className="event-editor__content">
              {eventTab === "info" && (
                <form className="event-info" onSubmit={saveEvent}>
                  <InfoSection title="Overview">
                  <div className="event-info-form">
                  <div className="event-info-main">
                    <div className="event-image-field">
                      <span>Cover photo</span>
                      <div className="event-image-row">
                        <div
                          className={[
                            "event-image-drop",
                            editingEvent.image && "has-image",
                            imageBusy && "is-busy",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={editingEvent.image ? { backgroundImage: `url("${editingEvent.image}")` } : undefined}
                        >
                          <label className="event-image-drop__target">
                            <span className="event-image-drop__icon" aria-hidden="true">
                              <UploadIcon />
                            </span>
                            <span className="visually-hidden">
                              {editingEvent.image ? "Replace cover photo" : "Upload cover photo"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="visually-hidden"
                              disabled={imageBusy}
                              onChange={(event) => {
                                void chooseImage(event.target.files?.[0]);
                                event.target.value = "";
                              }}
                            />
                          </label>
                          {editingEvent.image && (
                            <button
                              type="button"
                              className="event-image-drop__remove"
                              aria-label="Remove cover photo"
                              onClick={() => setEditingEvent({ ...editingEvent, image: "" })}
                            />
                          )}
                        </div>
                      </div>
                      {imageError && <p className="ump-warn">{imageError}</p>}
                    </div>

                    <div className="event-info-fields">
                      <label className="form-field">
                        <span>Event name</span>
                        <input
                          type="text"
                          placeholder="Event name"
                          maxLength={EVENT_NAME_MAX}
                          value={editingEvent.title}
                          onChange={(event) =>
                            setEditingEvent({ ...editingEvent, title: event.target.value.slice(0, EVENT_NAME_MAX) })
                          }
                          required
                        />
                        <small className="form-field__count" aria-live="polite">
                          {editingEvent.title.length}/{EVENT_NAME_MAX}
                        </small>
                      </label>
                      <label className="form-field">
                        <span>Subtitle</span>
                        <input
                          type="text"
                          placeholder="Subtitle"
                          maxLength={60}
                          value={editingEvent.subtitle}
                          onChange={(event) => setEditingEvent({ ...editingEvent, subtitle: event.target.value })}
                        />
                      </label>
                      <label className="form-field">
                        <span>Location</span>
                        <input
                          type="text"
                          placeholder="Location"
                          value={editingEvent.location}
                          onChange={(event) => setEditingEvent({ ...editingEvent, location: event.target.value })}
                        />
                      </label>
                      <DateRangePicker
                        label="Dates"
                        start={editingEvent.startDate}
                        end={editingEvent.endDate}
                        format={formatDates}
                        onChange={setDates}
                      />
                      <Dropdown
                        label="Status"
                        name="status"
                        options={eventStatuses}
                        value={editingEvent.status}
                        onChange={(status) => setEditingEvent({ ...editingEvent, status: status as EventStatus })}
                      />
                    </div>

                  </div>

                  <aside className="event-info-preview" aria-label="Home page preview">
                    <span className="event-info-preview__label">Home page preview</span>
                    <EventCard
                      title={editingEvent.title || "Event name"}
                      subtitle={editingEvent.subtitle}
                      dates={editingEvent.dates || "Dates"}
                      image={editingEvent.image || undefined}
                    />
                  </aside>
                  </div>
                  </InfoSection>

                  <EventDetailsSections
                    details={editingEvent.details}
                    startDate={editingEvent.startDate}
                    endDate={editingEvent.endDate}
                    onChange={(details) => setEditingEvent({ ...editingEvent, details })}
                  />

                  {/* Pinned to the bottom so Save is in reach from any section */}
                  <div className="event-info-savebar">
                    <Button type="submit" icon="check" disabled={busy || !hasChanges}>
                      {busy ? "Saving" : isNewEvent ? "Create event" : "Save changes"}
                    </Button>
                    {hasChanges && <small className="event-info-unsaved">Unsaved changes</small>}
                    {eventsError && <p className="ump-warn">{eventsError}</p>}
                  </div>
                </form>
              )}

              {eventTab === "players" && (
                <PlayersPanel
                  key={editingEvent.id}
                  event={editingEvent}
                  onChange={(patch) => {
                    setEditingEvent({ ...editingEvent, ...patch });
                    patchLocal(editingEvent.id, patch);
                  }}
                />
              )}

              {eventTab !== "info" && eventTab !== "players" && isNewEvent && (
                <div className="event-empty-state">
                  <div role="heading" aria-level={2}>
                    Save first
                  </div>
                  <p>Save the event info, then reopen it to add teams.</p>
                </div>
              )}

              {!isNewEvent &&
                (eventTab === "teams" ||
                  eventTab === "calcutta" ||
                  (eventTab === "bracket" && editingEvent.status === "Active")) && (
                  <EventTournament
                    key={editingEvent.id}
                    eventId={editingEvent.id}
                    tab={eventTab}
                    writer={{ role: "admin" }}
                  />
                )}

              {!isNewEvent && eventTab === "judges" && <JudgesPanel eventId={editingEvent.id} />}
            </div>
            </div>
          </div>
        </div>
      )}
      {confirmReplace && editingEvent && activeToReplace && (
        <Modal
          label={
            <Chip type="soft" mode="warning" size="sm">
              One active event
            </Chip>
          }
          title={`Replace ${activeToReplace.title} as the active event?`}
          body={
            <>
              Only one event can be active at a time. Making {editingEvent.title || "this event"} active will end{" "}
              {activeToReplace.title} and change it to <strong>Completed</strong>.
            </>
          }
          primary={{ label: `Make ${editingEvent.title || "this event"} active`, onClick: () => void saveEvent(undefined, true) }}
          tertiary={{ label: "Cancel" }}
          onClose={() => setConfirmReplace(false)}
        />
      )}
    </main>
  );
}
