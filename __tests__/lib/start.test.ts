import { startRoute } from '../../src/lib/start';

test('no role starts at the login page', () =>
  expect(startRoute({ role: null, account: null })).toEqual({
    name: 'Login',
    params: { again: false },
  }));

test('a role without an account shows the login page again', () =>
  expect(startRoute({ role: 'elder', account: null })).toEqual({
    name: 'Login',
    params: { again: true },
  }));

test('a set-up, logged-in phone starts at Today', () =>
  expect(
    startRoute({ role: 'carer', account: { name: 'Ravi', email: 'r@x' } }),
  ).toEqual({ name: 'Main' }));

test('a logged-in phone never asked who it is for asks first', () =>
  expect(
    startRoute({ role: null, account: { name: 'Ravi', email: 'r@x' } }),
  ).toEqual({ name: 'Login', params: { again: false } }));
