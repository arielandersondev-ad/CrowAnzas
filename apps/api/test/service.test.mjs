import assert from 'node:assert/strict';
import { test } from 'node:test';
import { todayInTimezone } from '@crowanzas/contracts';
import { ExpenseService } from '../dist/expenses/expense.service.js';
import { MemoryExpenseRepository } from '../dist/expenses/memory.repository.js';
import { loadConfig } from '../dist/config.js';
import { serializeExpense } from '../dist/expenses/prisma.repository.js';
import { Prisma } from '../dist/generated/prisma/client.js';

test('timezone default is a calendar day at midnight boundaries', () => {
  assert.equal(todayInTimezone('America/La_Paz', new Date('2026-10-07T02:30:00Z')), '2026-10-06');
  assert.equal(todayInTimezone('America/La_Paz', new Date('2026-10-07T04:00:00Z')), '2026-10-07');
});

test('storage configuration never selects a fallback for missing or invalid database URL', () => {
  assert.equal(loadConfig({}).storage, 'memory');
  for (const DATABASE_URL of [undefined, '', 'https://example.com', 'postgresql://localhost/']) {
    assert.throws(() => loadConfig({ API_STORAGE: 'prisma', DATABASE_URL }), /DATABASE_URL/);
  }
  assert.equal(loadConfig({ API_STORAGE: 'prisma', DATABASE_URL: 'postgresql://localhost/expenses' }).storage, 'prisma');
  assert.throws(() => loadConfig({ API_STORAGE: 'invalid' }), /API_STORAGE/);
  assert.throws(() => loadConfig({ APP_TIMEZONE: 'invalid' }), /APP_TIMEZONE/);
  assert.throws(() => loadConfig({ API_PORT: '0' }), /API_PORT/);
  assert.throws(() => loadConfig({ WEB_ORIGIN: '*' }), /WEB_ORIGIN/);
});

test('repository protects stored records from caller mutations and isolates calendar days', async () => {
  const repository = new MemoryExpenseRepository('America/La_Paz', false);
  const service = new ExpenseService(repository, loadConfig({}));
  const expense = await service.create({ name: 'Test', amount: '1', quantity: 99, date: '2024-01-01' });
  expense.amount = '999.00';
  const list = await service.list('2024-01-01');
  list[0].name = 'mutated';
  assert.equal((await service.list('2024-01-01'))[0].name, 'Test');
  assert.equal((await service.summary('2024-01-01')).total, '1.00');
  assert.equal((await service.summary('2024-01-02')).total, '0.00');
});

test('Prisma serializer preserves date-only and Decimal without numeric precision loss', () => {
  const timestamp = new Date('2026-10-07T02:30:00Z');
  const result = serializeExpense({ id: 'id', name: 'Expense', amount: new Prisma.Decimal('9999999999.99'), quantity: 2, date: new Date('2024-02-29T00:00:00Z'), description: null, createdAt: timestamp, updatedAt: timestamp });
  assert.equal(result.amount, '9999999999.99');
  assert.equal(result.date, '2024-02-29');
  assert.equal(result.createdAt, '2026-10-07T02:30:00.000Z');
});
