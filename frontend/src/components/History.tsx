import { useState } from "react";
import type { Transaction, Category, SavingsGoal } from "../types";
import { IconBack, IconIncome, IconExpense, IconSavings } from "./Icons";
import CustomDropdown from "./CustomDropdown";
import InlineDatePicker from "./InlineDatePicker";

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
  savingsGoals: SavingsGoal[];
  categoryMap: Record<string, Category>;
  month: string;
  onMonthChange: (delta: number) => void;
  onBack: () => void;
  onEdit: (id: string, data: {
    type: "income" | "expense" | "savings";
    amount: number;
    categoryId: string;
    date: string;
    comment: string;
    savingsGoalId?: string;
  }) => Promise<void>;
  onDelete: (id: string) => void;
}

export default function History({ transactions, categories, savingsGoals, categoryMap, month, onMonthChange, onBack, onEdit, onDelete }: Props) {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [editType, setEditType] = useState<"income" | "expense" | "savings">("expense");
  const [editAmount, setEditAmount] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editSavingsGoalId, setEditSavingsGoalId] = useState("");
  const [editDate, setEditDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [editComment, setEditComment] = useState("");
  const [editError, setEditError] = useState("");

  const savingsGoalMap = Object.fromEntries(savingsGoals.map((g) => [g.id, g]));
  const editCategories = categories.filter((c) => c.type === editType);

  const getTransactionTitle = (tx: Transaction): string => {
    if (tx.debtId) {
      if (tx.debtEvent === "created") {
        return "Взял в долг";
      }
      return tx.debtDirection === "owed_to_me" ? "Мне вернули долг" : "Я погасил долг";
    }
    return categoryMap[tx.categoryId]?.name || savingsGoalMap[tx.savingsGoalId || ""]?.name || "Накопление";
  };

  const getTransactionSubtitle = (tx: Transaction): string | undefined => {
    if (tx.debtId && tx.debtName) {
      return tx.debtName;
    }
    return tx.comment;
  };

  const openEdit = (tx: Transaction) => {
    setEditError("");
    setEditId(tx.id);
    setEditType(tx.type);
    setEditAmount(String(tx.amount));
    setEditCategoryId(tx.categoryId || "");
    setEditSavingsGoalId(tx.savingsGoalId || "");
    setEditDate(tx.date);
    setEditComment(tx.comment || "");
  };

  const closeEdit = () => {
    setEditError("");
    setEditId(null);
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    const amount = parseFloat(editAmount);
    if (!amount || amount <= 0) return;
    if (editType === "savings" && !editSavingsGoalId) return;
    if (editType !== "savings" && !editCategoryId) return;
    try {
      setEditError("");
      await onEdit(editId, {
        type: editType,
        amount,
        categoryId: editType === "savings" ? "" : editCategoryId,
        date: editDate,
        comment: editComment,
        savingsGoalId: editType === "savings" ? editSavingsGoalId : undefined,
      });
      closeEdit();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Не удалось сохранить изменения");
    }
  };

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
              const subtitle = getTransactionSubtitle(tx);
              return (
                <div key={tx.id} className="tx-item">
                  <div className={`tx-icon ${tx.type}`}>
                    {tx.type === "income" ? <IconIncome /> : tx.type === "savings" ? <IconSavings /> : <IconExpense />}
                  </div>
                  <div className="tx-info">
                    <div className="tx-category">{getTransactionTitle(tx)}</div>
                    {subtitle && <div className="tx-comment">{subtitle}</div>}
                    <div className="tx-date">{formatDate(tx.date)}</div>
                  </div>
                  <div className="tx-item-actions">
                    <div className={`tx-amount ${tx.type}`}>
                      {tx.type === "income" ? "+" : "\u2212"}{formatAmount(tx.amount)}
                    </div>
                    <button className="btn btn-outline btn-sm" style={{ width: "auto" }} onClick={() => openEdit(tx)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
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

      {editId && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeEdit()}>
          <div className="modal-sheet">
            <div className="modal-header">
              <h2>Редактировать операцию</h2>
              <button className="modal-close" onClick={closeEdit}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="type-selector">
              <button className={`type-btn ${editType === "income" ? "active-income" : ""}`} onClick={() => { setEditType("income"); setEditSavingsGoalId(""); }}>
                Доход
              </button>
              <button className={`type-btn ${editType === "expense" ? "active-expense" : ""}`} onClick={() => { setEditType("expense"); setEditSavingsGoalId(""); }}>
                Расход
              </button>
              <button className={`type-btn ${editType === "savings" ? "active-income" : ""}`} onClick={() => { setEditType("savings"); setEditCategoryId(""); }}>
                Накопление
              </button>
            </div>

            <div className="form-group">
              <label>Сумма</label>
              <input type="number" inputMode="decimal" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} step="0.01" min="0" autoFocus />
            </div>

            {editType === "savings" ? (
              <div className="form-group">
                <label>Цель накопления</label>
                <div className="category-grid">
                  {savingsGoals.map((g) => (
                    <button key={g.id} className={`category-chip${editSavingsGoalId === g.id ? " active" : ""}`} onClick={() => setEditSavingsGoalId(g.id)}>
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label>Категория</label>
                <div className="category-grid">
                  {editCategories.map((c) => (
                    <button key={c.id} className={`category-chip${editCategoryId === c.id ? " active" : ""}`} onClick={() => setEditCategoryId(c.id)}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Дата</label>
              <InlineDatePicker value={editDate} onChange={setEditDate} />
            </div>

            <div className="form-group">
              <label>Комментарий (необязательно)</label>
              <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} rows={2} />
            </div>

            {editError && (
              <div className="alert-banner danger" style={{ marginBottom: 10 }}>
                {editError}
              </div>
            )}

            <button className="btn btn-primary" onClick={handleSaveEdit}>Сохранить</button>
          </div>
        </div>
      )}
    </div>
  );
}
