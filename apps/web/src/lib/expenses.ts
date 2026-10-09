import axios from "axios";
import {
  validateCreateExpense, validateCreateUser, sumAmounts,
  type CreateExpense, type CreateUser, type DailySummary, type Expense,
  type ExpenseWithUser, type HealthResponse, type User, type UsersDailySummary,
} from "@crowanzas/contracts";
import { validDate, today } from "./format";

export const STORAGE_KEY = "crowanzas.data.v2";
export interface ExpenseAdapter {
  health(): Promise<"local" | "memory" | "prisma">;
  users(): Promise<User[]>;
  createUser(value: CreateUser): Promise<User>;
  user(userId: string): Promise<User>;
  create(userId: string, value: CreateExpense): Promise<Expense>;
  list(userId: string, date?: string): Promise<Expense[]>;
  summary(userId: string, date?: string): Promise<DailySummary>;
  allExpenses(date?: string): Promise<ExpenseWithUser[]>;
  dailySummary(date?: string): Promise<UsersDailySummary>;
}
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
interface LocalData { users: User[]; expenses: Expense[] }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestamp = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));

function isUser(value: unknown): value is User {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const user = value as User;
  return typeof user.id === "string" && UUID.test(user.id)
    && typeof user.name === "string" && user.name.trim().length > 0 && user.name.length <= 120
    && timestamp(user.createdAt) && timestamp(user.updatedAt);
}
function isExpense(value: unknown): value is Expense {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const e = value as Expense;
  if (typeof e.id !== "string" || !UUID.test(e.id) || typeof e.userId !== "string" || !UUID.test(e.userId)
    || typeof e.amount !== "string" || !/^\d{1,10}\.\d{2}$/.test(e.amount)
    || !validDate(e.date) || !timestamp(e.createdAt) || !timestamp(e.updatedAt)
    || !(e.description === null || typeof e.description === "string")) return false;
  try {
    validateCreateExpense({ name: e.name, amount: e.amount, quantity: e.quantity, date: e.date,
      ...(e.description === null ? {} : { description: e.description }) });
    return true;
  } catch { return false; }
}
function isLocalData(value: unknown): value is LocalData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as LocalData;
  if (!Array.isArray(data.users) || !data.users.every(isUser)
    || !Array.isArray(data.expenses) || !data.expenses.every(isExpense)) return false;
  const users = new Set(data.users.map(user => user.id));
  const expenses = new Set(data.expenses.map(expense => expense.id));
  return users.size === data.users.length && expenses.size === data.expenses.length
    && data.expenses.every(expense => users.has(expense.userId));
}
function assertDate(date?: string) {
  if (date !== undefined && !validDate(date)) throw new Error("Selecciona una fecha válida.");
}
const descending = (a: Expense, b: Expense) => b.createdAt.localeCompare(a.createdAt);

export function createMockAdapter(storage: StoragePort, now = () => new Date()): ExpenseAdapter {
  function write(data: LocalData) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch { throw new Error("El navegador no permitió guardar. Habilita el almacenamiento local e inténtalo otra vez."); }
  }
  function read(): LocalData {
    let raw: string | null;
    try { raw = storage.getItem(STORAGE_KEY); }
    catch { throw new Error("No se pudo leer el almacenamiento de este navegador."); }
    // The old mock key is intentionally neither read nor deleted.
    if (raw === null) return { users: [], expenses: [] };
    try {
      const data: unknown = JSON.parse(raw);
      if (!isLocalData(data)) throw new Error();
      return data;
    } catch { throw new Error("Los datos locales no se pudieron leer. Conservamos el contenido para evitar perder tus registros."); }
  }
  function owner(data: LocalData, userId: string): User {
    if (!UUID.test(userId)) throw new Error("El identificador del usuario no es válido.");
    const found = data.users.find(user => user.id === userId);
    if (!found) throw new Error("Este usuario ya no está disponible. Vuelve al inicio y selecciona otro.");
    return found;
  }
  function ownerExpenses(data: LocalData, userId: string, date?: string) {
    owner(data, userId); assertDate(date);
    return data.expenses.filter(expense => expense.userId === userId && (date === undefined || expense.date === date)).sort(descending);
  }
  return {
    async health() { return "local"; },
    async users() { return read().users; },
    async user(userId) { return owner(read(), userId); },
    async createUser(value) {
      const checked = validateCreateUser(value);
      const data = read();
      const date = now().toISOString();
      const user: User = { ...checked, id: crypto.randomUUID(), createdAt: date, updatedAt: date };
      write({ ...data, users: [...data.users, user] });
      return user;
    },
    async create(userId, value) {
      const data = read(); owner(data, userId);
      const checked = validateCreateExpense({ ...value, date: value.date ?? today(now()) });
      const date = now().toISOString();
      const expense: Expense = { ...checked, id: crypto.randomUUID(), userId, date: checked.date!,
        description: checked.description || null, createdAt: date, updatedAt: date };
      write({ ...data, expenses: [expense, ...data.expenses] });
      return expense;
    },
    async list(userId, date) { return ownerExpenses(read(), userId, date); },
    async summary(userId, date = today(now())) {
      const expenses = ownerExpenses(read(), userId, date);
      return { userId, date, total: sumAmounts(expenses.map(expense => expense.amount)), count: expenses.length, expenses };
    },
    async allExpenses(date) {
      assertDate(date);
      const data = read();
      const owners = new Map(data.users.map(user => [user.id, user]));
      return data.expenses.filter(expense => date === undefined || expense.date === date).sort(descending)
        .map(expense => ({ ...expense, user: owners.get(expense.userId)! }));
    },
    async dailySummary(date = today(now())) {
      assertDate(date);
      const data = read();
      const expenses = data.expenses.filter(expense => expense.date === date);
      const users = data.users.map(user => {
        const own = expenses.filter(expense => expense.userId === user.id);
        return { user, total: sumAmounts(own.map(expense => expense.amount)), count: own.length };
      });
      return { date, total: sumAmounts(expenses.map(expense => expense.amount)), count: expenses.length, users };
    },
  };
}

export function createApiAdapter(baseURL: string): ExpenseAdapter {
  const client = axios.create({ baseURL: baseURL.replace(/\/$/, ""), timeout: 12000, headers: { "Content-Type": "application/json" } });
  const path = (userId: string) => `/users/${encodeURIComponent(userId)}`;
  const params = (date?: string) => date === undefined ? {} : { params: { date } };
  return {
    async health() { return (await client.get<HealthResponse>("/health")).data.storage; },
    async users() { return (await client.get<User[]>("/users")).data; },
    async user(userId) { return (await client.get<User>(path(userId))).data; },
    async createUser(value) { return (await client.post<User>("/users", value)).data; },
    async create(userId, value) { return (await client.post<Expense>(`${path(userId)}/expenses`, value)).data; },
    async list(userId, date) { return (await client.get<Expense[]>(`${path(userId)}/expenses`, params(date))).data; },
    async summary(userId, date) { return (await client.get<DailySummary>(`${path(userId)}/expenses/summary`, params(date))).data; },
    async allExpenses(date) { return (await client.get<ExpenseWithUser[]>("/expenses", params(date))).data; },
    async dailySummary(date) { return (await client.get<UsersDailySummary>("/expenses/summary", params(date))).data; },
  };
}

export function getAdapter(): ExpenseAdapter {
  const mode = process.env.NEXT_PUBLIC_DATA_MODE || "mock";
  if (mode === "mock") {
    try { return createMockAdapter(window.localStorage); }
    catch { throw new Error("No se pudo acceder al almacenamiento de este navegador."); }
  }
  if (mode !== "api") throw new Error("El modo de datos configurado no es válido. Usa mock o api.");
  const baseURL = process.env.NEXT_PUBLIC_API_URL;
  if (!baseURL) throw new Error("Falta configurar la conexión con el servidor.");
  return createApiAdapter(baseURL);
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo otra vez.";
    if (error.response.status === 404) return "El usuario no está disponible. Vuelve al inicio y selecciona otro.";
    if (error.response.status === 400) return "El servidor no aceptó los datos. Revisa los campos y la fecha.";
    return "El servidor no pudo completar la solicitud. Inténtalo otra vez en un momento.";
  }
  return error instanceof Error ? error.message : "No se pudo completar la solicitud. Inténtalo otra vez.";
}
