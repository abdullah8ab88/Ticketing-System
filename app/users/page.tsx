'use client';

import { useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { AppShell } from '@/components/app-shell';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import type { Role, UserProfile } from '@/lib/types';
import { employeeDepartments } from '@/lib/utils';

export default function UsersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (deleteTarget) deleteDialog.current?.showModal();
  }, [deleteTarget]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setUsers(snap.docs.map((d) => ({ ...d.data(), uid: d.id }) as UserProfile)));
  }, []);

  async function updateUser(uid: string, patch: Partial<UserProfile>) {
    await updateDoc(doc(db, 'users', uid), { ...patch, updatedAt: serverTimestamp() });
  }

  async function deleteUser(uid: string) {
    if (uid === profile?.uid) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteDoc(doc(db, 'users', uid));
      setDeleteTarget(null);
    } catch {
      setDeleteError('Could not delete this profile. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ProtectedRoute requireAdmin>
      <AppShell title="Users" subtitle="Activate accounts and manage roles">
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr><th className="py-3">User</th><th>Department</th><th>Department verification</th><th>Role</th><th>Account</th><th>Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50">
                    <td className="py-4"><div className="font-semibold text-lazem-teal">{u.name}</div><div className="text-slate-500">{u.email}</div></td>
                    <td>
                      <select className="input min-w-48" value={u.department} onChange={(e) => updateUser(u.uid, { department: e.target.value, departmentVerificationStatus: 'pending' })}>
                        {u.department && !employeeDepartments.includes(u.department) && <option value={u.department}>{u.department}</option>}
                        {!u.department && <option value="">Not selected</option>}
                        {employeeDepartments.map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </td>
                    <td>
                      <button
                        onClick={() => updateUser(u.uid, { departmentVerificationStatus: u.departmentVerificationStatus === 'pending' ? 'verified' : 'pending' })}
                        disabled={!u.department}
                        className={`badge disabled:opacity-40 ${(u.departmentVerificationStatus ?? 'verified') === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
                      >
                        {(u.departmentVerificationStatus ?? 'verified') === 'pending' ? 'Verify department' : 'Verified'}
                      </button>
                    </td>
                    <td>
                      <select className="input min-w-40" value={u.role} disabled={u.uid === profile?.uid} onChange={(e) => updateUser(u.uid, { role: e.target.value as Role })}>
                        <option value="admin">Admin</option>
                        <option value="it_manager">IT Manager</option>
                        <option value="agent">IT Agent</option>
                        <option value="staff">Staff</option>
                      </select>
                    </td>
                    <td>
                      <button disabled={u.uid === profile?.uid} onClick={() => updateUser(u.uid, { pending: !u.pending })} className={`badge ${u.pending ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {u.pending ? 'Pending' : 'Active'}
                      </button>
                    </td>
                    <td>
                      <button disabled={u.uid === profile?.uid} onClick={() => { setDeleteError(''); setDeleteTarget(u.uid); }} className="btn-secondary py-2 text-rose-700 disabled:opacity-30">Delete</button>
                    </td>
                  </tr>
                ))}
                {!users.length && <tr><td colSpan={6} className="py-10 text-center text-slate-500">No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {deleteTarget && <dialog ref={deleteDialog} aria-modal="true" aria-labelledby="delete-title" className="fixed inset-0 z-50 m-0 flex h-full w-full items-center justify-center bg-black/40 p-6" onCancel={(event) => { event.preventDefault(); if (!deleting) setDeleteTarget(null); }}>
          <div className="card max-w-md">
            <h2 id="delete-title" className="text-xl font-bold text-lazem-teal">Delete user profile?</h2>
            <p className="mt-3 text-sm text-slate-600">The Firebase Authentication account must be deleted separately if required.</p>
            {deleteError && <p role="alert" className="mt-3 text-rose-700">{deleteError}</p>}
            <div className="mt-5 flex gap-3"><button autoFocus className="btn-secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</button><button className="btn-primary" disabled={deleting} onClick={() => deleteUser(deleteTarget)}>{deleting ? 'Deleting...' : 'Delete profile'}</button></div>
          </div>
        </dialog>}
      </AppShell>
    </ProtectedRoute>
  );
}
