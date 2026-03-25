import { useState } from "react";
import type { SavingsGoal } from "../types";
import * as api from "../api";
import { IconBack } from "./Icons";

function formatAmount(n: number): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20AC";
}

interface Props {
  goals: SavingsGoal[];
  onBack: () => void;
  onRefresh: () => void;
}

export default function SavingsGoals({ goals, onBack, onRefresh }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showDeposit, setShowDeposit] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");

  const handleCreate = async () => {
    if (!name || !targetAmount) return;
    await api.createSavingsGoal({ name, targetAmount: parseFloat(targetAmount) });
    setName("");
    setTargetAmount("");
    setShowCreate(false);
    onRefresh();
  };

  const handleDeposit = async (goalId: string) => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) return;
    await api.depositToGoal(goalId, amt);
    setDepositAmount("");
    setShowDeposit(null);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await api.deleteSavingsGoal(id);
    onRefresh();
  };

  const openEdit = (goal: SavingsGoal) => {
    setEditId(goal.id);
    setName(goal.name);
    setTargetAmount(String(goal.targetAmount));
  };

  const handleSaveEdit = async () => {
    if (!editId || !name || !targetAmount) return;
    await api.updateSavingsGoal(editId, { name, targetAmount: parseFloat(targetAmount) });
    setEditId(null);
    setName("");
    setTargetAmount("");
    onRefresh();
  };

  const closeEdit = () => {
    setEditId(null);
    setName("");
    setTargetAmount("");
  };

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><IconBack /></button>
        <h2>Накопления</h2>
      </div>

      <div className="section">
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginBottom: 16, width: "auto" }}>
          Новая цель
        </button>

        {goals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <p>Нет целей накопления</p>
            <p className="sub">Создайте цель, чтобы начать копить</p>
          </div>
        ) : (
          goals.map((goal) => {
            const percent = goal.targetAmount > 0
              ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
              : 0;

            return (
              <div key={goal.id} className="goal-card">
                <div className="goal-header">
                  <span className="goal-name">{goal.name}</span>
                  <span className="goal-percent">{percent}%</span>
                </div>
                <div className="goal-amounts">
                  {formatAmount(goal.currentAmount)} / {formatAmount(goal.targetAmount)}
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${percent}%` }} />
                </div>
                <div className="goal-actions">
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ width: "auto" }}
                    onClick={() => openEdit(goal)}
                  >
                    Редактировать
                  </button>
                  <button
                    className="btn btn-green btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => { setShowDeposit(goal.id); setDepositAmount(""); }}
                  >
                    Пополнить
                  </button>
                  <button className="delete-btn" onClick={() => handleDelete(goal.id)}>
                    Удалить
                  </button>
                </div>

                {showDeposit === goal.id && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="Сумма"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        border: "1.5px solid var(--border)",
                        borderRadius: 10,
                        fontSize: 14,
                        outline: "none",
                      }}
                      autoFocus
                      step="0.01"
                      min="0"
                    />
                    <button className="btn btn-primary btn-sm" style={{ width: "auto" }} onClick={() => handleDeposit(goal.id)}>OK</button>
                    <button className="btn btn-outline btn-sm" style={{ width: "auto" }} onClick={() => setShowDeposit(null)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal-sheet">
            <div className="modal-header">
              <h2>Новая цель</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="form-group">
              <label>Название</label>
              <input type="text" placeholder="Например: Новый компьютер" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label>Целевая сумма</label>
              <input type="number" inputMode="decimal" placeholder="2000" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} step="0.01" min="0" />
            </div>
            <button className="btn btn-primary" onClick={handleCreate}>Создать цель</button>
          </div>
        </div>
      )}

      {editId && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeEdit()}>
          <div className="modal-sheet">
            <div className="modal-header">
              <h2>Редактировать цель</h2>
              <button className="modal-close" onClick={closeEdit}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="form-group">
              <label>Название</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label>Целевая сумма</label>
              <input type="number" inputMode="decimal" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} step="0.01" min="0" />
            </div>
            <button className="btn btn-primary" onClick={handleSaveEdit}>Сохранить</button>
          </div>
        </div>
      )}
    </div>
  );
}
