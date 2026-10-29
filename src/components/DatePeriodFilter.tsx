import { CalendarDays } from "lucide-react";

export type DatePreset = "today" | "last7" | "last15" | "last30" | "thisMonth" | "month" | "thisYear" | "year" | "specificDay" | "custom";
export type DatePeriod = {
  preset: DatePreset;
  label: string;
  startDate: string;
  endDate: string;
  startAt: string;
  endExclusive: string;
  month: string;
  year: string;
};

const localKey = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
const parseLocal = (value: string) => { const [year, month, day] = value.split("-").map(Number); return new Date(year || 2000, (month || 1) - 1, day || 1); };
const labelDate = (date: Date) => date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
function buildPeriod(preset: DatePreset, startDate: string, endDate: string, month = "", year = ""): DatePeriod {
  const start = parseLocal(startDate);
  const end = parseLocal(endDate);
  const next = new Date(end); next.setDate(next.getDate() + 1);
  const labels: Record<DatePreset, string> = {
    today: "Hoje", last7: "Últimos 7 dias", last15: "Últimos 15 dias", last30: "Últimos 30 dias",
    thisMonth: "Este mês", month: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(start),
    thisYear: "Este ano", year: "Ano " + start.getFullYear(), specificDay: labelDate(start),
    custom: labelDate(start) + " – " + labelDate(end),
  };
  return { preset, label: labels[preset], startDate: localKey(start), endDate: localKey(end),
    startAt: new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString(),
    endExclusive: new Date(next.getFullYear(), next.getMonth(), next.getDate()).toISOString(),
    month: month || localKey(start).slice(0, 7), year: year || String(start.getFullYear()) };
}

export function createDatePeriod(preset: DatePreset): DatePeriod {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (preset === "today" || preset === "specificDay") return buildPeriod(preset, localKey(today), localKey(today));
  if (preset === "last7" || preset === "last15" || preset === "last30") {
    const start = new Date(today); start.setDate(start.getDate() - (Number(preset.slice(4)) - 1));
    return buildPeriod(preset, localKey(start), localKey(today));
  }
  if (preset === "thisMonth" || preset === "month") {
    const start = preset === "month" ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return buildPeriod(preset, localKey(start), localKey(end), localKey(today).slice(0, 7));
  }
  if (preset === "thisYear" || preset === "year") return buildPeriod(preset, today.getFullYear() + "-01-01", today.getFullYear() + "-12-31", "", String(today.getFullYear()));
  return buildPeriod(preset, localKey(today), localKey(today));
}

export function DatePeriodFilter({ value, onChange }: { value: DatePeriod; onChange: (period: DatePeriod) => void }) {
  function choose(preset: DatePreset) { onChange(createDatePeriod(preset)); }
  function changeSpecificDay(date: string) { if (date) onChange(buildPeriod("specificDay", date, date)); }
  function changeMonth(month: string) {
    if (!month) return;
    const [year, monthNumber] = month.split("-").map(Number);
    const start = new Date(year, monthNumber - 1, 1);
    const end = new Date(year, monthNumber, 0);
    onChange(buildPeriod("month", localKey(start), localKey(end), month));
  }
  function changeYear(yearText: string) {
    const year = Number(yearText);
    if (yearText.length === 4 && year >= 2000 && year <= 2100) onChange(buildPeriod("year", year + "-01-01", year + "-12-31", "", yearText));
  }
  function changeDates(start: string, end: string) {
    if (!start || !end) return;
    const safeEnd = end < start ? start : end;
    onChange(buildPeriod("custom", start, safeEnd));
  }

  return <div className="date-period-filter">
    <label className="date-period-select"><CalendarDays size={17} /><span className="sr-only">Período</span>
      <select aria-label="Selecionar período" value={value.preset} onChange={event => choose(event.currentTarget.value as DatePreset)}>
        <option value="today">Hoje</option><option value="specificDay">Data específica</option>
        <option value="last7">Últimos 7 dias</option><option value="last15">Últimos 15 dias</option><option value="last30">Últimos 30 dias</option>
        <option value="thisMonth">Este mês</option><option value="month">Escolher mês</option>
        <option value="thisYear">Este ano</option><option value="year">Escolher ano</option><option value="custom">Período personalizado</option>
      </select>
    </label>
    {value.preset === "specificDay" && <input aria-label="Escolher data" type="date" value={value.startDate} onChange={event => changeSpecificDay(event.currentTarget.value)} />}
    {value.preset === "month" && <input aria-label="Escolher mês" type="month" value={value.month} onChange={event => changeMonth(event.currentTarget.value)} />}
    {value.preset === "year" && <input aria-label="Escolher ano" type="number" min="2000" max="2100" value={value.year} onChange={event => changeYear(event.currentTarget.value)} />}
    {value.preset === "custom" && <div className="date-period-custom"><label>De <input aria-label="Data inicial" type="date" value={value.startDate} onChange={event => changeDates(event.currentTarget.value, value.endDate)} /></label><label>Até <input aria-label="Data final" type="date" value={value.endDate} min={value.startDate} onChange={event => changeDates(value.startDate, event.currentTarget.value)} /></label></div>}
    {value.preset !== "custom" && <span className="date-period-label">{value.label}</span>}
  </div>;
}
