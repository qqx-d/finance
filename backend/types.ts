export interface Transaction {
  id: string;
  type: "income" | "expense" | "savings";
  amount: number;
  categoryId: string;
  date: string;
  comment?: string;
  savingsGoalId?: string;
  recurringPaymentId?: string;
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
