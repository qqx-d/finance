import { useState } from "react";
import { IconBack } from "./Icons";
import { downloadExport } from "../api";
import type { PublicUser } from "../types";

type TileIcon =
  | "categories"
  | "recurring"
  | "savings"
  | "budget"
  | "charts"
  | "calendar"
  | "habits"
  | "theme"
  | "export";

interface Props {
  user: PublicUser;
  onBack: () => void;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

function SettingsTileIcon({ kind }: { kind: TileIcon }) {
  switch (kind) {
    case "categories":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      );
    case "recurring":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 0 1 15.3-6.4" />
          <polyline points="18 2 18 6 14 6" />
          <path d="M21 12a9 9 0 0 1-15.3 6.4" />
          <polyline points="6 22 6 18 10 18" />
        </svg>
      );
    case "savings":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20" />
          <path d="M17 7a4 4 0 0 0-4-2H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6h-3a4 4 0 0 1-4-2" />
        </svg>
      );
    case "budget":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M16 15h3" />
        </svg>
      );
    case "charts":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="6" y1="20" x2="6" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="18" y1="20" x2="18" y2="14" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />
        </svg>
      );
    case "habits":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h4l2-6 4 12 2-6h6" />
        </svg>
      );
    case "theme":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z" />
        </svg>
      );
    case "export":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12" />
          <polyline points="7 10 12 15 17 10" />
          <rect x="4" y="18" width="16" height="3" rx="1" />
        </svg>
      );
  }
}

export default function Settings({ user, onBack, onNavigate, onLogout }: Props) {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [exporting, setExporting] = useState(false);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await downloadExport("csv");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "finance-export.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const navTiles: Array<{ label: string; icon: TileIcon; action: () => void }> = [
    { label: "Категории", icon: "categories", action: () => onNavigate("categories") },
    { label: "Платежи", icon: "recurring", action: () => onNavigate("recurring") },
    { label: "Цели", icon: "savings", action: () => onNavigate("savings") },
    { label: "Лимиты", icon: "budget", action: () => onNavigate("budgetManager") },
    { label: "Графики", icon: "charts", action: () => onNavigate("charts") },
    { label: "Календарь", icon: "calendar", action: () => onNavigate("calendar") },
    { label: "Анализ", icon: "habits", action: () => onNavigate("habits") },
  ];

  const actionTiles: Array<{ label: string; icon: TileIcon; action: () => void; accent?: "active" }> = [
    {
      label: dark ? "Темная тема" : "Светлая тема",
      icon: "theme",
      action: toggleTheme,
      accent: dark ? "active" : undefined,
    },
    { label: exporting ? "Подготовка..." : "Экспорт CSV", icon: "export", action: handleExport },
  ];

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><IconBack /></button>
        <h2>Ещё</h2>
      </div>

      <div className="section">
        <div className="account-card">
          <div className="account-row">
            <div className="account-label">Аккаунт</div>
            <button className="account-logout" onClick={onLogout} aria-label="Выйти">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
          <div className="account-name">{user.username}</div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Разделы</div>
        <div className="settings-grid">
          {navTiles.map((tile) => (
            <button key={tile.label} className="settings-tile" onClick={tile.action}>
              <span className="settings-tile-icon"><SettingsTileIcon kind={tile.icon} /></span>
              <span className="settings-tile-label">{tile.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-title">Действия</div>
        <div className="settings-grid settings-grid-actions">
          {actionTiles.map((tile) => (
            <button
              key={tile.label}
              className={`settings-tile ${tile.accent === "active" ? "settings-tile-active" : ""}`}
              onClick={tile.action}
              disabled={exporting && tile.icon === "export"}
            >
              <span className="settings-tile-icon"><SettingsTileIcon kind={tile.icon} /></span>
              <span className="settings-tile-label">{tile.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
