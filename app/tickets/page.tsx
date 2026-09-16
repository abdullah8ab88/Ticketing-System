'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { Search } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { db } from '@/lib/firebase';
import type { Priority, Ticket, TicketStatus } from '@/lib/types';
import { formatDateTime, priorityClass, statusClass, statuses } from '@/lib/utils';
import { categoryLabels, priorityLabels, statusLabels, translateValue } from '@/lib/i18n';

export default function TicketsPage() {
  const router = useRouter();
  const { profile, isIT } = useAuth();
  const { t, lang } = useLanguage();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!profile?.uid) return;

    setErr('');

    /**
     * IMPORTANT:
     * IT users can see all tickets.
     * Staff users can see only tickets where requesterId == their UID.
     *
     * For staff, we avoid orderBy('createdAt') in Firestore query
     * to prevent Firebase composite index error.
     * Sorting is done locally below.
     */
    const ticketsQuery = isIT
      ? query(collection(db, 'tickets'), orderBy('createdAt', 'desc'))
      : query(
          collection(db, 'tickets'),
          where('requesterId', '==', profile.uid)
        );

    return onSnapshot(
      ticketsQuery,
      (snap) => {
        const data = snap.docs.map(
          (d) =>
            ({
              id: d.id,
              ...d.data(),
            }) as Ticket
        );

        const sorted = data.sort((a: any, b: any) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

        setTickets(sorted);
      },
      (error) => {
        console.error('Tickets snapshot error:', error);
        setErr(error.message || t('ticketsList.loadError'));
      }
    );
  }, [profile?.uid, isIT]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const s = search.toLowerCase();

      const searchableValues = isIT
        ? [t.ticketNo, t.title, t.requesterName, t.department, t.category]
        : [t.ticketNo, t.title, t.department, t.category];

      const matchesSearch =
        !s ||
        searchableValues.some((v) =>
          (v || '').toLowerCase().includes(s)
        );

      return (
        matchesSearch &&
        (!status || t.status === status) &&
        (!priority || t.priority === priority)
      );
    });
  }, [tickets, search, status, priority, isIT]);

  return (
    <ProtectedRoute>
      <AppShell
        title={isIT ? t('ticketsList.titleIT') : t('ticketsList.titleStaff')}
        subtitle={isIT ? t('ticketsList.subtitleIT') : t('ticketsList.subtitleStaff')}
      >
        <div className="card">
          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" />
              <input
                className="input pl-11 rtl:pl-4 rtl:pr-11"
                placeholder={t('ticketsList.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="input"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as TicketStatus | '')
              }
            >
              <option value="">{t('ticketsList.allStatuses')}</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{translateValue(statusLabels, s, lang)}</option>
              ))}
            </select>

            <select
              className="input"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as Priority | '')
              }
            >
              <option value="">{t('ticketsList.allPriorities')}</option>
              {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                <option key={p} value={p}>{translateValue(priorityLabels, p, lang)}</option>
              ))}
            </select>

            <Link href="/tickets/new" className="btn-primary whitespace-nowrap">
              {t('ticketsList.newTicket')}
            </Link>
          </div>

          {err && (
            <p className="mb-5 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
              {err}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3">{t('ticketsList.colTicket')}</th>
                  <th>{t('ticketsList.colCategory')}</th>
                  <th>{t('ticketsList.colStatus')}</th>
                  <th>{t('ticketsList.colPriority')}</th>
                  <th>{t('ticketsList.colCreated')}</th>

                  {isIT && (
                    <>
                      <th>{t('ticketsList.colRequester')}</th>
                      <th>{t('ticketsList.colAssigned')}</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.map((t2) => (
                  <tr
                    key={t2.id}
                    onClick={() => router.push(`/tickets/${t2.id}`)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="py-4">
                      <span className="font-semibold text-lazem-teal hover:underline">
                        {t2.ticketNo}
                      </span>
                      <div className="text-slate-500">{t2.title}</div>
                    </td>

                    <td className="text-slate-600">{translateValue(categoryLabels, t2.category, lang)}</td>

                    <td>
                      <span className={`badge ${statusClass(t2.status)}`}>
                        {translateValue(statusLabels, t2.status, lang)}
                      </span>
                    </td>

                    <td>
                      <span className={`badge ${priorityClass(t2.priority)}`}>
                        {translateValue(priorityLabels, t2.priority, lang)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap text-slate-600">
                      {formatDateTime(t2.createdAt)}
                    </td>

                    {isIT && (
                      <>
                        <td className="text-slate-600">
                          {t2.requesterName || t('ticketsList.unknown')}
                        </td>
                        <td className="text-slate-600">
                          {t2.assignedToName || t('ticketsList.unassigned')}
                        </td>
                      </>
                    )}
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={isIT ? 7 : 5}
                      className="py-10 text-center text-slate-500"
                    >
                      {t('ticketsList.noMatching')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
