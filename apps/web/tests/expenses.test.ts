import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { createApiAdapter, createMockAdapter, errorMessage, STORAGE_KEY, type StoragePort } from "../src/lib/expenses";
import { dateLabel, money, today, validDate } from "../src/lib/format";
import { validateForm, type FormFields } from "../src/lib/validation";
import { initialSummaryState, reduceSummary } from "../src/lib/summary-state";

class MemoryStorage implements StoragePort {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
const clock = () => new Date("2026-10-07T15:00:00.000Z");
const form: FormFields = { name: "  Almuerzo  ", amount: "12,50", quantity: "3", date: "2026-10-06", description: "  Con amigos  " };

test("mock create, exact cents totals independent of quantity, date filtering and reload persistence", async () => {
  const storage = new MemoryStorage();
  const adapter = createMockAdapter(storage, clock);
  assert.equal((await adapter.summary("2026-10-07")).total, "104.50");
  const payload = validateForm(form).value!;
  const created = await adapter.create(payload);
  assert.match(created.id, /^[\da-f-]{36}$/);
  assert.equal(created.name, "Almuerzo");
  assert.equal(created.description, "Con amigos");
  await adapter.create({ name: "Extra", amount: "0.10", quantity: 1000000, date: "2026-10-06" });
  await adapter.create({ name: "Extra 2", amount: "0.20", quantity: 7, date: "2026-10-06" });
  const reloaded = createMockAdapter(storage, clock);
  const yesterday = await reloaded.summary("2026-10-06");
  assert.equal(yesterday.total, "12.80");
  assert.equal(yesterday.count, 3);
  assert.equal(yesterday.expenses.every((e) => e.date === "2026-10-06"), true);
  assert.equal((await reloaded.summary("2026-10-07")).count, 2);
  assert.deepEqual(await reloaded.summary("2026-10-08"), { date: "2026-10-08", total: "0.00", count: 0, expenses: [] });
  assert.ok(storage.getItem(STORAGE_KEY)?.includes(created.id));
});

test("mock defaults to local day, supports future date and stable descending timestamps", async () => {
  const storage = new MemoryStorage();
  let time = new Date("2026-10-08T02:30:00Z"); // still October 7 in La Paz
  const adapter = createMockAdapter(storage, () => time);
  const first = await adapter.create({ name: "Primero", amount: "1", quantity: 1 });
  assert.equal(first.date, "2026-10-07");
  time = new Date("2026-10-08T03:00:00Z");
  const second = await adapter.create({ name: "Segundo", amount: "2.00", quantity: 1 });
  assert.equal((await adapter.list("2026-10-07"))[0].id, second.id);
  const future = await adapter.create({ name: "Futuro", amount: "9.99", quantity: 2, date: "2028-02-29" });
  assert.equal((await adapter.summary("2028-02-29")).total, future.amount);
  await assert.rejects(adapter.list("2026-02-30"), /fecha válida/);
  await assert.rejects(adapter.create({ name: "Fecha vacía", amount: "1", quantity: 1, date: "" }), /fecha válida/);
});

test("shared input validation rejects invalid, zero, excess precision, overflow and fractional quantity", () => {
  const valid = validateForm(form);
  assert.equal(valid.value?.amount, "12.50");
  for (const amount of ["0", "-1", "12.345", "99999999999", "1e2", "", "1,2,3"]) {
    assert.ok(validateForm({ ...form, amount }).errors.amount, amount);
  }
  for (const quantity of ["0", "-1", "1.5", "1000001", "", "1e2"]) {
    assert.ok(validateForm({ ...form, quantity }).errors.quantity, quantity);
  }
  assert.ok(validateForm({ ...form, name: " ", date: "2025-02-29", description: "x".repeat(1001) }).errors.name);
  assert.ok(validateForm({ ...form, date: "2025-02-29" }).errors.date);
  assert.ok(validateForm({ ...form, description: "x".repeat(1001) }).errors.description);
  assert.equal(validateForm({ ...form, amount: "9999999999.99", quantity: "1000000" }).value?.amount, "9999999999.99");
});

test("large money totals are exact and retain all cents", async () => {
  const storage = new MemoryStorage(); storage.setItem(STORAGE_KEY, "[]");
  const adapter = createMockAdapter(storage, clock);
  for (let i = 0; i < 100; i++) await adapter.create({ name: `Gasto ${i}`, amount: "9999999999.99", quantity: 1000000, date: "2026-10-07" });
  assert.equal((await adapter.summary("2026-10-07")).total, "999999999999.00");
});

test("storage corruption and blocked writes never report a successful save", async () => {
  const storage = new MemoryStorage(); storage.setItem(STORAGE_KEY, "broken");
  const adapter = createMockAdapter(storage, clock);
  await assert.rejects(adapter.summary("2026-10-07"), /Conservamos/);
  assert.equal(storage.getItem(STORAGE_KEY), "broken");
  const blocked = createMockAdapter({ getItem: () => "[]", setItem: () => { throw new Error("QuotaExceeded"); } }, clock);
  await assert.rejects(blocked.create({ name: "Gasto", amount: "1.00", quantity: 1 }), /no permitió guardar/);
});

test("date helpers use calendar day in configured timezone and render early years correctly", () => {
  assert.equal(today(new Date("2026-10-08T02:30:00Z")), "2026-10-07");
  assert.equal(validDate("2000-02-29"), true);
  assert.equal(validDate("1900-02-29"), false);
  assert.equal(validDate("0000-01-01"), false);
  assert.ok(dateLabel("0099-01-01").includes("99"));
  assert.ok(!dateLabel("0099-01-01").includes("1999"));
  assert.equal(money("1234.50"), "Bs 1.234,50");
});

test("Axios adapter uses canonical paths and payload, preserves decimal strings and maps Spanish errors", async () => {
  const original = axios.defaults.adapter;
  const calls: { url?: string; params?: unknown; data?: unknown }[] = [];
  axios.defaults.adapter = async (config) => {
    calls.push({ url: config.url, params: config.params, data: config.data });
    return { status: 200, statusText: "OK", config, headers: {}, data: config.url === "/health"
      ? { status: "ok", storage: "memory" }
      : { date: "2026-10-06", total: "12.50", count: 1, expenses: [] } };
  };
  try {
    const adapter = createApiAdapter("http://example.invalid/api/");
    assert.equal(await adapter.health(), "memory");
    assert.equal((await adapter.summary("2026-10-06")).total, "12.50");
    await adapter.list("2026-10-06");
    await adapter.create(validateForm(form).value!);
    assert.deepEqual(calls.map((call) => call.url), ["/health", "/expenses/summary", "/expenses", "/expenses"]);
    assert.deepEqual(calls[1].params, { date: "2026-10-06" });
    assert.equal(JSON.parse(calls[3].data as string).quantity, 3);
    assert.equal(JSON.parse(calls[3].data as string).amount, "12.50");
    assert.match(errorMessage(new axios.AxiosError("offline")), /conectar/);
  } finally { axios.defaults.adapter = original; }
});

test("clearing the selected date removes expenses/total; reselecting loads again and stale responses are ignored", async () => {
  const adapter = createMockAdapter(new MemoryStorage(), clock);
  let state = reduceSummary(initialSummaryState, { type: "select", date: "2026-10-07" });
  state = reduceSummary(state, { type: "loaded", date: "2026-10-07", summary: await adapter.summary("2026-10-07") });
  assert.equal(state.summary?.total, "104.50");
  state = reduceSummary(state, { type: "select", date: "" });
  assert.equal(state.summary, null);
  assert.equal(state.loading, false);
  assert.match(state.error, /fecha válida/);
  state = reduceSummary(state, { type: "loaded", date: "2026-10-07", summary: await adapter.summary("2026-10-07") });
  assert.equal(state.summary, null);
  state = reduceSummary(state, { type: "select", date: "2026-10-07" });
  assert.equal(state.loading, true);
  assert.equal(state.error, "");
  state = reduceSummary(state, { type: "loaded", date: "2026-10-07", summary: await adapter.summary("2026-10-07") });
  assert.equal(state.summary?.count, 2);
  state = reduceSummary(state, { type: "select", date: "2026-10-08" });
  state = reduceSummary(state, { type: "failed", date: "2026-10-07", error: "Late failure" });
  assert.equal(state.error, "");
  state = reduceSummary(state, { type: "loaded", date: "2026-10-08", summary: await adapter.summary("2026-10-08") });
  assert.equal(state.summary?.total, "0.00");
});
