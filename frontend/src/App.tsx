import { useState, useEffect, useCallback } from "react";
import type {
  Transaction,
  Category,
  MonthStats,
  SavingsGoal,
  RecurringPayment,
  BudgetLimit,
  Debt,
  Analytics,
  PublicUser,
  AuthResponse,
} from "./types";
import * as api from "./api";
import MainScreen from "./components/MainScreen";
import AddTransaction from "./components/AddTransaction";
import History from "./components/History";
import SavingsGoals from "./components/SavingsGoals";
import RecurringPayments from "./components/RecurringPayments";
import Charts from "./components/Charts";
import Settings from "./components/Settings";
import CategoryManager from "./components/CategoryManager";
import PaymentCalendar from "./components/PaymentCalendar";
import HabitAnalysis from "./components/HabitAnalysis";
import BudgetManager from "./components/BudgetManager";
import Debts from "./components/Debts";
import AuthScreen from "./components/AuthScreen";

type Page = "home" | "history" | "savings" | "recurring" | "charts" | "settings" | "categories" | "calendar" | "habits" | "budgetManager" | "debts";

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [showAdd, setShowAdd] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<PublicUser | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [budgets, setBudgets] = useState<BudgetLimit[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const resetData = useCallback(() => {
    setTransactions([]);
    setCategories([]);
    setStats(null);
    setSavingsGoals([]);
    setRecurringPayments([]);
    setBudgets([]);
    setDebts([]);
    setAnalytics(null);
  }, []);

  const loadData = useCallback(async () => {
    if (!authUser) return;
    try {
      const [txs, cats, st, goals, recs, budg, deb, anl] = await Promise.all([
        api.getTransactions(month),
        api.getCategories(),
        api.getStats(month),
        api.getSavingsGoals(),
        api.getRecurringPayments(),
        api.getBudgetLimits(month),
        api.getDebts(),
        api.getAnalytics(month),
      ]);
      setTransactions(txs);
      setCategories(cats);
      setStats(st);
      setSavingsGoals(goals);
      setRecurringPayments(recs);
      setBudgets(budg);
      setDebts(deb);
      setAnalytics(anl);
    } catch (e) {
      console.error("Failed to load data:", e);
    }
  }, [authUser, month]);

  useEffect(() => {
    if (!api.hasAuthToken()) {
      setAuthReady(true);
      return;
    }

    api.getMe()
      .then(({ user }) => {
        setAuthUser(user);
      })
      .catch(() => {
        api.clearAuthToken();
        setAuthUser(null);
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);

  useEffect(() => {
    if (!authUser) {
      resetData();
      return;
    }
    loadData();
  }, [authUser, loadData, resetData]);

  // Process recurring payments on load
  useEffect(() => {
    if (!authUser) return;
    api.processRecurring().then(() => loadData()).catch(() => {});
  }, [authUser, loadData]);

  // Apply saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const handleMonthChange = (delta: number) => {
    const d = new Date(month + "-01");
    d.setMonth(d.getMonth() + delta);
    setMonth(d.toISOString().substring(0, 7));
  };

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const handleAuthenticated = ({ token, user }: AuthResponse) => {
    api.setAuthToken(token);
    setAuthUser(user);
    setPage("home");
    setShowAdd(false);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout transport errors and clear local session anyway.
    }
    api.clearAuthToken();
    setAuthUser(null);
    resetData();
    setPage("home");
    setShowAdd(false);
  };

  if (!authReady) {
    return (
      <div className="auth-shell">
        <div className="auth-card auth-loading">Проверка сессии...</div>
      </div>
    );
  }

  if (!authUser) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  const renderPage = () => {
    switch (page) {
      case "history":
        return (
          <History
            transactions={transactions}
            categories={categories}
            savingsGoals={savingsGoals}
            categoryMap={categoryMap}
            month={month}
            onMonthChange={handleMonthChange}
            onBack={() => setPage("home")}
            onEdit={async (id, data) => { await api.updateTransaction(id, data); loadData(); }}
            onDelete={async (id) => {
              await api.deleteTransaction(id);
              loadData();
            }}
          />
        );
      case "savings":
        return (
          <SavingsGoals
            goals={savingsGoals}
            onBack={() => setPage("home")}
            onRefresh={loadData}
          />
        );
      case "recurring":
        return (
          <RecurringPayments
            payments={recurringPayments}
            categories={categories}
            onBack={() => setPage("home")}
            onRefresh={loadData}
          />
        );
      case "charts":
        return (
          <Charts
            stats={stats}
            categoryMap={categoryMap}
            month={month}
            onMonthChange={handleMonthChange}
            onBack={() => setPage("home")}
          />
        );
      case "settings":
        return (
          <Settings
            user={authUser}
            onBack={() => setPage("home")}
            onNavigate={(p: string) => setPage(p as Page)}
            onLogout={handleLogout}
          />
        );
      case "categories":
        return (
          <CategoryManager
            categories={categories}
            onBack={() => setPage("settings")}
            onRefresh={loadData}
          />
        );
      case "calendar":
        return (
          <PaymentCalendar
            recurringPayments={recurringPayments}
            categoryMap={categoryMap}
            onBack={() => setPage("settings")}
          />
        );
      case "habits":
        return (
          <HabitAnalysis
            analytics={analytics}
            categoryMap={categoryMap}
            onBack={() => setPage("settings")}
          />
        );
      case "budgetManager":
        return (
          <BudgetManager
            budgets={budgets}
            categories={categories}
            month={month}
            onBack={() => setPage("settings")}
            onRefresh={loadData}
          />
        );
      case "debts":
        return (
          <Debts
            debts={debts}
            onBack={() => setPage("settings")}
            onRefresh={loadData}
          />
        );
      default:
        return (
          <MainScreen
            stats={stats}
            transactions={transactions}
            categoryMap={categoryMap}
            month={month}
            onMonthChange={handleMonthChange}
            budgets={budgets}
            analytics={analytics}
            recurringPayments={recurringPayments}
          />
        );
    }
  };

  return (
    <>
      {renderPage()}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className={`nav-btn ${page === "home" ? "active" : ""}`} onClick={() => setPage("home")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Главная
        </button>
        <button className={`nav-btn ${page === "debts" ? "active" : ""}`} onClick={() => setPage("debts")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7h18" />
            <path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
            <rect x="3" y="7" width="18" height="13" rx="2" />
            <path d="M9 13h6" />
          </svg>
          Долги
        </button>
        <button className="nav-btn-add" onClick={() => setShowAdd(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button className={`nav-btn ${page === "history" ? "active" : ""}`} onClick={() => setPage("history")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          История
        </button>
        <button className={`nav-btn ${page === "settings" ? "active" : ""}`} onClick={() => setPage("settings")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Ещё
        </button>
      </nav>

      {/* Add Transaction Modal */}
      {showAdd && (
        <AddTransaction
          categories={categories}
          savingsGoals={savingsGoals}
          onClose={() => setShowAdd(false)}
          onSave={async (data) => {
            await api.createTransaction(data);
            setShowAdd(false);
            loadData();
          }}
        />
      )}
    </>
  );
}
