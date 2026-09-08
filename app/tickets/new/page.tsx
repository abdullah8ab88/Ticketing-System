'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/lib/auth-context';
import { Plus, X } from 'lucide-react';
import { createTicket } from '@/lib/ticket-service';
import type { PersonDetails, Priority } from '@/lib/types';
import Link from 'next/link';
import { categories, departments } from '@/lib/utils';

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
      setErr(
        'Attachments must be PDF, PNG, JPG, JPEG, or WEBP and maximum 10MB per file.'
      );
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
      setErr('Please complete all required fields.');
      return;
    }

    if (isHrRequest && people.some((p) => Object.values(p).some((v) => !v.trim()))) {
      setErr('Please complete all fields for every person.');
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
      setErr(error.message || 'Could not create ticket.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <AppShell title="New Ticket" subtitle="Create a new IT support request">
        <form onSubmit={onSubmit} className="card max-w-4xl">
          {profile?.departmentSelectionRequired && <div role="status" className="mb-5 rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">Select a department for this ticket below. Saving your profile department is optional. <Link href="/onboarding" className="font-semibold underline">Update profile department</Link></div>}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                placeholder="Example: Email is not working"
                required
              />
            </div>

            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                required
              >
                <option value="">Select category</option>
                {categoryOptions.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Priority</label>
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
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Department</label>

              {isIT || !profile?.department ? (
                <select
                  className="input"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  required
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d}>{d}</option>
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
                    Your department is taken from your user profile.
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="label">Attachments</label>
              <input
                className="input"
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.webp,.pdf"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <p className="mt-2 text-xs text-slate-500">
                Screenshots, PDFs, or images. Maximum 10MB per file.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input min-h-40"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Explain the issue, affected system, device, urgency, and any error message."
                required
              />
            </div>
          </div>

          {isHrRequest && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <h3 className="font-bold text-lazem-teal">{form.category} details</h3>
              <p className="mt-1 text-xs text-slate-500">
                {form.category === 'Onboarding'
                  ? "Provide each new employee's information for account setup."
                  : 'Provide each employee\'s information to deactivate their accounts.'}
              </p>

              <div className="mt-4 space-y-5">
                {people.map((person, index) => (
                  <div key={index} className="rounded-3xl border border-slate-100 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm font-bold text-lazem-teal">Person {index + 1}</span>
                      {people.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePerson(index)}
                          className="text-slate-400 hover:text-rose-600"
                          aria-label="Remove person"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="label">First name (Arabic)</label>
                        <input className="input" value={person.firstNameAr} onChange={(e) => updatePerson(index, { firstNameAr: e.target.value })} required />
                      </div>
                      <div>
                        <label className="label">Last name (Arabic)</label>
                        <input className="input" value={person.lastNameAr} onChange={(e) => updatePerson(index, { lastNameAr: e.target.value })} required />
                      </div>
                      <div>
                        <label className="label">First name (English)</label>
                        <input className="input" value={person.firstNameEn} onChange={(e) => updatePerson(index, { firstNameEn: e.target.value })} required />
                      </div>
                      <div>
                        <label className="label">Last name (English)</label>
                        <input className="input" value={person.lastNameEn} onChange={(e) => updatePerson(index, { lastNameEn: e.target.value })} required />
                      </div>
                      <div>
                        <label className="label">Job title (Arabic)</label>
                        <input className="input" value={person.jobTitleAr} onChange={(e) => updatePerson(index, { jobTitleAr: e.target.value })} required />
                      </div>
                      <div>
                        <label className="label">Job title (English)</label>
                        <input className="input" value={person.jobTitleEn} onChange={(e) => updatePerson(index, { jobTitleEn: e.target.value })} required />
                      </div>
                      <div>
                        <label className="label">Mobile number</label>
                        <input className="input" type="tel" value={person.mobile} onChange={(e) => updatePerson(index, { mobile: e.target.value })} required />
                      </div>
                      <div>
                        <label className="label">Personal email</label>
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
                Add another person
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
              Cancel
            </button>

            <button disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </AppShell>
    </ProtectedRoute>
  );
}