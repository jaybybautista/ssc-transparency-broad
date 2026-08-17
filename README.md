# SSC Virtual Board

This project now supports a cloud database using Firebase Firestore.

## Does this project use a database?

Yes, now it does:
- If Firebase environment variables are set, the app uses Firestore (cloud database).
- If they are not set, it automatically falls back to local sample data so the app still runs.

## Quick setup (no backend required)

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** in your project.
3. Copy `.env.example` to `.env`.
4. Fill the Firebase values in `.env`.
5. Run:

```bash
npm install
npm start
```

## What is saved in cloud database

Public content, shared between the public pages and the admin dashboard:
`announcements`, `events`, `resolutions`, `officers`, `meetings`,
`accomplishments`, `requestTypes`, `memorandums`, `narrativeReports`,
`constitution`.

Restricted collections:

| Collection | Contents | Who can read it |
|---|---|---|
| `resolutionVotes` | One vote per Google account per resolution | Anyone (tallies are public) |
| `tickets` | Student requests and grievances | The holder of the reference code; admins |
| `suggestions` | Anonymous suggestion box | Admins only |
| `subscribers` | Email alert sign-ups | Admins only |
| `admins` | The officer roster that unlocks the above | Each admin's own document |

## Firestore security rules

The real rules are in [`firestore.rules`](firestore.rules) — they are what
actually protects the data, since the Firebase API key ships inside the public
JavaScript bundle. Deploy them after any change:

```bash
npx firebase-tools deploy --only firestore:rules
```

## Admin access

Officers sign in at `/admin` with Google. An account can edit the board only if
its Firebase Auth uid has a document in the `admins` collection, which is also
what `firestore.rules` checks — so it holds against anything talking straight to
the database, not just against the UI. See [SECURITY.md](SECURITY.md).

## Paging

Each public collection loads `PAGE_SIZE` (60) documents at a time, newest first,
with a **Load older** button for the rest. `officers` and `requestTypes` have no
date field, so they are capped but not ordered — a Firestore `orderBy` silently
omits documents that lack the field it sorts on, which would have hidden all of
them.

## Further documentation

| File | Covers |
|---|---|
| [SECURITY.md](SECURITY.md) | Vote integrity, App Check, ticket privacy, granting admins access |
| [NOTIFICATIONS.md](NOTIFICATIONS.md) | Email alerts, calendar sync, dark mode, and the automation upgrade path |
| [STORAGE.md](STORAGE.md) | File uploads, size limits, and the Google Drive fallback |
