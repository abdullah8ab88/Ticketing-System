'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function ProtectedRoute({ children, requireIT = false, requireAdmin = false }: { children: React.ReactNode; requireIT?: boolean; requireAdmin?: boolean }) {
  const { firebaseUser, profile, loading, isIT, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      const next = pathname.startsWith('/') ? pathname : '/dashboard';
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [loading, firebaseUser, pathname, router]);

  useEffect(() => {
    if (!loading && firebaseUser && profile?.departmentSelectionRequired && pathname !== '/onboarding') {
      router.replace(`/onboarding?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, firebaseUser, profile?.departmentSelectionRequired, pathname, router]);

  if (loading || !firebaseUser || !profile) {
    return <div className="flex min-h-screen items-center justify-center text-lazem-teal">Loading...</div>;
  }

  if (profile.departmentSelectionRequired && pathname !== '/onboarding') {
    return <div className="flex min-h-screen items-center justify-center text-lazem-teal">Preparing your profile...</div>;
  }

  if (profile.pending) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-lg text-center">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-amber-600" />
          <h1 className="text-2xl font-bold text-lazem-teal">Account pending approval</h1>
          <p className="mt-3 text-sm text-slate-600">Your account has been created, but an admin must activate it before you can use the system.</p>
          <Link href="/login" className="btn-secondary mt-6">Back to login</Link>
        </div>
      </div>
    );
  }

  if ((requireAdmin && !isAdmin) || (requireIT && !isIT)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-lg text-center">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-rose-600" />
          <h1 className="text-2xl font-bold text-lazem-teal">Access denied</h1>
          <p className="mt-3 text-sm text-slate-600">You do not have permission to open this page.</p>
          <Link href="/dashboard" className="btn-primary mt-6">Go to dashboard</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
