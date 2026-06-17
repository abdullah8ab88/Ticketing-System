'use client';

import Link from 'next/link';
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
import { db } from '@/lib/firebase';
import type { Priority, Ticket, TicketStatus } from '@/lib/types';
import { priorityClass, statusClass, statuses } from '@/lib/utils';

export default function TicketsPage() {
  const { profile, isIT } = useAuth();

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
        setErr(error.message || 'Could not load tickets.');
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
        title={isIT ? 'Tickets' : 'My Tickets'}
        subtitle={
          isIT
            ? 'Search, filter, assign, and resolve IT tickets'
            : 'Track your submitted IT support requests'
        }
      >
        <div className="card">
          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-11"
                placeholder="Search tickets..."
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
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <select
              className="input"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as Priority | '')
              }
            >
              <option value="">All priorities</option>
              {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>

            <Link href="/tickets/new" className="btn-primary whitespace-nowrap">
              New Ticket
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
                  <th className="py-3">Ticket</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Priority</th>

                  {isIT && (
                    <>
                      <th>Requester</th>
                      <th>Assigned</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-4">
                      <Link
                        href={`/tickets/${t.id}`}
                        className="font-semibold text-lazem-teal hover:underline"
                      >
                        {t.ticketNo}
                      </Link>
                      <div className="text-slate-500">{t.title}</div>
                    </td>

                    <td className="text-slate-600">{t.category}</td>

                    <td>
                      <span className={`badge ${statusClass(t.status)}`}>
                        {t.status}
                      </span>
                    </td>

                    <td>
                      <span className={`badge ${priorityClass(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>

                    {isIT && (
                      <>
                        <td className="text-slate-600">
                          {t.requesterName || 'Unknown'}
                        </td>
                        <td className="text-slate-600">
                          {t.assignedToName || 'Unassigned'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={isIT ? 6 : 4}
                      className="py-10 text-center text-slate-500"
                    >
                      No matching tickets.
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