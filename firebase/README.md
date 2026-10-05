# Connecting the site to Firebase

Until these steps are done the site still works, but everything is saved
only in the browser you are using.

The Umpire page uses the **demo sign-in** for now: one of the two admin
numbers (619-484-8005 or 678-200-4156) and code `123456`.

## 1. Create the project

1. Go to https://console.firebase.google.com and click **Create a project**.
   Any name works (e.g. "Reserve Pro-Am"). Google Analytics isn't needed.
2. The free **Spark** plan covers everything below.

## 2. Create the database

1. In the left menu open **Build → Firestore Database → Create database**.
2. Location: pick one in the US (e.g. `nam5`). This can't be changed later.
3. Choose **Start in production mode** and click **Create**.
4. Open the **Rules** tab, replace everything with the contents of
   `firebase/firestore.rules`, and click **Publish**.

> **Development only.** With the demo sign-in nobody is really signed in, so
> these rules let anyone who has the site's Firebase settings change events,
> teams, settings and judge codes. That's fine while building. Before a real
> event, real sign-in and stricter rules need to go in (step 5).

The database starts empty: sign in to the Umpire page and add your events
there. The home page shows "No upcoming events" until one is **Active** or
**Scheduled**.

### What's stored

| Where | Holds |
| --- | --- |
| `events/{id}` | Each event: name, subtitle, status (activating one ends the old Active one), location, dates, cover photo, and its venues, schedule and prizes |
| `events/{id}/items/…` | Everything inside an event, one document per piece: sign-ups, players, pros, teams, groups, Calcutta bids, scores, match times, bracket |
| `settings/main` | Umpire > Settings: league details, entry fee, payment methods, Calcutta defaults, default pros |
| `judges/{code}` | Scoring codes, one per group |

Cover photos are shrunk and stored inside the event itself, unless
Cloudinary is set up (below).

## Cover photos in Cloudinary (optional)

1. In Cloudinary open **Settings (gear) → Upload → Upload presets → Add
   upload preset**.
2. Set **Signing mode** to **Unsigned**, name it (e.g. `pro-am-events`) and
   set the folder to `pro-am/events`. To limit what can be uploaded with it,
   set **Allowed formats** to `jpg, png, webp, heic` and a maximum file size
   (e.g. 10 MB). Save.
3. Add to `.env.local` (and the host's environment variables), then restart:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
   VITE_CLOUDINARY_UPLOAD_PRESET=pro-am-events
   ```
   The cloud name is on the Cloudinary dashboard. Never put the **API
   secret** in the site.

New photos then upload to Cloudinary; photos already saved keep working.
An unsigned preset means anyone who finds its name could upload pictures to
that folder (not change or delete anything), which is why the limits in
step 2 help.

## 3. Point the site at the project

1. Open **Project settings** (gear icon, top left) → **General**, scroll to
   **Your apps** and click the **web** icon (`</>`). Give it a nickname;
   leave "Firebase Hosting" unticked; click **Register app**.
2. It shows a `firebaseConfig` block. In this folder, copy `.env.example` to
   `.env.local` and paste in `apiKey`, `authDomain`, `projectId` and `appId`.
   These are meant to be public; the rules are what protect the data.
3. Restart `pnpm dev`.

When the site is hosted (Vercel, Netlify, Figma Make…), add the same four
`VITE_FIREBASE_…` values to that host's environment variables.

## 4. Payments (Umpire > Settings > Payments)

Payment details live in `settings/main`. For Stripe, only the
**publishable** key (`pk_…`) goes in the page. The **secret** key (`sk_…`)
must never be in the site or the database.

## 5. Later, before a real event

- Turn on **Authentication → Sign-in method → Phone** so umpires sign in with
  a texted code. Sending texts may need the pay-as-you-go **Blaze** plan
  (it still has a free allowance).
- Swap in production rules: only admins change data, judges only their
  group's results, visitors only read and sign up. These get written together
  with the real sign-in.
