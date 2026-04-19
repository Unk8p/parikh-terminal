// Main list — card-based for both mobile and desktop (calmer than a dense table)

const { useMemo: useMemoL, useState: useStateL } = React;

function List({ state, listings, onSelect, selected, outreach, isMobile }) {
  const [sortBy, setSortBy] = useStateL('fit');
  const [query, setQuery] = useStateL('');

  const sorted = useMemoL(() => {
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
      switch (sortBy) {
        case 'fit':         return b.fit.composite - a.fit.composite;
        case 'collections': return (b.collections || 0) - (a.collections || 0);
        case 'dscr':        return (b.deal?.dscr || 0) - (a.deal?.dscr || 0);
        case 'commute':     return (a.fit.geoDetail?.combined ?? 999) - (b.fit.geoDetail?.combined ?? 999);
        default:            return b.fit.composite - a.fit.composite;
      }
    };
    return [...arr].sort(cmp);
  }, [listings, sortBy, query]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: '100dvh' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: isMobile ? '12px 14px' : '16px 24px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--paper)',
        position: 'sticky', top: 0, zIndex: 5,
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 180, maxWidth: 360 }}>
          <input type="text" placeholder="Search name, city, notes…"
            value={query} onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 32 }} />
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', fontSize: 14 }}>⌕</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { k: 'fit',         l: 'Best fit' },
            { k: 'commute',     l: 'Commute' },
            { k: 'collections', l: 'Collections' },
            { k: 'dscr',        l: 'DSCR' },
          ].map(opt => (
            <button key={opt.k} onClick={() => setSortBy(opt.k)}
              className={'pill' + (sortBy === opt.k ? ' active' : '')}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{
        flex: 1, overflow: 'auto',
        padding: isMobile ? '12px 12px 24px' : '20px 24px 40px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))',
        gap: 14,
        alignContent: 'start',
      }}>
        {sorted.map(l => (
          <ListingCard key={l.id} l={l} selected={selected?.id === l.id} onSelect={() => onSelect(l)} outreach={outreach[l.id]} />
        ))}
        {sorted.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '60px 20px', textAlign: 'center', color: 'var(--ink-3)' }}>
            <div className="serif" style={{ fontSize: 22, marginBottom: 6 }}>Nothing matches.</div>
            <div style={{ fontSize: 13 }}>Relax your reality filters, expand the price band, or change the scenario.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ListingCard({ l, selected, onSelect, outreach }) {
  const fit = l.fit;
  const deal = l.deal;
  const geo = fit.geoDetail;
  const out = outreach;
  const dscrTone = deal?.dscr >= 1.25 ? 'sage' : deal?.dscr >= 1.0 ? 'gold' : 'rose';

  return (
    <article onClick={onSelect} className="card card-hover"
      style={{
        padding: 18,
        cursor: 'pointer',
        borderColor: selected ? 'var(--sage)' : 'var(--line)',
        boxShadow: selected ? '0 0 0 3px var(--sage-soft)' : 'none',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <ScoreRing value={fit.composite} size={56} stroke={5} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {shortMarket(l.market)}
            </span>
            {l.fellowship?.rank && l.fellowship.rank <= 5 && (
              <Chip tone="gold" size="xs">Shreya #{l.fellowship.rank}</Chip>
            )}
          </div>
          <h3 className="serif" style={{ margin: '3px 0 0', fontSize: 18, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.25 }}>
            {l.name}
          </h3>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
            {l.city}
          </div>
        </div>
      </div>

      {/* Key numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <MiniStat label="Collections" value={fmtMoney(l.collections)} />
        <MiniStat label="Ops" value={l.ops ?? '—'} />
        <MiniStat label="DSCR" value={deal?.dscr ? deal.dscr.toFixed(2) + '×' : '—'}
          tone={deal?.dscr ? dscrTone : null} />
      </div>

      {/* Chips row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {l.ffs === 'yes' && <Chip tone="gold" size="xs">All-FFS</Chip>}
        {l.ffs === 'potential' && <Chip tone="sky" size="xs">FFS potential</Chip>}
        {l.enrich?.sedationPermit?.value === true && <Chip tone="sage" size="xs">Sedation ✓</Chip>}
        {l.enrich?.googleRating?.value && (
          <Chip tone="default" size="xs">★ {l.enrich.googleRating.value.stars}</Chip>
        )}
        {out?.status && out.status !== 'Not Started' && (
          <Chip tone={out.status === 'LOI' ? 'gold' : out.status === 'Pass' ? 'ghost' : out.status === 'Under Review' ? 'sky' : 'sage'} size="xs">
            {out.status}
          </Chip>
        )}
      </div>

      {/* Geo line */}
      {geo && (
        <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5, padding: '10px 12px', background: 'var(--paper-3)', borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Home base
            </span>
            <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{geo.neighborhood.name}</span>
            <span className="num" style={{ fontSize: 11, color: 'var(--ink-3)' }}>· ${geo.neighborhood.priceK}K · schools {geo.neighborhood.schools}/10</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            ~{geo.toPractice}min to practice · ~{geo.toShreya}min to Shreya
          </div>
        </div>
      )}

      {/* Notes */}
      {l.notes && (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', lineHeight: 1.45 }}>
          {l.notes}
        </div>
      )}
    </article>
  );
}

function MiniStat({ label, value, tone }) {
  const col = tone === 'sage' ? 'var(--sage)' : tone === 'gold' ? 'var(--gold)' : tone === 'rose' ? 'var(--rose)' : 'var(--ink)';
  return (
    <div>
      <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <div className="num" style={{ fontSize: 15, fontWeight: 600, color: col, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function shortMarket(m) {
  if (!m) return '—';
  return m.replace('NC Triangle', 'NC Triangle');
}

window.List = List;
