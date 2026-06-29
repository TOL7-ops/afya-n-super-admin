'use client';

import { useEffect, useState } from 'react';
import { REVENUE_TREND } from '@/constants';

export interface RevenueTrendItem {
  month: string;
  value: number;
}

interface Props {
  /** Optional live data — falls back to static REVENUE_TREND if not provided */
  data?: RevenueTrendItem[];
}

export default function RevenueBarChart({ data }: Props) {
  const chartData = data && data.length > 0 ? data : REVENUE_TREND;
  const [animated, setAnimated] = useState(false);
  const max = Math.max(...chartData.map((d) => d.value), 1);

  useEffect(() => {
    setAnimated(false);
    const timer = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, [chartData]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          height: '80px',
          gap: '6px',
        }}
      >
        {chartData.map((item, i) => (
          <div
            key={`bar-${item.month}-${i}`}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              height: '100%',
              justifyContent: 'flex-end',
            }}
          >
            <div
              style={{
                width: '100%',
                borderRadius: '3px 3px 0 0',
                background:
                  i === chartData.length - 1
                    ? 'var(--green)'
                    : 'rgba(26,122,74,.4)',
                height: animated ? `${(item.value / max) * 100}%` : '0%',
                transition: `height 1s ease ${200 + i * 80}ms`,
              }}
              title={`GHS ${item.value.toLocaleString()}`}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        {chartData.map((item, i) => (
          <span
            key={`label-${item.month}-${i}`}
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
