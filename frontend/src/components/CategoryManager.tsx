import { useState } from "react";
import type { Category } from "../types";
import * as api from "../api";
import { IconBack } from "./Icons";

interface Props {
  categories: Category[];
  onBack: () => void;
  onRefresh: () => void;
}

export default function CategoryManager({ categories, onBack, onRefresh }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"income" | "expense">("expense");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await api.createCategory({ name: newName.trim(), type: newType });
    setNewName("");
    setShowCreate(false);
    onRefresh();
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    await api.updateCategory(id, { name: editName.trim() });
    setEditId(null);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await api.deleteCategory(id);
    onRefresh();
  };

  const renderSection = (title: string, list: Category[]) => (
    <div className="section" style={{ marginBottom: 20 }}>
      <div className="section-title">{title}</div>
      {list.map((c) => (
        <div key={c.id} className="category-row">
          {editId === c.id ? (
            <div style={{ display: "flex", gap: 6, flex: 1 }}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  border: "1.5px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                }}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleUpdate(c.id)}
              />
              <button className="btn btn-primary btn-sm" style={{ width: "auto" }} onClick={() => handleUpdate(c.id)}>OK</button>
              <button className="btn btn-outline btn-sm" style={{ width: "auto" }} onClick={() => setEditId(null)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ) : (
            <>
              <span className="category-label">{c.name}</span>
              <div className="category-actions">
                <button
                  className="icon-btn"
                  onClick={() => { setEditId(c.id); setEditName(c.name); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="icon-btn danger" onClick={() => handleDelete(c.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><IconBack /></button>
        <h2>Категории</h2>
      </div>

      <div className="section" style={{ paddingLeft: 16, paddingRight: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginBottom: 16, width: "auto" }}>
          Новая категория
        </button>
      </div>

      {renderSection("Расходы", expenseCategories)}
      {renderSection("Доходы", incomeCategories)}

      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal-sheet">
            <div className="modal-header">
              <h2>Новая категория</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="type-selector">
              <button className={`type-btn expense${newType === "expense" ? " active" : ""}`} onClick={() => setNewType("expense")}>
                Расход
              </button>
              <button className={`type-btn income${newType === "income" ? " active" : ""}`} onClick={() => setNewType("income")}>
                Доход
              </button>
            </div>
            <div className="form-group">
              <label>Название</label>
              <input
                type="text"
                placeholder="Название категории"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <button className="btn btn-primary" onClick={handleCreate}>Создать</button>
          </div>
        </div>
      )}
    </div>
  );
}
