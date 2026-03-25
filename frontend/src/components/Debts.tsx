import { useState } from "react";
import type { Debt } from "../types";
import * as api from "../api";
import { IconBack } from "./Icons";

function formatAmount(n: number): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20AC";
}

interface Props {
  debts: Debt[];
  onBack: () => void;
  onRefresh: () => void;
}

export default function Debts({ debts, onBack, onRefresh }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [showPay, setShowPay] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [direction, setDirection] = useState<"i_owe" | "owed_to_me">("i_owe");
  const [totalAmount, setTotalAmount] = useState("");
  const [payAmount, setPayAmount] = useState("");

  const iOweDebts = debts.filter((debt) => (debt.direction || "i_owe") === "i_owe");
  const owedToMeDebts = debts.filter((debt) => (debt.direction || "i_owe") === "owed_to_me");

  const handleCreate = async () => {
    const amount = parseFloat(totalAmount);
    if (!name.trim() || !amount || amount <= 0) return;
    await api.createDebt({ name: name.trim(), direction, totalAmount: amount });
    setName("");
    setDirection("i_owe");
    setTotalAmount("");
    setShowCreate(false);
    onRefresh();
  };

  const handlePay = async (id: string) => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    await api.payDebt(id, amount);
    setPayAmount("");
    setShowPay(null);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteDebt(id);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "Not found") {
        throw error;
      }
    }
    onRefresh();
  };

  const renderDebtSection = (title: string, items: Debt[], emptyText: string) => (
    <div className="section" style={{ paddingTop: 0 }}>
      <div className="section-title">{title}</div>
      {items.length === 0 ? (
        <div className="empty-state" style={{ padding: "24px 16px" }}>
          <p>{emptyText}</p>
        </div>
      ) : (
        items.map((debt) => {
          const paid = Math.max(0, Math.min(debt.totalAmount, debt.paidAmount));
          const remaining = Math.max(0, debt.totalAmount - paid);
          const percent = debt.totalAmount > 0 ? Math.round((paid / debt.totalAmount) * 100) : 0;
          const closed = remaining <= 0;

          return (
            <div key={debt.id} className={`goal-card debt-card${closed ? " debt-card-closed" : ""}`} style={{ padding: 14, marginBottom: 8 }}>
              <div className="goal-header" style={{ marginBottom: 4 }}>
                <span className="goal-name">{debt.name}</span>
                <span className={`goal-percent debt-status-badge${closed ? " debt-status-badge-closed" : ""}`} style={{ fontSize: 13 }}>
                  {closed ? "Закрыт" : `${percent}%`}
                </span>
              </div>
              <div className={`debt-meta${closed ? " debt-meta-closed" : ""}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, marginBottom: 8 }}>
                <span>Погашено: {formatAmount(paid)}</span>
                <span>Осталось: {formatAmount(remaining)}</span>
              </div>
              <div className={`progress-bar${closed ? " debt-progress-closed" : ""}`} style={{ marginBottom: 10 }}>
                <div className={`progress-fill${closed ? " debt-progress-fill-closed" : ""}`} style={{ width: `${Math.min(100, percent)}%` }} />
              </div>
              <div className="goal-actions">
                <button
                  className={`btn btn-sm debt-pay-btn${closed ? " debt-pay-btn-disabled" : ""}`}
                  style={{ flex: 1 }}
                  onClick={() => { setShowPay(debt.id); setPayAmount(""); }}
                  disabled={closed}
                >
                  Внести сумму
                </button>
                <button className="delete-btn" onClick={() => handleDelete(debt.id)}>
                  Удалить
                </button>
              </div>

              {showPay === debt.id && !closed && (
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Сумма"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
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
                  <button className="btn btn-primary btn-sm" style={{ width: "auto" }} onClick={() => handlePay(debt.id)}>OK</button>
                  <button className="btn btn-outline btn-sm" style={{ width: "auto" }} onClick={() => setShowPay(null)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><IconBack /></button>
        <h2>Долги</h2>
      </div>

      <div className="section">
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginBottom: 16, width: "auto" }}>
          Добавить долг
        </button>

        {debts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </div>
            <p>Нет долгов</p>
            <p className="sub">Добавьте долг, чтобы отслеживать погашение</p>
          </div>
        ) : null}
      </div>

      {debts.length > 0 && (
        <>
          {renderDebtSection("Должен я", iOweDebts, "Нет долгов, которые должен ты")}
          {renderDebtSection("Должны мне", owedToMeDebts, "Никто ничего не должен")}
        </>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal-sheet">
            <div className="modal-header">
              <h2>Новый долг</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="form-group">
              <label>Название</label>
              <input type="text" placeholder="Кому/за что долг" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label>Тип долга</label>
              <div className="type-selector">
                <button className={`type-btn${direction === "i_owe" ? " active" : ""}`} onClick={() => setDirection("i_owe")}>
                  Должен я
                </button>
                <button className={`type-btn${direction === "owed_to_me" ? " active" : ""}`} onClick={() => setDirection("owed_to_me")}>
                  Должны мне
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Сумма долга</label>
              <input type="number" inputMode="decimal" placeholder="1000" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} step="0.01" min="0" />
            </div>
            <button className="btn btn-primary" onClick={handleCreate}>Создать</button>
          </div>
        </div>
      )}
    </div>
  );
}
