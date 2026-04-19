// Shared UI atoms — calm paper aesthetic

const fmtMoney = (n) => {
  if (n == null) return '—';
  if (n >= 1e6) return '$' + (n/1e6).toFixed(2).replace(/\.?0+$/,'') + 'M';
  if (n >= 1e3) return '$' + Math.round(n/1e3) + 'K';
  return '$' + n;
};
const fmtMoneyFull = (n) => n == null ? '—' : '$' + Math.round(n).toLocaleString();
const fmtPct = (n) => n == null ? '—' : (n * 100).toFixed(1) + '%';

// Chip — pill with tone
function Chip({ children, tone = 'default', size = 'sm', title }) {
  const tones = {
    default: { bg: 'var(--paper-3)', fg: 'var(--ink-2)', bd: 'var(--line)' },
    sage:    { bg: 'var(--sage-soft)', fg: 'var(--moss)', bd: 'transparent' },
    clay:    { bg: 'var(--clay-soft)', fg: 'var(--clay)', bd: 'transparent' },
    gold:    { bg: 'var(--gold-soft)', fg: 'var(--gold)', bd: 'transparent' },
    sky:     { bg: 'var(--sky-soft)', fg: 'var(--sky)', bd: 'transparent' },
    rose:    { bg: 'var(--rose-soft)', fg: 'var(--rose)', bd: 'transparent' },
    ghost:   { bg: 'transparent', fg: 'var(--ink-3)', bd: 'var(--line)' },
  };
  const t = tones[tone] || tones.default;
  const isXs = size === 'xs';
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: isXs ? '1px 6px' : '3px 9px',
      background: t.bg, color: t.fg,
      border: `1px solid ${t.bd}`,
      fontSize: isXs ? 10 : 11,
      fontWeight: 500,
      borderRadius: 999,
      whiteSpace: 'nowrap',
      fontFamily: 'Inter',
      lineHeight: 1.2,
    }}>{children}</span>
  );
}

// Confidence badge — shows data provenance
function Confidence({ level }) {
  if (!level || level === 'unknown') return null;
  const label = level === 'verified' ? 'verified' : 'inferred';
  const title = level === 'verified'
    ? 'Directly sourced or confirmed'
    : 'Inferred from reviews / public records';
  return <span className={'conf ' + level} title={title}>{label}</span>;
}

// Score bar
function ScoreBar({ value, label, width = 120, color }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  const c = color || (pct >= 80 ? 'var(--sage)' : pct >= 60 ? 'var(--gold)' : pct >= 40 ? 'var(--clay)' : 'var(--rose)');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {label && (
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', width: 40, textTransform: 'uppercase', letterSpacing: 0.3 }}>
          {label}
        </span>
      )}
      <div style={{ position: 'relative', width, height: 6, background: 'var(--paper-3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, width: pct + '%', background: c, transition: 'width 0.3s ease' }} />
      </div>
      <span className="num" style={{ fontSize: 11, color: 'var(--ink-2)', width: 24, textAlign: 'right', fontWeight: 500 }}>{pct}</span>
    </div>
  );
}

// Score ring
function ScoreRing({ value, size = 72, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value || 0));
  const dash = c * pct / 100;
  const col = pct >= 80 ? 'var(--sage)' : pct >= 60 ? 'var(--gold)' : pct >= 40 ? 'var(--clay)' : 'var(--rose)';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--paper-3)" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r}
          stroke={col} strokeWidth={stroke} fill="none"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.3s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="num" style={{ fontSize: size * 0.3, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>{pct}</div>
        <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>fit</div>
      </div>
    </div>
  );
}

// Toggle switch
function Toggle({ on, onChange, label, hint }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
      padding: '10px 14px',
      textAlign: 'left',
      background: 'transparent',
      borderLeft: `2px solid ${on ? 'var(--sage)' : 'transparent'}`,
      transition: 'background 0.12s',
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-3)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
      <div style={{
        width: 32, height: 18, borderRadius: 9,
        background: on ? 'var(--sage)' : 'var(--paper-3)',
        border: on ? 'none' : '1px solid var(--line-2)',
        position: 'relative', flexShrink: 0,
        transition: 'background 0.15s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: on ? 16 : 2,
          width: 12, height: 12, borderRadius: '50%',
          background: on ? 'white' : 'var(--ink-4)',
          transition: 'left 0.15s',
          boxShadow: on ? '0 1px 2px rgba(0,0,0,0.15)' : 'none',
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.35 }}>{hint}</div>}
      </div>
    </button>
  );
}

// Slider
function Slider({ value, onChange, min = 0, max = 100, step = 1, label, suffix = '' }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>{label}</span>
        <span className="num" style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600 }}>{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

// Section header
function SectionLabel({ children, count, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px 8px',
      borderTop: '1px solid var(--line)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>
          {children}
        </span>
        {count != null && <span className="num" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{count}</span>}
      </div>
      {right}
    </div>
  );
}

// Fact — label+value pair for detail views
function Fact({ label, value, confidence, mono = false, accent }) {
  const color = accent === 'sage' ? 'var(--sage)' :
                accent === 'rose' ? 'var(--rose)' :
                accent === 'clay' ? 'var(--clay)' :
                accent === 'gold' ? 'var(--gold)' :
                'var(--ink)';
  const empty = value == null || value === '' || value === '—';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </span>
        {confidence && <Confidence level={confidence} />}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 500,
        color: empty ? 'var(--ink-4)' : color,
        fontFamily: mono ? 'JetBrains Mono' : 'Inter',
        fontStyle: empty ? 'italic' : 'normal',
      }}>{empty ? 'not yet known' : value}</div>
    </div>
  );
}

Object.assign(window, {
  fmtMoney, fmtMoneyFull, fmtPct,
  Chip, Confidence, ScoreBar, ScoreRing, Toggle, Slider, SectionLabel, Fact
});
