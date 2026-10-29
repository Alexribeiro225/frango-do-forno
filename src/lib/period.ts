export type PeriodPreset = "today" | "date" | "7" | "15" | "30" | "month" | "pickMonth" | "year" | "custom";
export type PeriodValue = { preset: PeriodPreset; date: string; month: string; from: string; to: string };

const pad = (n: number) => String(n).padStart(2, "0");
export const toInputDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y!, (m || 1) - 1, d || 1); };

export function defaultPeriod(preset: PeriodPreset = "7"): PeriodValue {
  const today = toInputDate(new Date());
  return { preset, date: today, month: today.slice(0, 7), from: today, to: today };
}

/** Returns [start, end) in local time. */
export function periodRange(p: PeriodValue, now = new Date()): { start: Date; end: Date } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  switch (p.preset) {
    case "today": return { start: today, end: addDays(today, 1) };
    case "date": { const d = parse(p.date); return { start: d, end: addDays(d, 1) }; }
    case "7": case "15": case "30": return { start: addDays(today, -(Number(p.preset) - 1)), end: addDays(today, 1) };
    case "month": return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 1) };
    case "pickMonth": { const d = parse(p.month + "-01"); return { start: d, end: new Date(d.getFullYear(), d.getMonth() + 1, 1) }; }
    case "year": return { start: new Date(today.getFullYear(), 0, 1), end: new Date(today.getFullYear() + 1, 0, 1) };
    case "custom": { let a = parse(p.from), b = parse(p.to); if (b < a) [a, b] = [b, a]; return { start: a, end: addDays(b, 1) }; }
  }
}

export const presetLabels: Record<PeriodPreset, string> = {
  today: "Hoje", date: "Escolher data", "7": "Últimos 7 dias", "15": "Últimos 15 dias", "30": "Últimos 30 dias",
  month: "Este mês", pickMonth: "Mês específico", year: "Este ano", custom: "Período personalizado",
};

export function periodLabel(p: PeriodValue) {
  const { start, end } = periodRange(p);
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
  const f = (d: Date) => d.toLocaleDateString("pt-BR");
  if (p.preset === "pickMonth") return start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  if (p.preset === "date") return f(start);
  if (p.preset === "custom") return f(start) === f(last) ? f(start) : `${f(start)} a ${f(last)}`;
  return presetLabels[p.preset].toLowerCase();
}
