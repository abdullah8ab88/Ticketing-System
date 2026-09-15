import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { normalizeEmail } from './user-profile';
import { auth, db, storage } from './firebase';
import type { Attachment, CommentVisibility, PersonDetails, Priority, Ticket, TicketStatus, UserProfile } from './types';

export async function uploadTicketFiles(ticketId: string, files: File[]): Promise<Attachment[]> {
  const uploaded: Attachment[] = [];
  for (const file of files) {
    const path = `ticket-attachments/${ticketId}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    uploaded.push({ name: file.name, url, path });
  }
  return uploaded;
}

export async function createTicket(input: {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  department: string;
  files: File[];
  requester: UserProfile;
  people?: PersonDetails[];
}) {
  if (!auth.currentUser || auth.currentUser.uid !== input.requester.uid) throw new Error('Please sign in again.');
  const ticketNo = `IT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const ref = await addDoc(collection(db, 'tickets'), {
    ticketNo,
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority,
    department: input.department,
    status: 'New' satisfies TicketStatus,
    requesterId: auth.currentUser.uid,
    requesterName: input.requester.name,
    requesterEmail: normalizeEmail(input.requester.email),
    attachments: [],
    ...(input.people?.length ? { people: input.people } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const attachments = input.files.length ? await uploadTicketFiles(ref.id, input.files) : [];
  if (attachments.length) await updateDoc(ref, { attachments, updatedAt: serverTimestamp() });

  await addDoc(collection(db, 'tickets', ref.id, 'comments'), {
    authorId: input.requester.uid,
    authorName: input.requester.name,
    visibility: 'public' satisfies CommentVisibility,
    body: 'Ticket created.',
    createdAt: serverTimestamp()
  });

  fetch('/api/tickets/notify-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId: ref.id, status: 'New' })
  }).catch((error) => console.error('Ticket creation email notification failed', error));

  return ref.id;
}

async function translateText(text: string): Promise<{ translatedText: string; targetLang: string } | null> {
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Comment translation failed', error);
    return null;
  }
}

export async function addTicketComment(input: {
  ticketId: string;
  author: UserProfile;
  body: string;
  visibility: CommentVisibility;
  files?: File[];
}) {
  const attachments = input.files?.length ? await uploadTicketFiles(input.ticketId, input.files) : [];
  const translation = await translateText(input.body);

  await addDoc(collection(db, 'tickets', input.ticketId, 'comments'), {
    authorId: input.author.uid,
    authorName: input.author.name,
    body: input.body,
    visibility: input.visibility,
    ...(attachments.length ? { attachments } : {}),
    ...(translation ? { translatedBody: translation.translatedText, translatedLang: translation.targetLang } : {}),
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, 'tickets', input.ticketId), { updatedAt: serverTimestamp() });

  fetch('/api/tickets/notify-comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticketId: input.ticketId,
      authorId: input.author.uid,
      authorName: input.author.name,
      body: input.body,
      visibility: input.visibility
    })
  }).catch((error) => console.error('Ticket comment email notification failed', error));
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  await updateDoc(doc(db, 'tickets', ticketId), {
    status,
    updatedAt: serverTimestamp(),
    ...(status === 'Closed' ? { closedAt: serverTimestamp() } : {})
  });

  fetch('/api/tickets/notify-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId, status })
  }).catch((error) => console.error('Ticket status email notification failed', error));
}

export async function assignTicket(ticketId: string, agent: UserProfile) {
  await updateDoc(doc(db, 'tickets', ticketId), {
    assignedToId: agent.uid,
    assignedToName: agent.name,
    updatedAt: serverTimestamp()
  });
}

export async function getAgents() {
  const q = query(
    collection(db, 'users'),
    where('role', 'in', ['agent', 'it_manager', 'admin'])
  );

  const snap = await getDocs(q);

  return snap.docs
    .map((d) => d.data() as UserProfile)
    .filter((u) => (u.active ?? u.pending === false) && u.pending === false);
}

export async function getRecentTickets(max = 5) {
  const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ticket);
}
