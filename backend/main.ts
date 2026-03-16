import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveDir } from "jsr:@std/http/file-server";
import * as db from "./db.ts";
import type { Transaction, Category, SavingsGoal, RecurringPayment, BudgetLimit } from "./types.ts";

const app = new Hono();

app.use("/*", cors());

// --- Transactions ---

app.get("/api/transactions", async (c) => {
  const month = c.req.query("month");
  const categoryId = c.req.query("categoryId");
  const type = c.req.query("type");
  let transactions = await db.getTransactions(month);
  if (categoryId) transactions = transactions.filter((t) => t.categoryId === categoryId);
  if (type) transactions = transactions.filter((t) => t.type === type);
  return c.json(transactions);
});

app.post("/api/transactions", async (c) => {
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
  await db.createTransaction(tx);

  if (tx.type === "savings" && tx.savingsGoalId) {
    const goal = await db.getSavingsGoal(tx.savingsGoalId);
    if (goal) {
      await db.updateSavingsGoal(goal.id, {
        currentAmount: goal.currentAmount + tx.amount,
      });
    }
  }

  return c.json(tx, 201);
});

app.delete("/api/transactions/:id", async (c) => {
  const id = c.req.param("id");
  const tx = await db.getTransaction(id);
  if (tx && tx.type === "savings" && tx.savingsGoalId) {
    const goal = await db.getSavingsGoal(tx.savingsGoalId);
    if (goal) {
      await db.updateSavingsGoal(goal.id, {
        currentAmount: Math.max(0, goal.currentAmount - tx.amount),
      });
    }
  }
  const ok = await db.deleteTransaction(id);
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});

// --- Categories ---

app.get("/api/categories", async (c) => {
  const cats = await db.getCategories();
  return c.json(cats);
});

app.post("/api/categories", async (c) => {
  const body = await c.req.json();
  const cat: Category = {
    id: crypto.randomUUID(),
    name: body.name,
    type: body.type,
  };
  await db.createCategory(cat);
  return c.json(cat, 201);
});

app.put("/api/categories/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await db.updateCategory(id, body);
  return updated ? c.json(updated) : c.json({ error: "Not found" }, 404);
});

app.delete("/api/categories/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await db.deleteCategory(id);
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});

// --- Savings Goals ---

app.get("/api/savings", async (c) => {
  const goals = await db.getSavingsGoals();
  return c.json(goals);
});

app.post("/api/savings", async (c) => {
  const body = await c.req.json();
  const goal: SavingsGoal = {
    id: crypto.randomUUID(),
    name: body.name,
    targetAmount: Number(body.targetAmount),
    currentAmount: 0,
    createdAt: new Date().toISOString(),
  };
  await db.createSavingsGoal(goal);
  return c.json(goal, 201);
});

app.put("/api/savings/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await db.updateSavingsGoal(id, body);
  return updated ? c.json(updated) : c.json({ error: "Not found" }, 404);
});

app.delete("/api/savings/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await db.deleteSavingsGoal(id);
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});

app.post("/api/savings/:id/deposit", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const amount = Number(body.amount);
  const goal = await db.getSavingsGoal(id);
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
  await db.createTransaction(tx);
  const updated = await db.updateSavingsGoal(id, {
    currentAmount: goal.currentAmount + amount,
  });
  return c.json({ goal: updated, transaction: tx });
});

// --- Recurring Payments ---

app.get("/api/recurring", async (c) => {
  const payments = await db.getRecurringPayments();
  return c.json(payments);
});

app.post("/api/recurring", async (c) => {
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
  await db.createRecurringPayment(rp);
  return c.json(rp, 201);
});

app.put("/api/recurring/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await db.updateRecurringPayment(id, body);
  return updated ? c.json(updated) : c.json({ error: "Not found" }, 404);
});

app.delete("/api/recurring/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await db.deleteRecurringPayment(id);
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});

app.post("/api/recurring/process", async (c) => {
  const today = new Date().toISOString().split("T")[0];
  const payments = await db.getRecurringPayments();
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
    await db.createTransaction(tx);
    created.push(tx);

    const next = new Date(rp.nextDate);
    if (rp.period === "weekly") next.setDate(next.getDate() + 7);
    else if (rp.period === "monthly") next.setMonth(next.getMonth() + 1);
    else if (rp.period === "yearly") next.setFullYear(next.getFullYear() + 1);

    await db.updateRecurringPayment(rp.id, {
      nextDate: next.toISOString().split("T")[0],
    });
  }

  return c.json({ processed: created.length, transactions: created });
});

// --- Stats ---

app.get("/api/stats", async (c) => {
  const month = c.req.query("month") || new Date().toISOString().substring(0, 7);
  const transactions = await db.getTransactions(month);

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
  const month = c.req.query("month");
  const budgets = await db.getBudgetLimits(month);
  return c.json(budgets);
});

app.post("/api/budgets", async (c) => {
  const body = await c.req.json();
  const bl: BudgetLimit = {
    id: crypto.randomUUID(),
    categoryId: body.categoryId,
    limit: Number(body.limit),
    month: body.month,
  };
  await db.setBudgetLimit(bl);
  return c.json(bl, 201);
});

app.put("/api/budgets/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  // Read existing, update, save
  const budgets = await db.getBudgetLimits();
  const existing = budgets.find((b) => b.id === id);
  if (!existing) return c.json({ error: "Not found" }, 404);
  const updated = { ...existing, ...body, id };
  await db.setBudgetLimit(updated);
  return c.json(updated);
});

app.delete("/api/budgets/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await db.deleteBudgetLimit(id);
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});

// --- Analytics (forecast, avg, habits, cushion, templates) ---

app.get("/api/analytics", async (c) => {
  const month = c.req.query("month") || new Date().toISOString().substring(0, 7);
  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === mon;
  const dayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth;

  const transactions = await db.getTransactions(month);
  const expenses = transactions.filter((t) => t.type === "expense");
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);

  // Average daily expense
  const avgPerDay = dayOfMonth > 0 ? totalExpense / dayOfMonth : 0;

  // Forecast to end of month
  const forecast = avgPerDay * daysInMonth;

  // Previous month comparison
  const prevDate = new Date(year, mon - 2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const prevTransactions = await db.getTransactions(prevMonth);
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

  // Smart templates — top 5 most frequent expense descriptions/amounts
  const allTransactions = await db.getAllTransactions();
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
  const savingsGoals = await db.getSavingsGoals();
  const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  // Use avg of last 3 months of expenses for cushion calc
  const months3: number[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(year, mon - 1 - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const txs = await db.getTransactions(m);
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
  const format = c.req.query("format") || "json";
  const transactions = await db.getTransactions();
  const categories = await db.getCategories();
  const savings = await db.getSavingsGoals();
  const recurring = await db.getRecurringPayments();

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

// --- Seed & Start ---

await db.seedDefaults();

// Process recurring payments on startup
const today = new Date().toISOString().split("T")[0];
const payments = await db.getRecurringPayments();
for (const rp of payments) {
  if (rp.active && rp.nextDate <= today) {
    console.log(`Processing recurring payment: ${rp.name}`);
  }
}

console.log("Finance API running on http://localhost:8000");

// Serve built frontend static files (production)
const distRoot = new URL("../frontend/dist", import.meta.url).pathname
  // On Windows, pathname starts with /C:/... — strip leading slash
  .replace(/^\/([A-Za-z]:)/, "$1");

app.get("*", async (c) => {
  const res = await serveDir(c.req.raw, { fsRoot: distRoot, quiet: true });
  if (res.status === 404) {
    // SPA fallback — return index.html
    try {
      const html = await Deno.readTextFile(distRoot + "/index.html");
      return c.html(html);
    } catch {
      return res;
    }
  }
  return res;
});

Deno.serve({ port: 8000 }, app.fetch);
