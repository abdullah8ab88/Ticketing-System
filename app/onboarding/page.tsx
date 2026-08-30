'use client';

import { FormEvent, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Building2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { employeeDepartments } from '@/lib/utils';

function safeNext(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/tickets/new';
}

export default function OnboardingPage() {
  const { profile } = useAuth();
  const [department, setDepartment] = useState('');
  const [otherDepartment, setOtherDepartment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    const selectedDepartment = department === 'Other' ? otherDepartment.trim() : department;
    if (!selectedDepartment) {
      setError('Please select your department.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        department: selectedDepartment,
        departmentVerificationStatus: 'pending',
        departmentSelectionRequired: false,
        updatedAt: serverTimestamp(),
      });
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.assign(safeNext(next));
    } catch (err) {
      console.error('Save department error:', err);
      setError('We could not save your department. Please try again.');
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
          <h1 className="text-2xl font-bold text-lazem-teal">Select your department</h1>
          <p className="mt-2 text-sm text-slate-600">
            Choose the department you belong to. You can create IT tickets immediately while the IT team verifies this information.
          </p>

          <label className="mt-6 block text-sm font-semibold text-slate-700">Department</label>
          <select className="input mt-2" value={department} onChange={(event) => setDepartment(event.target.value)} required>
            <option value="">Select department</option>
            {employeeDepartments.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>

          {department === 'Other' && (
            <>
              <label className="mt-4 block text-sm font-semibold text-slate-700">Department name</label>
              <input className="input mt-2" value={otherDepartment} onChange={(event) => setOtherDepartment(event.target.value)} placeholder="Enter your department" required />
            </>
          )}

          {error && <p className="mt-4 text-sm font-medium text-rose-600">{error}</p>}
          <button className="btn-primary mt-6 w-full" disabled={saving}>{saving ? 'Saving...' : 'Continue to create ticket'}</button>
          <p className="mt-4 text-center text-xs text-slate-500">Department verification does not prevent you from submitting tickets.</p>
        </form>
      </main>
    </ProtectedRoute>
  );
}
