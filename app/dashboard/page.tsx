'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { CheckCircle2, Clock3, Inbox, PlusCircle, TicketIcon, Users } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { db } from '@/lib/firebase';
import type { Ticket } from '@/lib/types';
import { priorityClass, statusClass } from '@/lib/utils';
import { priorityLabels, statusLabels, translateValue } from '@/lib/i18n';

export default function DashboardPage() {
  const router = useRouter();
  const { profile, isIT } = useAuth();
  const { t, lang } = useLanguage();
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // 🔥 فلتر الحالة
  const [filter, setFilter] = useState<
    'all' | 'active' | 'inProgress' | 'closed' | 'unassigned'
  >('all');

  useEffect(() => {
    if (!profile) return;

    const q = isIT
      ? query(collection(db, 'tickets'), orderBy('createdAt', 'desc'))
      : query(
          collection(db, 'tickets'),
          where('requesterId', '==', profile.uid),
          orderBy('createdAt', 'desc')
        );

    return onSnapshot(q, (snap) =>
      setTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ticket))
    );
  }, [profile, isIT]);

  // 🔥 الإحصائيات
  const stats = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter(
        (t) => !['Closed', 'Cancelled'].includes(t.status)
      ).length,
      inProgress: tickets.filter((t) => t.status === 'In Progress').length,
      closed: tickets.filter((t) => t.status === 'Closed').length,
      unassigned: tickets.filter(
        (t) =>
          !t.assignedToId && !['Closed', 'Cancelled'].includes(t.status)
      ).length,
    }),
    [tickets]
  );

  // 🔥 التذاكر حسب الفلتر
  const filteredTickets = useMemo(() => {
    switch (filter) {
      case 'active':
        return tickets.filter(
          (t) => !['Closed', 'Cancelled'].includes(t.status)
        );

      case 'inProgress':
        return tickets.filter((t) => t.status === 'In Progress');

      case 'closed':
        return tickets.filter((t) => t.status === 'Closed');

      case 'unassigned':
        return tickets.filter(
          (t) =>
            !t.assignedToId &&
            !['Closed', 'Cancelled'].includes(t.status)
        );

      default:
        return tickets;
    }
  }, [tickets, filter]);

  return (
    <ProtectedRoute>
      <AppShell title={t('dashboard.title')} subtitle={t('dashboard.subtitle')}>

        {/* 🔥 Stat Cards */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label={t('dashboard.totalTickets')}
            value={stats.total}
            icon={<TicketIcon />}
            onClick={() => setFilter('all')}
          />

          <StatCard
            label={t('dashboard.active')}
            value={stats.open}
            icon={<Inbox />}
            onClick={() => setFilter('active')}
          />

          <StatCard
            label={t('dashboard.inProgress')}
            value={stats.inProgress}
            icon={<Clock3 />}
            onClick={() => setFilter('inProgress')}
          />

          <StatCard
            label={t('dashboard.closed')}
            value={stats.closed}
            icon={<CheckCircle2 />}
            onClick={() => setFilter('closed')}
          />

          <StatCard
            label={t('dashboard.unassigned')}
            value={stats.unassigned}
            icon={<Users />}
            onClick={() => setFilter('unassigned')}
          />
        </div>

        {/* 🔥 Table */}
        <div className="mt-8 grid gap-6 xl:grid-cols-3">
          <div className="card xl:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-lazem-teal">
                  {t('dashboard.recentTickets')}
                </h2>
                <p className="text-sm text-slate-500">
                  {t('dashboard.filteredView')}
                </p>
              </div>
              <Link href="/tickets" className="btn-secondary">
                {t('dashboard.viewAll')}
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-3">{t('dashboard.colTicket')}</th>
                    <th>{t('dashboard.colStatus')}</th>
                    <th>{t('dashboard.colPriority')}</th>
                    <th>{t('dashboard.colOwner')}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredTickets.slice(0, 8).map((t2) => (
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

                      <td className="text-slate-600">
                        {t2.assignedToName || t('dashboard.unassigned')}
                      </td>
                    </tr>
                  ))}

                  {!filteredTickets.length && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-10 text-center text-slate-500"
                      >
                        {t('dashboard.noTickets')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🔥 Side card */}
          <div className="brand-gradient rounded-3xl p-6 text-white shadow-soft">
            <PlusCircle className="h-12 w-12 text-white/80" />
            <h2 className="mt-6 text-2xl font-bold">
              {t('dashboard.createNewRequest')}
            </h2>
            <p className="mt-3 text-sm text-white/70">
              {t('dashboard.createNewRequestBody')}
            </p>
            <Link
              href="/tickets/new"
              className="mt-6 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-bold text-lazem-teal"
            >
              {t('dashboard.newTicket')}
            </Link>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

/* 🔥 Stat Card */
function StatCard({
  label,
  value,
  icon,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="card cursor-pointer transition hover:scale-[1.02] hover:shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div className="rounded-2xl bg-lazem-teal/10 p-3 text-lazem-teal [&_svg]:h-6 [&_svg]:w-6">
          {icon}
        </div>
      </div>

      <div className="mt-5 text-3xl font-bold text-lazem-teal">
        {value}
      </div>

      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}
