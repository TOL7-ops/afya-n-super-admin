'use client';

import { useEffect, useRef, useState } from 'react';

export interface ScreeningTrendItem {
  month: string;
  value: number;
}

interface Props {
  data: ScreeningTrendItem[];
}

const COLORS = [
  'rgba(196,30,58,.25)',
  'rgba(196,30,58,.35)',
  'rgba(196,30,58,.5)',
  'rgba(196,30,58,.6)',
  'rgba(196,30,58,.8)',
  'var(--red)',
];

export default function ScreeningTrendChart({ data }: Props) {
  const [animated, setAnimated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const max = data.length > 0 ? Math.max(...data.map((d) => d.value), 1) : 1;

  useEffect(() => {
    setAnimated(false);
    const timer = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, [data]);

  if (data.length === 0) {
    return (
      <div style={{ height: '88px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.7rem', color: 'var(--gray)' }}>
          No screening data
        </span>
      </div>
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          height: '72px',
          gap: '4px',
        }}
      >
        {data.map((item, i) => {
          const color = COLORS[Math.min(i, COLORS.length - 1)];
          return (
            <div
              key={item.month}
              style={{
                flex: 1,
                borderRadius: '3px 3px 0 0',
                minWidth: '14px',
                background: color,
                height: animated ? `${(item.value / max) * 100}%` : '0%',
                transition: `height 1s ease ${200 + i * 80}ms`,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
              title={`${item.value} screenings`}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '.58rem',
                  color: 'var(--gray)',
                  textAlign: 'center',
                  marginTop: '4px',
                }}
              >
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        {data.map((item) => (
          <span
            key={item.month}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '.6rem',
              color: 'var(--gray)',
            }}
          >
            {item.month}
          </span>
        ))}
      </div>
    </div>
  );
}
