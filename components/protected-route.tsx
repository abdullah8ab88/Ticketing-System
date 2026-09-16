'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

export function ProtectedRoute({ children, requireIT = false, requireAdmin = false }: { children: React.ReactNode; requireIT?: boolean; requireAdmin?: boolean }) {
  const { firebaseUser, profile, loading, isIT, isAdmin } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      const next = pathname.startsWith('/') ? pathname : '/dashboard';
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [loading, firebaseUser, pathname, router]);

  if (loading || !firebaseUser) {
    return <div className="flex min-h-screen items-center justify-center text-lazem-teal">{t('protected.loading')}</div>;
  }

  if (!profile) return <div className="card m-6" role="alert"><p>{t('protected.profileError')}</p><button className="btn-primary mt-4" onClick={() => window.location.reload()}>{t('protected.retry')}</button></div>;

  if (profile.pending) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-lg text-center">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-amber-600" />
          <h1 className="text-2xl font-bold text-lazem-teal">{t('protected.pendingTitle')}</h1>
          <p className="mt-3 text-sm text-slate-600">{t('protected.pendingBody')}</p>
          <Link href="/login" className="btn-secondary mt-6">{t('protected.backToLogin')}</Link>
        </div>
      </div>
    );
  }

  if ((requireAdmin && !isAdmin) || (requireIT && !isIT)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-lg text-center">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-rose-600" />
          <h1 className="text-2xl font-bold text-lazem-teal">{t('protected.deniedTitle')}</h1>
          <p className="mt-3 text-sm text-slate-600">{t('protected.deniedBody')}</p>
          <Link href="/dashboard" className="btn-primary mt-6">{t('protected.goDashboard')}</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
