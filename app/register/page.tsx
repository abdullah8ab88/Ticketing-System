'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { departments } from '@/lib/utils';
import { MicrosoftLogo } from '@/components/microsoft-logo';
import Image from "next/image";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loginWithMicrosoft } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '' });
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [err, setErr] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) return setErr('Password must be at least 6 characters.');
    setLoading(true); setErr('');
    try {
      await register(form);
      router.push('/dashboard');
    } catch (error: any) {
      setErr(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function onMicrosoftSignup() {
    setMsLoading(true); setErr('');
    try {
      await loginWithMicrosoft();
      router.push('/dashboard');
    } catch (error: any) {
      setErr(error.message || 'Microsoft sign-in failed');
    } finally {
      setMsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={onSubmit} className="card w-full max-w-lg">
          <Image
    src="/logo/Lazem Secondary Logo Solid (1).svg"
  alt="Lazem"
  width={100}
  height={100}
  priority
  className="mx-auto mb-5"
/>
        <h1 className="text-3xl font-bold text-lazem-teal">Create account</h1>
        <p className="mt-2 text-sm text-slate-500">New accounts require admin activation.</p>
        <button
          type="button"
          onClick={onMicrosoftSignup}
          disabled={msLoading}
          className="btn-secondary mt-6 flex w-full items-center justify-center gap-3"
        >
          <MicrosoftLogo />
          {msLoading ? 'Signing in...' : 'Sign up with Microsoft'}
        </button>
        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <label className="label">Full name</label>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <label className="label mt-4">Email</label>
        <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <label className="label mt-4">Department</label>
        <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required>
          <option value="">Select department</option>
          {departments.map((d) => <option key={d}>{d}</option>)}
        </select>
        <label className="label mt-4">Password</label>
        <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {err && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
        <button disabled={loading} className="btn-primary mt-6 w-full">{loading ? 'Creating...' : 'Create account'}</button>
        <p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-lazem-teal">Login</Link></p>
      </form>
    </div>
  );
}
