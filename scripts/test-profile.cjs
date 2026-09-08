const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, modules) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText, { exports, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
    return modules[name];
  }, console, process, fetch: async () => ({ ok: true }) });
  return exports;
}
function setup(existing) {
  let stored = existing;
  let writes = 0;
  const api = load('lib/user-profile.ts', {
    './firebase': { db: {} },
    'firebase/firestore': {
      doc: (_, collection, uid) => { assert.equal(collection, 'users'); assert.equal(uid, 'uid-123'); return uid; },
      serverTimestamp: () => 'timestamp',
      runTransaction: async (_, run) => run({
        get: async () => ({ exists: () => !!stored, data: () => stored }),
        set: (_, data) => { stored = data; writes++; },
        update: (_, data) => { stored = { ...stored, ...data }; writes++; }
      })
    }
  });
  return { api, stored: () => stored, writes: () => writes };
}
const user = { uid: 'uid-123', email: ' Person@Lazem.COM ', displayName: 'Person', providerData: [{ providerId: 'microsoft.com' }] };
test('first Microsoft login creates active staff at Auth UID with normalized email', async () => {
  const { api, stored } = setup();
  const profile = await api.ensureUserProfile(user);
  assert.equal(profile.uid, user.uid);
  assert.equal(profile.email, 'person@lazem.com');
  assert.equal(profile.role, 'staff');
  assert.equal(profile.active, true);
  assert.equal(profile.departmentSelectionRequired, true);
  assert.equal(stored().createdAt, 'timestamp');
});
test('repeat login preserves role, activation and department; repairs in-memory UID', async () => {
  const { api, writes } = setup({ uid: 'stale', email: 'person@lazem.com', role: 'admin', department: 'HR', active: false, pending: true });
  const profile = await api.ensureUserProfile(user);
  assert.equal(profile.uid, user.uid);
  assert.equal(profile.role, 'admin');
  assert.equal(profile.active, false);
  assert.equal(profile.department, 'HR');
  assert.equal(writes(), 0);
});
test('normal registration retains supplied name and department through callback reload', async () => {
  const { api, writes } = setup();
  await api.ensureUserProfile(user, { name: ' Registered User ', department: 'Finance' });
  const reloaded = await api.ensureUserProfile(user);
  assert.equal(reloaded.name, 'Registered User');
  assert.equal(reloaded.department, 'Finance');
  assert.equal(reloaded.departmentSelectionRequired, false);
  assert.equal(reloaded.departmentVerificationStatus, 'verified');
  assert.equal(writes(), 1);
});
test('provider email fallback and absent email are supported without using email as identity', () => {
  const { api } = setup();
  assert.equal(api.initialProfile({ ...user, email: null, providerData: [{ email: ' ALIAS@Lazem.com ' }] }).email, 'alias@lazem.com');
  assert.equal(api.initialProfile({ ...user, email: null, providerData: [] }).uid, user.uid);
});
test('legacy mixed-case profile email is normalized in storage', async () => {
  const { api, stored } = setup({ uid: user.uid, email: ' PERSON@Lazem.COM ', department: 'IT' });
  await api.ensureUserProfile(user);
  assert.equal(stored().email, 'person@lazem.com');
});

test('registration callback waits for the submitted profile instead of creating defaults', async () => {
  let callback;
  let observer;
  let saved;
  let context;
  const auth = { currentUser: user };
  const api = load('lib/auth-context.tsx', {
    react: {
      createContext: () => ({ Provider: 'Provider' }), useContext: () => null,
      useState: value => [value, () => {}], useRef: value => ({ current: value }),
      useEffect: fn => fn(), useMemo: fn => { context = fn(); return context; }
    },
    'react/jsx-runtime': { jsx: () => null },
    './firebase': { auth, db: {} },
    'firebase/firestore': {},
    'firebase/auth': {
      onAuthStateChanged: (_, fn) => { callback = fn; return () => {}; },
      createUserWithEmailAndPassword: async (_, email) => {
        assert.equal(email, 'person@lazem.com');
        observer = callback(user);
        return { user };
      }
    },
    './user-profile': {
      normalizeEmail: email => email.trim().toLowerCase(),
      ensureUserProfile: async (_, input) => {
        if (!saved) { assert.ok(input, 'observer must not create the profile first'); saved = input; }
        return saved;
      }
    }
  });
  api.AuthProvider({ children: null });
  await context.register({ name: 'Person', email: ' Person@Lazem.COM ', password: 'test', department: 'Finance' });
  await observer;
  assert.equal(saved.department, 'Finance');
});

test('ticket creation works with an unsaved department and never writes the user document', async () => {
  const writes = [];
  const api = load('lib/ticket-service.ts', {
    './firebase': { auth: { currentUser: user }, db: {}, storage: {} },
    './user-profile': { normalizeEmail: email => email.trim().toLowerCase() },
    'firebase/storage': {},
    'firebase/firestore': {
      collection: (_, ...path) => path.join('/'), serverTimestamp: () => 'timestamp',
      addDoc: async (path, data) => { writes.push({ path, data }); return { id: 'ticket-123' }; }
    }
  });
  const id = await api.createTicket({ title: 'Help', description: 'Test', category: 'Hardware', priority: 'Medium',
    department: 'Finance', files: [], requester: { uid: user.uid, email: user.email, name: 'Person', department: '', departmentSelectionRequired: true } });
  assert.equal(id, 'ticket-123');
  assert.equal(writes[0].data.requesterId, user.uid);
  assert.equal(writes[0].data.department, 'Finance');
  assert.equal(writes[0].data.requesterEmail, 'person@lazem.com');
  assert.ok(writes.every(write => write.path.startsWith('tickets')));
});
