// Main App — assembles sidebar + table + detail, runs scoring pipeline

const { useState: useStateA, useMemo: useMemoA, useEffect: useEffectA } = React;

function useIsMobile() {
  const [isMobile, setIsMobile] = useStateA(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffectA(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

// Rank scenarios override Shreya's actual rank list
const SCENARIO_RANKS = {
  ranked: { 'Denver, CO': 1, 'NC Triangle': 2, 'Orlando, FL': 3, 'Nashville, TN': 5 },
  colorado: { 'Denver, CO': 1 },
  orlando: { 'Orlando, FL': 1 },
  nc: { 'NC Triangle': 1 },
  nashville: { 'Nashville, TN': 1 },
  unranked: { 'Denver, CO': 3, 'Orlando, FL': 3, 'Nashville, TN': 3, 'NC Triangle': 3, 'Portland, OR': 3, 'Seattle, WA': 3, 'Cincinnati, OH': 3, 'St. Louis, MO': 3 }
};

const DEFAULT_STATE = {
  scenario: 'ranked',
  weights: { deal: 25, ffs: 25, location: 30, upside: 20 },
  rules: {
    sbaCap: true, specialty: true, tooSmall: true, tooLarge: true,
    chartSale: true, offList: true, lowScore: false
  },
  assumptions: {
    priceMultiple: 0.85, downPct: 10, rate: 10.5, termYears: 10, upsidePct: 12
  }
};

function App() {
  const raw = window.PARIKH_DATA.listings;
  const brokers = window.PARIKH_BROKERS;

  const [state, setState] = useStateA(() => {
    try {
      const s = localStorage.getItem('parikh_state_v2');
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

  useEffectA(() => { localStorage.setItem('parikh_state_v2', JSON.stringify(state)); }, [state]);
  useEffectA(() => { localStorage.setItem('parikh_outreach_v2', JSON.stringify(outreach)); }, [outreach]);

  // Run scoring + filtering pipeline
  const { shown, totalCount } = useMemoA(() => {
    const rankOverride = SCENARIO_RANKS[state.scenario] || {};
    const enriched = raw.map(l => {
      const fit = computeFit(l, state.weights, rankOverride);
      const deal = dealModel(l, state.assumptions);
      const flags = realityFlags(l, state.rules);
      return { ...l, fit, deal, flags };
    });

    // Adjust offList rule per scenario — if 'unranked', ignore
    const filtered = enriched.filter(l => {
      if (state.scenario === 'unranked') {
        // Skip offList flag check for unranked
        return l.flags.filter(f => f !== "Off Shreya's rank list").length === 0;
      }
      // For specific scenarios, only show that market if offList is on
      if (state.rules.offList && ['colorado','orlando','nc','nashville'].includes(state.scenario)) {
        const allowedMarket = { colorado:'Denver, CO', orlando:'Orlando, FL', nc:'NC Triangle', nashville:'Nashville, TN' }[state.scenario];
        if (l.market !== allowedMarket) return false;
      }
      return l.flags.length === 0;
    });

    return { shown: filtered, totalCount: raw.length };
  }, [raw, state]);

  // If selected got filtered out, keep showing it (user can re-select)
  const currentSelected = useMemoA(() => {
    if (!selected) return null;
    const enrichedMatch = shown.find(l => l.id === selected.id);
    if (enrichedMatch) return enrichedMatch;
    // fall back to re-scoring just this one
    const rankOverride = SCENARIO_RANKS[state.scenario] || {};
    return {
      ...selected,
      fit: computeFit(selected, state.weights, rankOverride),
      deal: dealModel(selected, state.assumptions)
    };
  }, [selected, shown, state]);

  // Keyboard: escape to close
  useEffectA(() => {
    const h = (e) => {
      if (e.key === 'Escape') {
        if (sidebarOpen) setSidebarOpen(false);
        else setSelected(null);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [sidebarOpen]);

  // Lock background scroll when mobile overlays are open
  useEffectA(() => {
    if (!isMobile) return;
    const overlay = sidebarOpen || !!currentSelected;
    document.body.style.overflow = overlay ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, sidebarOpen, selected]);

  const counts = { shown: shown.length, total: totalCount };

  // Compute some headline stats
  const stats = useMemoA(() => {
    const withFit = shown.filter(l => l.fit.composite >= 80);
    const ffsCount = shown.filter(l => l.ffs === 'yes').length;
    const dscrOk = shown.filter(l => l.deal?.dscr >= 1.25).length;
    const outreachActive = Object.values(outreach).filter(o => o.status && o.status !== 'Not Started' && o.status !== 'Pass').length;
    return { strong: withFit.length, ffs: ffsCount, dscrOk, outreachActive };
  }, [shown, outreach]);

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
        <div className="mobile-topbar">
          <button className="mobile-topbar__btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open filters">
            ☰ Filters
          </button>
          <div className="mobile-topbar__brand">
            Practice terminal
            <div className="mobile-topbar__tag">
              {counts.shown}/{counts.total} · {state.scenario}
            </div>
          </div>
        </div>

        <StatsBar stats={stats} isMobile />

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Table state={state} listings={shown} onSelect={setSelected} selected={currentSelected} outreach={outreach} isMobile />
        </div>

        {/* Sidebar drawer */}
        <div className={'mobile-backdrop' + (sidebarOpen ? ' open' : '')}
          onClick={() => setSidebarOpen(false)} />
        <Sidebar state={state} setState={setState} counts={counts}
          isMobile mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

        {/* Detail full-screen overlay */}
        {currentSelected && (
          <Detail
            listing={currentSelected}
            onClose={() => setSelected(null)}
            outreach={outreach}
            setOutreach={setOutreach}
            brokers={brokers}
            isMobile
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <Sidebar state={state} setState={setState} counts={counts} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <StatsBar stats={stats} />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <Table state={state} listings={shown} onSelect={setSelected} selected={currentSelected} outreach={outreach} />
          {currentSelected && (
            <Detail
              listing={currentSelected}
              onClose={() => setSelected(null)}
              outreach={outreach}
              setOutreach={setOutreach}
              brokers={brokers}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StatsBar({ stats, isMobile }) {
  const Stat = ({ label, value, accent }) => (
    <div style={{
      display: 'flex', flexDirection: 'column',
      paddingRight: isMobile ? 12 : 24,
      borderRight: '1px solid var(--line)',
      marginRight: isMobile ? 12 : 24,
      flexShrink: 0
    }}>
      <span className="mono" style={{ fontSize: isMobile ? 9 : 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</span>
      <span className="mono" style={{ fontSize: isMobile ? 15 : 18, color: accent ? 'var(--amber-2)' : 'var(--ink)', fontWeight: 600, marginTop: 1 }}>{value}</span>
    </div>
  );
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: isMobile ? '10px 14px' : '12px 20px',
      background: 'var(--bg)',
      borderBottom: '1px solid var(--line)', flexShrink: 0,
      overflowX: isMobile ? 'auto' : 'visible',
      whiteSpace: isMobile ? 'nowrap' : 'normal'
    }}>
      <Stat label={isMobile ? 'Fit 80+' : 'Strong fit (80+)'} value={stats.strong} accent />
      <Stat label={isMobile ? 'FFS' : 'All-FFS listings'} value={stats.ffs} />
      <Stat label={isMobile ? 'DSCR≥1.25' : 'DSCR ≥ 1.25×'} value={stats.dscrOk} />
      <Stat label={isMobile ? 'Active' : 'Active outreach'} value={stats.outreachActive} />
      {!isMobile && (
        <>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'right' }}>
            <div className="serif" style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.1 }}>
              The best practice is the one you can actually own.
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              — filter ruthlessly
            </div>
          </div>
        </>
      )}
    </div>
  );
}

window.App = App;
