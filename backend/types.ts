export interface Transaction {
  id: string;
  type: "income" | "expense" | "savings";
  amount: number;
  categoryId: string;
  date: string;
  comment?: string;
  savingsGoalId?: string;
  recurringPaymentId?: string;
  debtId?: string;
  debtName?: string;
  debtDirection?: "i_owe" | "owed_to_me";
  debtEvent?: "created" | "payment";
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  createdAt: string;
}

export interface RecurringPayment {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  period: "weekly" | "monthly" | "yearly";
  nextDate: string;
  active: boolean;
  createdAt: string;
}

export interface BudgetLimit {
  id: string;
  categoryId: string;
  limit: number;
  month: string; // YYYY-MM
}

export interface Debt {
  id: string;
  name: string;
  direction: "i_owe" | "owed_to_me";
  totalAmount: number;
  paidAmount: number;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  usernameKey: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}
