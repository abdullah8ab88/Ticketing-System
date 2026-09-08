import type { User } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile } from './types';

export const normalizeEmail = (email: string | null | undefined) => (email || '').trim().toLowerCase();

export function initialProfile(user: User, input?: { name: string; department: string }): UserProfile {
  const email = normalizeEmail(user.email || user.providerData.find(p => p.email)?.email);
  return {
    uid: user.uid, email, name: input?.name.trim() || user.displayName || email.split('@')[0] || 'New User',
    role: 'staff', department: input?.department.trim() || '',
    departmentVerificationStatus: input ? 'verified' : 'pending',
    departmentSelectionRequired: !input, active: true, pending: false,
  };
}

// A transaction makes first-login creation idempotent across tabs and callbacks.
export async function ensureUserProfile(user: User, input?: { name: string; department: string }) {
  return runTransaction(db, async transaction => {
    const ref = doc(db, 'users', user.uid);
    const snap = await transaction.get(ref);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      const email = normalizeEmail(data.email || user.email);
      if (data.email && data.email !== email) transaction.update(ref, { email });
      return { ...data, uid: user.uid, email: normalizeEmail(data.email || user.email),
        active: data.active ?? data.pending === false,
        departmentSelectionRequired: data.departmentSelectionRequired ?? !data.department,
        departmentVerificationStatus: data.departmentVerificationStatus ?? 'verified' } as UserProfile;
    }
    const profile = initialProfile(user, input);
    transaction.set(ref, { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return profile;
  });
}
