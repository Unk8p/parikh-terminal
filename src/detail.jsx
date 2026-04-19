// Detail panel — listing deep-dive with enrichment fields, commute, deal model, outreach

const { useState: useStateD, useMemo: useMemoD, useEffect: useEffectD } = React;

function Detail({ listing, onClose, outreach, setOutreach, brokers, isMobile }) {
  if (!listing) return null;
  const l = listing;
  const fit = l.fit;
  const deal = l.deal;
  const e = l.enrich || {};
  const geo = fit.geoDetail;
  const out = outreach[l.id] || { status: 'Not Started', note: '', contactDate: '', offer: '' };
  const update = (patch) => setOutreach({ ...outreach, [l.id]: { ...out, ...patch } });

  const marketBrokers = brokers.filter(b => {
    const m = (b.markets || '').toLowerCase();
    const market = (l.market || '').toLowerCase();
    if (m.includes('all')) return true;
    if (market.includes('denver') && /co|colorado/i.test(m)) return true;
    if (market.includes('orlando') && /fl|florida/i.test(m)) return true;
    if (market.includes('nashville') && /tn/i.test(m)) return true;
    if (market.includes('nc') && /nc/i.test(m)) return true;
    return false;
  }).slice(0, 6);

  const style = isMobile ? {
    position: 'fixed', inset: 0, width: '100%', height: '100dvh',
    zIndex: 100, borderLeft: 'none',
  } : {
    width: 480, height: '100vh',
    position: 'sticky', top: 0, flexShrink: 0,
    borderLeft: '1px solid var(--line)',
  };

  const searchLink = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

  return (
    <aside style={{
      overflowY: 'auto',
      background: 'var(--paper-2)',
      ...style,
    }}>
      {/* Header */}
      <div style={{ padding: '18px 22px 16px', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, background: 'var(--paper-2)', zIndex: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {l.city} · {l.market.split(',')[0]}
            </div>
            <h2 className="serif" style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 500, lineHeight: 1.2 }}>
              {l.name}
            </h2>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {l.ffs === 'yes' && <Chip tone="gold">All-FFS</Chip>}
              {l.ffs === 'potential' && <Chip tone="sky">FFS potential</Chip>}
              {l.fellowship?.rank && l.fellowship.rank <= 5 && <Chip tone="gold">Shreya rank #{l.fellowship.rank}</Chip>}
              {e.sedationPermit?.value === true && <Chip tone="sage">Sedation permit ✓</Chip>}
              {l.nda && <Chip tone="sage" title={`CIM received ${l.nda.signedDate || ''} · ${l.nda.source || ''}`}>🔓 NDA unlocked</Chip>}
              {l.source && <Chip tone="ghost">{l.source}</Chip>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: 32, height: 32, border: '1px solid var(--line)', borderRadius: 6,
            color: 'var(--ink-3)', fontSize: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--paper)',
          }}>×</button>
        </div>
      </div>

      {/* Fit breakdown */}
      <div style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <ScoreRing value={fit.composite} size={86} stroke={7} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <ScoreBar value={fit.deal} label="Deal" width={160} />
          <ScoreBar value={fit.ffs} label="FFS" width={160} />
          <ScoreBar value={fit.location} label="Loc" width={160} />
          <ScoreBar value={fit.upside} label="Upside" width={160} />
          <ScoreBar value={fit.geo} label="Geo" width={160} />
        </div>
      </div>

      {/* Read */}
      <div style={{ padding: '0 22px 18px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
          {generateRead(l)}
        </div>
      </div>

      {/* Home base / commute */}
      <CommuteWidget listing={l} defaultGeo={geo} />


      {/* Practice facts (enrichable) */}
      <SectionLabel right={<span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>refreshed nightly</span>}>
        Practice facts
      </SectionLabel>
      <div style={{ padding: '10px 22px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
          <Fact label="Collections" value={fmtMoneyFull(l.collections)} mono hint="collections" />
          <Fact label="Operatories" value={l.ops ?? '—'} mono hint="ops" />
          <Fact label="Square feet" value={l.sqft ? l.sqft.toLocaleString() : '—'} mono />
          <Fact label="Specialty" value={l.specialty} />
          <Fact label="Practice website" value={e.practiceUrl?.value
            ? <a href={e.practiceUrl.value} target="_blank" rel="noopener">{e.practiceUrl.value.replace(/^https?:\/\//, '')}</a>
            : null} confidence={e.practiceUrl?.conf} />
          <Fact label="Google rating" value={e.googleRating?.value
            ? `★ ${e.googleRating.value.stars} (${e.googleRating.value.count})`
            : null} confidence={e.googleRating?.conf} />
          <Fact label="Owner name" value={e.ownerName?.value} confidence={e.ownerName?.conf} />
          <Fact label="License #" value={e.licenseNumber?.value} confidence={e.licenseNumber?.conf} mono />
          <Fact label="Years licensed" value={e.yearsLicensed?.value} confidence={e.yearsLicensed?.conf} mono />
          <Fact label="Sedation permit" value={
            e.sedationPermit?.value === true ? 'Yes' :
            e.sedationPermit?.value === false ? 'No' : null
          } confidence={e.sedationPermit?.conf}
             accent={e.sedationPermit?.value === true ? 'sage' : null}
             hint="sedationPermit" />
        </div>

        {/* Procedures */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Procedures offered
            </span>
            <Confidence level={e.proceduresOffered?.conf} />
          </div>
          {e.proceduresOffered?.value?.length ? (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {e.proceduresOffered.value.map((p, i) => <Chip key={i} tone="default" size="xs">{p}</Chip>)}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic' }}>
              not yet known — inferred from reviews + site once we know practice name
            </div>
          )}
        </div>

        {/* Quick research shortcuts */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
          <a className="pill" href={searchLink(`${l.name} ${l.city} dentist`)} target="_blank" rel="noopener">🔍 Google this</a>
          <a className="pill" href={searchLink(`dentist ${l.city} reviews site:google.com/maps`)} target="_blank" rel="noopener">Maps</a>
          <a className="pill" href={`https://www.google.com/maps/search/dentist+${encodeURIComponent(l.city)}`} target="_blank" rel="noopener">Competitors nearby</a>
        </div>
      </div>

      {/* Demographics (enrichable) */}
      <SectionLabel>Area & competition</SectionLabel>
      <div style={{ padding: '10px 22px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
        <Fact label="Median income" value={e.medianIncome?.value ? '$' + e.medianIncome.value.toLocaleString() : null}
          confidence={e.medianIncome?.conf} mono hint="medianIncome" />
        <Fact label="Population growth (5y)" value={e.populationGrowth5y?.value ? (e.populationGrowth5y.value > 0 ? '+' : '') + e.populationGrowth5y.value + '%' : null}
          confidence={e.populationGrowth5y?.conf} mono hint="populationGrowth" />
        <Fact label="Competing practices (3mi)" value={e.competingPractices3mi?.value}
          confidence={e.competingPractices3mi?.conf} mono hint="competingPractices" />
        <Fact label="First seen" value={e.firstSeen?.value} confidence={e.firstSeen?.conf} mono />
      </div>

      {/* Recent headlines */}
      {e.recentHeadlines?.value?.length > 0 && (
        <>
          <SectionLabel>Recent headlines</SectionLabel>
          <div style={{ padding: '10px 22px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {e.recentHeadlines.value.map((h, i) => (
              <a key={i} href={h.url} target="_blank" rel="noopener" style={{ display: 'block', padding: 10, background: 'var(--paper-3)', borderRadius: 6 }}>
                <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.3 }}>{h.title}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>{h.date}</div>
              </a>
            ))}
          </div>
        </>
      )}

      {/* Deal model */}
      {deal && (
        <>
          <SectionLabel right={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span className="mono" style={{ fontSize: 10, fontWeight: 600, color: deal.dscr >= 1.25 ? 'var(--sage)' : 'var(--rose)' }}>
                ● DSCR {deal.dscr >= 1.25 ? 'OK' : 'LOW'}
              </span>
              <InfoDot term="dscr" />
            </span>
          }>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              SBA 7(a) model
              <InfoDot term="sba" />
            </span>
          </SectionLabel>
          <div style={{ padding: '10px 22px 18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginBottom: 14 }}>
              <Fact label="Purchase price" value={fmtMoneyFull(deal.price)} mono />
              <Fact label="Loan" value={fmtMoneyFull(deal.loanAmt)} mono hint="loanAmt" />
              <Fact label="Monthly debt" value={fmtMoneyFull(deal.monthlyPay)} mono hint="monthlyPay" />
              <Fact label="Annual debt" value={fmtMoneyFull(deal.annualDebt)} mono />
              <Fact label="Base EBITDA" value={fmtMoneyFull(deal.baseEbitda)} mono hint="ebitda" />
              <Fact label="Your upside" value={'+' + fmtMoneyFull(deal.upsideEbitda)} mono accent="sage" hint="upsideEbitda" />
              <Fact label="Proj. EBITDA" value={fmtMoneyFull(deal.projEbitda)} mono />
              <Fact label="DSCR" value={deal.dscr.toFixed(2) + '×'} mono
                accent={deal.dscr >= 1.25 ? 'sage' : 'rose'} hint="dscr" />
            </div>
            <div style={{ padding: 14, background: 'var(--sage-soft)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--moss)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Projected take-home (post-debt, pre-tax)
                </span>
                <InfoDot term="takeHome" />
              </div>
              <div className="num" style={{ fontSize: 26, color: deal.takeHome > 0 ? 'var(--moss)' : 'var(--rose)', fontWeight: 600, marginTop: 4 }}>
                {fmtMoneyFull(deal.takeHome)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Outreach */}
      <SectionLabel>Outreach</SectionLabel>
      <div style={{ padding: '10px 22px 18px' }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>Status</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
          {['Not Started','Contacted','Under Review','LOI','Pass'].map(st => (
            <button key={st} onClick={() => update({ status: st })}
              className={'pill' + (out.status === st ? ' active' : '')}>
              {st}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Contact date</div>
            <input type="text" placeholder="4/22/26" value={out.contactDate || ''} onChange={(e) => update({ contactDate: e.target.value })} />
          </div>
          <div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Your offer</div>
            <input type="text" placeholder="$540K" value={out.offer || ''} onChange={(e) => update({ offer: e.target.value })} />
          </div>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</div>
          <textarea rows={3} placeholder="Broker response, next step, red flags…"
            value={out.note || ''} onChange={(ev) => update({ note: ev.target.value })}
            style={{ resize: 'vertical', minHeight: 64 }} />
        </div>
      </div>

      {/* Brokers */}
      {marketBrokers.length > 0 && (
        <>
          <SectionLabel count={marketBrokers.length}>Brokers · {l.market.split(',')[0]}</SectionLabel>
          <div style={{ padding: '8px 22px 30px' }}>
            {marketBrokers.map((b, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < marketBrokers.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{b.name}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                  {b.website && <a href={`https://${b.website}`} target="_blank" rel="noopener">{b.website}</a>}
                  {b.phone && <span> · {b.phone}</span>}
                  {b.email && <span> · <a href={`mailto:${b.email}`}>{b.email}</a></span>}
                </div>
                {b.notes && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3 }}>{b.notes}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}

// CommuteWidget — lets user pick a home-base neighborhood and see what it
// does to commute tradeoffs. Uses the haversine estimates from enrichment.jsx
// (Google Maps drive-time integration can slot in later by replacing
// estDriveMin with an async distance-matrix fetch).
function CommuteWidget({ listing, defaultGeo }) {
  const coords = window.CITY_COORDS?.[listing.city];
  const hoods = window.NEIGHBORHOODS?.[listing.market] || [];
  const shreya = window.SHREYA_ANCHORS?.[listing.market];

  // Precompute commute times for every neighborhood in the market
  const ranked = useMemoD(() => {
    if (!coords || hoods.length === 0) return [];
    return hoods.map(h => {
      const toPractice = window.estDriveMin(window.milesBetween(h, coords));
      const toShreya = shreya ? window.estDriveMin(window.milesBetween(h, shreya)) : null;
      const combined = (toPractice || 0) + (toShreya || 0);
      return { ...h, toPractice, toShreya, combined };
    }).sort((a, b) => a.combined - b.combined);
  }, [listing.id, coords, shreya, hoods]);

  const [pickName, setPick] = useStateD(null);

  // Reset pick when the listing changes. Prefer the scoring-algorithm default,
  // fall back to the top-ranked anchor.
  useEffectD(() => {
    const fallback = defaultGeo?.neighborhood?.name || ranked[0]?.name || null;
    setPick(fallback);
  }, [listing.id]);

  if (!coords || ranked.length === 0) {
    return (
      <>
        <SectionLabel>Home base & commute</SectionLabel>
        <div style={{ padding: '10px 22px 18px', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
          No neighborhood anchors for this market yet — add them in src/enrichment.jsx → window.NEIGHBORHOODS.
        </div>
      </>
    );
  }

  const pick = ranked.find(r => r.name === pickName) || ranked[0];

  return (
    <>
      <SectionLabel right={shreya ? (
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>
          vs. {shreya.name.split('—')[0].trim()}
        </span>
      ) : null}>Home base &amp; commute</SectionLabel>
      <div style={{ padding: '10px 22px 18px' }}>

        {/* Selected neighborhood card */}
        <div style={{ padding: 14, background: 'var(--paper-3)', borderRadius: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Home anchor
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', marginTop: 3 }}>
                {pick.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                Schools {pick.schools}/10 · ~${pick.priceK}K median
              </div>
            </div>
            <CommuteScore combined={pick.combined} />
          </div>
        </div>

        {/* Two-up commute boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <CommuteBox label="To practice" min={pick.toPractice} />
          <CommuteBox label="To Shreya's hospital" min={pick.toShreya} />
        </div>

        {/* Alternative neighborhoods ranked */}
        <div style={{ marginTop: 14 }}>
          <div className="mono" style={{
            fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase',
            letterSpacing: 0.6, marginBottom: 6,
          }}>
            Try another neighborhood ({ranked.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ranked.slice(0, 6).map(h => {
              const active = h.name === pick.name;
              return (
                <button key={h.name} onClick={() => setPick(h.name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 10px', borderRadius: 6,
                    background: active ? 'var(--sage-soft)' : 'var(--paper-2)',
                    border: '1px solid var(--line)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: active ? 600 : 500,
                      color: active ? 'var(--moss)' : 'var(--ink)',
                    }}>
                      {h.name}
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 1 }}>
                      Schools {h.schools}/10 · ~${h.priceK}K
                    </div>
                  </div>
                  <div className="num" style={{ fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                    <span style={{ color: tintForMin(h.toPractice) }}>~{h.toPractice}m</span>
                    <span style={{ color: 'var(--ink-4)', margin: '0 4px' }}>·</span>
                    <span style={{ color: tintForMin(h.toShreya) }}>~{h.toShreya ?? '—'}m</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 12, fontStyle: 'italic' }}>
          Times are straight-line estimates at 30 mph. Swap in Google Distance Matrix by replacing <span className="mono">estDriveMin</span> in enrichment.jsx.
        </div>
      </div>
    </>
  );
}

function CommuteScore({ combined }) {
  // Quick badge summarizing whether this anchor is tenable.
  const label = combined == null ? '—'
    : combined <= 50 ? 'Great'
    : combined <= 75 ? 'OK'
    : combined <= 100 ? 'Tight'
    : 'Tough';
  const tone = combined == null ? 'ghost'
    : combined <= 50 ? 'sage'
    : combined <= 75 ? 'gold'
    : 'rose';
  return (
    <div style={{ textAlign: 'right' }}>
      <Chip tone={tone} size="xs">{label}</Chip>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 4 }}>
        ~{combined}m combined
      </div>
    </div>
  );
}

function tintForMin(min) {
  if (min == null) return 'var(--ink-4)';
  if (min <= 30) return 'var(--moss)';
  if (min <= 45) return 'var(--gold)';
  return 'var(--rose)';
}

function CommuteBox({ label, min }) {
  const tone = min == null ? 'default' : min <= 30 ? 'sage' : min <= 45 ? 'gold' : 'rose';
  const col = tone === 'sage' ? 'var(--moss)' : tone === 'gold' ? 'var(--gold)' : tone === 'rose' ? 'var(--rose)' : 'var(--ink)';
  const bg = tone === 'sage' ? 'var(--sage-soft)' : tone === 'gold' ? 'var(--gold-soft)' : tone === 'rose' ? 'var(--rose-soft)' : 'var(--paper-3)';
  return (
    <div style={{ padding: 12, background: bg, borderRadius: 8 }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div className="num" style={{ fontSize: 22, fontWeight: 600, color: col, marginTop: 3 }}>
        {min != null ? '~' + min : '—'}<span style={{ fontSize: 12, fontWeight: 500, marginLeft: 3 }}>min</span>
      </div>
    </div>
  );
}

function generateRead(l) {
  const bits = [];
  if (l.fit.composite >= 85) bits.push('Strong overall fit.');
  else if (l.fit.composite >= 70) bits.push('Solid fit.');
  else if (l.fit.composite >= 55) bits.push('Marginal fit.');
  else bits.push('Low fit given your criteria.');
  if (l.ffs === 'yes') bits.push('Already FFS — rare; move fast.');
  else if (l.ffs === 'potential') bits.push('FFS-transition candidate given area.');
  if (l.fit.geoDetail) {
    const g = l.fit.geoDetail;
    if (g.toPractice <= 30 && g.toShreya <= 30) bits.push(`Lives nicely in ${g.neighborhood.name} — under 30 min to both.`);
    else if (g.toPractice > 45 || g.toShreya > 45) bits.push(`Commute pinch: ${g.neighborhood.name} is best, but one leg exceeds 45 min.`);
  }
  if (l.enrich?.sedationPermit?.value === true) bits.push('Already holds a sedation permit — big unlock on your thesis.');
  if (l.deal) {
    if (l.deal.dscr >= 1.5) bits.push(`Debt self-funds comfortably (${l.deal.dscr.toFixed(2)}×).`);
    else if (l.deal.dscr < 1.25) bits.push(`DSCR tight at ${l.deal.dscr.toFixed(2)}× — negotiate or expect lender pushback.`);
  }
  return bits.join(' ');
}

window.Detail = Detail;
