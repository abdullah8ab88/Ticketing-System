'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { AppShell } from '@/components/app-shell';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { db } from '@/lib/firebase';
import { addTicketComment, assignTicket, getAgents, updateTicketStatus } from '@/lib/ticket-service';
import type { CommentVisibility, Ticket, TicketComment, TicketStatus, UserProfile } from '@/lib/types';
import { formatDateTime, priorityClass, statusClass, statuses } from '@/lib/utils';
import { categoryLabels, departmentLabels, employeeDepartmentLabels, priorityLabels, roleLabels, statusLabels, translateValue } from '@/lib/i18n';

function translateDepartment(value: string, lang: 'en' | 'ar') {
  return departmentLabels[value]?.[lang] ?? employeeDepartmentLabels[value]?.[lang] ?? value;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
];

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
  const { t, lang } = useLanguage();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [agents, setAgents] = useState<UserProfile[]>([]);
  const [comment, setComment] = useState('');
  const [visibility, setVisibility] = useState<CommentVisibility>('public');
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [fileErr, setFileErr] = useState('');
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

  function handleCommentFiles(selectedFiles: FileList | null) {
    setFileErr('');

    const nextFiles = Array.from(selectedFiles || []);

    const invalidFile = nextFiles.find(
      (file) => !ALLOWED_FILE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE
    );

    if (invalidFile) {
      setCommentFiles([]);
      setFileErr(t('ticketDetails.errFileType'));
      return;
    }

    setCommentFiles(nextFiles);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !comment.trim()) return;
    setLoading(true);
    try {
      await addTicketComment({ ticketId: params.id, author: profile, body: comment.trim(), visibility, files: commentFiles });
      setComment('');
      setCommentFiles([]);
    } finally {
      setLoading(false);
    }
  }

  if (!ticket) {
    return <ProtectedRoute><AppShell title={t('nav.tickets')}><div className="card">{t('ticketDetails.loading')}</div></AppShell></ProtectedRoute>;
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
                  <p className="mt-2 text-sm text-slate-500">{t('ticketDetails.createdBy')} {ticket.requesterName} · {translateDepartment(ticket.department, lang)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`badge ${statusClass(ticket.status)}`}>{translateValue(statusLabels, ticket.status, lang)}</span>
                  <span className={`badge ${priorityClass(ticket.priority)}`}>{translateValue(priorityLabels, ticket.priority, lang)}</span>
                </div>
              </div>
              <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-700 whitespace-pre-wrap">{ticket.description}</div>
              {!!ticket.attachments?.length && (
                <div className="mt-6">
                  <h3 className="font-bold text-lazem-teal">{t('ticketDetails.attachments')}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ticket.attachments.map((a) => <a key={a.path} href={a.url} target="_blank" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-lazem-teal hover:bg-slate-50">{a.name}</a>)}
                  </div>
                </div>
              )}
              {!!ticket.people?.length && (
                <div className="mt-6">
                  <h3 className="font-bold text-lazem-teal">{translateValue(categoryLabels, ticket.category, lang)} {t('newTicket.detailsSuffix')}</h3>
                  <div className="mt-3 space-y-4">
                    {ticket.people.map((person, index) => (
                      <div key={index} className="rounded-3xl bg-slate-50 p-5">
                        {ticket.people!.length > 1 && (
                          <div className="mb-3 text-xs font-bold uppercase text-slate-400">{t('ticketDetails.person')} {index + 1}</div>
                        )}
                        <dl className="grid gap-3 text-sm sm:grid-cols-2">
                          <OnboardingRow label={t('newTicket.firstNameAr')} value={person.firstNameAr} />
                          <OnboardingRow label={t('newTicket.lastNameAr')} value={person.lastNameAr} />
                          <OnboardingRow label={t('newTicket.firstNameEn')} value={person.firstNameEn} />
                          <OnboardingRow label={t('newTicket.lastNameEn')} value={person.lastNameEn} />
                          <OnboardingRow label={t('newTicket.jobTitleAr')} value={person.jobTitleAr} />
                          <OnboardingRow label={t('newTicket.jobTitleEn')} value={person.jobTitleEn} />
                          <OnboardingRow label={t('newTicket.mobile')} value={person.mobile} />
                          <OnboardingRow label={t('newTicket.personalEmail')} value={person.personalEmail} />
                        </dl>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="text-xl font-bold text-lazem-teal">{t('ticketDetails.timeline')}</h3>
              <div className="mt-5 space-y-4">
                {comments.filter((c) => isIT || c.visibility === 'public').map((c) => (
                  <div key={c.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-lazem-teal">{c.authorName}</div>
                      <span className="badge bg-white text-slate-500">{c.visibility === 'public' ? t('ticketDetails.publicComment') : t('ticketDetails.internalNote')}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{c.body}</p>
                    {c.translatedBody && (
                      <p className="mt-2 border-t border-slate-200 pt-2 text-sm italic text-slate-500 whitespace-pre-wrap">
                        {c.translatedBody}
                      </p>
                    )}
                    {!!c.attachments?.length && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {c.attachments.map((a) => (
                          <a
                            key={a.path}
                            href={a.url}
                            target="_blank"
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-lazem-teal hover:bg-slate-50"
                          >
                            {a.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={submitComment} className="mt-6">
                <textarea className="input min-h-28" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('ticketDetails.addCommentPlaceholder')} />
                <div className="mt-3">
                  <label className="label">{t('ticketDetails.attachments')}</label>
                  <input
                    className="input"
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.webp,.pdf"
                    onChange={(e) => handleCommentFiles(e.target.files)}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {t('ticketDetails.attachmentsHint')}
                  </p>
                  {fileErr && <p className="mt-2 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{fileErr}</p>}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  {isIT ? (
                    <select className="input max-w-xs" value={visibility} onChange={(e) => setVisibility(e.target.value as CommentVisibility)}>
                      <option value="public">{t('ticketDetails.publicComment')}</option>
                      <option value="internal">{t('ticketDetails.internalNote')}</option>
                    </select>
                  ) : <span />}
                  <button disabled={loading} className="btn-primary">{t('ticketDetails.addComment')}</button>
                </div>
              </form>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-bold text-lazem-teal">{t('ticketDetails.actions')}</h3>
              {isIT && (
                <>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <label className="label">{t('ticketDetails.assignTo')}</label>
                    {profile && ticket.assignedToId !== profile.uid && (
                      <button
                        type="button"
                        onClick={() => assignTicket(ticket.id, profile)}
                        className="text-xs font-semibold text-lazem-teal hover:underline"
                      >
                        {t('ticketDetails.assignToMe')}
                      </button>
                    )}
                  </div>
                  <select className="input" value={ticket.assignedToId || ''} onChange={(e) => {
                    const agent = [...agents, TEAM_ASSIGNEE].find((a) => a.uid === e.target.value);
                    if (agent) assignTicket(ticket.id, agent);
                  }}>
                    <option value="">{t('ticketDetails.unassigned')}</option>
                    {agents.map((a) => <option key={a.uid} value={a.uid}>{a.name} · {roleLabels[a.role]?.[lang] ?? a.role}</option>)}
                    <option value={TEAM_ASSIGNEE.uid}>{TEAM_ASSIGNEE.name}</option>
                  </select>
                  <label className="label mt-5">{t('ticketDetails.status')}</label>
                  <select className="input" value={ticket.status} onChange={(e) => updateTicketStatus(ticket.id, e.target.value as TicketStatus)}>
                    {statuses.map((s) => <option key={s} value={s}>{translateValue(statusLabels, s, lang)}</option>)}
                  </select>
                </>
              )}
              {!isIT && <p className="mt-3 text-sm text-slate-500">{t('ticketDetails.itWillUpdate')}</p>}
            </div>

            <div className="card">
              <h3 className="text-lg font-bold text-lazem-teal">{t('ticketDetails.details')}</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <Row label={t('ticketDetails.category')} value={translateValue(categoryLabels, ticket.category, lang)} />
                <Row label={t('ticketDetails.department')} value={translateDepartment(ticket.department, lang)} />
                <Row label={t('ticketDetails.requester')} value={ticket.requesterName} />
                <Row label={t('ticketDetails.assigned')} value={ticket.assignedToName || t('ticketDetails.unassigned')} />
                <Row label={t('ticketDetails.email')} value={ticket.requesterEmail} />
                <Row label={t('ticketDetails.created')} value={formatDateTime(ticket.createdAt)} />
                <Row label={t('ticketDetails.lastUpdated')} value={formatDateTime(ticket.updatedAt)} />
              </dl>
              <Link href="/tickets" className="btn-secondary mt-6 w-full">{t('ticketDetails.backToTickets')}</Link>
            </div>
          </aside>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><dt className="text-slate-500">{label}</dt><dd className="text-right font-semibold text-slate-700 rtl:text-left">{value}</dd></div>;
}

function OnboardingRow({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt><dd className="mt-1 font-semibold text-slate-700">{value}</dd></div>;
}
