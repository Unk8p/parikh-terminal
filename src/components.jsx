// Shared UI atoms

const fmtMoney = (n) => {
  if (n == null) return '—';
  if (n >= 1e6) return '$' + (n/1e6).toFixed(2).replace(/\.?0+$/,'') + 'M';
  if (n >= 1e3) return '$' + Math.round(n/1e3) + 'K';
  return '$' + n;
};
const fmtMoneyFull = (n) => n == null ? '—' : '$' + Math.round(n).toLocaleString();
const fmtPct = (n) => n == null ? '—' : (n * 100).toFixed(1) + '%';

function Chip({ children, tone = 'default', size = 'sm' }) {
  const tones = {
    default: { bg: 'var(--bg-3)', fg: 'var(--ink-2)', bd: 'var(--line-2)' },
    amber:   { bg: 'rgba(232,176,74,0.12)', fg: 'var(--amber-2)', bd: 'rgba(232,176,74,0.35)' },
    green:   { bg: 'rgba(110,195,137,0.12)', fg: 'var(--green)', bd: 'rgba(110,195,137,0.3)' },
    red:     { bg: 'rgba(209,106,106,0.12)', fg: 'var(--red)', bd: 'rgba(209,106,106,0.3)' },
    blue:    { bg: 'rgba(107,154,209,0.12)', fg: 'var(--blue)', bd: 'rgba(107,154,209,0.3)' },
    ghost:   { bg: 'transparent', fg: 'var(--ink-3)', bd: 'var(--line)' },
  };
  const t = tones[tone] || tones.default;
  return (
    <span className="mono" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: size === 'xs' ? '1px 5px' : '2px 7px',
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      fontSize: size === 'xs' ? 10 : 11,
      letterSpacing: 0.2,
      textTransform: 'uppercase',
      fontWeight: 500,
      whiteSpace: 'nowrap'
    }}>{children}</span>
  );
}

// Score bar — 0-100 with amber fill
function ScoreBar({ value, label, color = 'var(--amber)', width = 80 }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {label && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', width: 36, textTransform: 'uppercase' }}>{label}</span>}
      <div style={{ position: 'relative', width, height: 4, background: 'var(--bg-3)' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct + '%', background: color }} />
      </div>
      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', width: 24, textAlign: 'right' }}>{pct}</span>
    </div>
  );
}

// Big score ring (for detail view)
function ScoreRing({ value, size = 64, stroke = 6, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value || 0));
  const dash = c * pct / 100;
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} stroke="var(--bg-3)" strokeWidth={stroke} fill="none" />
          <circle cx={size/2} cy={size/2} r={r}
            stroke="var(--amber)" strokeWidth={stroke} fill="none"
            strokeDasharray={`${dash} ${c}`} strokeLinecap="square"
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'IBM Plex Mono', fontWeight: 600, fontSize: size * 0.32,
          color: 'var(--ink)'
        }}>{pct}</div>
      </div>
      {label && <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>}
    </div>
  );
}

// Toggle pill
function Toggle({ on, onChange, label, hint }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
      padding: '8px 10px', background: 'transparent',
      borderLeft: `2px solid ${on ? 'var(--amber)' : 'transparent'}`,
      transition: 'background 0.1s',
      textAlign: 'left'
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-2)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
      <div style={{
        width: 28, height: 16, borderRadius: 8, background: on ? 'var(--amber)' : 'var(--bg-3)',
        position: 'relative', transition: 'background 0.15s', flexShrink: 0,
        border: on ? 'none' : '1px solid var(--line-2)'
      }}>
        <div style={{
          position: 'absolute', top: 1, left: on ? 13 : 1,
          width: 12, height: 12, borderRadius: '50%',
          background: on ? 'var(--bg)' : 'var(--ink-3)',
          transition: 'left 0.15s'
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>{label}</div>
        {hint && <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{hint}</div>}
      </div>
    </button>
  );
}

// Slider
function Slider({ value, onChange, min = 0, max = 100, step = 1, label, suffix = '', width = '100%' }) {
  return (
    <div style={{ width }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--amber-2)', fontWeight: 500 }}>{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%', height: 4, WebkitAppearance: 'none', appearance: 'none',
          background: 'var(--bg-3)', outline: 'none', cursor: 'pointer'
        }}
      />
    </div>
  );
}

function SectionLabel({ children, count, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px 6px', borderTop: '1px solid var(--line)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
          {children}
        </span>
        {count != null && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{count}</span>}
      </div>
      {right}
    </div>
  );
}

// Inject slider thumb CSS once
(function injectSliderCSS(){
  if (document.getElementById('__parikh_slider_css')) return;
  const s = document.createElement('style');
  s.id = '__parikh_slider_css';
  s.textContent = `
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 12px; height: 12px; background: var(--amber);
      cursor: pointer; border: 2px solid var(--bg);
      box-shadow: 0 0 0 1px var(--amber);
    }
    input[type=range]::-moz-range-thumb {
      width: 12px; height: 12px; background: var(--amber);
      cursor: pointer; border: 2px solid var(--bg);
      box-shadow: 0 0 0 1px var(--amber);
    }
    input[type=text], input[type=number], textarea, select {
      background: var(--bg-2); border: 1px solid var(--line);
      color: var(--ink); padding: 6px 8px; outline: none;
      font-size: 12px; width: 100%;
    }
    input[type=text]:focus, input[type=number]:focus, textarea:focus, select:focus {
      border-color: var(--amber-dim);
    }
  `;
  document.head.appendChild(s);
})();

Object.assign(window, {
  fmtMoney, fmtMoneyFull, fmtPct,
  Chip, ScoreBar, ScoreRing, Toggle, Slider, SectionLabel
});
