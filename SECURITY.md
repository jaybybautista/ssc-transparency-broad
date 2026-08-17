# Vote security — what is done, and what you must do

## The core problem

The Firebase API key is compiled into the public JavaScript bundle. Anyone can
open DevTools, copy it, and write a script that talks straight to your Firestore
database. **Nothing written in React can stop that.** Only Firestore security
rules, which run on Google's servers, decide what a request is allowed to do.

So the voting feature is split in two:

| Layer | Where it runs | What it does |
|---|---|---|
| React UI | Browser | Convenience — sign-in button, showing your vote, hiding buttons |
| `firestore.rules` | Google's servers | **The actual enforcement** |
| App Check | Google's servers | Blocks requests that don't come from your real site |

---

## 1. Deploy the security rules — REQUIRED

Until you do this, **the voting protection is not active.** The rules file is in
the repo at `firestore.rules`.

```bash
npm install -g firebase-tools
```

```bash
firebase login
```

```bash
firebase use --add
```

```bash
firebase deploy --only firestore:rules
```

Or paste the contents of `firestore.rules` into
**Firebase Console → Firestore Database → Rules → Publish**.

### What the rules enforce

Each vote is stored as one document whose id is `<resolutionId>__<uid>`, and the
rules require that id to be built from *the caller's own* uid. That single
constraint means:

- **No double voting** — a second vote lands on the same document id and replaces
  the first instead of adding to the tally.
- **No voting as someone else** — you cannot write a document whose id contains a
  uid that isn't yours.
- **No fake emails** — the stored email must match the signed-in account's email.
- **No editing other people's votes** — delete is restricted to your own uid.
- **No votes on made-up resolutions** — the resolution document must exist.

This holds against a script hitting the API directly, not just against the UI.

---

## 2. Turn on Google sign-in — REQUIRED

**Firebase Console → Authentication → Sign-in method → Google → Enable.**

Then under **Authentication → Settings → Authorized domains**, add the domain you
host the site on (`localhost` is already there for development).

---

## 3. Turn on App Check — recommended

This is the answer to "third-party apps or tools that boost votes". App Check
attests that a request came from your real website, and rejects everything else.

1. **Firebase Console → App Check → Register** your web app with
   **reCAPTCHA v3**, and copy the site key.
2. Add it to `.env`:
   ```
   REACT_APP_RECAPTCHA_SITE_KEY=your_site_key_here
   ```
3. In **App Check → APIs**, set **Cloud Firestore** to **Enforced**.

Do step 3 last, and only after the site works with the key in place — enforcing
before the key is deployed will block your own app.

---

## 4. Restrict to school accounts — optional but strongly recommended

Right now any Google account can vote, which is what lets someone register throwaway
Gmail addresses. Limiting voting to your school's Google Workspace domain shuts
that down almost entirely.

**In `.env`** (controls the UI):
```
REACT_APP_VOTE_ALLOWED_DOMAINS=psu.edu.ph
```

**In `firestore.rules`** (the part that actually enforces it) — uncomment the
`allowedVoteDomains` block near the top and swap `isEligibleVoter()` to the
domain-checking version, then redeploy.

Both must be set. The `.env` value alone is only a friendlier error message.

---

## Student tickets & the anonymous suggestion box

These carry personal information — names, emails, and formal grievances — so they
are the one part of the app where reads are genuinely locked down.

| Operation | Who can do it |
|---|---|
| Submit a ticket | Anyone, no sign-in (that's the point) |
| Read **one** ticket by its reference code | Anyone holding the code |
| **List** all tickets | Verified admins only |
| Reply / change status / delete | Verified admins only |
| Submit an anonymous suggestion | Anyone, no sign-in |
| Read suggestions | Verified admins only |

The reference code **is** the document id, and it is generated from
`crypto.getRandomValues` (8 characters from a 32-symbol alphabet ≈ 10¹² codes).
That is what makes the split possible: a single-document `get` is safe because
you must already know the code, while `list` — which would let someone enumerate
every grievance — is denied to everyone but admins.

The suggestion box is **write-only for students**. They cannot read back even
their own submission, and the rules reject any document containing `uid`,
`email`, `name`, `studentName` or `studentEmail`. There is no identifier stored,
so nothing can tie a suggestion to a person — including for you.

### Granting an officer access to the inbox

Reading tickets requires a Google account listed in the `admins` collection. The
localStorage admin login cannot be verified by Firestore, so it is not enough.

1. The officer opens **Admin → Student Tickets** and clicks
   **Sign in with Google** once. This creates their Firebase Auth account.
2. In the Firebase console go to **Authentication → Users** and copy that
   account's **User UID**.
3. Go to **Firestore Database → Start collection** → collection id `admins`.
4. Add a document whose **Document ID is exactly that UID**. The fields don't
   matter; `email` (string) is useful for your own reference.
5. The officer reloads the page — the inbox opens.

Repeat step 3–4 for each officer. Remove the document to revoke access
immediately. The app can never write to `admins`, so access cannot be
self-granted from the browser.

## Email alert subscribers

The `subscribers` collection holds student email addresses, one document per
address (the document id **is** the lowercased address, which makes the roster
self-deduplicating).

| Operation | Who can do it |
|---|---|
| Subscribe / update topics | Anyone, no sign-in |
| Unsubscribe | Anyone who knows the address |
| Read or list the roster | Verified admins only |

Reading is the part that matters, and it is admin-only — nobody can harvest the
list of student emails, and officers only ever send with addresses in **BCC**.

The trade-off of having no server: create, update and delete have to be open,
because a student subscribing is not signed in. So somebody who knew a
classmate's address could subscribe or unsubscribe them from announcements. The
rules cap every field's length and reject unknown fields, so the collection
cannot be used as free storage, and the worst outcome is a nuisance rather than a
disclosure. Closing it properly means the same Cloud Function that would send the
mail automatically — see NOTIFICATIONS.md.

The topic choices are also cached in the student's own `localStorage`, so the
panel can show a returning student what they signed up for without the board
having to expose the roster.

## Known gap: admin writes are still unprotected

The admin login (`admin` / `ssc2026`) is checked in the browser and remembered as
a `localStorage` flag. Firestore has no way to verify that, so the content
collections — announcements, resolutions, officers, meetings, and so on — are
still writable by anyone who extracts the API key.

**Voting is safe. Content is not.**

Closing this gap means having admins sign in through Firebase Auth so the rules
can check a real identity. The usual approach:

1. Create admin accounts in **Authentication → Users**.
2. Set a custom claim on them (`{ admin: true }`) with the Firebase Admin SDK,
   or keep an `admins/{uid}` collection.
3. Change the content rules from `allow write: if true;` to
   `allow write: if isAdmin();`.
4. Replace the hardcoded login screen with a Firebase sign-in.

Happy to implement that — it's a self-contained follow-up.
