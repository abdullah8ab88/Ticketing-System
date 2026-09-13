# Microsoft profile and department fix

The supplied Firestore rules allow a staff user to create users/{auth.uid}, but only an admin to update it. The onboarding page calls updateDoc, so a successful Microsoft login is followed by a denied department write. This is the cause identified in the supplied source; production rules and logs were not accessed.

The Auth observer and password registration also both wrote the profile independently. Registration now holds a barrier until its supplied profile has been created. Profile creation uses a transaction and leaves existing roles, activation and departments intact. Identity always comes from Firebase Auth UID. Emails are trimmed and lowercased for login, linking, reset, registration, profiles and ticket submission. Provider email is a fallback when Auth email is absent. No accounts are merged by email.

Owners can update only department fields, setting verification to pending, or normalize their existing email. Admin-only fields remain protected. Department selection no longer forces a redirect. An unsaved department can be selected on the ticket itself, without writing the profile. Creating a ticket still requires an active persisted user profile; a failed profile load shows an explicit retry screen. HR-only requests require a verified HR profile (legacy profiles without the verification field retain their prior behavior).

The existing browser confirm for profile deletion was replaced with a styled modal dialog. No alert(), prompt() or confirm() calls remain in app/components.

Local results: 7/7 regression tests passed; TypeScript and ESLint passed; full Next.js production build passed using synthetic local Firebase configuration and an ephemeral test key. No production credentials were used.

## Local verification

Run from this project's root:

```powershell
npm ci
node --test scripts/test-profile.cjs
npx tsc --noEmit
npm run lint
npm run build
```

The seven regression tests use mocked Firebase calls and cover first Microsoft login, repeat login with existing permissions, ordinary registration, its Auth callback race, provider email fallback, legacy email normalization and ticket creation with an unsaved department. They do not validate deployed Firebase rules or perform interactive Microsoft OAuth.

## Deployment

Copy the fixed source into your Lazem repository (not the unrelated CAD repository). Keep the existing .env.local and Vercel project/environment settings. Set FIREBASE_PROJECT_ID to the Firebase project used by that Vercel application. Deploy the rules before the web application; a Vercel-only deployment does not update Firestore rules.

```powershell
$FirebaseProjectId = 'YOUR_FIREBASE_PROJECT_ID'
npm ci
node --test scripts/test-profile.cjs
npx tsc --noEmit
npm run lint
npm run build
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project $FirebaseProjectId
npx vercel link
npx vercel --prod
```

Select the existing Lazem Vercel project when linking. Alternatively, if the repository is already linked to Vercel, commit and push these files after deploying the Firestore rules, using your existing deployment branch.

## Staging acceptance checks

1. First Microsoft login: exactly one users/{Firebase Auth UID} document, normalized email, staff role, active true, pending false.
2. Select a department: save succeeds, verification pending, selectionRequired false. Reload and confirm it persists.
3. Deny the department update in staging: the inline error offers continuing; /tickets/new remains usable. Select a ticket department and submit an ordinary support ticket. Do not disable ticket writes in this test.
4. Register with email/password, mixed-case email and Finance department: supplied name/department survive the Auth callback. Log out, log back in, reset password and create a ticket.
5. Repeat Microsoft login and link an existing password account using its password: UID and existing role/activation remain unchanged.
6. Verify in the Firebase rules simulator/emulator that owners cannot modify role/active/pending, update another user, verify their own department, or create a ticket for another UID. Pending HR must not create HR-only requests; verified HR should succeed.

The live Microsoft flow and rules simulator/emulator checks remain required: no Microsoft test credentials or production Firebase access were supplied.
