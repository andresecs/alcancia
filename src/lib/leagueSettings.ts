import { useCallback, useEffect, useState } from "react";
import type { Person } from "./registration";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, errorText } from "./firebase";

// League-wide settings from the Umpire Settings page. New events start from
// these; each event can still change its own Calcutta rules.

export type CalcuttaDefaults = {
  minBid: number;
  minIncrement: number;
  guestBidding: boolean;
  requireApproval: boolean;
  payout: { champion: number; finalist: number; semifinalist: number };
};

export type PaymentSettings = {
  // Only the publishable key lives here. The Stripe secret key must never be
  // in the site: it goes in the server's secrets (see firebase/README.md).
  stripe: { enabled: boolean; publishableKey: string; accountEmail: string };
  ach: { enabled: boolean; bankName: string; accountHolder: string; routingNumber: string; accountNumber: string };
  venmo: { enabled: boolean; handle: string };
  zelle: { enabled: boolean; contact: string };
  check: { enabled: boolean; payableTo: string; mailTo: string };
  instructions: string; // shown to players when they're asked to pay
};

export type LeagueSettings = {
  league: { name: string; contactEmail: string; entryFee: number };
  payments: PaymentSettings;
  calcutta: CalcuttaDefaults;
  defaultPros: Person[];
};

export const defaultLeagueSettings: LeagueSettings = {
  league: { name: "Reserve Pro-Am", contactEmail: "", entryFee: 1000 },
  payments: {
    stripe: { enabled: false, publishableKey: "", accountEmail: "" },
    ach: { enabled: false, bankName: "", accountHolder: "", routingNumber: "", accountNumber: "" },
    venmo: { enabled: false, handle: "" },
    zelle: { enabled: false, contact: "" },
    check: { enabled: false, payableTo: "", mailTo: "" },
    instructions: "",
  },
  calcutta: {
    minBid: 500,
    minIncrement: 250,
    guestBidding: false,
    requireApproval: true,
    payout: { champion: 50, finalist: 25, semifinalist: 12.5 },
  },
  defaultPros: [],
};

// Fill in anything missing from an older or partial save
const withDefaults = (s: Partial<LeagueSettings> | null | undefined): LeagueSettings => ({
  league: { ...defaultLeagueSettings.league, ...s?.league },
  payments: {
    ...defaultLeagueSettings.payments,
    ...s?.payments,
    stripe: { ...defaultLeagueSettings.payments.stripe, ...s?.payments?.stripe },
    ach: { ...defaultLeagueSettings.payments.ach, ...s?.payments?.ach },
    venmo: { ...defaultLeagueSettings.payments.venmo, ...s?.payments?.venmo },
    zelle: { ...defaultLeagueSettings.payments.zelle, ...s?.payments?.zelle },
    check: { ...defaultLeagueSettings.payments.check, ...s?.payments?.check },
  },
  calcutta: {
    ...defaultLeagueSettings.calcutta,
    ...s?.calcutta,
    payout: { ...defaultLeagueSettings.calcutta.payout, ...s?.calcutta?.payout },
  },
  defaultPros: s?.defaultPros ?? [],
});

// A copy kept in this browser so new events can start from the league's
// defaults without waiting for the database.
const cacheKey = "reserve-league-settings";

export function cachedLeagueSettings(): LeagueSettings {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(cacheKey);
      if (raw) return withDefaults(JSON.parse(raw));
    }
  } catch {
    // fall back to the defaults
  }
  return defaultLeagueSettings;
}

const writeCache = (s: LeagueSettings) => {
  try {
    localStorage.setItem(cacheKey, JSON.stringify(s));
  } catch {
    // storage full or blocked
  }
};

// Loads and saves the league settings: Firestore (settings/main) when
// connected, otherwise this browser.
export function useLeagueSettings() {
  const [settings, setSettings] = useState<LeagueSettings | null>(db ? null : cachedLeagueSettings());
  const [error, setError] = useState("");

  useEffect(() => {
    if (!db) return;
    void (async () => {
      let stored: Partial<LeagueSettings> | undefined;
      try {
        stored = (await getDoc(doc(db, "settings", "main"))).data() as Partial<LeagueSettings> | undefined;
      } catch (e) {
        setError(errorText(e));
        setSettings(cachedLeagueSettings());
        return;
      }
      const loaded = withDefaults(stored ?? cachedLeagueSettings());
      writeCache(loaded);
      setSettings(loaded);
    })();
  }, []);

  const save = useCallback(async (next: LeagueSettings) => {
    writeCache(next);
    if (db) {
      try {
        await setDoc(doc(db, "settings", "main"), next);
      } catch (e) {
        setError(`Not saved: ${errorText(e)}`);
        return false;
      }
    }
    setError("");
    setSettings(next);
    return true;
  }, []);

  return { settings, save, error };
}
