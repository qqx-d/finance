import type { Transaction, Category, SavingsGoal, RecurringPayment, BudgetLimit } from "./types.ts";

const kv = await Deno.openKv();

// --- Transactions ---

export async function getTransactions(month?: string): Promise<Transaction[]> {
  const entries = kv.list<Transaction>({ prefix: ["transactions"] });
  const results: Transaction[] = [];
  for await (const entry of entries) {
    const tx = entry.value;
    if (month) {
      const txMonth = tx.date.substring(0, 7);
      if (txMonth === month) results.push(tx);
    } else {
      results.push(tx);
    }
  }
  results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return results;
}

export async function createTransaction(tx: Transaction): Promise<Transaction> {
  await kv.set(["transactions", tx.id], tx);
  return tx;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const entry = await kv.get<Transaction>(["transactions", id]);
  if (!entry.value) return false;
  await kv.delete(["transactions", id]);
  return true;
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const entry = await kv.get<Transaction>(["transactions", id]);
  return entry.value;
}

// --- Categories ---

export async function getCategories(): Promise<Category[]> {
  const entries = kv.list<Category>({ prefix: ["categories"] });
  const results: Category[] = [];
  for await (const entry of entries) {
    results.push(entry.value);
  }
  return results;
}

export async function createCategory(cat: Category): Promise<Category> {
  await kv.set(["categories", cat.id], cat);
  return cat;
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<Category | null> {
  const entry = await kv.get<Category>(["categories", id]);
  if (!entry.value) return null;
  const updated = { ...entry.value, ...data, id };
  await kv.set(["categories", id], updated);
  return updated;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const entry = await kv.get<Category>(["categories", id]);
  if (!entry.value) return false;
  await kv.delete(["categories", id]);
  return true;
}

// --- Savings Goals ---

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const entries = kv.list<SavingsGoal>({ prefix: ["savings"] });
  const results: SavingsGoal[] = [];
  for await (const entry of entries) {
    results.push(entry.value);
  }
  return results;
}

export async function getSavingsGoal(id: string): Promise<SavingsGoal | null> {
  const entry = await kv.get<SavingsGoal>(["savings", id]);
  return entry.value;
}

export async function createSavingsGoal(goal: SavingsGoal): Promise<SavingsGoal> {
  await kv.set(["savings", goal.id], goal);
  return goal;
}

export async function updateSavingsGoal(id: string, data: Partial<SavingsGoal>): Promise<SavingsGoal | null> {
  const entry = await kv.get<SavingsGoal>(["savings", id]);
  if (!entry.value) return null;
  const updated = { ...entry.value, ...data, id };
  await kv.set(["savings", id], updated);
  return updated;
}

export async function deleteSavingsGoal(id: string): Promise<boolean> {
  const entry = await kv.get<SavingsGoal>(["savings", id]);
  if (!entry.value) return false;
  await kv.delete(["savings", id]);
  return true;
}

// --- Recurring Payments ---

export async function getRecurringPayments(): Promise<RecurringPayment[]> {
  const entries = kv.list<RecurringPayment>({ prefix: ["recurring"] });
  const results: RecurringPayment[] = [];
  for await (const entry of entries) {
    results.push(entry.value);
  }
  return results;
}

export async function createRecurringPayment(rp: RecurringPayment): Promise<RecurringPayment> {
  await kv.set(["recurring", rp.id], rp);
  return rp;
}

export async function updateRecurringPayment(id: string, data: Partial<RecurringPayment>): Promise<RecurringPayment | null> {
  const entry = await kv.get<RecurringPayment>(["recurring", id]);
  if (!entry.value) return null;
  const updated = { ...entry.value, ...data, id };
  await kv.set(["recurring", id], updated);
  return updated;
}

export async function deleteRecurringPayment(id: string): Promise<boolean> {
  const entry = await kv.get<RecurringPayment>(["recurring", id]);
  if (!entry.value) return false;
  await kv.delete(["recurring", id]);
  return true;
}

// --- Budget Limits ---

export async function getBudgetLimits(month?: string): Promise<BudgetLimit[]> {
  const entries = kv.list<BudgetLimit>({ prefix: ["budgets"] });
  const results: BudgetLimit[] = [];
  for await (const entry of entries) {
    if (month && entry.value.month !== month) continue;
    results.push(entry.value);
  }
  return results;
}

export async function setBudgetLimit(bl: BudgetLimit): Promise<BudgetLimit> {
  await kv.set(["budgets", bl.id], bl);
  return bl;
}

export async function deleteBudgetLimit(id: string): Promise<boolean> {
  const entry = await kv.get<BudgetLimit>(["budgets", id]);
  if (!entry.value) return false;
  await kv.delete(["budgets", id]);
  return true;
}

// --- All Transactions (no month filter) ---

export async function getAllTransactions(): Promise<Transaction[]> {
  const entries = kv.list<Transaction>({ prefix: ["transactions"] });
  const results: Transaction[] = [];
  for await (const entry of entries) {
    results.push(entry.value);
  }
  return results;
}

// --- Seed default categories ---

export async function seedDefaults() {
  const cats = await getCategories();
  if (cats.length > 0) return;

  const defaults: Category[] = [
    { id: "cat-income-salary", name: "Зарплата", type: "income" },
    { id: "cat-income-freelance", name: "Фриланс", type: "income" },
    { id: "cat-income-gifts", name: "Подарки", type: "income" },
    { id: "cat-income-invest", name: "Инвестиции", type: "income" },
    { id: "cat-expense-food", name: "Еда", type: "expense" },
    { id: "cat-expense-transport", name: "Транспорт", type: "expense" },
    { id: "cat-expense-housing", name: "Жильё", type: "expense" },
    { id: "cat-expense-subs", name: "Подписки", type: "expense" },
    { id: "cat-expense-fun", name: "Развлечения", type: "expense" },
    { id: "cat-expense-shopping", name: "Покупки", type: "expense" },
  ];

  for (const cat of defaults) {
    await createCategory(cat);
  }
}
