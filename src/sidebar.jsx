// Left sidebar — fellowship scenario, reality filters, weight sliders

const { useState } = React;

function Sidebar({ state, setState, counts, isMobile, mobileOpen, onMobileClose }) {
  const s = state;
  const up = (patch) => setState({ ...s, ...patch });
  const upRules = (patch) => setState({ ...s, rules: { ...s.rules, ...patch } });
  const upWeights = (patch) => setState({ ...s, weights: { ...s.weights, ...patch } });
  const upAssump = (patch) => setState({ ...s, assumptions: { ...s.assumptions, ...patch } });

  const mobileStyle = isMobile ? {
    position: 'fixed',
    top: 0, left: 0, bottom: 0,
    width: 'min(320px, 86vw)',
    height: '100vh',
    zIndex: 100,
    transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.22s ease-out',
    boxShadow: mobileOpen ? '2px 0 24px rgba(0,0,0,0.5)' : 'none'
  } : {};

  return (
    <aside style={{
      width: 280, height: '100vh', overflowY: 'auto',
      background: 'var(--bg-1)', borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      ...mobileStyle
    }}>
      {/* Brand */}
      <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            PARIKH / ACQUISITION
          </div>
          <div className="serif" style={{ fontSize: 22, color: 'var(--ink)', marginTop: 2, lineHeight: 1.1 }}>
            Practice terminal
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 6 }}>
            130 listings · live filter
          </div>
        </div>
        {isMobile && (
          <button onClick={onMobileClose} aria-label="Close filters" style={{
            width: 28, height: 28, color: 'var(--ink-3)', fontSize: 18, lineHeight: 1,
            border: '1px solid var(--line)', flexShrink: 0
          }}>×</button>
        )}
      </div>

      {/* Fellowship scenario */}
      <SectionLabel>Shreya's Match Scenario</SectionLabel>
      <div style={{ padding: '4px 14px 12px' }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 8, lineHeight: 1.5 }}>
          Rank list weights Location score. Swap to test scenarios.
        </div>
        {[
          { key: 'ranked', label: 'Ranked (current)', hint: 'Denver #1, NC #2, Orlando #3, Nashville #5' },
          { key: 'colorado', label: 'Matches Colorado', hint: 'Denver/Aurora — her top choice' },
          { key: 'orlando', label: 'Matches Nemours', hint: 'Stay in Orlando — easiest path' },
          { key: 'nc', label: 'Matches Duke (late add)', hint: 'NC Triangle — LOI in flight' },
          { key: 'nashville', label: 'Matches Vanderbilt', hint: 'Nashville — backup' },
          { key: 'unranked', label: 'Ignore rank list', hint: 'Show all markets equally' },
        ].map(opt => (
          <button key={opt.key}
            onClick={() => up({ scenario: opt.key })}
            style={{
              width: '100%', textAlign: 'left', padding: '7px 10px',
              marginBottom: 2, background: s.scenario === opt.key ? 'var(--bg-3)' : 'transparent',
              borderLeft: `2px solid ${s.scenario === opt.key ? 'var(--amber)' : 'transparent'}`,
              transition: 'background 0.1s'
            }}
            onMouseEnter={(e) => { if (s.scenario !== opt.key) e.currentTarget.style.background = 'var(--bg-2)'; }}
            onMouseLeave={(e) => { if (s.scenario !== opt.key) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ fontSize: 12, color: s.scenario === opt.key ? 'var(--amber-2)' : 'var(--ink)', fontWeight: 500 }}>{opt.label}</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{opt.hint}</div>
          </button>
        ))}
      </div>

      {/* Reality filters */}
      <SectionLabel count={`${counts.shown}/${counts.total}`}>Reality Filter</SectionLabel>
      <div style={{ padding: '2px 0 8px' }}>
        <Toggle on={s.rules.sbaCap} onChange={v => upRules({ sbaCap: v })}
          label="Hide > $2.5M" hint="Above SBA 7(a) comfort zone for first acquisition" />
        <Toggle on={s.rules.specialty} onChange={v => upRules({ specialty: v })}
          label="Hide pedo / ortho" hint="Specialty mismatch vs your GP+surgical scope" />
        <Toggle on={s.rules.tooSmall} onChange={v => upRules({ tooSmall: v })}
          label="Hide < 3 ops" hint="Too small to absorb implant/sedation case load" />
        <Toggle on={s.rules.tooLarge} onChange={v => upRules({ tooLarge: v })}
          label="Hide > 10 ops" hint="Likely DSO / too complex for solo" />
        <Toggle on={s.rules.chartSale} onChange={v => upRules({ chartSale: v })}
          label="Hide chart sales" hint="Collections < $250K = walk-in patient list, not a practice" />
        <Toggle on={s.rules.offList} onChange={v => upRules({ offList: v })}
          label="Hide off-rank markets" hint="Hide Portland/Seattle/STL/Cincinnati unless rank list changes" />
        <Toggle on={s.rules.lowScore} onChange={v => upRules({ lowScore: v })}
          label="Hide low source score" hint="Original dashboard score < 75" />
      </div>

      {/* Weights */}
      <SectionLabel>Fit Weights</SectionLabel>
      <div style={{ padding: '8px 14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Slider value={s.weights.deal} onChange={v => upWeights({ deal: v })} label="Deal size" suffix="%" />
        <Slider value={s.weights.ffs} onChange={v => upWeights({ ffs: v })} label="FFS fit" suffix="%" />
        <Slider value={s.weights.location} onChange={v => upWeights({ location: v })} label="Location / Shreya" suffix="%" />
        <Slider value={s.weights.upside} onChange={v => upWeights({ upside: v })} label="Implant upside" suffix="%" />
        <button onClick={() => up({ weights: { deal: 25, ffs: 25, location: 30, upside: 20 }})}
          className="mono"
          style={{ fontSize: 10, color: 'var(--ink-3)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left' }}>
          ↺ reset to default
        </button>
      </div>

      {/* Deal assumptions */}
      <SectionLabel>SBA 7(a) Assumptions</SectionLabel>
      <div style={{ padding: '8px 14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Slider value={s.assumptions.priceMultiple * 100} onChange={v => upAssump({ priceMultiple: v/100 })}
          label="Price / collections" min={60} max={120} suffix="%" />
        <Slider value={s.assumptions.downPct} onChange={v => upAssump({ downPct: v })}
          label="Down payment" min={5} max={25} suffix="%" />
        <Slider value={s.assumptions.rate} onChange={v => upAssump({ rate: v })}
          label="Rate" min={7} max={12} step={0.25} suffix="%" />
        <Slider value={s.assumptions.termYears} onChange={v => upAssump({ termYears: v })}
          label="Term" min={5} max={15} suffix="y" />
        <Slider value={s.assumptions.upsidePct} onChange={v => upAssump({ upsidePct: v })}
          label="Implant/sedation lift" min={0} max={25} suffix="% of coll." />
      </div>

      <div style={{ flex: 1 }} />

      {/* Footnote */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--line)' }}>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)', lineHeight: 1.6 }}>
          Source · Dashboard v4 · Apr 2026<br/>
          Data · Provide, BizBuySell, Schein, ADS<br/>
          Context · directives.md
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
