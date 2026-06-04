'use client';

import { useEffect, useState } from 'react';

export interface BpDistributionItem {
  label: string;
  percent: number;
  colorVar: string;
  count?: number;
}

interface Props {
  data: BpDistributionItem[];
}

export default function BpDistributionChart({ data }: Props) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setAnimated(false);
    const timer = setTimeout(() => setAnimated(true), 400);
    return () => clearTimeout(timer);
  }, [data]);

  if (data.length === 0) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center' }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.7rem', color: 'var(--gray)' }}>
          No BP data
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              fontSize: '.74rem',
              color: 'var(--ink-mid)',
              width: '68px',
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              flex: 1,
              background: 'var(--gray-xlt)',
              borderRadius: '2px',
              height: '9px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: item.colorVar,
                borderRadius: '2px',
                width: animated ? `${item.percent}%` : '0%',
                transition: 'width 1s ease',
              }}
            />
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '.7rem',
              color: 'var(--gray)',
              width: '34px',
              textAlign: 'right',
            }}
          >
            {item.percent}%
          </div>
        </div>
      ))}
    </div>
  );
}
