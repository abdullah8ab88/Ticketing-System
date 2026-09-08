'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AuthCredential,
  OAuthProvider,
  User,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { ensureUserProfile, normalizeEmail } from './user-profile';
import type { Role, UserProfile } from './types';

type AuthContextValue = {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  linkMicrosoftAccount: (email: string, password: string, pendingCredential: AuthCredential) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    department: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  saveDepartment: (department: string) => Promise<void>;
  isIT: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const registration = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setFirebaseUser(user);
      setProfile(null);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        await registration.current;
        const loaded = await ensureUserProfile(user);
        if (auth.currentUser?.uid === user.uid) setProfile(loaded);
      } catch (error) {
        console.error('Load user profile error:', error);
        if (auth.currentUser?.uid === user.uid) setProfile(null);
      } finally {
        if (auth.currentUser?.uid === user.uid) setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = profile?.role as Role | undefined;

    return {
      firebaseUser,
      profile,
      loading,

      login: async (email, password) => {
        await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
      },

      loginWithMicrosoft: async () => {
        const provider = new OAuthProvider('microsoft.com');
        const tenant = process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID;
        provider.setCustomParameters({ prompt: 'select_account', ...(tenant ? { tenant } : {}) });
        await signInWithPopup(auth, provider);
      },

      linkMicrosoftAccount: async (email, password, pendingCredential) => {
        const result = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
        await linkWithCredential(result.user, pendingCredential);
      },

      register: async ({ name, email, password, department }) => {
        let release!: () => void;
        registration.current = new Promise<void>(resolve => { release = resolve; });
        setLoading(true);
        try {
          const cred = await createUserWithEmailAndPassword(auth, normalizeEmail(email), password);
          const created = await ensureUserProfile(cred.user, { name, department });
          if (auth.currentUser?.uid === cred.user.uid) setProfile(created);
        } finally {
          release();
          registration.current = null;
          setLoading(false);
        }
      },

      saveDepartment: async (department) => {
        const user = auth.currentUser;
        if (!user) throw new Error('Please sign in again.');
        const selected = department.trim();
        if (!selected || selected.length > 120) throw new Error('Enter a department of 1-120 characters.');
        await ensureUserProfile(user);
        const patch = { department: selected, departmentVerificationStatus: 'pending' as const,
          departmentSelectionRequired: false };
        await updateDoc(doc(db, 'users', user.uid), { ...patch, updatedAt: serverTimestamp() });
        if (auth.currentUser?.uid === user.uid) setProfile(current => current ? { ...current, ...patch } : current);
      },

      logout: () => signOut(auth),

      resetPassword: (email) => sendPasswordResetEmail(auth, normalizeEmail(email)),

      isIT:
        role === 'admin' ||
        role === 'it_manager' ||
        role === 'agent',

      isAdmin: role === 'admin',
    };
  }, [firebaseUser, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
