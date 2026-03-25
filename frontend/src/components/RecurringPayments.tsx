import { useState } from "react";
import type { RecurringPayment, Category } from "../types";
import * as api from "../api";
import { IconBack } from "./Icons";
import InlineDatePicker from "./InlineDatePicker";

function formatAmount(n: number): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20AC";
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

interface Props {
  payments: RecurringPayment[];
  categories: Category[];
  onBack: () => void;
  onRefresh: () => void;
}

export default function RecurringPayments({ payments, categories, onBack, onRefresh }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [period, setPeriod] = useState<"monthly" | "weekly" | "yearly">("monthly");
  const [nextDate, setNextDate] = useState(getTodayDate());

  const handleCreate = async () => {
    if (!name || !amount || !categoryId || !nextDate) return;
    await api.createRecurringPayment({
      name,
      amount: parseFloat(amount),
      categoryId,
      period,
      nextDate,
      active: true,
    });
    setName("");
    setAmount("");
    setCategoryId("");
    setNextDate(getTodayDate());
    setShowCreate(false);
    onRefresh();
  };

  const handleToggle = async (p: RecurringPayment) => {
    await api.updateRecurringPayment(p.id, { active: !p.active });
    onRefresh();
  };

  const openEdit = (p: RecurringPayment) => {
    setEditId(p.id);
    setName(p.name);
    setAmount(String(p.amount));
    setCategoryId(p.categoryId);
    setPeriod(p.period);
    setNextDate(p.nextDate);
  };

  const handleSaveEdit = async () => {
    if (!editId || !name || !amount || !categoryId || !nextDate) return;
    await api.updateRecurringPayment(editId, {
      name,
      amount: parseFloat(amount),
      categoryId,
      period,
      nextDate,
    });
    setEditId(null);
    setName("");
    setAmount("");
    setCategoryId("");
    setPeriod("monthly");
    setNextDate(getTodayDate());
    onRefresh();
  };

  const closeEdit = () => {
    setEditId(null);
    setName("");
    setAmount("");
    setCategoryId("");
    setPeriod("monthly");
    setNextDate(getTodayDate());
  };

  const handleDelete = async (id: string) => {
    await api.deleteRecurringPayment(id);
    onRefresh();
  };

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "-";

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><IconBack /></button>
        <h2>Повторяющиеся платежи</h2>
      </div>

      <div className="section">
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginBottom: 16, width: "auto" }}>
          Новый платёж
        </button>

        {payments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p>Нет повторяющихся платежей</p>
            <p className="sub">Добавьте платёж, чтобы автоматизировать учёт</p>
          </div>
        ) : (
          payments.map((p) => (
            <div key={p.id} className={`recurring-card${!p.active ? " inactive" : ""}`}>
              <div className="recurring-header">
                <div>
                  <div className="recurring-name">{p.name}</div>
                  <div className="recurring-meta">
                    {getCategoryName(p.categoryId)} &middot; {p.period === "monthly" ? "ежемесячно" : p.period === "weekly" ? "еженедельно" : "ежегодно"}
                  </div>
                </div>
                <div className="recurring-amount">
                  {formatAmount(p.amount)}
                </div>
              </div>
              <div className="recurring-actions">
                <button className="btn btn-outline btn-sm" style={{ width: "auto" }} onClick={() => openEdit(p)}>
                  Редактировать
                </button>
                <button
                  className={`toggle-btn${p.active ? " active" : ""}`}
                  onClick={() => handleToggle(p)}
                >
                  {p.active ? "Активен" : "Пауза"}
                </button>
                <button className="delete-btn" onClick={() => handleDelete(p.id)}>Удалить</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal-sheet">
            <div className="modal-header">
              <h2>Новый платёж</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="form-group">
              <label>Название</label>
              <input type="text" placeholder="Аренда, подписка..." value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label>Сумма</label>
              <input type="number" inputMode="decimal" placeholder="1000" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" min="0" />
            </div>
            <div className="form-group">
              <label>Период</label>
              <div className="type-selector">
                <button className={`type-btn${period === "monthly" ? " active" : ""}`} onClick={() => setPeriod("monthly")}>Месяц</button>
                <button className={`type-btn${period === "weekly" ? " active" : ""}`} onClick={() => setPeriod("weekly")}>Неделя</button>
                <button className={`type-btn${period === "yearly" ? " active" : ""}`} onClick={() => setPeriod("yearly")}>Год</button>
              </div>
            </div>
            <div className="form-group">
              <label>Дата первого платежа</label>
              <InlineDatePicker value={nextDate} onChange={setNextDate} />
            </div>
            <div className="form-group">
              <label>Категория</label>
              <div className="category-grid">
                {categories.map((c) => (
                  <button key={c.id} className={`category-chip${categoryId === c.id ? " active" : ""}`} onClick={() => setCategoryId(c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleCreate}>Создать</button>
          </div>
        </div>
      )}

      {editId && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeEdit()}>
          <div className="modal-sheet">
            <div className="modal-header">
              <h2>Редактировать платёж</h2>
              <button className="modal-close" onClick={closeEdit}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="form-group">
              <label>Название</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label>Сумма</label>
              <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" min="0" />
            </div>
            <div className="form-group">
              <label>Период</label>
              <div className="type-selector">
                <button className={`type-btn${period === "monthly" ? " active" : ""}`} onClick={() => setPeriod("monthly")}>Месяц</button>
                <button className={`type-btn${period === "weekly" ? " active" : ""}`} onClick={() => setPeriod("weekly")}>Неделя</button>
                <button className={`type-btn${period === "yearly" ? " active" : ""}`} onClick={() => setPeriod("yearly")}>Год</button>
              </div>
            </div>
            <div className="form-group">
              <label>Дата первого платежа</label>
              <InlineDatePicker value={nextDate} onChange={setNextDate} />
            </div>
            <div className="form-group">
              <label>Категория</label>
              <div className="category-grid">
                {categories.map((c) => (
                  <button key={c.id} className={`category-chip${categoryId === c.id ? " active" : ""}`} onClick={() => setCategoryId(c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSaveEdit}>Сохранить</button>
          </div>
        </div>
      )}
    </div>
  );
}
