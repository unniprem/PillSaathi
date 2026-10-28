/// <reference types="node" />
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const MINUTE = 60_000;
const DAY = 86_400_000;

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pillsaathi',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
    },
  });
});

afterAll(() => env.cleanup());

beforeEach(() => env.clearFirestore());

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const at = (ms: number) => Timestamp.fromMillis(Date.now() + ms);

/** Writes [data] with the rules off. */
async function seed(data: Record<string, object>) {
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    for (const [path, value] of Object.entries(data)) {
      await setDoc(doc(db, path), value);
    }
  });
}

/** Elder E, followed by R and S, heard from [heardAgo] ms ago, with a month and a photo. */
function elderE(heardAgo = MINUTE) {
  return seed({
    'elders/E': {
      zone: 'Asia/Kolkata',
      heardAt: at(-heardAgo),
      oldest: '2026-10-01',
      pills: [],
      followers: ['R', 'S'],
      people: {
        R: { name: 'Ravi', email: 'ravi@gmail.com' },
        S: { name: 'Sita', email: 'sita@gmail.com' },
      },
    },
    'elders/E/months/2026-10': { records: [] },
    'elders/E/photos/p1': { name: 'a.jpg' },
  });
}

function request(
  db: ReturnType<typeof as>,
  code: string,
  elder = 'E',
  uid = 'R',
) {
  return setDoc(doc(db, `elders/${elder}/requests/${uid}`), {
    code,
    name: 'Ravi',
    email: 'ravi@gmail.com',
    at: serverTimestamp(),
    status: 'pending',
  });
}

test('a stranger reads nothing', async () => {
  await elderE();
  const db = as('stranger');
  await assertFails(getDoc(doc(db, 'elders/E')));
  await assertFails(getDoc(doc(db, 'elders/E/months/2026-10')));
  await assertFails(getDoc(doc(db, 'elders/E/photos/p1')));
  await assertFails(getDocs(collection(db, 'codes')));
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), 'elders/E')),
  );
});

test('an elder writes only her own data', async () => {
  const e = as('E');
  await assertSucceeds(
    setDoc(doc(e, 'elders/E'), { followers: [], people: {} }),
  );
  await assertSucceeds(
    setDoc(
      doc(e, 'elders/E'),
      { zone: 'Asia/Kolkata', heardAt: serverTimestamp(), pills: [] },
      { merge: true },
    ),
  );
  await assertSucceeds(
    setDoc(doc(e, 'elders/E/months/2026-10'), { records: [] }),
  );
  await assertSucceeds(setDoc(doc(e, 'elders/E/photos/p1'), { name: 'a.jpg' }));
  await assertSucceeds(getDoc(doc(e, 'elders/E')));
  await assertSucceeds(getDocs(collection(e, 'elders/E/months')));
  await assertSucceeds(deleteDoc(doc(e, 'elders/E/months/2026-10')));
  await assertFails(setDoc(doc(e, 'elders/F'), { followers: [] }));
  await assertFails(setDoc(doc(e, 'elders/F/months/2026-10'), { records: [] }));
  await assertSucceeds(deleteDoc(doc(e, 'elders/E')));
});

test('codes: 15-minute life, no listing, no overwrite', async () => {
  const e = as('E');
  await assertSucceeds(
    setDoc(doc(e, 'codes/482913'), {
      elderId: 'E',
      expiresAt: at(15 * MINUTE - 5000),
    }),
  );
  await assertFails(
    setDoc(doc(e, 'codes/111111'), {
      elderId: 'E',
      expiresAt: at(16 * MINUTE),
    }),
  );
  await assertFails(
    setDoc(doc(e, 'codes/222222'), { elderId: 'F', expiresAt: at(MINUTE) }),
  );
  await assertFails(
    setDoc(doc(as('F'), 'codes/482913'), {
      elderId: 'F',
      expiresAt: at(MINUTE),
    }),
  );
  await assertFails(
    setDoc(doc(e, 'codes/482913'), { elderId: 'E', expiresAt: at(MINUTE) }),
  );
  await assertSucceeds(getDoc(doc(as('R'), 'codes/482913')));
  await assertFails(getDocs(collection(as('R'), 'codes')));
  await assertFails(getDocs(collection(e, 'codes')));
  await assertFails(deleteDoc(doc(as('R'), 'codes/482913')));
  await assertSucceeds(deleteDoc(doc(e, 'codes/482913')));
});

test('a follow request needs a live code for that elder', async () => {
  await seed({
    'codes/111111': { elderId: 'E', expiresAt: at(10 * MINUTE) },
    'codes/222222': { elderId: 'E', expiresAt: at(-MINUTE) },
    'codes/333333': { elderId: 'F', expiresAt: at(10 * MINUTE) },
  });
  const r = as('R');
  await assertFails(request(r, '222222'));
  await assertFails(request(r, '333333'));
  await assertFails(request(r, '999999'));
  await assertFails(request(r, '111111', 'E', 'S'));
  await assertFails(
    setDoc(doc(r, 'elders/E/requests/R'), {
      code: '111111',
      name: 'Ravi',
      email: 'ravi@gmail.com',
      at: serverTimestamp(),
      status: 'allowed',
    }),
  );
  await assertSucceeds(request(r, '111111'));
  // Asking again with a fresh code replaces the old request.
  await assertSucceeds(request(r, '111111'));
  await assertFails(
    updateDoc(doc(r, 'elders/E/requests/R'), { status: 'allowed' }),
  );
});

test('a requester reads only their own request', async () => {
  await seed({
    'elders/E/requests/R': { code: '111111', status: 'pending' },
    'elders/E/requests/S': { code: '111111', status: 'pending' },
  });
  const r = as('R');
  await assertSucceeds(getDoc(doc(r, 'elders/E/requests/R')));
  await assertFails(getDoc(doc(r, 'elders/E/requests/S')));
  await assertFails(getDocs(collection(r, 'elders/E/requests')));
  const e = as('E');
  await assertSucceeds(
    getDocs(
      query(
        collection(e, 'elders/E/requests'),
        where('status', '==', 'pending'),
      ),
    ),
  );
  await assertSucceeds(
    updateDoc(doc(e, 'elders/E/requests/R'), { status: 'denied' }),
  );
  await assertSucceeds(deleteDoc(doc(r, 'elders/E/requests/R')));
  await assertFails(deleteDoc(doc(r, 'elders/E/requests/S')));
});

test('a follower reads the elder doc, months and photos, and writes none of them', async () => {
  await elderE();
  const r = as('R');
  await assertSucceeds(getDoc(doc(r, 'elders/E')));
  await assertSucceeds(getDoc(doc(r, 'elders/E/months/2026-10')));
  await assertSucceeds(getDoc(doc(r, 'elders/E/photos/p1')));
  await assertFails(updateDoc(doc(r, 'elders/E'), { zone: 'UTC' }));
  await assertFails(
    updateDoc(doc(r, 'elders/E'), { followers: arrayUnion('X') }),
  );
  await assertFails(setDoc(doc(r, 'elders/E/months/2026-10'), { records: [] }));
  await assertFails(setDoc(doc(r, 'elders/E/photos/p1'), { name: 'b.jpg' }));
  await assertFails(deleteDoc(doc(r, 'elders/E/months/2026-10')));
  await assertFails(deleteDoc(doc(r, 'elders/E')));
});

test('a follower can remove only himself', async () => {
  await elderE();
  const r = as('R');
  await assertFails(
    updateDoc(doc(r, 'elders/E'), {
      followers: arrayRemove('S'),
      'people.S': deleteField(),
    }),
  );
  await assertFails(
    updateDoc(doc(r, 'elders/E'), { followers: arrayRemove('R') }),
  );
  await assertFails(
    updateDoc(doc(r, 'elders/E'), {
      followers: arrayRemove('R'),
      'people.R': deleteField(),
      'people.S': deleteField(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(r, 'elders/E'), {
      followers: arrayRemove('R'),
      'people.R': deleteField(),
    }),
  );
});

test('a removed follower is refused at once', async () => {
  await elderE();
  const r = as('R');
  await assertSucceeds(getDoc(doc(r, 'elders/E')));
  await assertSucceeds(
    updateDoc(doc(as('E'), 'elders/E'), {
      followers: arrayRemove('R'),
      'people.R': deleteField(),
    }),
  );
  await assertFails(getDoc(doc(r, 'elders/E')));
  await assertFails(getDoc(doc(r, 'elders/E/months/2026-10')));
  await assertFails(getDoc(doc(r, 'elders/E/photos/p1')));
});

test('a follower deletes the copy only after 30 days of silence', async () => {
  await elderE(29 * DAY);
  const r = as('R');
  await assertFails(deleteDoc(doc(r, 'elders/E/months/2026-10')));
  await assertFails(deleteDoc(doc(r, 'elders/E/photos/p1')));
  await assertFails(deleteDoc(doc(r, 'elders/E')));
  await elderE(31 * DAY);
  await assertFails(deleteDoc(doc(as('stranger'), 'elders/E/months/2026-10')));
  await assertSucceeds(getDocs(collection(r, 'elders/E/months')));
  await assertSucceeds(deleteDoc(doc(r, 'elders/E/months/2026-10')));
  await assertSucceeds(deleteDoc(doc(r, 'elders/E/photos/p1')));
  await assertSucceeds(deleteDoc(doc(r, 'elders/E')));
});
