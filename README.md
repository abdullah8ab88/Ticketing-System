# Lazem IT Ticketing System

Production-ready Next.js + Firebase IT ticketing system using Lazem brand colors.

## Features

- Firebase Authentication, including "Sign in with Microsoft" (Azure AD / Office 365 accounts)
- Firestore database
- Firebase Storage attachments
- Role-based access: Admin, IT Manager, IT Agent, Staff
- Ticket creation, assignment, status tracking, comments, internal notes
- Automatic email notifications to the ticket requester when a ticket's status changes (e.g. In Progress, Closed)
- Dashboard KPIs
- User management and activation
- Modern Lazem UI using Dark Teal `#274C5A`, Blue Gray `#86A7B2`, White, Dark Gray, and Gray50
- Vercel-ready deployment

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env.local
```

3. Create Firebase project and paste the Firebase web app config into `.env.local`.

4. Enable Firebase services:

- Authentication > Email/Password
- Firestore Database
- Storage

5. Deploy rules from this project or paste them manually:

- `firestore.rules`
- `storage.rules`

6. Run locally:

```bash
npm run dev
```

7. Open:

```text
http://localhost:3000
```

## Create first admin

Recommended simple path:

1. In Firebase Console > Authentication, create a user manually.
2. Copy the user's UID.
3. In Firestore, create document:

```text
users/{uid}
```

With fields:

```json
{
  "uid": "paste_uid_here",
  "name": "Lazem Admin",
  "email": "admin@lazem.sa",
  "role": "admin",
  "department": "IT",
  "pending": false,
  "createdAt": "server timestamp",
  "updatedAt": "server timestamp"
}
```

Alternative: use `npm run seed:admin` after adding Firebase Admin service account variables to `.env.local`.

## Enable "Sign in with Microsoft"

This lets any user sign in (and auto-register on first sign-in) with their company Microsoft/Azure AD account. It requires an Azure app registration plus enabling the Microsoft provider in Firebase — this part cannot be done from code.

1. In [Azure Portal](https://portal.azure.com) > Microsoft Entra ID > App registrations, click **New registration**.
   - Redirect URI (type: Web): `https://<your-firebase-project-id>.firebaseapp.com/__/auth/handler`
2. Under **Certificates & secrets**, create a new client secret and copy its value.
3. Copy the **Application (client) ID** from the app's Overview page.
4. In the Firebase Console > Authentication > Sign-in method, add **Microsoft** as a provider and paste the Application (client) ID and client secret from steps 2–3, then save.
5. (Optional) To restrict sign-in to only your organization's Azure AD tenant instead of any Microsoft account, copy your **Directory (tenant) ID** from Azure and set it as `NEXT_PUBLIC_MICROSOFT_TENANT_ID` in `.env.local`.
6. New users who sign in with Microsoft are created the same way as email/password sign-ups (role `staff`, subject to the `AUTO_ACTIVATE_NEW_USERS` flag in `lib/auth-context.tsx`).

## Ticket status email notifications

When an IT agent/manager/admin changes a ticket's status (e.g. to "In Progress" or "Closed") on the ticket details page, the requester automatically receives an email at `requesterEmail` with the new status and a link back to the ticket. This is powered by:

- `lib/email.ts` — Nodemailer SMTP transport
- `lib/email-templates.ts` — HTML email template
- `app/api/tickets/notify-status/route.ts` — server route that looks up the ticket via the Firebase Admin SDK and sends the email

To enable it, set the `SMTP_*` variables in `.env.local` (see `.env.example`) using your mail provider's SMTP credentials (e.g. Microsoft 365 SMTP, SendGrid, etc.), and set `NEXT_PUBLIC_APP_URL` to your deployed URL so the email's "Open Ticket" link resolves correctly. It also relies on the same `FIREBASE_ADMIN_*` variables used by `npm run seed:admin`, so those must be set as well.

## Vercel deployment

1. Push this folder to GitHub.
2. In Vercel, click **Add New Project** and import the GitHub repository.
3. Add all `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_ADMIN_*`, `SMTP_*`, `NEXT_PUBLIC_APP_URL`, and (if used) `NEXT_PUBLIC_MICROSOFT_TENANT_ID` environment variables.
4. Deploy.
5. Test login (including "Sign in with Microsoft"), ticket creation, role-based pages, attachments, comments, and status-change email notifications.

## Firebase data model

### users/{uid}

```ts
{
  uid: string,
  name: string,
  email: string,
  role: 'admin' | 'it_manager' | 'agent' | 'staff',
  department: string,
  pending: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### tickets/{ticketId}

```ts
{
  ticketNo: string,
  title: string,
  description: string,
  category: string,
  priority: 'Low' | 'Medium' | 'High' | 'Urgent',
  status: 'New' | 'Assigned' | 'In Progress' | 'Waiting for User' | 'Waiting for Vendor' | 'Resolved' | 'Closed' | 'Cancelled',
  department: string,
  requesterId: string,
  requesterName: string,
  requesterEmail: string,
  assignedToId?: string,
  assignedToName?: string,
  attachments: Array<{ name: string, url: string, path: string }>,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  closedAt?: Timestamp
}
```

### tickets/{ticketId}/comments/{commentId}

```ts
{
  authorId: string,
  authorName: string,
  visibility: 'public' | 'internal',
  body: string,
  createdAt: Timestamp
}
```

## Notes

- Staff users are created as pending until an admin activates them.
- Agents and managers can see operational tickets.
- Staff can only see their own tickets.
- Internal notes are hidden from staff in the UI and blocked by Firestore rules.
