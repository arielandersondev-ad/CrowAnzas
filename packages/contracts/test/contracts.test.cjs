const { test } = require('node:test');
const assert = require('node:assert/strict');
const c = require('../dist/index.js');

test('decimal costs sum exactly, including large totals, independent of quantity', () => {
  assert.equal(c.sumAmounts(['0.10', '0.20']), '0.30');
  assert.equal(c.sumAmounts([]), '0.00');
  assert.equal(c.sumAmounts(['9999999999.99', '9999999999.99']), '19999999999.98');
  const expenses = [{amount:'20.10',quantity:4},{amount:'0.20',quantity:100}];
  assert.equal(c.sumAmounts(expenses.map(e=>e.amount)), '20.30');
});
test('amount boundaries and precision reject invalid transport input', () => {
  for (const amount of ['0', '-1', '1.001', '10000000000', '1e2', '1,20', '', ' 1', 1, null]) {
    assert.throws(()=>c.normalizeAmount(amount));
  }
  assert.equal(c.normalizeAmount('0000000001.2'), '1.20');
  assert.equal(c.normalizeAmount(c.MAX_AMOUNT), c.MAX_AMOUNT);
});
test('calendar validation covers leap centuries and forbids impossible dates', () => {
  for (const day of ['2024-02-29','2000-02-29','0001-01-01','2026-12-31']) assert.equal(c.isValidDate(day),true);
  for (const day of ['1900-02-29','2026-02-29','2026-04-31','2026-1-01','0000-01-01','2026-00-01']) assert.equal(c.isValidDate(day),false);
  assert.equal(c.todayInTimezone(undefined,new Date('2026-10-07T02:00:00Z')),'2026-10-06');
  assert.equal(c.todayInTimezone(undefined,new Date('2026-10-07T04:00:00Z')),'2026-10-07');
});
test('validation normalizes values without defaulting omitted service date', () => {
  assert.deepEqual(c.validateCreateExpense({name:'  Mercado  ',amount:'12.3',quantity:2,description:'  fruta  '}),{name:'Mercado',amount:'12.30',quantity:2,description:'fruta'});
  assert.throws(()=>c.validateCreateExpense({name:' ',amount:'0',quantity:1.5,date:'2026-02-30',description:'a'.repeat(1001)}),e=>Object.keys(e.errors).length===5);
  assert.throws(()=>c.validateCreateExpense(null),c.ExpenseValidationError);
});
