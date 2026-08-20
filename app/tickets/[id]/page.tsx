'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { AppShell } from '@/components/app-shell';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { addTicketComment, assignTicket, getAgents, updateTicketStatus } from '@/lib/ticket-service';
import type { CommentVisibility, Ticket, TicketComment, TicketStatus, UserProfile } from '@/lib/types';
import { priorityClass, statusClass, statuses } from '@/lib/utils';

const TEAM_ASSIGNEE: UserProfile = {
  uid: 'team-abdullah-rashed',
  name: 'Abdullah & Rashed',
  email: '',
  role: 'agent',
  department: 'IT',
  active: true,
  pending: false,
};

export default function TicketDetailsPage() {
  const params = useParams<{ id: string }>();
  const { profile, isIT } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [agents, setAgents] = useState<UserProfile[]>([]);
  const [comment, setComment] = useState('');
  const [visibility, setVisibility] = useState<CommentVisibility>('public');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    const unsubTicket = onSnapshot(doc(db, 'tickets', params.id), (snap) => {
      if (snap.exists()) setTicket({ id: snap.id, ...snap.data() } as Ticket);
    });
    const commentsRef = collection(db, 'tickets', params.id, 'comments');
    const q = isIT ? query(commentsRef) : query(commentsRef, where('visibility', '==', 'public'));
    const unsubComments = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TicketComment);
      rows.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
      setComments(rows);
    });
    return () => { unsubTicket(); unsubComments(); };
  }, [params.id, isIT]);

  useEffect(() => {
    if (isIT) getAgents().then(setAgents).catch(() => setAgents([]));
  }, [isIT]);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !comment.trim()) return;
    setLoading(true);
    try {
      await addTicketComment({ ticketId: params.id, author: profile, body: comment.trim(), visibility });
      setComment('');
    } finally {
      setLoading(false);
    }
  }

  if (!ticket) {
    return <ProtectedRoute><AppShell title="Ticket"><div className="card">Loading ticket...</div></AppShell></ProtectedRoute>;
  }

  return (
    <ProtectedRoute>
      <AppShell title={ticket.ticketNo} subtitle={ticket.title}>
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <div className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-lazem-teal">{ticket.title}</h2>
                  <p className="mt-2 text-sm text-slate-500">Created by {ticket.requesterName} · {ticket.department}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`badge ${statusClass(ticket.status)}`}>{ticket.status}</span>
                  <span className={`badge ${priorityClass(ticket.priority)}`}>{ticket.priority}</span>
                </div>
              </div>
              <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-700 whitespace-pre-wrap">{ticket.description}</div>
              {!!ticket.attachments?.length && (
                <div className="mt-6">
                  <h3 className="font-bold text-lazem-teal">Attachments</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ticket.attachments.map((a) => <a key={a.path} href={a.url} target="_blank" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-lazem-teal hover:bg-slate-50">{a.name}</a>)}
                  </div>
                </div>
              )}
              {ticket.onboarding && (
                <div className="mt-6">
                  <h3 className="font-bold text-lazem-teal">Onboarding details</h3>
                  <dl className="mt-3 grid gap-3 rounded-3xl bg-slate-50 p-5 text-sm sm:grid-cols-2">
                    <OnboardingRow label="First name (Arabic)" value={ticket.onboarding.firstNameAr} />
                    <OnboardingRow label="Last name (Arabic)" value={ticket.onboarding.lastNameAr} />
                    <OnboardingRow label="First name (English)" value={ticket.onboarding.firstNameEn} />
                    <OnboardingRow label="Last name (English)" value={ticket.onboarding.lastNameEn} />
                    <OnboardingRow label="Job title (Arabic)" value={ticket.onboarding.jobTitleAr} />
                    <OnboardingRow label="Job title (English)" value={ticket.onboarding.jobTitleEn} />
                    <OnboardingRow label="Mobile number" value={ticket.onboarding.mobile} />
                    <OnboardingRow label="Personal email" value={ticket.onboarding.personalEmail} />
                  </dl>
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="text-xl font-bold text-lazem-teal">Timeline & comments</h3>
              <div className="mt-5 space-y-4">
                {comments.filter((c) => isIT || c.visibility === 'public').map((c) => (
                  <div key={c.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-lazem-teal">{c.authorName}</div>
                      <span className="badge bg-white text-slate-500">{c.visibility}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={submitComment} className="mt-6">
                <textarea className="input min-h-28" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment..." />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  {isIT ? (
                    <select className="input max-w-xs" value={visibility} onChange={(e) => setVisibility(e.target.value as CommentVisibility)}>
                      <option value="public">Public comment</option>
                      <option value="internal">Internal IT note</option>
                    </select>
                  ) : <span />}
                  <button disabled={loading} className="btn-primary">Add comment</button>
                </div>
              </form>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-bold text-lazem-teal">Actions</h3>
              {isIT && (
                <>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <label className="label">Assign to</label>
                    {profile && ticket.assignedToId !== profile.uid && (
                      <button
                        type="button"
                        onClick={() => assignTicket(ticket.id, profile)}
                        className="text-xs font-semibold text-lazem-teal hover:underline"
                      >
                        Assign to me
                      </button>
                    )}
                  </div>
                  <select className="input" value={ticket.assignedToId || ''} onChange={(e) => {
                    const agent = [...agents, TEAM_ASSIGNEE].find((a) => a.uid === e.target.value);
                    if (agent) assignTicket(ticket.id, agent);
                  }}>
                    <option value="">Unassigned</option>
                    {agents.map((a) => <option key={a.uid} value={a.uid}>{a.name} · {a.role.replace('_', ' ')}</option>)}
                    <option value={TEAM_ASSIGNEE.uid}>{TEAM_ASSIGNEE.name}</option>
                  </select>
                  <label className="label mt-5">Status</label>
                  <select className="input" value={ticket.status} onChange={(e) => updateTicketStatus(ticket.id, e.target.value as TicketStatus)}>
                    {statuses.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </>
              )}
              {!isIT && <p className="mt-3 text-sm text-slate-500">The IT team will update assignment and status.</p>}
            </div>

            <div className="card">
              <h3 className="text-lg font-bold text-lazem-teal">Details</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <Row label="Category" value={ticket.category} />
                <Row label="Department" value={ticket.department} />
                <Row label="Requester" value={ticket.requesterName} />
                <Row label="Assigned" value={ticket.assignedToName || 'Unassigned'} />
                <Row label="Email" value={ticket.requesterEmail} />
              </dl>
              <Link href="/tickets" className="btn-secondary mt-6 w-full">Back to tickets</Link>
            </div>
          </aside>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><dt className="text-slate-500">{label}</dt><dd className="text-right font-semibold text-slate-700">{value}</dd></div>;
}

function OnboardingRow({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt><dd className="mt-1 font-semibold text-slate-700">{value}</dd></div>;
}
