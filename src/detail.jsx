// Right-side detail drawer

const { useState: useStateD } = React;

function Detail({ listing, onClose, outreach, setOutreach, brokers, isMobile }) {
  if (!listing) return null;
  const l = listing;
  const fit = l.fit;
  const deal = l.deal;
  const out = outreach[l.id] || { status: 'Not Started', note: '', contactDate: '', offer: '' };

  const update = (patch) => setOutreach({ ...outreach, [l.id]: { ...out, ...patch } });

  // find matching brokers for this market
  const marketBrokers = brokers.filter(b => {
    const m = (b.markets || '').toLowerCase();
    const market = (l.market || '').toLowerCase();
    if (m.includes('all')) return true;
    if (market.includes('denver') && /co|colorado/i.test(m)) return true;
    if (market.includes('orlando') && /fl|florida/i.test(m)) return true;
    if (market.includes('nashville') && /tn/i.test(m)) return true;
    if (market.includes('nc') && /nc/i.test(m)) return true;
    if (market.includes('portland') && /or|oregon/i.test(m)) return true;
    if (market.includes('seattle') && /wa/i.test(m)) return true;
    if (market.includes('cincinnati') && /oh/i.test(m)) return true;
    if (market.includes('st. louis') && /mo|il/i.test(m)) return true;
    return false;
  }).slice(0, 6);

  const mobileStyle = isMobile ? {
    position: 'fixed',
    inset: 0,
    width: '100%',
    height: '100vh',
    zIndex: 110,
    borderLeft: 'none'
  } : {};

  return (
    <aside style={{
      width: 440, height: '100vh', overflowY: 'auto',
      background: 'var(--bg-1)', borderLeft: '1px solid var(--line)',
      flexShrink: 0,
      ...mobileStyle
    }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, background: 'var(--bg-1)', zIndex: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {l.city}, {l.market.split(',')[0].replace('NC Triangle', 'NC')}
            </div>
            <div className="serif" style={{ fontSize: 22, color: 'var(--ink)', marginTop: 2, lineHeight: 1.2 }}>
              {l.name}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {l.ffs === 'yes' && <Chip tone="amber">All FFS</Chip>}
              {l.ffs === 'potential' && <Chip tone="blue">FFS potential</Chip>}
              {l.fellowship?.rank && l.fellowship.rank < 10 && <Chip tone="amber">Shreya rank #{l.fellowship.rank}</Chip>}
              {l.source && <Chip tone="ghost">{l.source}</Chip>}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 26, height: 26, color: 'var(--ink-3)', fontSize: 18, lineHeight: 1,
            border: '1px solid var(--line)'
          }}>×</button>
        </div>
      </div>

      {/* Fit breakdown */}
      <div style={{ padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <ScoreRing value={fit.composite} size={78} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ScoreBar value={fit.deal} label="Deal" width={140} />
            <ScoreBar value={fit.ffs} label="FFS" width={140} />
            <ScoreBar value={fit.location} label="Loc" width={140} />
            <ScoreBar value={fit.upside} label="Upside" width={140} />
          </div>
        </div>
      </div>

      {/* Why this / why not */}
      <div style={{ padding: '0 18px 18px' }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
          Read
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
          {generateRead(l)}
        </div>
      </div>

      {/* Practice facts */}
      <SectionLabel>Practice</SectionLabel>
      <div style={{ padding: '10px 18px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 18px' }}>
        <Fact label="Collections" value={fmtMoneyFull(l.collections)} mono />
        <Fact label="Operatories" value={l.ops ?? '—'} mono />
        <Fact label="Square feet" value={l.sqft ? l.sqft.toLocaleString() : '—'} mono />
        <Fact label="Specialty" value={l.specialty} />
        <Fact label="FFS status" value={l.ffsRaw || 'Unknown'} />
        <Fact label="Source" value={l.source} />
      </div>

      {/* Deal model */}
      {deal && (
        <>
          <SectionLabel right={
            <span className="mono" style={{ fontSize: 10, color: deal.dscr >= 1.25 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {deal.dscr >= 1.25 ? '● DSCR OK' : '● DSCR LOW'}
            </span>
          }>SBA 7(a) Model</SectionLabel>
          <div style={{ padding: '10px 18px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 18px', marginBottom: 12 }}>
              <Fact label="Purchase price" value={fmtMoneyFull(deal.price)} mono />
              <Fact label="Loan amount" value={fmtMoneyFull(deal.loanAmt)} mono />
              <Fact label="Monthly debt" value={fmtMoneyFull(deal.monthlyPay)} mono />
              <Fact label="Annual debt" value={fmtMoneyFull(deal.annualDebt)} mono />
              <Fact label="Base EBITDA (35%)" value={fmtMoneyFull(deal.baseEbitda)} mono />
              <Fact label="Your upside" value={'+' + fmtMoneyFull(deal.upsideEbitda)} mono accent />
              <Fact label="Proj. EBITDA" value={fmtMoneyFull(deal.projEbitda)} mono />
              <Fact label="DSCR" value={deal.dscr.toFixed(2) + '×'} mono
                accent={deal.dscr >= 1.25 ? 'green' : 'red'} />
            </div>
            <div style={{ padding: 12, background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Proj. take-home (post-debt, pre-tax)
              </div>
              <div className="mono" style={{ fontSize: 22, color: deal.takeHome > 0 ? 'var(--amber-2)' : 'var(--red)', fontWeight: 600, marginTop: 2 }}>
                {fmtMoneyFull(deal.takeHome)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Shreya commute */}
      {l.fellowship && l.fellowship.rank && l.fellowship.rank < 10 && (
        <>
          <SectionLabel>Shreya Fit</SectionLabel>
          <div style={{ padding: '10px 18px 14px' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
              {l.fellowship.notes}
            </div>
          </div>
        </>
      )}

      {/* Outreach */}
      <SectionLabel>Outreach</SectionLabel>
      <div style={{ padding: '10px 18px 18px' }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>Status</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
          {['Not Started','Contacted','LOI','Under Review','Pass'].map(st => (
            <button key={st} onClick={() => update({ status: st })}
              style={{
                padding: '4px 9px', fontSize: 11,
                background: out.status === st ? 'var(--amber)' : 'var(--bg-2)',
                color: out.status === st ? 'var(--bg)' : 'var(--ink-2)',
                border: `1px solid ${out.status === st ? 'var(--amber)' : 'var(--line)'}`,
                fontWeight: out.status === st ? 600 : 400
              }}>{st}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>Contact date</div>
            <input type="text" placeholder="e.g. 4/22/26" value={out.contactDate || ''} onChange={(e) => update({ contactDate: e.target.value })} />
          </div>
          <div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>Your offer</div>
            <input type="text" placeholder="e.g. $540K" value={out.offer || ''} onChange={(e) => update({ offer: e.target.value })} />
          </div>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>Notes</div>
          <textarea rows={3} placeholder="Broker response, next step, red flags…"
            value={out.note || ''} onChange={(e) => update({ note: e.target.value })}
            style={{ resize: 'vertical', minHeight: 56 }} />
        </div>
      </div>

      {/* Brokers */}
      {marketBrokers.length > 0 && (
        <>
          <SectionLabel count={marketBrokers.length}>Brokers for {l.market.split(',')[0]}</SectionLabel>
          <div style={{ padding: '8px 18px 24px' }}>
            {marketBrokers.map((b, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < marketBrokers.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>{b.name}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>
                  {b.website && <a href={`https://${b.website}`} target="_blank" rel="noopener">{b.website}</a>}
                  {b.notes && <span style={{ color: 'var(--ink-4)' }}> · {b.notes}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}

function Fact({ label, value, mono, accent }) {
  const color = accent === 'green' ? 'var(--green)' :
                accent === 'red' ? 'var(--red)' :
                accent ? 'var(--amber-2)' : 'var(--ink)';
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color, marginTop: 2, fontFamily: mono ? 'IBM Plex Mono' : 'Inter' }}>{value}</div>
    </div>
  );
}

// Generate a one-paragraph read
function generateRead(l) {
  const bits = [];
  if (l.fit.composite >= 85) bits.push('Strong overall fit.');
  else if (l.fit.composite >= 70) bits.push('Solid fit.');
  else if (l.fit.composite >= 55) bits.push('Marginal fit.');
  else bits.push('Low fit given your criteria.');

  if (l.ffs === 'yes') bits.push('Already FFS — these almost never come to market; speed matters.');
  else if (l.ffs === 'potential') bits.push('FFS-transition candidate given location and size.');

  if (l.fellowship?.rank === 1) bits.push('Aligns with Shreya\'s #1 (Colorado/BDC).');
  else if (l.fellowship?.rank && l.fellowship.rank < 10) bits.push(`Aligns with Shreya rank #${l.fellowship.rank}.`);

  if (l.deal) {
    if (l.deal.dscr >= 1.5) bits.push(`Debt service self-funds comfortably (${l.deal.dscr.toFixed(2)}×).`);
    else if (l.deal.dscr < 1.25) bits.push(`DSCR tight at ${l.deal.dscr.toFixed(2)}× — negotiate price or expect lender pushback.`);
  }

  if (l.ops && l.ops >= 5 && l.collections && l.collections / l.ops < 150000) {
    bits.push(`Collections/op is low (${fmtMoney(l.collections/l.ops)}) — room for your implant/sedation lift.`);
  }
  return bits.join(' ');
}

window.Detail = Detail;
