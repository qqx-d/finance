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

export interface MonthStats {
  month: string;
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  balance: number;
  byCategory: Record<string, number>;
  byDay: Record<string, number>;
}

export interface BudgetLimit {
  id: string;
  categoryId: string;
  limit: number;
  month: string;
}

export interface Debt {
  id: string;
  name: string;
  direction: "i_owe" | "owed_to_me";
  totalAmount: number;
  paidAmount: number;
  createdAt: string;
}

export interface Analytics {
  month: string;
  daysInMonth: number;
  dayOfMonth: number;
  totalExpense: number;
  avgPerDay: number;
  forecast: number;
  prevMonth: string;
  prevTotalExpense: number;
  categoryComparison: Record<string, { current: number; previous: number; changePercent: number }>;
  templates: { comment: string; amount: number; categoryId: string; count: number }[];
  totalSaved: number;
  avgMonthlyExpense: number;
  cushionMonths: number;
}

export interface PublicUser {
  id: string;
  username: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}
