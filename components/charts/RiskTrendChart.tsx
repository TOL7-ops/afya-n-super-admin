'use client';

import { useEffect, useState } from 'react';

export interface RiskTrendItem {
  month: string;
  normal: number;
  elevated: number;
  stage12: number;
  crisis: number;
}

interface Props {
  data?: RiskTrendItem[];
}

const COLORS = ['var(--green)', 'var(--amber)', 'var(--red-soft)', 'var(--red)'];
const LABELS = ['Normal', 'Elevated', 'Stage 1/2', 'Crisis'];

export default function RiskTrendChart({ data }: Props) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!data || data.length === 0) return;
    setAnimated(false);
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.7rem', color: 'var(--gray)' }}>
          Risk trend data not yet available from API
        </span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px' }}>
        {data.map((item, i) => (
          <div key={item.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, height: '100%' }}>
            <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column-reverse', gap: '1px', borderRadius: '3px 3px 0 0', overflow: 'hidden' }}>
              {[item.normal, item.elevated, item.stage12, item.crisis].map((pct, j) => (
                <div key={j} style={{
                  width: '100%',
                  background: COLORS[j],
                  height: animated ? `${pct}%` : '0%',
                  transition: `height 1s ease ${300 + i * 80}ms`,
                }} title={`${LABELS[j]}: ${pct}%`} />
              ))}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.6rem', color: 'var(--gray)', marginTop: '5px', textAlign: 'center' }}>
              {item.month}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '14px', marginTop: '12px', flexWrap: 'wrap' }}>
        {LABELS.map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
            <span style={{ fontSize: '.72rem', color: 'var(--gray)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
