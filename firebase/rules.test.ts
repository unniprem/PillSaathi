/// <reference types="node" />
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  assertFails,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

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

test('a stranger reads nothing', async () => {
  const db = env.authenticatedContext('stranger').firestore();
  await assertFails(getDoc(doc(db, 'elders/E')));
  await assertFails(getDocs(collection(db, 'codes')));
});
