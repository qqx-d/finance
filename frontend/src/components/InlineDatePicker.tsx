import { useState, useMemo } from "react";
import { createPortal } from "react-dom";

const DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_RU = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];
const MONTHS_SHORT = ["янв.","фев.","мар.","апр.","мая","июн.","июл.","авг.","сен.","окт.","ноя.","дек."];

function pad(n: number) { return n < 10 ? "0" + n : String(n); }

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function InlineDatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [value]);

  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startDay = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);



  const prev = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };

  const next = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const pick = (day: number) => {
    onChange(`${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`);
    setOpen(false);
  };

  const selectedStr = value;
  const todayStr = today;

  // Format display: "16 мар. 2026"
  const displayDate = `${selected.getDate()} ${MONTHS_SHORT[selected.getMonth()]} ${selected.getFullYear()}`;

  const popup = open ? createPortal(
    <div className="dp-overlay" onClick={() => setOpen(false)}>
      <div className="dp" onClick={e => e.stopPropagation()}>
        <div className="dp-header">
        <button className="dp-nav" onClick={prev} type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="dp-title">{MONTHS_RU[viewMonth]} {viewYear}</span>
        <button className="dp-nav" onClick={next} type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
      </div>
      <div className="dp-weekdays">
        {DAYS_SHORT.map((d) => <span key={d} className="dp-wd">{d}</span>)}
      </div>
      <div className="dp-grid">
        {days.map((d, i) => {
          if (d === null) return <span key={`e${i}`} className="dp-cell dp-empty" />;
          const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
          const isSel = iso === selectedStr;
          const isToday = iso === todayStr;
          return (
            <button
              key={d}
              type="button"
              className={`dp-cell${isSel ? " dp-sel" : ""}${isToday && !isSel ? " dp-today" : ""}`}
              onClick={() => pick(d)}
            >
              {d}
            </button>
          );
        })}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="dp-wrap">
      <button className="dp-trigger" type="button" onClick={() => setOpen(!open)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>{displayDate}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points={open ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
        </svg>
      </button>
      {popup}
    </div>
  );
}
