// Left sidebar — scenarios, reality filters, weights, assumptions, price band

function Sidebar({ state, setState, counts, isMobile, mobileOpen, onMobileClose }) {
  const s = state;
  const up = (patch) => setState({ ...s, ...patch });
  const upRules = (patch) => setState({ ...s, rules: { ...s.rules, ...patch } });
  const upWeights = (patch) => setState({ ...s, weights: { ...s.weights, ...patch } });
  const upAssump = (patch) => setState({ ...s, assumptions: { ...s.assumptions, ...patch } });

  const mobileStyle = isMobile ? {
    position: 'fixed',
    top: 0, left: 0, bottom: 0,
    width: 'min(340px, 90vw)',
    height: '100dvh',
    zIndex: 90,
    transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.24s cubic-bezier(.2,.7,.2,1)',
    boxShadow: mobileOpen ? '4px 0 24px rgba(31,36,32,0.15)' : 'none',
  } : {
    width: 320, height: '100vh',
    flexShrink: 0,
    position: 'sticky', top: 0,
  };

  const recs = window.SCENARIOS.filter(x => x.rec);
  const core = window.SCENARIOS.filter(x => !x.rec);

  return (
    <aside style={{
      overflowY: 'auto',
      background: 'var(--paper-2)',
      borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column',
      ...mobileStyle,
    }}>
      {/* Brand */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Parikh / Acquisition
          </div>
          <div className="serif" style={{ fontSize: 26, color: 'var(--ink)', marginTop: 4, lineHeight: 1.05, fontWeight: 500 }}>
            Practice finder
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.4 }}>
            The best practice is the one you can actually own.
          </div>
        </div>
        {isMobile && (
          <button onClick={onMobileClose} aria-label="Close" style={{
            width: 32, height: 32, color: 'var(--ink-3)', fontSize: 20,
            border: '1px solid var(--line)', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        )}
      </div>

      {/* Scenario */}
      <SectionLabel>Match scenario</SectionLabel>
      <div style={{ padding: '2px 10px 14px' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', padding: '0 6px 10px', lineHeight: 1.4 }}>
          Shreya's rank weights the Location score.
        </div>
        {core.map(opt => <ScenarioRow key={opt.key} opt={opt} active={s.scenario === opt.key} onClick={() => up({ scenario: opt.key })} />)}
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)', padding: '10px 6px 6px', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Worth considering
        </div>
        {recs.map(opt => <ScenarioRow key={opt.key} opt={opt} active={s.scenario === opt.key} onClick={() => up({ scenario: opt.key })} />)}
      </div>

      {/* Reality filter */}
      <SectionLabel count={`${counts.shown}/${counts.total}`}>Reality filter</SectionLabel>
      <div style={{ padding: '2px 0 8px' }}>
        <Toggle on={s.rules.sbaCap} onChange={v => upRules({ sbaCap: v })}
          label="Hide > $2.5M" hint="Above SBA 7(a) comfort zone" />
        <Toggle on={s.rules.specialty} onChange={v => upRules({ specialty: v })}
          label="Hide pedo / ortho" hint="Specialty mismatch vs your scope" />
        <Toggle on={s.rules.tooSmall} onChange={v => upRules({ tooSmall: v })}
          label="Hide < 3 ops" hint="Too small to absorb sedation case load" />
        <Toggle on={s.rules.tooLarge} onChange={v => upRules({ tooLarge: v })}
          label="Hide > 10 ops" hint="Likely DSO" />
        <Toggle on={s.rules.chartSale} onChange={v => upRules({ chartSale: v })}
          label="Hide chart sales" hint="< $250K = patient list, not a practice" />
        <Toggle on={s.rules.scenarioOnly} onChange={v => upRules({ scenarioOnly: v })}
          label="Only show scenario market" hint="Restrict list to the market selected above" />
      </div>

      {/* Weights */}
      <SectionLabel>Fit weights</SectionLabel>
      <div style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Slider value={s.weights.deal} onChange={v => upWeights({ deal: v })} label="Deal size" suffix="%" />
        <Slider value={s.weights.ffs} onChange={v => upWeights({ ffs: v })} label="FFS fit" suffix="%" />
        <Slider value={s.weights.location} onChange={v => upWeights({ location: v })} label="Location (Shreya)" suffix="%" />
        <Slider value={s.weights.upside} onChange={v => upWeights({ upside: v })} label="Implant upside" suffix="%" />
        <Slider value={s.weights.geo} onChange={v => upWeights({ geo: v })} label="Commute & schools" suffix="%" />
        <button onClick={() => up({ weights: { deal: 22, ffs: 22, location: 22, upside: 18, geo: 16 } })}
          className="mono"
          style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          ↺ reset
        </button>
      </div>

      {/* Home price band */}
      <SectionLabel>Home price band</SectionLabel>
      <div style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.4 }}>
          Filters neighborhoods where we could realistically buy a home.
        </div>
        <Slider value={s.priceBand[0]} onChange={v => up({ priceBand: [v, Math.max(v + 50, s.priceBand[1])] })}
          label="Min home price" min={300} max={1500} step={25} suffix="K" />
        <Slider value={s.priceBand[1]} onChange={v => up({ priceBand: [Math.min(s.priceBand[0], v - 50), v] })}
          label="Max home price" min={400} max={2000} step={25} suffix="K" />
      </div>

      {/* Assumptions */}
      <SectionLabel>SBA 7(a) assumptions</SectionLabel>
      <div style={{ padding: '12px 16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Slider value={Math.round(s.assumptions.priceMultiple * 100)} onChange={v => upAssump({ priceMultiple: v/100 })}
          label="Price / collections" min={60} max={120} suffix="%" />
        <Slider value={s.assumptions.downPct} onChange={v => upAssump({ downPct: v })}
          label="Down payment" min={5} max={25} suffix="%" />
        <Slider value={s.assumptions.rate} onChange={v => upAssump({ rate: v })}
          label="Rate" min={7} max={12} step={0.25} suffix="%" />
        <Slider value={s.assumptions.termYears} onChange={v => upAssump({ termYears: v })}
          label="Term" min={5} max={15} suffix="y" />
        <Slider value={s.assumptions.upsidePct} onChange={v => upAssump({ upsidePct: v })}
          label="Implant/sedation lift" min={0} max={25} suffix="% coll" />
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)', lineHeight: 1.7 }}>
          Dashboard v4 · Apr 2026<br/>
          130 listings · nightly refresh via Cowork
        </div>
      </div>
    </aside>
  );
}

function ScenarioRow({ opt, active, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '8px 10px',
        marginBottom: 2, borderRadius: 6,
        background: active ? 'var(--sage-soft)' : 'transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--paper-3)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      <div style={{ fontSize: 13, color: active ? 'var(--moss)' : 'var(--ink)', fontWeight: active ? 600 : 500 }}>
        {opt.label}
      </div>
      <div style={{ fontSize: 11, color: active ? 'var(--moss)' : 'var(--ink-3)', marginTop: 1, lineHeight: 1.35, opacity: active ? 0.8 : 1 }}>
        {opt.hint}
      </div>
    </button>
  );
}

window.Sidebar = Sidebar;
