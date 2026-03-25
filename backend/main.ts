import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveDir } from "jsr:@std/http/file-server";
import * as db from "./db.ts";
import {
  createPasswordCredentials,
  createSessionToken,
  isValidUsername,
  normalizeUsername,
  verifyPassword,
} from "./auth.ts";
import type {
  Transaction,
  Category,
  SavingsGoal,
  RecurringPayment,
  BudgetLimit,
  Debt,
  User,
  Session,
} from "./types.ts";

type AppVariables = {
  user: User;
};

type PublicUser = Pick<User, "id" | "username" | "createdAt">;

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const publicAuthPaths = new Set(["/api/auth/register", "/api/auth/login"]);

const app = new Hono<{ Variables: AppVariables }>();

app.use("/*", cors());

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
  };
}

function getTokenFromRequest(c: Parameters<typeof app.fetch>[0] extends never ? never : any): string {
  const header = c.req.header("Authorization") || "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
}

async function createUserSession(userId: string): Promise<Session> {
  const now = new Date();
  const session: Session = {
    token: createSessionToken(),
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
  };
  await db.createSession(session);
  return session;
}

app.use("/api/*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (publicAuthPaths.has(path)) {
    await next();
    return;
  }

  const token = getTokenFromRequest(c);
  if (!token) {
    return c.json({ error: "Требуется авторизация" }, 401);
  }

  const session = await db.getSession(token);
  if (!session) {
    return c.json({ error: "Сессия не найдена" }, 401);
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await db.deleteSession(token);
    return c.json({ error: "Сессия истекла" }, 401);
  }

  const user = await db.getUser(session.userId);
  if (!user) {
    await db.deleteSession(token);
    return c.json({ error: "Пользователь не найден" }, 401);
  }

  c.set("user", user);
  await next();
});

app.post("/api/auth/register", async (c) => {
  const body = await c.req.json();
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!isValidUsername(username)) {
    return c.json({ error: "Логин должен быть длиной 3-32 символа и без пробелов" }, 400);
  }

  if (password.length < 6) {
    return c.json({ error: "Пароль должен быть не короче 6 символов" }, 400);
  }

  const credentials = await createPasswordCredentials(password);
  const user: User = {
    id: crypto.randomUUID(),
    username,
    usernameKey: normalizeUsername(username),
    passwordHash: credentials.passwordHash,
    passwordSalt: credentials.passwordSalt,
    createdAt: new Date().toISOString(),
  };

  const createdUser = await db.createUser(user);
  if (!createdUser) {
    return c.json({ error: "Пользователь с таким логином уже существует" }, 409);
  }

  await db.seedDefaults(createdUser.id);
  const session = await createUserSession(createdUser.id);

  return c.json({ token: session.token, user: toPublicUser(createdUser) }, 201);
});

app.post("/api/auth/login", async (c) => {
  const body = await c.req.json();
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  const user = await db.getUserByUsername(username);
  if (!user || !(await verifyPassword(password, user))) {
    return c.json({ error: "Неверный логин или пароль" }, 401);
  }

  await db.seedDefaults(user.id);
  const session = await createUserSession(user.id);
  return c.json({ token: session.token, user: toPublicUser(user) });
});

app.get("/api/auth/me", async (c) => {
  return c.json({ user: toPublicUser(c.get("user")) });
});

app.post("/api/auth/logout", async (c) => {
  const token = getTokenFromRequest(c);
  if (token) {
    await db.deleteSession(token);
  }
  return c.json({ ok: true });
});

// --- Transactions ---

app.get("/api/transactions", async (c) => {
  const user = c.get("user");
  const month = c.req.query("month");
  const categoryId = c.req.query("categoryId");
  const type = c.req.query("type");
  let transactions = await db.getTransactions(user.id, month);
  if (categoryId) transactions = transactions.filter((t) => t.categoryId === categoryId);
  if (type) transactions = transactions.filter((t) => t.type === type);
  return c.json(transactions);
});

app.post("/api/transactions", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const tx: Transaction = {
    id: crypto.randomUUID(),
    type: body.type,
    amount: Number(body.amount),
    categoryId: body.categoryId,
    date: body.date || new Date().toISOString().split("T")[0],
    comment: body.comment || "",
    savingsGoalId: body.savingsGoalId,
    recurringPaymentId: body.recurringPaymentId,
    createdAt: new Date().toISOString(),
  };
  await db.createTransaction(user.id, tx);

  if (tx.type === "savings" && tx.savingsGoalId) {
    const goal = await db.getSavingsGoal(user.id, tx.savingsGoalId);
    if (goal) {
      await db.updateSavingsGoal(user.id, goal.id, {
        currentAmount: goal.currentAmount + tx.amount,
      });
    }
  }

  return c.json(tx, 201);
});

app.put("/api/transactions/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await db.updateTransaction(user.id, id, {
    type: body.type,
    amount: body.amount !== undefined ? Number(body.amount) : undefined,
    categoryId: body.categoryId,
    date: body.date,
    comment: body.comment,
    savingsGoalId: body.savingsGoalId,
  });
  return updated ? c.json(updated) : c.json({ error: "Not found" }, 404);
});

app.delete("/api/transactions/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const tx = await db.getTransaction(user.id, id);
  if (tx?.debtId) {
    const transactions = await db.getAllTransactions(user.id);
    const debtTransactions = transactions.filter((item) => item.debtId === tx.debtId);
    for (const item of debtTransactions) {
      await db.deleteTransaction(user.id, item.id);
    }
    await db.deleteDebt(user.id, tx.debtId);
    return c.json({ ok: true });
  }

  if (tx && tx.type === "savings" && tx.savingsGoalId) {
    const goal = await db.getSavingsGoal(user.id, tx.savingsGoalId);
    if (goal) {
      await db.updateSavingsGoal(user.id, goal.id, {
        currentAmount: Math.max(0, goal.currentAmount - tx.amount),
      });
    }
  }
  const ok = await db.deleteTransaction(user.id, id);
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});

// --- Categories ---

app.get("/api/categories", async (c) => {
  const user = c.get("user");
  const cats = await db.getCategories(user.id);
  return c.json(cats);
});

app.post("/api/categories", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const cat: Category = {
    id: crypto.randomUUID(),
    name: body.name,
    type: body.type,
  };
  await db.createCategory(user.id, cat);
  return c.json(cat, 201);
});

app.put("/api/categories/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await db.updateCategory(user.id, id, body);
  return updated ? c.json(updated) : c.json({ error: "Not found" }, 404);
});

app.delete("/api/categories/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const ok = await db.deleteCategory(user.id, id);
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});

// --- Savings Goals ---

app.get("/api/savings", async (c) => {
  const user = c.get("user");
  const goals = await db.getSavingsGoals(user.id);
  return c.json(goals);
});

app.post("/api/savings", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const goal: SavingsGoal = {
    id: crypto.randomUUID(),
    name: body.name,
    targetAmount: Number(body.targetAmount),
    currentAmount: 0,
    createdAt: new Date().toISOString(),
  };
  await db.createSavingsGoal(user.id, goal);
  return c.json(goal, 201);
});

app.put("/api/savings/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await db.updateSavingsGoal(user.id, id, body);
  return updated ? c.json(updated) : c.json({ error: "Not found" }, 404);
});

app.delete("/api/savings/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const ok = await db.deleteSavingsGoal(user.id, id);
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});

app.post("/api/savings/:id/deposit", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const amount = Number(body.amount);
  const goal = await db.getSavingsGoal(user.id, id);
  if (!goal) return c.json({ error: "Not found" }, 404);

  const tx: Transaction = {
    id: crypto.randomUUID(),
    type: "savings",
    amount,
    categoryId: "",
    date: new Date().toISOString().split("T")[0],
    comment: `Пополнение: ${goal.name}`,
    savingsGoalId: id,
    createdAt: new Date().toISOString(),
  };
  await db.createTransaction(user.id, tx);
  const updated = await db.updateSavingsGoal(user.id, id, {
    currentAmount: goal.currentAmount + amount,
  });
  return c.json({ goal: updated, transaction: tx });
});

// --- Recurring Payments ---

app.get("/api/recurring", async (c) => {
  const user = c.get("user");
  const payments = await db.getRecurringPayments(user.id);
  return c.json(payments);
});

app.post("/api/recurring", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const rp: RecurringPayment = {
    id: crypto.randomUUID(),
    name: body.name,
    amount: Number(body.amount),
    categoryId: body.categoryId,
    period: body.period,
    nextDate: body.nextDate || new Date().toISOString().split("T")[0],
    active: true,
    createdAt: new Date().toISOString(),
  };
  await db.createRecurringPayment(user.id, rp);
  return c.json(rp, 201);
});

app.put("/api/recurring/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await db.updateRecurringPayment(user.id, id, body);
  return updated ? c.json(updated) : c.json({ error: "Not found" }, 404);
});

app.delete("/api/recurring/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const ok = await db.deleteRecurringPayment(user.id, id);
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});

app.post("/api/recurring/process", async (c) => {
  const user = c.get("user");
  const today = new Date().toISOString().split("T")[0];
  const payments = await db.getRecurringPayments(user.id);
  const created: Transaction[] = [];

  for (const rp of payments) {
    if (!rp.active || rp.nextDate > today) continue;

    const tx: Transaction = {
      id: crypto.randomUUID(),
      type: "expense",
      amount: rp.amount,
      categoryId: rp.categoryId,
      date: rp.nextDate,
      comment: `Повторяющийся: ${rp.name}`,
      recurringPaymentId: rp.id,
      createdAt: new Date().toISOString(),
    };
    await db.createTransaction(user.id, tx);
    created.push(tx);

    const next = new Date(rp.nextDate);
    if (rp.period === "weekly") next.setDate(next.getDate() + 7);
    else if (rp.period === "monthly") next.setMonth(next.getMonth() + 1);
    else if (rp.period === "yearly") next.setFullYear(next.getFullYear() + 1);

    await db.updateRecurringPayment(user.id, rp.id, {
      nextDate: next.toISOString().split("T")[0],
    });
  }

  return c.json({ processed: created.length, transactions: created });
});

// --- Stats ---

app.get("/api/stats", async (c) => {
  const user = c.get("user");
  const month = c.req.query("month") || new Date().toISOString().substring(0, 7);
  const transactions = await db.getTransactions(user.id, month);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSavings = transactions
    .filter((t) => t.type === "savings")
    .reduce((sum, t) => sum + t.amount, 0);

  const byCategory: Record<string, number> = {};
  for (const t of transactions.filter((t) => t.type === "expense")) {
    byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount;
  }

  const byDay: Record<string, number> = {};
  for (const t of transactions.filter((t) => t.type === "expense")) {
    byDay[t.date] = (byDay[t.date] || 0) + t.amount;
  }

  return c.json({
    month,
    totalIncome,
    totalExpense,
    totalSavings,
    balance: totalIncome - totalExpense - totalSavings,
    byCategory,
    byDay,
  });
});

// --- Budget Limits ---

app.get("/api/budgets", async (c) => {
  const user = c.get("user");
  const month = c.req.query("month");
  const budgets = await db.getBudgetLimits(user.id, month);
  return c.json(budgets);
});

app.post("/api/budgets", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const bl: BudgetLimit = {
    id: crypto.randomUUID(),
    categoryId: body.categoryId,
    limit: Number(body.limit),
    month: body.month,
  };
  await db.setBudgetLimit(user.id, bl);
  return c.json(bl, 201);
});

app.put("/api/budgets/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  // Read existing, update, save
  const budgets = await db.getBudgetLimits(user.id);
  const existing = budgets.find((b) => b.id === id);
  if (!existing) return c.json({ error: "Not found" }, 404);
  const updated = { ...existing, ...body, id };
  await db.setBudgetLimit(user.id, updated);
  return c.json(updated);
});

app.delete("/api/budgets/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const ok = await db.deleteBudgetLimit(user.id, id);
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});

// --- Debts ---

app.get("/api/debts", async (c) => {
  const user = c.get("user");
  const debts = (await db.getDebts(user.id)).map((debt) => ({
    ...debt,
    direction: debt.direction || "i_owe",
  }));
  return c.json(debts);
});

app.post("/api/debts", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const debt: Debt = {
    id: crypto.randomUUID(),
    name: body.name,
    direction: body.direction === "owed_to_me" ? "owed_to_me" : "i_owe",
    totalAmount: Number(body.totalAmount),
    paidAmount: 0,
    createdAt: new Date().toISOString(),
  };
  await db.createDebt(user.id, debt);

  const tx: Transaction = {
    id: crypto.randomUUID(),
    type: "expense",
    amount: debt.totalAmount,
    categoryId: "cat-expense-debt-created",
    date: new Date().toISOString().split("T")[0],
    comment: debt.direction === "i_owe"
      ? `Добавлен долг: ${debt.name}`
      : `Выдан долг: ${debt.name}`,
    debtId: debt.id,
    debtName: debt.name,
    debtDirection: debt.direction,
    debtEvent: "created",
    createdAt: new Date().toISOString(),
  };
  await db.createTransaction(user.id, tx);

  return c.json(debt, 201);
});

app.put("/api/debts/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await db.updateDebt(user.id, id, {
    name: body.name,
    direction: body.direction,
    totalAmount: body.totalAmount !== undefined ? Number(body.totalAmount) : undefined,
    paidAmount: body.paidAmount !== undefined ? Number(body.paidAmount) : undefined,
  });
  return updated ? c.json(updated) : c.json({ error: "Not found" }, 404);
});

app.delete("/api/debts/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const transactions = await db.getAllTransactions(user.id);
  const debtTransactions = transactions.filter((tx) => tx.debtId === id);
  for (const tx of debtTransactions) {
    await db.deleteTransaction(user.id, tx.id);
  }
  const ok = await db.deleteDebt(user.id, id);
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});

app.post("/api/debts/:id/pay", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return c.json({ error: "Некорректная сумма" }, 400);
  }

  const debt = await db.getDebt(user.id, id);
  if (!debt) return c.json({ error: "Not found" }, 404);

  const paidAmount = Math.min(debt.totalAmount, debt.paidAmount + amount);
  const actualAmount = paidAmount - debt.paidAmount;
  if (actualAmount <= 0) {
    return c.json({ error: "Долг уже полностью закрыт" }, 400);
  }

  const tx: Transaction = {
    id: crypto.randomUUID(),
    type: debt.direction === "owed_to_me" ? "income" : "expense",
    amount: actualAmount,
    categoryId: debt.direction === "owed_to_me" ? "cat-income-debts" : "cat-expense-debts",
    date: new Date().toISOString().split("T")[0],
    comment: debt.direction === "owed_to_me"
      ? `Возврат по долгу: ${debt.name}`
      : `Погашение долга: ${debt.name}`,
    debtId: debt.id,
    debtName: debt.name,
    debtDirection: debt.direction,
    debtEvent: "payment",
    createdAt: new Date().toISOString(),
  };
  await db.createTransaction(user.id, tx);

  const updated = await db.updateDebt(user.id, id, { paidAmount });
  return updated ? c.json(updated) : c.json({ error: "Not found" }, 404);
});

// --- Analytics (forecast, avg, habits, cushion, templates) ---

app.get("/api/analytics", async (c) => {
  const user = c.get("user");
  const month = c.req.query("month") || new Date().toISOString().substring(0, 7);
  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === mon;
  const dayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth;

  const transactions = await db.getTransactions(user.id, month);
  const expenses = transactions.filter((t) => t.type === "expense");
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);

  // Average daily expense
  const avgPerDay = dayOfMonth > 0 ? totalExpense / dayOfMonth : 0;

  // Forecast to end of month
  const forecast = avgPerDay * daysInMonth;

  // Previous month comparison
  const prevDate = new Date(year, mon - 2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const prevTransactions = await db.getTransactions(user.id, prevMonth);
  const prevExpenses = prevTransactions.filter((t) => t.type === "expense");
  const prevTotalExpense = prevExpenses.reduce((s, t) => s + t.amount, 0);

  // By category comparison
  const prevByCategory: Record<string, number> = {};
  for (const t of prevExpenses) {
    prevByCategory[t.categoryId] = (prevByCategory[t.categoryId] || 0) + t.amount;
  }

  const currentByCategory: Record<string, number> = {};
  for (const t of expenses) {
    currentByCategory[t.categoryId] = (currentByCategory[t.categoryId] || 0) + t.amount;
  }

  const categoryComparison: Record<string, { current: number; previous: number; changePercent: number }> = {};
  const allCatIds = new Set([...Object.keys(currentByCategory), ...Object.keys(prevByCategory)]);
  for (const catId of allCatIds) {
    const curr = currentByCategory[catId] || 0;
    const prev = prevByCategory[catId] || 0;
    const changePercent = prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : 0);
    categoryComparison[catId] = { current: curr, previous: prev, changePercent };
  }

  // Smart templates - top 5 most frequent expense descriptions/amounts
  const allTransactions = await db.getAllTransactions(user.id);
  const allExpenses = allTransactions.filter((t) => t.type === "expense" && t.comment);
  const commentMap: Record<string, { count: number; amount: number; categoryId: string }> = {};
  for (const t of allExpenses) {
    const key = `${t.comment}|${t.categoryId}`;
    if (!commentMap[key]) {
      commentMap[key] = { count: 0, amount: 0, categoryId: t.categoryId };
    }
    commentMap[key].count++;
    commentMap[key].amount = t.amount; // last used amount
  }
  const templates = Object.entries(commentMap)
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([key, v]) => ({
      comment: key.split("|")[0],
      amount: v.amount,
      categoryId: v.categoryId,
      count: v.count,
    }));

  // Financial cushion
  const savingsGoals = await db.getSavingsGoals(user.id);
  const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  // Use avg of last 3 months of expenses for cushion calc
  const months3: number[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(year, mon - 1 - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const txs = await db.getTransactions(user.id, m);
    months3.push(txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0));
  }
  const avgMonthlyExpense = months3.reduce((a, b) => a + b, 0) / Math.max(months3.filter((m) => m > 0).length, 1);
  const cushionMonths = avgMonthlyExpense > 0 ? totalSaved / avgMonthlyExpense : 0;

  return c.json({
    month,
    daysInMonth,
    dayOfMonth,
    totalExpense,
    avgPerDay,
    forecast,
    prevMonth,
    prevTotalExpense,
    categoryComparison,
    templates,
    totalSaved,
    avgMonthlyExpense,
    cushionMonths,
  });
});

// --- Export ---

app.get("/api/export", async (c) => {
  const user = c.get("user");
  const format = c.req.query("format") || "json";
  const transactions = await db.getTransactions(user.id);
  const categories = await db.getCategories(user.id);
  const savings = await db.getSavingsGoals(user.id);
  const recurring = await db.getRecurringPayments(user.id);

  if (format === "csv") {
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
    const lines = ["date,type,amount,category,comment"];
    for (const t of transactions) {
      const cat = catMap[t.categoryId] || t.categoryId;
      const comment = (t.comment || "").replace(/"/g, '""');
      lines.push(`${t.date},${t.type},${t.amount},"${cat}","${comment}"`);
    }
    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=finance-export.csv",
      },
    });
  }

  return c.json({ transactions, categories, savings, recurring });
});

// --- Start ---

const portArgIndex = Deno.args.findIndex((arg) => arg === "--port");
const port = portArgIndex >= 0 ? Number(Deno.args[portArgIndex + 1] || "8000") : 8000;

console.log(`Finance API starting on http://localhost:${port}`);

// Serve built frontend static files (production)
const distRoot = new URL("../frontend/dist", import.meta.url).pathname
  // On Windows, pathname starts with /C:/... - strip leading slash
  .replace(/^\/([A-Za-z]:)/, "$1");

app.get("*", async (c) => {
  const pathname = new URL(c.req.url).pathname;
  if (pathname.startsWith("/api/")) {
    return c.json({ error: "Not found" }, 404);
  }

  const res = await serveDir(c.req.raw, { fsRoot: distRoot, quiet: true });
  if (res.status === 404) {
    // SPA fallback - return index.html
    try {
      const html = await Deno.readTextFile(distRoot + "/index.html");
      return c.html(html);
    } catch {
      return res;
    }
  }
  return res;
});

Deno.serve({ port }, app.fetch);
