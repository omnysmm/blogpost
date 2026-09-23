import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerProps {
  /** Selected dates as YYYY-MM-DD */
  selected: string[];
  onChange: (dates: string[]) => void;
  /** Current month view can start at today */
  language?: 'ru' | 'en';
}

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const DOW_EN = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function pad(n: number) { return n < 10 ? `0${n}` : String(n); }
function toKey(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

export default function CalendarPicker({ selected, onChange, language = 'ru' }: CalendarPickerProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const ru = language === 'ru';

  const weeks = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    // Monday-first index
    const startDow = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [viewYear, viewMonth]);

  const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (key: string) => {
    if (selectedSet.has(key)) onChange(selected.filter(d => d !== key));
    else onChange([...selected, key].sort());
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const clearAll = () => onChange([]);
  const selectRestOfMonth = () => {
    const keys: string[] = [];
    const start = todayKey.startsWith(toKey(viewYear, viewMonth, 1).slice(0, 7))
      ? now.getDate()
      : 1;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // If viewing current month, from today; else all days of month that are not past
    for (let d = 1; d <= daysInMonth; d++) {
      const key = toKey(viewYear, viewMonth, d);
      if (key >= todayKey) keys.push(key);
    }
    void start;
    onChange(keys);
  };

  return (
    <div className="border border-slate-200 rounded-xl p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100" title={ru ? 'Предыдущий месяц' : 'Previous month'}>
          <ChevronLeft size={18} />
        </button>
        <div className="font-bold text-slate-900 text-sm">
          {(ru ? MONTHS_RU : MONTHS_EN)[viewMonth]} {viewYear}
        </div>
        <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100" title={ru ? 'Следующий месяц' : 'Next month'}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {(ru ? DOW_RU : DOW_EN).map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, wi) => week.map((day, di) => {
          if (day == null) return <div key={`${wi}-${di}`} />;
          const key = toKey(viewYear, viewMonth, day);
          const isToday = key === todayKey;
          const isSelected = selectedSet.has(key);
          const isPast = key < todayKey;
          return (
            <button
              key={key}
              type="button"
              disabled={isPast}
              onClick={() => toggle(key)}
              className={`h-8 rounded-lg text-xs font-medium transition ${
                isSelected
                  ? 'bg-blue-500 text-white shadow'
                  : isToday
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : isPast
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-slate-100'
              }`}
              title={key}
            >
              {day}
            </button>
          );
        }))}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-500">
          {ru ? `Выбрано дней: ${selected.length}` : `Selected days: ${selected.length}`}
        </span>
        <div className="flex gap-1">
          <button type="button" onClick={selectRestOfMonth} className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700">
            {ru ? 'До конца месяца' : 'Rest of month'}
          </button>
          <button type="button" onClick={clearAll} className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700">
            {ru ? 'Сброс' : 'Clear'}
          </button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selected.slice(0, 12).map(d => (
            <span key={d} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
              {d}
            </span>
          ))}
          {selected.length > 12 && (
            <span className="text-[10px] text-slate-400">+{selected.length - 12}</span>
          )}
        </div>
      )}
    </div>
  );
}
