import type { RecurringPayment, Category } from "../types";
import { IconBack } from "./Icons";

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20AC";
}

interface Props {
  recurringPayments: RecurringPayment[];
  categoryMap: Record<string, Category>;
  onBack: () => void;
}

export default function PaymentCalendar({ recurringPayments, categoryMap, onBack }: Props) {
  const active = recurringPayments.filter((rp) => rp.active);
  const sorted = [...active].sort((a, b) => a.nextDate.localeCompare(b.nextDate));

  const todayStr = new Date().toISOString().split("T")[0];
  const todayMs = new Date(todayStr + "T00:00:00").getTime();

  const periodLabel: Record<string, string> = {
    weekly: "Еженедельно",
    monthly: "Ежемесячно",
    yearly: "Ежегодно",
  };

  // Group by month
  const groups: Record<string, typeof sorted> = {};
  for (const rp of sorted) {
    const m = rp.nextDate.substring(0, 7);
    if (!groups[m]) groups[m] = [];
    groups[m].push(rp);
  }

  const monthKeys = Object.keys(groups).sort();

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><IconBack /></button>
        <h2>Календарь платежей</h2>
      </div>

      {sorted.length === 0 ? (
        <div className="section">
          <div className="empty-state">
            <p>Нет активных повторяющихся платежей</p>
          </div>
        </div>
      ) : (
        monthKeys.map((mk) => {
          const [y, m] = mk.split("-");
          const label = `${MONTHS_RU[parseInt(m) - 1]} ${y}`;
          return (
            <div key={mk} className="section">
              <div className="section-title">{label}</div>
              <div className="calendar-list">
                {groups[mk].map((rp) => {
                  const dayNum = parseInt(rp.nextDate.split("-")[2]);
                  const rpMs = new Date(rp.nextDate + "T00:00:00").getTime();
                  const diff = Math.round((rpMs - todayMs) / 86400000);
                  const status = diff < 0 ? "past" : diff === 0 ? "today" : "future";
                  return (
                    <div key={rp.id} className={`calendar-item ${status}`}>
                      <div className={`calendar-day ${status}`}>{dayNum}</div>
                      <div className="calendar-info">
                        <div className="calendar-name">{rp.name}</div>
                        <div className="calendar-meta">
                          {categoryMap[rp.categoryId]?.name ?? ""} &middot; {periodLabel[rp.period] ?? rp.period}
                        </div>
                      </div>
                      <div className="calendar-amount">{fmt(rp.amount)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
