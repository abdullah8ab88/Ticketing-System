'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { employeeDepartments } from '@/lib/utils';
import { employeeDepartmentLabels, translateValue } from '@/lib/i18n';

function safeNext(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/tickets/new';
}

export default function OnboardingPage() {
  const { profile, saveDepartment } = useAuth();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [department, setDepartment] = useState('');
  const [otherDepartment, setOtherDepartment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    const selectedDepartment = department === 'Other' ? otherDepartment.trim() : department;
    if (!selectedDepartment) {
      setError(t('onboarding.errSelectDepartment'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      await saveDepartment(selectedDepartment);
      const next = new URLSearchParams(window.location.search).get('next');
      router.push(safeNext(next));
    } catch (err) {
      console.error('Save department error:', err);
      setError(t('onboarding.errSaveFailed'));
      setSaving(false);
    }
  }

  return (
    <ProtectedRoute>
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <form onSubmit={submit} className="card w-full max-w-xl">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-lazem-teal">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-lazem-teal">{t('onboarding.title')}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {t('onboarding.subtitle')}
          </p>

          <label className="mt-6 block text-sm font-semibold text-slate-700">{t('onboarding.department')}</label>
          <select className="input mt-2" value={department} onChange={(event) => setDepartment(event.target.value)} required>
            <option value="">{t('onboarding.selectDepartment')}</option>
            {employeeDepartments.map((item) => <option key={item} value={item}>{translateValue(employeeDepartmentLabels, item, lang)}</option>)}
          </select>

          {department === 'Other' && (
            <>
              <label className="mt-4 block text-sm font-semibold text-slate-700">{t('onboarding.otherDepartmentLabel')}</label>
              <input className="input mt-2" value={otherDepartment} onChange={(event) => setOtherDepartment(event.target.value)} placeholder={t('onboarding.otherDepartmentPlaceholder')} required />
            </>
          )}

          {error && <p role="alert" className="mt-4 text-sm font-medium text-rose-600">{error}</p>}
          <button className="btn-primary mt-6 w-full" disabled={saving}>{saving ? t('onboarding.saving') : t('onboarding.continue')}</button>
          <Link href="/tickets/new" className="btn-secondary mt-4 block text-center">{t('onboarding.continueWithoutSaving')}</Link>
          <p className="mt-4 text-center text-xs text-slate-500">{t('onboarding.footerNote')}</p>
        </form>
      </main>
    </ProtectedRoute>
  );
}
