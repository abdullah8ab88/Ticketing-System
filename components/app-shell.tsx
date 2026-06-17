'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, LogOut, PlusCircle, Ticket, Users, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import Image from "next/image";
const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3, all: true },
  { href: '/tickets', label: 'Tickets', icon: Ticket, all: true },
  { href: '/tickets/new', label: 'New Ticket', icon: PlusCircle, all: true },
  { href: '/users', label: 'Users', icon: Users, admin: true }
];

export function AppShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  const pathname = usePathname();
  const { profile, logout, isAdmin } = useAuth();

  return (
    <div className="min-h-screen lg:flex">
      <aside className="brand-gradient fixed inset-y-0 left-0 z-20 hidden w-72 flex-col p-5 text-white lg:flex">
        <div className="mb-8 flex items-center gap-3">
<div className="flex h-14 w-20 items-center justify-center rounded-2xl bg-white text-lazem-teal shadow-lg">
  <Image
    src="/logo/Lazem Secondary Logo Solid (1).svg"
    alt="Lazem"
    width={52}
    height={52}
    priority
    className="h-11 w-auto object-contain"
  />
</div>
          <div>

            <div className="text-lg font-bold">Lazem IT</div>
            <div className="text-xs text-white/70">Ticketing System</div>
          </div>
        </div>

        <nav className="space-y-2">
          {nav.filter((item) => item.all || (item.admin && isAdmin)).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition', active ? 'bg-white text-lazem-teal shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white')}>
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-3xl bg-white/10 p-4">
          <div className="text-sm font-bold">{profile?.name}</div>
          <div className="mt-1 text-xs text-white/70">{profile?.email}</div>
          <div className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold capitalize">{profile?.role?.replace('_', ' ')}</div>
          <button onClick={logout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/20">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      <main className="w-full lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-white/70 bg-white/75 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-lazem-teal">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              {nav.filter((item) => item.all || (item.admin && isAdmin)).map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="rounded-xl bg-white p-2 text-lazem-teal shadow-sm">
                    <Icon className="h-5 w-5" />
                  </Link>
                );
              })}
            </div>
          </div>
        </header>
        <div className="p-5 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
