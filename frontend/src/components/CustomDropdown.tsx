import { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function CustomDropdown({ options, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="cd" ref={ref}>
      <button
        className="cd-trigger"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span>{selected?.label ?? placeholder ?? "Выберите..."}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points={open ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
        </svg>
      </button>
      {open && (
        <div className="cd-list">
          {options.map((o) => (
            <button
              key={o.value}
              className={`cd-option${o.value === value ? " cd-active" : ""}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
              type="button"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
