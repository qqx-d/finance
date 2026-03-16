import { useState } from "react";
import type { BudgetLimit, Category } from "../types";
import * as api from "../api";
import { IconBack } from "./Icons";

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + "\u00A0\u20AC";
}

interface Props {
  budgets: BudgetLimit[];
  categories: Category[];
  month: string;
  onBack: () => void;
  onRefresh: () => void;
}

export default function BudgetManager({ budgets, categories, month, onBack, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState("");
  const [limitAmount, setLimitAmount] = useState("");

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const existingCatIds = new Set(budgets.map((b) => b.categoryId));

  const openNew = () => {
    setEditId(null);
    setSelectedCat("");
    setLimitAmount("");
    setShowForm(true);
  };

  const openEdit = (b: BudgetLimit) => {
    setEditId(b.id);
    setSelectedCat(b.categoryId);
    setLimitAmount(String(b.limit));
    setShowForm(true);
  };

  const handleSave = async () => {
    const amount = parseFloat(limitAmount);
    if (!selectedCat || isNaN(amount) || amount <= 0) return;

    if (editId) {
      await api.updateBudgetLimit(editId, { limit: amount });
    } else {
      await api.createBudgetLimit({ categoryId: selectedCat, limit: amount, month });
    }
    setShowForm(false);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await api.deleteBudgetLimit(id);
    onRefresh();
  };

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><IconBack /></button>
        <h2>Лимиты бюджета</h2>
      </div>

      <div className="section">
        <div className="section-title">Лимиты на {month}</div>

        {budgets.length === 0 ? (
          <div className="empty-state"><p>Нет установленных лимитов</p></div>
        ) : (
          budgets.map((b) => (
            <div key={b.id} className="budget-manage-item">
              <div className="budget-manage-info">
                <div className="budget-manage-name">{catMap[b.categoryId]?.name ?? "—"}</div>
                <div className="budget-manage-amount">{fmt(b.limit)}</div>
              </div>
              <div className="budget-manage-actions">
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(b)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => handleDelete(b.id)} style={{ color: "var(--red)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}

        <button className="btn btn-primary" onClick={openNew} style={{ marginTop: 12, width: "100%" }}>
          Добавить лимит
        </button>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? "Редактировать лимит" : "Новый лимит"}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {!editId && (
              <div className="form-group">
                <label className="form-label">Категория</label>
                <div className="category-grid">
                  {expenseCategories
                    .filter((c) => !existingCatIds.has(c.id) || c.id === selectedCat)
                    .map((c) => (
                      <button
                        key={c.id}
                        className={`category-chip ${selectedCat === c.id ? "active" : ""}`}
                        onClick={() => setSelectedCat(c.id)}
                      >
                        {c.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Лимит</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
                min="0"
                step="10"
              />
            </div>

            <button className="btn btn-primary" onClick={handleSave} disabled={!selectedCat || !limitAmount} style={{ width: "100%" }}>Сохранить</button>
          </div>
        </div>
      )}
    </div>
  );
}
