# Lazem IT Ticketing System

Production-ready Next.js + Firebase IT ticketing system using Lazem brand colors.

## Features

- Firebase Authentication
- Firestore database
- Firebase Storage attachments
- Role-based access: Admin, IT Manager, IT Agent, Staff
- Ticket creation, assignment, status tracking, comments, internal notes
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

## Vercel deployment

1. Push this folder to GitHub.
2. In Vercel, click **Add New Project** and import the GitHub repository.
3. Add all `NEXT_PUBLIC_FIREBASE_*` environment variables.
4. Deploy.
5. Test login, ticket creation, role-based pages, attachments, and comments.

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
