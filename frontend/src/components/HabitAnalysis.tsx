import type { Analytics, Category } from "../types";
import { IconBack } from "./Icons";

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + "\u00A0\u20AC";
}

interface Props {
  analytics: Analytics | null;
  categoryMap: Record<string, Category>;
  onBack: () => void;
}

export default function HabitAnalysis({ analytics, categoryMap, onBack }: Props) {
  if (!analytics) {
    return (
      <div>
        <div className="page-header">
          <button className="back-btn" onClick={onBack}><IconBack /></button>
          <h2>Анализ</h2>
        </div>
        <div className="section"><div className="empty-state"><p>Нет данных для анализа</p></div></div>
      </div>
    );
  }

  const entries = Object.entries(analytics.categoryComparison)
    .map(([catId, data]) => ({
      catId,
      name: categoryMap[catId]?.name ?? catId,
      ...data,
    }))
    .filter((e) => e.current > 0 || e.previous > 0)
    .sort((a, b) => b.current - a.current);

  const totalChange = analytics.prevTotalExpense > 0
    ? ((analytics.totalExpense - analytics.prevTotalExpense) / analytics.prevTotalExpense * 100)
    : 0;

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><IconBack /></button>
        <h2>Анализ</h2>
      </div>

      {/* Summary comparison */}
      <div className="section">
        <div className="info-row">
          <div className="info-card">
            <div className="info-card-label">Текущий месяц</div>
            <div className="info-card-value" style={{ color: "var(--red)" }}>{fmt(analytics.totalExpense)}</div>
          </div>
          <div className="info-card">
            <div className="info-card-label">Предыдущий месяц</div>
            <div className="info-card-value" style={{ color: "var(--text-secondary)" }}>{fmt(analytics.prevTotalExpense)}</div>
          </div>
        </div>
        {analytics.prevTotalExpense > 0 && (
          <div className={`alert-banner ${totalChange > 0 ? "warn" : "info"}`} style={{ marginTop: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={totalChange > 0 ? "23 6 13.5 15.5 8.5 10.5 1 18" : "23 18 13.5 8.5 8.5 13.5 1 6"} />
            </svg>
            {totalChange > 0 ? `Расходы выросли на ${Math.abs(totalChange).toFixed(0)}%` : `Расходы снизились на ${Math.abs(totalChange).toFixed(0)}%`}
          </div>
        )}
      </div>

      {/* By-category comparison */}
      <div className="section">
        <div className="section-title">По категориям</div>
        {entries.length === 0 ? (
          <div className="empty-state"><p>Нет данных</p></div>
        ) : (
          entries.map((e) => {
            const direction = e.changePercent > 5 ? "up" : e.changePercent < -5 ? "down" : "same";
            return (
              <div key={e.catId} className="habit-item">
                <div className="habit-item-name">{e.name}</div>
                <div className="habit-item-amounts">
                  <span className="habit-item-current">{fmt(e.current)}</span>
                  <span className="habit-item-prev">{fmt(e.previous)}</span>
                </div>
                <div className={`habit-item-change ${direction}`}>
                  {direction === "up" && "+"}
                  {direction === "same" ? "~0%" : `${Math.round(e.changePercent)}%`}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Savings recommendations */}
      {entries.filter((e) => e.changePercent > 20).length > 0 && (
        <div className="section">
          <div className="section-title">Рекомендации</div>
          {entries.filter((e) => e.changePercent > 20).map((e) => (
            <div key={`rec-${e.catId}`} className="savings-rec-card">
              <div className="savings-rec-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {e.name}
              </div>
              <div className="savings-rec-text">
                Расходы выросли на {Math.round(e.changePercent)}% по сравнению с прошлым месяцем ({fmt(e.previous)} → {fmt(e.current)}). Попробуйте сократить до {fmt(e.previous)}.
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
