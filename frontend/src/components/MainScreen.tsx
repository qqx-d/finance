import type { Transaction, Category, MonthStats, BudgetLimit, Analytics, RecurringPayment } from "../types";
import { IconIncome, IconExpense, IconSavings } from "./Icons";

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTHS_RU[parseInt(m) - 1]} ${y}`;
}

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + "\u00A0\u20AC";
}

function fmtFull(n: number): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20AC";
}

function formatDate(d: string): string {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

interface Props {
  stats: MonthStats | null;
  transactions: Transaction[];
  categoryMap: Record<string, Category>;
  month: string;
  onMonthChange: (delta: number) => void;
  budgets: BudgetLimit[];
  analytics: Analytics | null;
  recurringPayments: RecurringPayment[];
  onQuickAdd: (data: { comment: string; amount: number; categoryId: string }) => void;
}

export default function MainScreen({
  stats, transactions, categoryMap, month, onMonthChange,
  budgets, analytics, recurringPayments, onQuickAdd,
}: Props) {
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const recent = sorted.slice(0, 5);

  // Budget alerts — categories at 80%+ of limit
  const budgetAlerts: { name: string; percent: number; spent: number; limit: number }[] = [];
  for (const b of budgets) {
    const spent = stats?.byCategory[b.categoryId] ?? 0;
    const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
    const name = categoryMap[b.categoryId]?.name ?? "";
    if (pct >= 80) {
      budgetAlerts.push({ name, percent: Math.round(pct), spent, limit: b.limit });
    }
  }

  // Upcoming recurring payments (next 3 days)
  const todayStr = new Date().toISOString().split("T")[0];
  const todayMs = new Date(todayStr + "T00:00:00").getTime();
  const upcoming = recurringPayments
    .filter((rp) => {
      if (!rp.active) return false;
      const diff = (new Date(rp.nextDate + "T00:00:00").getTime() - todayMs) / 86400000;
      return diff >= 0 && diff <= 3;
    })
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));

  return (
    <div>
      <div className="header">
        <h1>Мои финансы</h1>
        <div className="month-picker-header">
          <button onClick={() => onMonthChange(-1)}>&#x2039;</button>
          <span className="month-text">{formatMonth(month)}</span>
          <button onClick={() => onMonthChange(1)}>&#x203A;</button>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="label">Доходы</div>
          <div className="value income">{fmtFull(stats?.totalIncome ?? 0)}</div>
        </div>
        <div className="summary-card">
          <div className="label">Расходы</div>
          <div className="value expense">{fmtFull(stats?.totalExpense ?? 0)}</div>
        </div>
        <div className="summary-card">
          <div className="label">Баланс</div>
          <div className="value balance">{fmtFull(stats?.balance ?? 0)}</div>
        </div>
      </div>

      {/* Alerts: Budget warnings */}
      {budgetAlerts.length > 0 && (
        <div className="section" style={{ paddingBottom: 0 }}>
          {budgetAlerts.map((a) => (
            <div key={a.name} className={`alert-banner ${a.percent >= 100 ? "danger" : "warn"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {a.percent >= 100
                ? `${a.name}: лимит превышен (${fmt(a.spent)} / ${fmt(a.limit)})`
                : `${a.name}: потрачено ${a.percent}% бюджета`}
            </div>
          ))}
        </div>
      )}

      {/* Alerts: Upcoming payments */}
      {upcoming.length > 0 && (
        <div className="section" style={{ paddingBottom: 0 }}>
          {upcoming.map((rp) => {
            const diff = Math.round((new Date(rp.nextDate + "T00:00:00").getTime() - todayMs) / 86400000);
            const when = diff === 0 ? "Сегодня" : diff === 1 ? "Завтра" : `Через ${diff} дн.`;
            return (
              <div key={rp.id} className="alert-banner upcoming">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                {when} спишется {rp.name} — {fmt(rp.amount)}
              </div>
            );
          })}
        </div>
      )}

      {/* Forecast + Daily avg */}
      {analytics && analytics.totalExpense > 0 && (
        <div className="section" style={{ paddingBottom: 0 }}>
          <div className="info-row">
            <div className="info-card">
              <div className="info-card-label">Средний расход / день</div>
              <div className="info-card-value" style={{ color: "var(--red)" }}>{fmt(analytics.avgPerDay)}</div>
            </div>
            <div className="info-card">
              <div className="info-card-label">Прогноз на месяц</div>
              <div className="info-card-value" style={{ color: "var(--orange)" }}>{fmt(analytics.forecast)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Financial cushion */}
      {analytics && analytics.cushionMonths > 0 && (
        <div className="section" style={{ paddingBottom: 0 }}>
          <div className="info-card">
            <div className="info-card-label">Финансовая подушка</div>
            <div className="info-card-value" style={{ color: "var(--green)" }}>
              {analytics.cushionMonths.toFixed(1)} мес.
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
              Накопления покрывают {analytics.cushionMonths.toFixed(1)} месяцев расходов
            </div>
          </div>
        </div>
      )}

      {/* Budget limits */}
      {budgets.length > 0 && (
        <div className="section">
          <div className="section-title">Лимиты по категориям</div>
          {budgets.map((b) => {
            const spent = stats?.byCategory[b.categoryId] ?? 0;
            const pctRaw = b.limit > 0 ? (spent / b.limit) * 100 : 0;
            const pct = Math.min(100, pctRaw);
            const status = pctRaw >= 100 ? "over" : pctRaw >= 80 ? "warn" : "ok";
            return (
              <div key={b.id} className="budget-card">
                <div className="budget-card-header">
                  <span className="budget-card-name">{categoryMap[b.categoryId]?.name ?? "—"}</span>
                  <span className="budget-card-amounts">{fmt(spent)} / {fmt(b.limit)}</span>
                </div>
                <div className="budget-progress">
                  <div className={`budget-progress-fill ${status}`} style={{ width: `${pct}%` }} />
                </div>
                <div className={`budget-percent ${status}`}>{Math.round(pctRaw)}%</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Smart templates */}
      {analytics && analytics.templates.length > 0 && (
        <div className="section">
          <div className="section-title">Быстрое добавление</div>
          <div className="template-scroll">
            {analytics.templates.map((t, i) => (
              <button
                key={i}
                className="template-chip"
                onClick={() => onQuickAdd({ comment: t.comment, amount: t.amount, categoryId: t.categoryId })}
              >
                <span className="template-chip-name">{t.comment}</span>
                <span className="template-chip-amount">{fmtFull(t.amount)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="section">
        <div className="section-title">Последние операции</div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <p>Нет операций за этот месяц</p>
            <p className="sub">Нажмите + чтобы добавить</p>
          </div>
        ) : (
          <div className="tx-list">
            {recent.map((tx) => {
              const cat = categoryMap[tx.categoryId];
              return (
                <div key={tx.id} className="tx-item">
                  <div className={`tx-icon ${tx.type}`}>
                    {tx.type === "income" ? <IconIncome /> : tx.type === "savings" ? <IconSavings /> : <IconExpense />}
                  </div>
                  <div className="tx-info">
                    <div className="tx-category">{cat?.name || "Накопление"}</div>
                    {tx.comment && <div className="tx-comment">{tx.comment}</div>}
                    <div className="tx-date">{formatDate(tx.date)}</div>
                  </div>
                  <div className={`tx-amount ${tx.type}`}>
                    {tx.type === "income" ? "+" : "\u2212"}{fmtFull(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
