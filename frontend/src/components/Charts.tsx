import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { MonthStats, Category } from "../types";
import { IconBack } from "./Icons";

const COLORS = ["#7C5CFC", "#FF647C", "#00C48C", "#FFA26B", "#3498DB", "#9B59B6", "#1ABC9C", "#E67E22", "#34495E", "#E91E63"];

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTHS_RU[parseInt(m) - 1]} ${y}`;
}

interface Props {
  stats: MonthStats | null;
  categoryMap: Record<string, Category>;
  month: string;
  onMonthChange: (delta: number) => void;
  onBack: () => void;
}

export default function Charts({ stats, categoryMap, month, onMonthChange, onBack }: Props) {
  if (!stats) return null;

  const pieData = Object.entries(stats.byCategory).map(([catId, amount]) => ({
    name: categoryMap[catId]?.name || catId,
    value: amount,
  })).sort((a, b) => b.value - a.value);

  const daysInMonth = new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0).getDate();
  const barData = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${month}-${String(d).padStart(2, "0")}`;
    barData.push({ day: d, amount: stats.byDay[dayStr] || 0 });
  }

  const formatValue = (value: number) =>
    value.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) + " \u20AC";

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><IconBack /></button>
        <h2>Статистика</h2>
      </div>

      <div className="month-picker">
        <button onClick={() => onMonthChange(-1)}>&#x2039;</button>
        <span className="month-text">{formatMonth(month)}</span>
        <button onClick={() => onMonthChange(1)}>&#x203A;</button>
      </div>

      {/* Pie Chart — no labels on chart, use legend below */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="chart-container">
          <div className="chart-title">Расходы по категориям</div>
          {pieData.length === 0 ? (
            <div className="empty-state" style={{ padding: "20px 0" }}>
              <p>Нет данных о расходах</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    label={false}
                    labelLine={false}
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatValue(v)} />
                </PieChart>
              </ResponsiveContainer>

              <div className="chart-legend">
                {pieData.map((item, idx) => (
                  <div key={item.name} className="chart-legend-item">
                    <div className="chart-legend-dot" style={{ background: COLORS[idx % COLORS.length] }} />
                    <span>{item.name}: {formatValue(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bar Chart */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="chart-container">
          <div className="chart-title">Расходы по дням</div>
          {barData.every((d) => d.amount === 0) ? (
            <div className="empty-state" style={{ padding: "20px 0" }}>
              <p>Нет данных о расходах</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDEDF1" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip
                  formatter={(v: number) => formatValue(v)}
                  labelFormatter={(l) => `${l} ${formatMonth(month).split(" ")[0].toLowerCase()}`}
                />
                <Bar dataKey="amount" fill="#7C5CFC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
