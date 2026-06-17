'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/lib/auth-context';
import { createTicket } from '@/lib/ticket-service';
import type { Priority } from '@/lib/types';
import { categories, departments } from '@/lib/utils';

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

    setLoading(true);
    setErr('');

    try {
      const id = await createTicket({
        ...form,
        files,
        requester: profile,
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
                {categories.map((c) => (
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

              {isIT ? (
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