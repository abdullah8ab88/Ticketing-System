'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthCredential, OAuthProvider } from 'firebase/auth';
import { Languages, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { MicrosoftLogo } from '@/components/microsoft-logo';
import Image from "next/image";
export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithMicrosoft, linkMicrosoftAccount, resetPassword } = useAuth();
  const { t, toggleLang } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [linkPrompt, setLinkPrompt] = useState<{ email: string; credential: AuthCredential } | null>(null);
  const [linkPassword, setLinkPassword] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);

  function destinationAfterLogin() {
    const requested = new URLSearchParams(window.location.search).get('next');
    return requested?.startsWith('/') && !requested.startsWith('//')
      ? requested
      : '/dashboard';
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(''); setMsg('');
    try {
      await login(email, password);
      router.push(destinationAfterLogin());
    } catch (error: any) {
      setErr(error.message || t('login.errLoginFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function onMicrosoftLogin() {
    setMsLoading(true); setErr(''); setMsg(''); setLinkPrompt(null);
    try {
      await loginWithMicrosoft();
      router.push(destinationAfterLogin());
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
      router.push(destinationAfterLogin());
    } catch (error: any) {
      setErr(error.message || t('login.errLinkFailed'));
    } finally {
      setLinkLoading(false);
    }
  }

  async function onReset() {
    if (!email) return setErr(t('login.errEnterEmail'));
    setErr(''); setMsg(''); setLoading(true);
    try {
      await resetPassword(email);
      setMsg(t('login.resetSent'));
    } catch (error: any) {
      setErr(error.message || t('login.errResetFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="brand-gradient hidden items-center justify-center p-10 text-white lg:flex">
        <div className="max-w-lg">
          <Link href={"/"}>
<div className="flex h-14 w-20 items-center justify-center rounded-2xl bg-white text-lazem-teal shadow-lg cursor-pointer">
  <Image
    src="/logo/Lazem Secondary Logo Solid (1).svg"
    alt="Lazem"
    width={52}
    height={52}
    priority
    className="h-11 w-auto object-contain"
  />
</div>
</Link>
          <h1 className="text-5xl font-bold leading-tight">{t('login.heroTitle')}</h1>
          <p className="mt-6 text-lg text-white/75">{t('login.heroSubtitle')}</p>
        </div>
      </section>
      <section className="relative flex items-center justify-center p-6">
        <button
          type="button"
          onClick={toggleLang}
          className="absolute top-5 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-lazem-teal shadow-sm hover:bg-slate-50 end-5"
          aria-label="Toggle language"
        >
          <Languages className="h-4 w-4" />
          {t('nav.langToggle')}
        </button>
        <div className="card w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lazem-teal text-white lg:hidden">
              <ShieldCheck className="h-8 w-8" />
            </div>

  <Image
    src="/logo/Lazem Secondary Logo Solid (1).svg"
  alt="Lazem"
  width={100}
  height={100}
  priority
  className="mx-auto mb-5"
/>

            <h2 className="text-3xl font-bold text-lazem-teal">{t('login.welcomeBack')}</h2>
            <p className="mt-2 text-sm text-slate-500">{t('login.subtitle')}</p>
          </div>

          {linkPrompt ? (
            <form onSubmit={onLinkSubmit}>
              <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">
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
                onClick={onMicrosoftLogin}
                disabled={msLoading}
                className="btn-secondary flex w-full items-center justify-center gap-3"
              >
                <MicrosoftLogo />
                {msLoading ? t('login.signingIn') : t('login.signInMicrosoft')}
              </button>
              <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                {t('login.or')}
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <form onSubmit={onSubmit}>
                <label className="label">{t('login.email')}</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <label className="label mt-4">{t('login.password')}</label>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                {err && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
                {msg && <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</p>}
                <button disabled={loading} className="btn-primary mt-6 w-full">{loading ? t('login.pleaseWait') : t('login.submit')}</button>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <button type="button" onClick={onReset} className="font-semibold text-lazem-teal hover:underline">{t('login.forgotPassword')}</button>
                  <Link href="/register" className="font-semibold text-lazem-teal hover:underline">{t('login.createAccount')}</Link>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
