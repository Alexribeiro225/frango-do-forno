import { CalendarDays } from "lucide-react";
import { presetLabels, type PeriodPreset, type PeriodValue } from "@/lib/period";

export function PeriodPicker({ value, onChange, presets }: { value: PeriodValue; onChange: (v: PeriodValue) => void; presets?: PeriodPreset[] }) {
  const list = presets ?? (Object.keys(presetLabels) as PeriodPreset[]);
  const set = (patch: Partial<PeriodValue>) => onChange({ ...value, ...patch });
  return <div className="period-picker">
    <CalendarDays size={16} />
    <select aria-label="Período" value={value.preset} onChange={e => set({ preset: e.currentTarget.value as PeriodPreset })}>
      {list.map(p => <option key={p} value={p}>{presetLabels[p]}</option>)}
    </select>
    {value.preset === "date" && <input type="date" aria-label="Data" value={value.date} onChange={e => e.currentTarget.value && set({ date: e.currentTarget.value })} />}
    {value.preset === "pickMonth" && <input type="month" aria-label="Mês" value={value.month} onChange={e => e.currentTarget.value && set({ month: e.currentTarget.value })} />}
    {value.preset === "custom" && <>
      <input type="date" aria-label="Data inicial" value={value.from} onChange={e => e.currentTarget.value && set({ from: e.currentTarget.value })} />
      <span>até</span>
      <input type="date" aria-label="Data final" value={value.to} onChange={e => e.currentTarget.value && set({ to: e.currentTarget.value })} />
    </>}
  </div>;
}
