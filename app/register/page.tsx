'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthCredential, OAuthProvider } from 'firebase/auth';
import { Languages } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { departmentLabels } from '@/lib/i18n';
import { departments } from '@/lib/utils';
import { MicrosoftLogo } from '@/components/microsoft-logo';
import Image from "next/image";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loginWithMicrosoft, linkMicrosoftAccount } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '' });
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [err, setErr] = useState('');
  const [linkPrompt, setLinkPrompt] = useState<{ email: string; credential: AuthCredential } | null>(null);
  const [linkPassword, setLinkPassword] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) return setErr(t('register.errPasswordLength'));
    setLoading(true); setErr('');
    try {
      await register(form);
      router.push('/dashboard');
    } catch (error: any) {
      setErr(error.message || t('register.errRegisterFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function onMicrosoftSignup() {
    setMsLoading(true); setErr(''); setLinkPrompt(null);
    try {
      await loginWithMicrosoft();
      router.push('/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        const pendingCredential = OAuthProvider.credentialFromError(error);
        const conflictEmail = error.customData?.email as string | undefined;
        if (pendingCredential && conflictEmail) {
          setLinkPrompt({ email: conflictEmail, credential: pendingCredential });
        } else {
          setErr(error.message || t('login.errMicrosoftFailed'));
        }
      } else {
        setErr(error.message || t('login.errMicrosoftFailed'));
      }
    } finally {
      setMsLoading(false);
    }
  }

  async function onLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!linkPrompt) return;
    setLinkLoading(true); setErr('');
    try {
      await linkMicrosoftAccount(linkPrompt.email, linkPassword, linkPrompt.credential);
      router.push('/dashboard');
    } catch (error: any) {
      setErr(error.message || t('login.errLinkFailed'));
    } finally {
      setLinkLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <button
        type="button"
        onClick={toggleLang}
        className="absolute top-5 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-lazem-teal shadow-sm hover:bg-slate-50 end-5"
        aria-label="Toggle language"
      >
        <Languages className="h-4 w-4" />
        {t('nav.langToggle')}
      </button>
      <div className="card w-full max-w-lg">
          <Image
    src="/logo/Lazem Secondary Logo Solid (1).svg"
  alt="Lazem"
  width={100}
  height={100}
  priority
  className="mx-auto mb-5"
/>
        <h1 className="text-3xl font-bold text-lazem-teal">{t('register.title')}</h1>
        <p className="mt-2 text-sm text-slate-500">{t('register.subtitle')}</p>

        {linkPrompt ? (
          <form onSubmit={onLinkSubmit}>
            <p className="mt-6 rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">
              {t('login.linkAccountExists')} <strong>{linkPrompt.email}</strong>{t('login.linkAccountBody')}
            </p>
            <label className="label mt-4">{t('login.linkPasswordFor')} {linkPrompt.email}</label>
            <input className="input" type="password" value={linkPassword} onChange={(e) => setLinkPassword(e.target.value)} required autoFocus />
            {err && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
            <button disabled={linkLoading} className="btn-primary mt-6 w-full">{linkLoading ? t('login.connecting') : t('login.connectMicrosoft')}</button>
            <button type="button" onClick={() => { setLinkPrompt(null); setLinkPassword(''); setErr(''); }} className="mt-3 w-full text-center text-sm font-semibold text-slate-500 hover:underline">{t('login.cancel')}</button>
          </form>
        ) : (
          <>
            <button
              type="button"
              onClick={onMicrosoftSignup}
              disabled={msLoading}
              className="btn-secondary mt-6 flex w-full items-center justify-center gap-3"
            >
              <MicrosoftLogo />
              {msLoading ? t('login.signingIn') : t('register.signUpMicrosoft')}
            </button>
            <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              {t('login.or')}
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <form onSubmit={onSubmit}>
              <label className="label">{t('register.fullName')}</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <label className="label mt-4">{t('login.email')}</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <label className="label mt-4">{t('register.department')}</label>
              <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required>
                <option value="">{t('register.selectDepartment')}</option>
                {departments.map((d) => <option key={d} value={d}>{departmentLabels[d]?.[lang] ?? d}</option>)}
              </select>
              <label className="label mt-4">{t('register.password')}</label>
              <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              {err && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
              <button disabled={loading} className="btn-primary mt-6 w-full">{loading ? t('register.creating') : t('register.submit')}</button>
              <p className="mt-5 text-center text-sm text-slate-500">{t('register.alreadyHaveAccount')} <Link href="/login" className="font-semibold text-lazem-teal">{t('register.login')}</Link></p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
