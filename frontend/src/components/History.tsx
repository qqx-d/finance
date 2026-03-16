import { useState } from "react";
import type { Transaction, Category } from "../types";
import { IconBack, IconIncome, IconExpense, IconSavings } from "./Icons";
import CustomDropdown from "./CustomDropdown";

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTHS_RU[parseInt(m) - 1]} ${y}`;
}

function formatAmount(n: number): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20AC";
}

function formatDate(d: string): string {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  transactions: Transaction[];
  categories: Category[];
  categoryMap: Record<string, Category>;
  month: string;
  onMonthChange: (delta: number) => void;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export default function History({ transactions, categories, categoryMap, month, onMonthChange, onBack, onDelete }: Props) {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  let filtered = sorted;
  if (filterType !== "all") {
    filtered = filtered.filter((t) => t.type === filterType);
  }
  if (filterCategory !== "all") {
    filtered = filtered.filter((t) => t.categoryId === filterCategory);
  }

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><IconBack /></button>
        <h2>История операций</h2>
      </div>

      <div className="month-picker">
        <button onClick={() => onMonthChange(-1)}>&#x2039;</button>
        <span className="month-text">{formatMonth(month)}</span>
        <button onClick={() => onMonthChange(1)}>&#x203A;</button>
      </div>

      <div className="filters">
        <button className={`filter-chip ${filterType === "all" ? "active" : ""}`} onClick={() => setFilterType("all")}>Все</button>
        <button className={`filter-chip ${filterType === "income" ? "active" : ""}`} onClick={() => setFilterType("income")}>Доходы</button>
        <button className={`filter-chip ${filterType === "expense" ? "active" : ""}`} onClick={() => setFilterType("expense")}>Расходы</button>
        <button className={`filter-chip ${filterType === "savings" ? "active" : ""}`} onClick={() => setFilterType("savings")}>Накопления</button>
      </div>

      <div style={{ padding: "0 16px 12px" }}>
        <CustomDropdown
          value={filterCategory}
          onChange={setFilterCategory}
          options={[
            { value: "all", label: "Все категории" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </div>

      <div className="section" style={{ paddingTop: 0 }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p>Нет операций</p>
          </div>
        ) : (
          <div className="tx-list">
            {filtered.map((tx) => {
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
                  <div className="tx-item-actions">
                    <div className={`tx-amount ${tx.type}`}>
                      {tx.type === "income" ? "+" : "\u2212"}{formatAmount(tx.amount)}
                    </div>
                    <button className="delete-btn" onClick={() => onDelete(tx.id)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
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
