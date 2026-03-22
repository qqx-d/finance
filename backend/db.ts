import type {
  Transaction,
  Category,
  SavingsGoal,
  RecurringPayment,
  BudgetLimit,
  User,
  Session,
} from "./types.ts";

const kv = await Deno.openKv();

function userKey(userId: string, bucket: string, id?: string) {
  return id ? ["users", userId, bucket, id] : ["users", userId, bucket];
}

function usernameKey(value: string) {
  return ["users_by_username", value];
}

// --- Users & Sessions ---

export async function getUser(id: string): Promise<User | null> {
  const entry = await kv.get<User>(["users", id]);
  return entry.value;
}

export async function getUserByUsername(usernameValue: string): Promise<User | null> {
  const normalized = usernameValue.trim().toLowerCase();
  const entry = await kv.get<string>(usernameKey(normalized));
  if (!entry.value) return null;
  return getUser(entry.value);
}

export async function createUser(user: User): Promise<User | null> {
  const result = await kv.atomic()
    .check({ key: usernameKey(user.usernameKey), versionstamp: null })
    .set(["users", user.id], user)
    .set(usernameKey(user.usernameKey), user.id)
    .commit();

  return result.ok ? user : null;
}

export async function createSession(session: Session): Promise<Session> {
  await kv.set(["sessions", session.token], session);
  return session;
}

export async function getSession(token: string): Promise<Session | null> {
  const entry = await kv.get<Session>(["sessions", token]);
  return entry.value;
}

export async function deleteSession(token: string): Promise<void> {
  await kv.delete(["sessions", token]);
}

// --- Transactions ---

export async function getTransactions(userId: string, month?: string): Promise<Transaction[]> {
  const entries = kv.list<Transaction>({ prefix: userKey(userId, "transactions") });
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

export async function createTransaction(userId: string, tx: Transaction): Promise<Transaction> {
  await kv.set(userKey(userId, "transactions", tx.id), tx);
  return tx;
}

export async function deleteTransaction(userId: string, id: string): Promise<boolean> {
  const entry = await kv.get<Transaction>(userKey(userId, "transactions", id));
  if (!entry.value) return false;
  await kv.delete(userKey(userId, "transactions", id));
  return true;
}

export async function getTransaction(userId: string, id: string): Promise<Transaction | null> {
  const entry = await kv.get<Transaction>(userKey(userId, "transactions", id));
  return entry.value;
}

// --- Categories ---

export async function getCategories(userId: string): Promise<Category[]> {
  const entries = kv.list<Category>({ prefix: userKey(userId, "categories") });
  const results: Category[] = [];
  for await (const entry of entries) {
    results.push(entry.value);
  }
  return results;
}

export async function createCategory(userId: string, cat: Category): Promise<Category> {
  await kv.set(userKey(userId, "categories", cat.id), cat);
  return cat;
}

export async function updateCategory(userId: string, id: string, data: Partial<Category>): Promise<Category | null> {
  const entry = await kv.get<Category>(userKey(userId, "categories", id));
  if (!entry.value) return null;
  const updated = { ...entry.value, ...data, id };
  await kv.set(userKey(userId, "categories", id), updated);
  return updated;
}

export async function deleteCategory(userId: string, id: string): Promise<boolean> {
  const entry = await kv.get<Category>(userKey(userId, "categories", id));
  if (!entry.value) return false;
  await kv.delete(userKey(userId, "categories", id));
  return true;
}

// --- Savings Goals ---

export async function getSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  const entries = kv.list<SavingsGoal>({ prefix: userKey(userId, "savings") });
  const results: SavingsGoal[] = [];
  for await (const entry of entries) {
    results.push(entry.value);
  }
  return results;
}

export async function getSavingsGoal(userId: string, id: string): Promise<SavingsGoal | null> {
  const entry = await kv.get<SavingsGoal>(userKey(userId, "savings", id));
  return entry.value;
}

export async function createSavingsGoal(userId: string, goal: SavingsGoal): Promise<SavingsGoal> {
  await kv.set(userKey(userId, "savings", goal.id), goal);
  return goal;
}

export async function updateSavingsGoal(userId: string, id: string, data: Partial<SavingsGoal>): Promise<SavingsGoal | null> {
  const entry = await kv.get<SavingsGoal>(userKey(userId, "savings", id));
  if (!entry.value) return null;
  const updated = { ...entry.value, ...data, id };
  await kv.set(userKey(userId, "savings", id), updated);
  return updated;
}

export async function deleteSavingsGoal(userId: string, id: string): Promise<boolean> {
  const entry = await kv.get<SavingsGoal>(userKey(userId, "savings", id));
  if (!entry.value) return false;
  await kv.delete(userKey(userId, "savings", id));
  return true;
}

// --- Recurring Payments ---

export async function getRecurringPayments(userId: string): Promise<RecurringPayment[]> {
  const entries = kv.list<RecurringPayment>({ prefix: userKey(userId, "recurring") });
  const results: RecurringPayment[] = [];
  for await (const entry of entries) {
    results.push(entry.value);
  }
  return results;
}

export async function createRecurringPayment(userId: string, rp: RecurringPayment): Promise<RecurringPayment> {
  await kv.set(userKey(userId, "recurring", rp.id), rp);
  return rp;
}

export async function updateRecurringPayment(userId: string, id: string, data: Partial<RecurringPayment>): Promise<RecurringPayment | null> {
  const entry = await kv.get<RecurringPayment>(userKey(userId, "recurring", id));
  if (!entry.value) return null;
  const updated = { ...entry.value, ...data, id };
  await kv.set(userKey(userId, "recurring", id), updated);
  return updated;
}

export async function deleteRecurringPayment(userId: string, id: string): Promise<boolean> {
  const entry = await kv.get<RecurringPayment>(userKey(userId, "recurring", id));
  if (!entry.value) return false;
  await kv.delete(userKey(userId, "recurring", id));
  return true;
}

// --- Budget Limits ---

export async function getBudgetLimits(userId: string, month?: string): Promise<BudgetLimit[]> {
  const entries = kv.list<BudgetLimit>({ prefix: userKey(userId, "budgets") });
  const results: BudgetLimit[] = [];
  for await (const entry of entries) {
    if (month && entry.value.month !== month) continue;
    results.push(entry.value);
  }
  return results;
}

export async function setBudgetLimit(userId: string, bl: BudgetLimit): Promise<BudgetLimit> {
  await kv.set(userKey(userId, "budgets", bl.id), bl);
  return bl;
}

export async function deleteBudgetLimit(userId: string, id: string): Promise<boolean> {
  const entry = await kv.get<BudgetLimit>(userKey(userId, "budgets", id));
  if (!entry.value) return false;
  await kv.delete(userKey(userId, "budgets", id));
  return true;
}

// --- All Transactions (no month filter) ---

export async function getAllTransactions(userId: string): Promise<Transaction[]> {
  const entries = kv.list<Transaction>({ prefix: userKey(userId, "transactions") });
  const results: Transaction[] = [];
  for await (const entry of entries) {
    results.push(entry.value);
  }
  return results;
}

// --- Seed default categories ---

export async function seedDefaults(userId: string) {
  const cats = await getCategories(userId);
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
    await createCategory(userId, cat);
  }
}
