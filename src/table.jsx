// Main listings table

const { useMemo: useMemoT, useState: useStateT } = React;

function Table({ state, listings, onSelect, selected, outreach }) {
  const [sortBy, setSortBy] = useStateT('fit');
  const [sortDir, setSortDir] = useStateT('desc');
  const [query, setQuery] = useStateT('');

  const sorted = useMemoT(() => {
    let arr = listings;
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(l =>
        (l.name || '').toLowerCase().includes(q) ||
        (l.city || '').toLowerCase().includes(q) ||
        (l.market || '').toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q)
      );
    }
    const cmp = (a, b) => {
      let av, bv;
      switch (sortBy) {
        case 'fit': av = a.fit.composite; bv = b.fit.composite; break;
        case 'collections': av = a.collections || 0; bv = b.collections || 0; break;
        case 'market': av = a.market; bv = b.market; break;
        case 'city': av = a.city || ''; bv = b.city || ''; break;
        case 'ops': av = a.ops || 0; bv = b.ops || 0; break;
        case 'dscr': av = a.deal?.dscr || 0; bv = b.deal?.dscr || 0; break;
        default: av = a.fit.composite; bv = b.fit.composite;
      }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    };
    return [...arr].sort(cmp);
  }, [listings, sortBy, sortDir, query]);

  const header = (key, label, align = 'left', w) => (
    <th onClick={() => {
      if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      else { setSortBy(key); setSortDir(key === 'market' || key === 'city' ? 'asc' : 'desc'); }
    }}
    style={{
      textAlign: align, padding: '10px 12px', cursor: 'pointer',
      fontWeight: 600, fontSize: 10, color: 'var(--ink-3)',
      textTransform: 'uppercase', letterSpacing: 0.6,
      borderBottom: '1px solid var(--line)',
      background: 'var(--bg-1)', position: 'sticky', top: 0, zIndex: 2,
      userSelect: 'none', width: w,
      fontFamily: 'IBM Plex Mono'
    }}>
      <span style={{ color: sortBy === key ? 'var(--amber-2)' : 'inherit' }}>
        {label} {sortBy === key && (sortDir === 'asc' ? '↑' : '↓')}
      </span>
    </th>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', flex: 1, minWidth: 0 }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', borderBottom: '1px solid var(--line)',
        background: 'var(--bg-1)', flexShrink: 0, height: 52
      }}>
        <div style={{ flex: 1, position: 'relative', maxWidth: 420 }}>
          <input type="text" placeholder="Search practice, city, notes…"
            value={query} onChange={(e) => setQuery(e.target.value)}
            style={{ padding: '6px 10px 6px 28px', background: 'var(--bg-2)', border: '1px solid var(--line)' }} />
          <span style={{ position: 'absolute', left: 9, top: 7, color: 'var(--ink-4)', fontSize: 14 }}>⌕</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>Showing </span>
            <span className="mono" style={{ fontSize: 13, color: 'var(--amber-2)', fontWeight: 600 }}>{sorted.length}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}> of 130</span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>
            {state.scenario === 'ranked' && 'Ranked scenario'}
            {state.scenario === 'colorado' && 'Colorado match'}
            {state.scenario === 'orlando' && 'Nemours match'}
            {state.scenario === 'nc' && 'Duke match'}
            {state.scenario === 'nashville' && 'Vanderbilt match'}
            {state.scenario === 'unranked' && 'All markets'}
          </div>
        </div>
      </div>

      {/* Table scroll area */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {header('fit', 'Fit', 'left', 130)}
              {header('market', 'Market', 'left')}
              {header('city', 'City', 'left')}
              <th style={thSt}>Practice</th>
              {header('collections', 'Collections', 'right', 110)}
              {header('ops', 'Ops', 'right', 60)}
              <th style={{ ...thSt, textAlign: 'right', width: 80 }}>FFS</th>
              {header('dscr', 'DSCR', 'right', 70)}
              <th style={{ ...thSt, width: 80 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(l => {
              const isSel = selected?.id === l.id;
              const out = outreach[l.id];
              return (
                <tr key={l.id}
                  onClick={() => onSelect(l)}
                  style={{
                    cursor: 'pointer',
                    background: isSel ? 'var(--bg-2)' : 'transparent',
                    borderLeft: isSel ? '2px solid var(--amber)' : '2px solid transparent',
                    transition: 'background 0.08s'
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                  <td style={{ ...tdSt, paddingLeft: 12 }}>
                    <ScoreBar value={l.fit.composite} width={70} />
                  </td>
                  <td style={tdSt}>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{shortMarket(l.market)}</div>
                    {l.fellowship?.rank && l.fellowship.rank < 10 && (
                      <div className="mono" style={{ fontSize: 9, color: 'var(--amber-dim)', marginTop: 1, textTransform: 'uppercase' }}>
                        Shreya #{l.fellowship.rank}
                      </div>
                    )}
                  </td>
                  <td style={tdSt}>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{l.city}</div>
                  </td>
                  <td style={tdSt}>
                    <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>{l.name}</div>
                    {l.notes && (
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdSt, textAlign: 'right', fontFamily: 'IBM Plex Mono', fontWeight: 500, color: 'var(--ink)' }}>
                    {fmtMoney(l.collections)}
                  </td>
                  <td style={{ ...tdSt, textAlign: 'right', fontFamily: 'IBM Plex Mono', color: 'var(--ink-2)' }}>
                    {l.ops ?? '—'}
                  </td>
                  <td style={{ ...tdSt, textAlign: 'right' }}>
                    {l.ffs === 'yes' && <Chip tone="amber" size="xs">FFS</Chip>}
                    {l.ffs === 'potential' && <Chip tone="blue" size="xs">POT.</Chip>}
                    {l.ffs === 'unknown' && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>—</span>}
                  </td>
                  <td style={{ ...tdSt, textAlign: 'right', fontFamily: 'IBM Plex Mono' }}>
                    {l.deal?.dscr != null ? (
                      <span style={{
                        color: l.deal.dscr >= 1.25 ? 'var(--green)' : (l.deal.dscr >= 1.0 ? 'var(--amber-2)' : 'var(--red)'),
                        fontWeight: 500
                      }}>{l.deal.dscr.toFixed(2)}</span>
                    ) : <span style={{ color: 'var(--ink-4)' }}>—</span>}
                  </td>
                  <td style={tdSt}>
                    {out?.status && out.status !== 'Not Started'
                      ? <Chip tone={out.status === 'Contacted' ? 'blue' : out.status === 'LOI' ? 'amber' : out.status === 'Pass' ? 'ghost' : 'green'} size="xs">{out.status}</Chip>
                      : <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>—</span>}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>
                <div className="serif" style={{ fontSize: 20, marginBottom: 4 }}>Nothing matches.</div>
                <div className="mono" style={{ fontSize: 11 }}>Relax your reality filters or change the scenario.</div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thSt = {
  textAlign: 'left', padding: '10px 12px',
  fontWeight: 600, fontSize: 10, color: 'var(--ink-3)',
  textTransform: 'uppercase', letterSpacing: 0.6,
  borderBottom: '1px solid var(--line)',
  background: 'var(--bg-1)', position: 'sticky', top: 0, zIndex: 2,
  fontFamily: 'IBM Plex Mono'
};
const tdSt = {
  padding: '9px 12px', borderBottom: '1px solid var(--line)',
  verticalAlign: 'middle'
};

function shortMarket(m) {
  if (!m) return '—';
  return m.replace(', ', ' ').replace('NC Triangle', 'NC Triangle');
}

window.Table = Table;
