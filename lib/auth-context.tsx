'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Role, UserProfile } from './types';

type AuthContextValue = {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    department: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isIT: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * TESTING MODE:
 * New registered users are active automatically.
 *
 * For production later, change:
 * active: true  -> active: false
 * pending: false -> pending: true
 */
const AUTO_ACTIVATE_NEW_USERS = true;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          const newProfile: UserProfile = {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'New User',
            email: user.email || '',
            role: 'staff',
            department: 'IT',
            active: AUTO_ACTIVATE_NEW_USERS,
            pending: !AUTO_ACTIVATE_NEW_USERS,
          };

          await setDoc(ref, {
            ...newProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          setProfile(newProfile);
        } else {
          const data = snap.data() as UserProfile;

          /**
           * Safety fallback:
           * If old users do not have active field, we keep profile readable.
           * But you should still add active:true in Firestore for existing approved users.
           */
          setProfile({
            ...data,
            active: data.active ?? data.pending === false,
          });
        }
      } catch (error) {
        console.error('Load user profile error:', error);
        setProfile(null);
      } finally {
        setLoading(false);
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
        await signInWithEmailAndPassword(auth, email, password);
      },

      register: async ({ name, email, password, department }) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        const newProfile: UserProfile = {
          uid: cred.user.uid,
          name,
          email,
          role: 'staff',
          department,
          active: AUTO_ACTIVATE_NEW_USERS,
          pending: !AUTO_ACTIVATE_NEW_USERS,
        };

        await setDoc(doc(db, 'users', cred.user.uid), {
          ...newProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setProfile(newProfile);
      },

      logout: () => signOut(auth),

      resetPassword: (email) => sendPasswordResetEmail(auth, email),

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