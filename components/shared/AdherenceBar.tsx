interface AdherenceBarProps {
  percent: number;
  color?: 'green' | 'amber';
}

export default function AdherenceBar({ percent, color = 'green' }: AdherenceBarProps) {
  const colorVar = color === 'green' ? 'var(--green)' : 'var(--amber)';
  const textColor = color === 'green' ? 'var(--green)' : 'var(--amber)';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
      <span
        style={{
          background: 'var(--gray-xlt)',
          borderRadius: '2px',
          height: '7px',
          width: '60px',
          overflow: 'hidden',
          display: 'inline-block',
        }}
      >
        <span
          style={{
            display: 'block',
            height: '100%',
            background: colorVar,
            width: `${percent}%`,
          }}
        />
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '.65rem',
          color: textColor,
          marginLeft: '5px',
        }}
      >
        {percent}%
      </span>
    </span>
  );
}
