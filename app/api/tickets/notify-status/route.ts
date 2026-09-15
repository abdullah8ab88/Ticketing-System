import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/email';
import { buildEmailTemplate } from '@/lib/email-templates';
import type { TicketStatus } from '@/lib/types';

const STATUS_HEADINGS: Partial<Record<TicketStatus, string>> = {
  New: 'New ticket submitted',
  'In Progress': 'Your ticket is now being processed',
  Closed: 'Your ticket has been closed',
  Cancelled: 'Your ticket has been cancelled',
};

const STATUS_MESSAGES: Partial<Record<TicketStatus, string>> = {
  New: 'A new IT support ticket has been submitted and is awaiting review.',
  'In Progress': 'Our IT team has started working on your ticket.',
  Closed: 'Your ticket has been closed. If the issue comes back, feel free to open a new ticket.',
  Cancelled: 'Your ticket has been cancelled.',
};

export async function POST(req: NextRequest) {
  const { ticketId, status } = (await req.json()) as { ticketId?: string; status?: TicketStatus };

  if (!ticketId || !status) {
    return NextResponse.json({ error: 'ticketId and status are required' }, { status: 400 });
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
    requesterName: string;
    requesterEmail: string;
    assignedToName?: string;
  };

  if (!ticket.requesterEmail) {
    return NextResponse.json({ error: 'Ticket has no requester email' }, { status: 400 });
  }

  const heading = STATUS_HEADINGS[status] ?? 'Your ticket status has been updated';
  const message = STATUS_MESSAGES[status] ?? `Your ticket status is now "${status}".`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || '';

  const html = buildEmailTemplate(heading, message, {
    ticketNumber: ticket.ticketNo,
    title: ticket.title,
    priority: ticket.priority,
    category: ticket.category,
    requester: ticket.requesterName,
    status,
    assignedAgent: ticket.assignedToName,
    ticketUrl: `${appUrl}/tickets/${ticketId}`,
  });

  const recipients = [ticket.requesterEmail, process.env.ADMIN_NOTIFY_EMAIL].filter(
    (email): email is string => !!email
  );

  const result = await sendEmail({
    to: recipients,
    subject: `[${ticket.ticketNo}] ${heading}`,
    html,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
