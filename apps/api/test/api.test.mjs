import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApplication } from '../dist/bootstrap.js';
import { loadConfig } from '../dist/config.js';
import { todayInTimezone } from '@crowanzas/contracts';

const config = loadConfig({ APP_TIMEZONE: 'America/La_Paz', API_STORAGE: 'memory' });
let app;
let base;
before(async () => {
  app = await createApplication(config, false);
  await app.listen(0, '127.0.0.1');
  base = `${await app.getUrl()}/api`;
});
after(async () => { await app?.close(); });

async function post(body) {
  return fetch(`${base}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
const input = { name: '  Café  ', amount: '0.10', quantity: 3, date: '2024-02-29' };

test('health labels memory demo and seeds two expenses today', async () => {
  assert.deepEqual(await (await fetch(`${base}/health`)).json(), { status: 'ok', storage: 'memory' });
  const summary = await (await fetch(`${base}/expenses/summary`)).json();
  assert.equal(summary.date, todayInTimezone(config.timezone));
  assert.equal(summary.count, 2);
  assert.equal(summary.total, '41.00');
  assert.equal(summary.expenses.length, 2);
  assert.ok(summary.expenses[0].createdAt >= summary.expenses[1].createdAt);
});

test('POST returns normalized contract; list filters date and summary adds amounts without quantity', async () => {
  const response = await post(input);
  assert.equal(response.status, 201);
  const expense = await response.json();
  assert.match(expense.id, /^[a-f\d-]{36}$/i);
  assert.equal(expense.name, 'Café');
  assert.equal(expense.amount, '0.10');
  assert.equal(expense.quantity, 3);
  assert.equal(expense.date, input.date);
  assert.equal(expense.description, null);
  assert.equal(new Date(expense.createdAt).toISOString(), expense.createdAt);
  assert.equal(expense.updatedAt, expense.createdAt);
  assert.equal((await post({ ...input, name: 'Pan', amount: '0.20', quantity: 9 })).status, 201);
  const summary = await (await fetch(`${base}/expenses/summary?date=${input.date}`)).json();
  assert.equal(summary.total, '0.30');
  assert.equal(summary.count, 2);
  const list = await (await fetch(`${base}/expenses?date=${input.date}`)).json();
  assert.equal(list.length, 2);
  assert.equal(list[0].name, 'Pan');
  assert.equal(list[1].name, 'Café');
  assert.deepEqual(list, summary.expenses);
});

test('empty date returns exact zero and future calendar dates remain unchanged', async () => {
  const summary = await (await fetch(`${base}/expenses/summary?date=2099-12-31`)).json();
  assert.deepEqual(summary, { date: '2099-12-31', count: 0, total: '0.00', expenses: [] });
  const response = await post({ ...input, date: '2099-12-30', amount: '9999999999.99', quantity: 1_000_000, description: '  Compra prevista  ' });
  assert.equal(response.status, 201);
  const expense = await response.json();
  assert.equal(expense.date, '2099-12-30');
  assert.equal(expense.description, 'Compra prevista');
  assert.equal(expense.amount, '9999999999.99');
});

test('missing date uses configured timezone day', async () => {
  const { date, ...body } = input;
  const response = await post(body);
  assert.equal(response.status, 201);
  assert.equal((await response.json()).date, todayInTimezone(config.timezone));
});

test('invalid transport input receives consistent Nest 400 and never creates an expense', async () => {
  const badBodies = [
    { ...input, name: '   ' }, { ...input, name: 'a'.repeat(121) },
    ...['0', '-1', '1.001', '10000000000.00', '1e2', '', 'NaN', null, 1].map(amount => ({ ...input, amount })),
    ...[0, -1, 1.5, 1_000_001, '2', null].map(quantity => ({ ...input, quantity })),
    ...['2023-02-29', '2024-04-31', '2024-13-01', '0000-01-01', '', null].map(date => ({ ...input, date })),
    { ...input, description: 'x'.repeat(1001) }, { ...input, description: null },
    { ...input, unexpected: true }, {}, [],
  ];
  for (const body of badBodies) {
    const response = await post(body);
    assert.equal(response.status, 400, JSON.stringify(body));
    const error = await response.json();
    assert.equal(error.statusCode, 400);
    assert.equal(error.error, 'Bad Request');
    assert.ok(Array.isArray(error.message));
  }
  assert.equal((await (await fetch(`${base}/expenses?date=${input.date}`)).json()).length, 2);
});

test('date query validation rejects invalid, repeated, and unrecognized inputs on both routes', async () => {
  for (const route of ['expenses', 'expenses/summary']) {
    for (const query of ['date=2023-02-29', 'date=', 'date=2024-01-01&date=2024-01-02', 'other=1']) {
      const response = await fetch(`${base}/${route}?${query}`);
      assert.equal(response.status, 400, `${route}?${query}`);
      assert.equal((await response.json()).statusCode, 400);
    }
  }
});

test('CORS enables the configured frontend origin', async () => {
  const response = await fetch(`${base}/health`, { headers: { Origin: config.webOrigin } });
  assert.equal(response.headers.get('access-control-allow-origin'), config.webOrigin);
  const preflight = await fetch(`${base}/expenses`, { method: 'OPTIONS', headers: { Origin: config.webOrigin, 'Access-Control-Request-Method': 'POST' } });
  assert.equal(preflight.status, 204);
});
