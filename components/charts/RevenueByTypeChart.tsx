'use client';

import { useEffect, useState } from 'react';
import { REVENUE_BY_TYPE } from '@/constants';

export interface RevenueByTypeItem {
  label: string;
  amount: string;
  fillPercent: number;
  color: string;
}

interface Props {
  /** Optional live data — falls back to static REVENUE_BY_TYPE if not provided */
  data?: RevenueByTypeItem[];
}

export default function RevenueByTypeChart({ data }: Props) {
  const chartData = data && data.length > 0 ? data : REVENUE_BY_TYPE;
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setAnimated(false);
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, [chartData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {chartData.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              fontSize: '.74rem',
              color: 'var(--ink-mid)',
              width: '80px',
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              flex: 1,
              background: 'var(--color-primary-light)',
              borderRadius: '2px',
              height: '9px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: item.color,
                borderRadius: '2px',
                width: animated ? `${item.fillPercent}%` : '0%',
                transition: 'width 1s ease',
              }}
            />
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '.7rem',
              color: 'var(--gray)',
              width: '60px',
            }}
          >
            {item.amount}
          </div>
        </div>
      ))}
    </div>
  );
}
