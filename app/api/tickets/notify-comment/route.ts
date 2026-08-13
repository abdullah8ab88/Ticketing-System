import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/email';
import { buildEmailTemplate } from '@/lib/email-templates';
import type { CommentVisibility } from '@/lib/types';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(req: NextRequest) {
  const { ticketId, authorId, authorName, body, visibility } = (await req.json()) as {
    ticketId?: string;
    authorId?: string;
    authorName?: string;
    body?: string;
    visibility?: CommentVisibility;
  };

  if (!ticketId || !authorName || !body || !visibility) {
    return NextResponse.json({ error: 'ticketId, authorName, body and visibility are required' }, { status: 400 });
  }

  const snap = await adminDb.collection('tickets').doc(ticketId).get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  const ticket = snap.data() as {
    ticketNo: string;
    title: string;
    priority: string;
    category: string;
    requesterId: string;
    requesterName: string;
    requesterEmail: string;
    assignedToName?: string;
    status: string;
  };

  const heading = visibility === 'internal' ? 'New internal note added' : 'New comment on your ticket';
  const message = `${escapeHtml(authorName)} wrote:<br/><br/>"${escapeHtml(body)}"`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || '';

  const html = buildEmailTemplate(heading, message, {
    ticketNumber: ticket.ticketNo,
    title: ticket.title,
    priority: ticket.priority,
    category: ticket.category,
    requester: ticket.requesterName,
    status: ticket.status,
    assignedAgent: ticket.assignedToName,
    ticketUrl: `${appUrl}/tickets/${ticketId}`,
  });

  const recipients = new Set<string>();
  if (process.env.ADMIN_NOTIFY_EMAIL) recipients.add(process.env.ADMIN_NOTIFY_EMAIL);
  if (visibility === 'public' && ticket.requesterEmail && authorId !== ticket.requesterId) {
    recipients.add(ticket.requesterEmail);
  }

  if (!recipients.size) {
    return NextResponse.json({ success: true, skipped: true });
  }

  const result = await sendEmail({
    to: Array.from(recipients),
    subject: `[${ticket.ticketNo}] ${heading}`,
    html,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
