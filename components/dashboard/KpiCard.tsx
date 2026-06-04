'use client';

interface KpiCardProps {
  icon: string;
  label: string;
  value: string | number;
  sub: string;
  valueColor?: 'green' | 'amber' | 'red' | '';
}

export default function KpiCard({ icon, label, value, sub, valueColor = '' }: KpiCardProps) {
  return (
    <div className="kpi">
      <div className="kpi-ico">{icon}</div>
      <div className="kpi-lbl">{label}</div>
      <div className={`kpi-val${valueColor ? ` ${valueColor}` : ''}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}
