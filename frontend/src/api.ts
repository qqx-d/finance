import type { Transaction, Category, SavingsGoal, RecurringPayment, MonthStats } from "./types";

const BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

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
export const getExportUrl = (format: "json" | "csv") => `${BASE}/export?format=${format}`;
