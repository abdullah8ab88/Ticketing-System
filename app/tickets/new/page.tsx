'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Plus, X } from 'lucide-react';
import { createTicket } from '@/lib/ticket-service';
import type { PersonDetails, Priority } from '@/lib/types';
import Link from 'next/link';
import { categories, departments } from '@/lib/utils';
import { categoryLabels, departmentLabels, priorityLabels, translateValue } from '@/lib/i18n';

const EMPTY_PERSON: PersonDetails = {
  firstNameAr: '',
  lastNameAr: '',
  firstNameEn: '',
  lastNameEn: '',
  jobTitleAr: '',
  jobTitleEn: '',
  mobile: '',
  personalEmail: '',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
];

export default function NewTicketPage() {
  const router = useRouter();
  const { profile, isIT } = useAuth();
  const { t, lang } = useLanguage();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'Medium' as Priority,
    department: '',
  });

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [people, setPeople] = useState<PersonDetails[]>([EMPTY_PERSON]);

  const canRequestHr = profile?.department === 'HR' && profile?.departmentVerificationStatus !== 'pending';
  const categoryOptions = canRequestHr ? [...categories, 'Onboarding', 'Offboarding'] : categories;
  const isHrRequest = form.category === 'Onboarding' || form.category === 'Offboarding';

  function updatePerson(index: number, patch: Partial<PersonDetails>) {
    setPeople((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addPerson() {
    setPeople((prev) => [...prev, EMPTY_PERSON]);
  }

  function removePerson(index: number) {
    setPeople((prev) => prev.filter((_, i) => i !== index));
  }

  /**
   * IMPORTANT:
   * profile loads after the page first renders.
   * So we set department after profile becomes available.
   */
  useEffect(() => {
    if (!profile?.department) return;

    setForm((prev) => ({
      ...prev,
      department: prev.department || profile.department || '',
    }));
  }, [profile?.department]);

  function handleFiles(selectedFiles: FileList | null) {
    setErr('');

    const nextFiles = Array.from(selectedFiles || []);

    const invalidFile = nextFiles.find(
      (file) =>
        !ALLOWED_FILE_TYPES.includes(file.type) ||
        file.size > MAX_FILE_SIZE
    );

    if (invalidFile) {
      setFiles([]);
      setErr(t('newTicket.errFileType'));
      return;
    }

    setFiles(nextFiles);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!profile) return;

    if (
      !form.title ||
      !form.description ||
      !form.category ||
      !form.department
    ) {
      setErr(t('newTicket.errRequired'));
      return;
    }

    if (isHrRequest && people.some((p) => Object.values(p).some((v) => !v.trim()))) {
      setErr(t('newTicket.errPeopleRequired'));
      return;
    }

    setLoading(true);
    setErr('');

    try {
      const id = await createTicket({
        ...form,
        files,
        requester: profile,
        people: isHrRequest ? people : undefined,
      });

      router.push(`/tickets/${id}`);
    } catch (error: any) {
      console.error('Create ticket error:', error);
      setErr(error.message || t('newTicket.errCreateFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <AppShell title={t('newTicket.title')} subtitle={t('newTicket.subtitle')}>
        <form onSubmit={onSubmit} className="card max-w-4xl">
          {profile?.departmentSelectionRequired && (
            <div role="status" className="mb-5 rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">
              {t('newTicket.deptRequiredNotice')} <Link href="/onboarding" className="font-semibold underline">{t('newTicket.updateProfileDept')}</Link>
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">{t('newTicket.fieldTitle')}</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                placeholder={t('newTicket.titlePlaceholder')}
                required
              />
            </div>

            <div>
              <label className="label">{t('newTicket.category')}</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                required
              >
                <option value="">{t('newTicket.selectCategory')}</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{translateValue(categoryLabels, c, lang)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">{t('newTicket.priority')}</label>
              <select
                className="input"
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: e.target.value as Priority,
                  })
                }
              >
                {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                  <option key={p} value={p}>{translateValue(priorityLabels, p, lang)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">{t('newTicket.department')}</label>

              {isIT || !profile?.department ? (
                <select
                  className="input"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  required
                >
                  <option value="">{t('newTicket.selectDepartment')}</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{translateValue(departmentLabels, d, lang)}</option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    className="input bg-slate-50"
                    value={form.department}
                    disabled
                    readOnly
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {t('newTicket.deptFromProfile')}
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="label">{t('newTicket.attachments')}</label>
              <input
                className="input"
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.webp,.pdf"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <p className="mt-2 text-xs text-slate-500">
                {t('newTicket.attachmentsHint')}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="label">{t('newTicket.description')}</label>
              <textarea
                className="input min-h-40"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder={t('newTicket.descriptionPlaceholder')}
                required
              />
            </div>
          </div>

          {isHrRequest && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <h3 className="font-bold text-lazem-teal">{translateValue(categoryLabels, form.category, lang)} {t('newTicket.detailsSuffix')}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {form.category === 'Onboarding'
                  ? t('newTicket.onboardingHint')
                  : t('newTicket.offboardingHint')}
              </p>

              <div className="mt-4 space-y-5">
                {people.map((person, index) => (
                  <div key={index} className="rounded-3xl border border-slate-100 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm font-bold text-lazem-teal">{t('newTicket.person')} {index + 1}</span>
                      {people.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePerson(index)}
                          className="text-slate-400 hover:text-rose-600"
                          aria-label={t('newTicket.removePerson')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="label">{t('newTicket.firstNameAr')}</label>
                        <input className="input" value={person.firstNameAr} onChange={(e) => updatePerson(index, { firstNameAr: e.target.value })} required />
                      </div>
                      <div>
                        <label className="label">{t('newTicket.lastNameAr')}</label>
                        <input className="input" value={person.lastNameAr} onChange={(e) => updatePerson(index, { lastNameAr: e.target.value })} required />
                      </div>
                      <div>
                        <label className="label">{t('newTicket.firstNameEn')}</label>
                        <input className="input" value={person.firstNameEn} onChange={(e) => updatePerson(index, { firstNameEn: e.target.value })} required />
                      </div>
                      <div>
                        <label className="label">{t('newTicket.lastNameEn')}</label>
                        <input className="input" value={person.lastNameEn} onChange={(e) => updatePerson(index, { lastNameEn: e.target.value })} required />
                      </div>
                      <div>
                        <label className="label">{t('newTicket.jobTitleAr')}</label>
                        <input className="input" value={person.jobTitleAr} onChange={(e) => updatePerson(index, { jobTitleAr: e.target.value })} required />
                      </div>
                      <div>
                        <label className="label">{t('newTicket.jobTitleEn')}</label>
                        <input className="input" value={person.jobTitleEn} onChange={(e) => updatePerson(index, { jobTitleEn: e.target.value })} required />
                      </div>
                      <div>
                        <label className="label">{t('newTicket.mobile')}</label>
                        <input className="input" type="tel" value={person.mobile} onChange={(e) => updatePerson(index, { mobile: e.target.value })} required />
                      </div>
                      <div>
                        <label className="label">{t('newTicket.personalEmail')}</label>
                        <input className="input" type="email" value={person.personalEmail} onChange={(e) => updatePerson(index, { personalEmail: e.target.value })} required />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addPerson}
                className="btn-secondary mt-4 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('newTicket.addPerson')}
              </button>
            </div>
          )}

          {err && (
            <p className="mt-5 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
              {err}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
            >
              {t('newTicket.cancel')}
            </button>

            <button disabled={loading} className="btn-primary">
              {loading ? t('newTicket.creating') : t('newTicket.submit')}
            </button>
          </div>
        </form>
      </AppShell>
    </ProtectedRoute>
  );
}
