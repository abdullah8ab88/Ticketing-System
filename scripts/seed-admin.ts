import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config({ path: '.env.local' });

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || 'Lazem Admin';

if (!projectId || !clientEmail || !privateKey || !email || !password) {
  throw new Error('Missing FIREBASE_ADMIN_* or ADMIN_* variables in .env.local');
}

admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey })
});

async function main() {
  let user;
  try {
    user = await admin.auth().getUserByEmail(email!);
  } catch {
    user = await admin.auth().createUser({ email, password, displayName: name, emailVerified: true });
  }

  await admin.firestore().collection('users').doc(user.uid).set({
    uid: user.uid,
    name,
    email,
    role: 'admin',
    department: 'IT',
    pending: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  console.log(`Admin ready: ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
