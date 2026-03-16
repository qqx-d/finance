import { useState, useEffect } from "react";
import { IconBack } from "./Icons";
import { getExportUrl } from "../api";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Props {
  onBack: () => void;
  onNavigate: (page: string) => void;
}

export default function Settings({ onBack, onNavigate }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleExport = (format: "json" | "csv") => {
    const a = document.createElement("a");
    a.href = getExportUrl(format);
    a.download = `finance-export.${format}`;
    a.click();
  };

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><IconBack /></button>
        <h2>Настройки</h2>
      </div>

      {!installed && (
        <div className="section">
          <button
            className="btn btn-primary"
            onClick={handleInstall}
            disabled={!deferredPrompt}
            style={{ opacity: deferredPrompt ? 1 : 0.5 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {deferredPrompt ? "Установить приложение" : "Откройте в браузере для установки"}
          </button>
        </div>
      )}

      <div className="section">
        <div className="settings-list">
          <button className="settings-item" onClick={() => onNavigate("categories")}>
            Управление категориями
            <span className="arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          </button>
          <button className="settings-item" onClick={() => onNavigate("recurring")}>
            Повторяющиеся платежи
            <span className="arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          </button>
          <button className="settings-item" onClick={() => onNavigate("savings")}>
            Цели накоплений
            <span className="arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          </button>
          <button className="settings-item" onClick={() => onNavigate("budgetManager")}>
            Лимиты бюджета
            <span className="arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          </button>
          <button className="settings-item" onClick={() => onNavigate("calendar")}>
            Календарь платежей
            <span className="arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          </button>
          <button className="settings-item" onClick={() => onNavigate("habits")}>
            Анализ
            <span className="arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Тема оформления</div>
        <div className="theme-toggle">
          <span>{dark ? "Тёмная тема" : "Светлая тема"}</span>
          <button className="theme-switch" onClick={toggleTheme} aria-label="Переключить тему">
            <div className={`theme-switch-thumb ${dark ? "on" : ""}`} />
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Экспорт данных</div>
        <div className="btn-row">
          <button className="btn btn-outline" onClick={() => handleExport("json")}>JSON</button>
          <button className="btn btn-outline" onClick={() => handleExport("csv")}>CSV</button>
        </div>
      </div>
    </div>
  );
}
