// Main App — assembles sidebar + list + detail

const { useState: useStateA, useMemo: useMemoA, useEffect: useEffectA } = React;

function useIsMobile() {
  const [m, setM] = useStateA(() => typeof window !== 'undefined' ? window.innerWidth < 980 : false);
  useEffectA(() => {
    const f = () => setM(window.innerWidth < 980);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return m;
}

const SCENARIO_MARKET = {
  colorado: 'Denver, CO', nc: 'NC Triangle', orlando: 'Orlando, FL', nashville: 'Nashville, TN',
  cincinnati: 'Cincinnati, OH', philly: 'Philadelphia, PA', stl: 'St. Louis, MO',
  houston: 'Houston, TX', pittsburgh: 'Pittsburgh, PA', seattle: 'Seattle, WA',
};

const DEFAULT_STATE = {
  scenario: 'ranked',
  priceBand: [550, 900],
  weights: { deal: 22, ffs: 22, location: 22, upside: 18, geo: 16 },
  rules: {
    sbaCap: true, specialty: true, tooSmall: true, tooLarge: true,
    chartSale: true, scenarioOnly: false, lowScore: false,
  },
  assumptions: { priceMultiple: 0.85, downPct: 10, rate: 10.5, termYears: 10, upsidePct: 12 }
};

function App() {
  const raw = window.PARIKH_DATA.listings;
  const brokers = window.PARIKH_BROKERS;

  const [state, setState] = useStateA(() => {
    try {
      const s = localStorage.getItem('parikh_state_v3');
      if (s) return { ...DEFAULT_STATE, ...JSON.parse(s) };
    } catch {}
    return DEFAULT_STATE;
  });
  const [selected, setSelected] = useStateA(null);
  const [sidebarOpen, setSidebarOpen] = useStateA(false);
  const isMobile = useIsMobile();
  const [outreach, setOutreach] = useStateA(() => {
    try {
      const s = localStorage.getItem('parikh_outreach_v2');
      if (s) return JSON.parse(s);
    } catch {}
    return {};
  });

  useEffectA(() => { localStorage.setItem('parikh_state_v3', JSON.stringify(state)); }, [state]);
  useEffectA(() => { localStorage.setItem('parikh_outreach_v2', JSON.stringify(outreach)); }, [outreach]);

  const { shown, totalCount } = useMemoA(() => {
    const rankOverride = window.SCENARIO_RANKS[state.scenario];
    const enriched = raw.map(l => {
      const fit = window.computeFit(l, state.weights, rankOverride, state.priceBand);
      const deal = window.dealModel(l, state.assumptions);
      const flags = window.realityFlags(l, state.rules);
      return { ...l, fit, deal, flags };
    });
    const filtered = enriched.filter(l => {
      if (l.flags.length > 0) return false;
      if (state.rules.scenarioOnly) {
        const targetMarket = SCENARIO_MARKET[state.scenario];
        if (targetMarket && l.market !== targetMarket) return false;
      }
      return true;
    });
    return { shown: filtered, totalCount: raw.length };
  }, [raw, state]);

  const currentSelected = useMemoA(() => {
    if (!selected) return null;
    const match = shown.find(l => l.id === selected.id);
    if (match) return match;
    const rankOverride = window.SCENARIO_RANKS[state.scenario];
    return {
      ...selected,
      fit: window.computeFit(selected, state.weights, rankOverride, state.priceBand),
      deal: window.dealModel(selected, state.assumptions),
    };
  }, [selected, shown, state]);

  useEffectA(() => {
    const h = (e) => {
      if (e.key === 'Escape') {
        if (sidebarOpen) setSidebarOpen(false);
        else if (selected) setSelected(null);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [sidebarOpen, selected]);

  useEffectA(() => {
    if (!isMobile) return;
    const overlay = sidebarOpen || !!currentSelected;
    document.body.style.overflow = overlay ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, sidebarOpen, currentSelected]);

  const counts = { shown: shown.length, total: totalCount };

  const stats = useMemoA(() => {
    const strong = shown.filter(l => l.fit.composite >= 80).length;
    const ffsCount = shown.filter(l => l.ffs === 'yes').length;
    const dscrOk = shown.filter(l => l.deal?.dscr >= 1.25).length;
    const active = Object.values(outreach).filter(o => o.status && !['Not Started', 'Pass'].includes(o.status)).length;
    return { strong, ffs: ffsCount, dscrOk, active };
  }, [shown, outreach]);

  // Mobile layout
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <MobileTopbar counts={counts} scenario={state.scenario} onFilters={() => setSidebarOpen(true)} />
        <StatsStrip stats={stats} isMobile />
        <List state={state} listings={shown} onSelect={setSelected} selected={currentSelected} outreach={outreach} isMobile />

        <div className={'drawer-backdrop' + (sidebarOpen ? ' open' : '')}
          onClick={() => setSidebarOpen(false)} />
        <Sidebar state={state} setState={setState} counts={counts}
          isMobile mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

        {currentSelected && (
          <Detail listing={currentSelected} onClose={() => setSelected(null)}
            outreach={outreach} setOutreach={setOutreach} brokers={brokers} isMobile />
        )}
      </div>
    );
  }

  // Desktop layout
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Sidebar state={state} setState={setState} counts={counts} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <StatsStrip stats={stats} scenario={state.scenario} counts={counts} />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <List state={state} listings={shown} onSelect={setSelected} selected={currentSelected} outreach={outreach} />
          {currentSelected && (
            <Detail listing={currentSelected} onClose={() => setSelected(null)}
              outreach={outreach} setOutreach={setOutreach} brokers={brokers} />
          )}
        </div>
      </div>
    </div>
  );
}

function MobileTopbar({ counts, scenario, onFilters }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 14px',
      background: 'var(--paper-2)', borderBottom: '1px solid var(--line)',
      position: 'sticky', top: 0, zIndex: 20,
    }}>
      <button onClick={onFilters} className="pill" style={{ padding: '8px 14px' }}>
        ☰ Filters
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="serif" style={{ fontSize: 16, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.1 }}>
          Practice finder
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {counts.shown}/{counts.total} · {scenario}
        </div>
      </div>
    </div>
  );
}

function StatsStrip({ stats, scenario, counts, isMobile }) {
  const Stat = ({ label, value, accent }) => (
    <div style={{
      display: 'flex', flexDirection: 'column',
      paddingRight: isMobile ? 14 : 28,
      borderRight: '1px solid var(--line)',
      marginRight: isMobile ? 14 : 28,
      flexShrink: 0,
    }}>
      <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
        {label}
      </span>
      <span className="num" style={{ fontSize: isMobile ? 17 : 22, color: accent ? 'var(--sage)' : 'var(--ink)', fontWeight: 600, marginTop: 2 }}>
        {value}
      </span>
    </div>
  );
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: isMobile ? '12px 14px' : '18px 24px',
      background: 'var(--paper-2)', borderBottom: '1px solid var(--line)',
      overflowX: isMobile ? 'auto' : 'visible',
      whiteSpace: 'nowrap',
    }}>
      <Stat label={isMobile ? 'Fit 80+' : 'Strong fit'} value={stats.strong} accent />
      <Stat label="All-FFS" value={stats.ffs} />
      <Stat label="DSCR ok" value={stats.dscrOk} />
      <Stat label="Active" value={stats.active} />
      {!isMobile && (
        <>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'right' }}>
            <div className="serif" style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.1, fontStyle: 'italic' }}>
              Filter ruthlessly. Call the ones that matter.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

window.App = App;
