import { useState } from "react";
import type { Category, SavingsGoal } from "../types";
import InlineDatePicker from "./InlineDatePicker";

interface Props {
  categories: Category[];
  savingsGoals: SavingsGoal[];
  onClose: () => void;
  onSave: (data: {
    type: "income" | "expense" | "savings";
    amount: number;
    categoryId: string;
    date: string;
    comment: string;
    savingsGoalId?: string;
  }) => void;
}

export default function AddTransaction({ categories, savingsGoals, onClose, onSave }: Props) {
  const [type, setType] = useState<"income" | "expense" | "savings">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [comment, setComment] = useState("");
  const [savingsGoalId, setSavingsGoalId] = useState("");

  const filteredCategories = categories.filter((c) =>
    type === "savings" ? false : c.type === type
  );

  const handleSubmit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    if (type !== "savings" && !categoryId) return;
    if (type === "savings" && !savingsGoalId) return;
    onSave({
      type,
      amount: amt,
      categoryId: type === "savings" ? "" : categoryId,
      date,
      comment,
      savingsGoalId: type === "savings" ? savingsGoalId : undefined,
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-header">
          <h2>Новая операция</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="type-selector">
          <button
            className={`type-btn ${type === "income" ? "active-income" : ""}`}
            onClick={() => { setType("income"); setCategoryId(""); }}
          >
            Доход
          </button>
          <button
            className={`type-btn ${type === "expense" ? "active-expense" : ""}`}
            onClick={() => { setType("expense"); setCategoryId(""); }}
          >
            Расход
          </button>
          <button
            className={`type-btn ${type === "savings" ? "active-income" : ""}`}
            onClick={() => { setType("savings"); setCategoryId(""); }}
          >
            Накопление
          </button>
        </div>

        <div className="form-group">
          <label>Сумма</label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            step="0.01"
            min="0"
          />
        </div>

        {type === "savings" ? (
          <div className="form-group">
            <label>Цель накопления</label>
            <div className="category-grid">
              {savingsGoals.map((g) => (
                <button
                  key={g.id}
                  className={`category-chip${savingsGoalId === g.id ? " active" : ""}`}
                  onClick={() => setSavingsGoalId(g.id)}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label>Категория</label>
            <div className="category-grid">
              {filteredCategories.map((c) => (
                <button
                  key={c.id}
                  className={`category-chip${categoryId === c.id ? " active" : ""}`}
                  onClick={() => setCategoryId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Дата</label>
          <InlineDatePicker value={date} onChange={setDate} />
        </div>

        <div className="form-group">
          <label>Комментарий (необязательно)</label>
          <textarea
            placeholder="Описание операции..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
          />
        </div>

        <button
          className={`btn ${type === "expense" ? "btn-red" : "btn-green"}`}
          onClick={handleSubmit}
          disabled={!amount || parseFloat(amount) <= 0}
        >
          {type === "income" ? "Добавить доход" : type === "expense" ? "Добавить расход" : "Отложить в накопление"}
        </button>
      </div>
    </div>
  );
}
