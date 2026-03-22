import type {
  Transaction,
  Category,
  SavingsGoal,
  RecurringPayment,
  MonthStats,
  AuthResponse,
  PublicUser,
} from "./types";

const BASE = "/api";
const AUTH_STORAGE_KEY = "finance.authToken";

let authToken = typeof window !== "undefined" ? window.localStorage.getItem(AUTH_STORAGE_KEY) : null;

function buildHeaders(options?: RequestInit): Headers {
  const headers = new Headers(options?.headers);
  if (options?.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  return headers;
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.error === "string") {
      return data.error;
    }
  } catch {
    // Ignore non-JSON errors.
  }
  return `API error: ${res.status}`;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: buildHeaders(options),
    ...options,
  });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function hasAuthToken() {
  return Boolean(authToken);
}

export function setAuthToken(token: string) {
  authToken = token;
  window.localStorage.setItem(AUTH_STORAGE_KEY, token);
}

export function clearAuthToken() {
  authToken = null;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

// Auth
export const register = (data: { username: string; password: string }) =>
  request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) });

export const login = (data: { username: string; password: string }) =>
  request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) });

export const getMe = () => request<{ user: PublicUser }>("/auth/me");

export const logout = () => request<{ ok: boolean }>("/auth/logout", { method: "POST" });

// Transactions
export const getTransactions = (month?: string, categoryId?: string, type?: string) => {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (categoryId) params.set("categoryId", categoryId);
  if (type) params.set("type", type);
  const qs = params.toString();
  return request<Transaction[]>(`/transactions${qs ? "?" + qs : ""}`);
};

export const createTransaction = (data: Partial<Transaction>) =>
  request<Transaction>("/transactions", { method: "POST", body: JSON.stringify(data) });

export const deleteTransaction = (id: string) =>
  request<{ ok: boolean }>(`/transactions/${encodeURIComponent(id)}`, { method: "DELETE" });

// Categories
export const getCategories = () => request<Category[]>("/categories");

export const createCategory = (data: { name: string; type: string }) =>
  request<Category>("/categories", { method: "POST", body: JSON.stringify(data) });

export const updateCategory = (id: string, data: Partial<Category>) =>
  request<Category>(`/categories/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteCategory = (id: string) =>
  request<{ ok: boolean }>(`/categories/${encodeURIComponent(id)}`, { method: "DELETE" });

// Savings
export const getSavingsGoals = () => request<SavingsGoal[]>("/savings");

export const createSavingsGoal = (data: { name: string; targetAmount: number }) =>
  request<SavingsGoal>("/savings", { method: "POST", body: JSON.stringify(data) });

export const updateSavingsGoal = (id: string, data: Partial<SavingsGoal>) =>
  request<SavingsGoal>(`/savings/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteSavingsGoal = (id: string) =>
  request<{ ok: boolean }>(`/savings/${encodeURIComponent(id)}`, { method: "DELETE" });

export const depositToGoal = (id: string, amount: number) =>
  request<{ goal: SavingsGoal; transaction: Transaction }>(`/savings/${encodeURIComponent(id)}/deposit`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });

// Recurring
export const getRecurringPayments = () => request<RecurringPayment[]>("/recurring");

export const createRecurringPayment = (data: Partial<RecurringPayment>) =>
  request<RecurringPayment>("/recurring", { method: "POST", body: JSON.stringify(data) });

export const updateRecurringPayment = (id: string, data: Partial<RecurringPayment>) =>
  request<RecurringPayment>(`/recurring/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteRecurringPayment = (id: string) =>
  request<{ ok: boolean }>(`/recurring/${encodeURIComponent(id)}`, { method: "DELETE" });

export const processRecurring = () =>
  request<{ processed: number }>("/recurring/process", { method: "POST" });

// Stats
export const getStats = (month?: string) => {
  const qs = month ? `?month=${month}` : "";
  return request<MonthStats>(`/stats${qs}`);
};

// Budgets
export const getBudgetLimits = (month?: string) => {
  const qs = month ? `?month=${month}` : "";
  return request<import("./types").BudgetLimit[]>(`/budgets${qs}`);
};

export const createBudgetLimit = (data: { categoryId: string; limit: number; month: string }) =>
  request<import("./types").BudgetLimit>("/budgets", { method: "POST", body: JSON.stringify(data) });

export const updateBudgetLimit = (id: string, data: Partial<import("./types").BudgetLimit>) =>
  request<import("./types").BudgetLimit>(`/budgets/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteBudgetLimit = (id: string) =>
  request<{ ok: boolean }>(`/budgets/${encodeURIComponent(id)}`, { method: "DELETE" });

// Analytics
export const getAnalytics = (month?: string) => {
  const qs = month ? `?month=${month}` : "";
  return request<import("./types").Analytics>(`/analytics${qs}`);
};

// Export
export async function downloadExport(format: "json" | "csv"): Promise<Blob> {
  const res = await fetch(`${BASE}/export?format=${format}`, {
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.blob();
}
