// Scoring — 5 dimensions now: deal, ffs, location, upside, geo
// geo = neighborhood-best commute to practice + to Shreya's hospital

// Rank scenarios. Values are fellowship-rank approximations; lower = better.
window.SHREYA_RANK = {
  'Denver, CO': 1,
  'NC Triangle': 2,
  'Orlando, FL': 3,
  'Nashville, TN': 5,
};

// Scenarios the user can toggle. "worth_considering" = expanded programs
// Claude recommends based on program quality + practice market.
window.SCENARIOS = [
  { key: 'ranked',    label: 'Current rank list',        hint: 'Denver #1, NC #2, Orlando #3, Nashville #5' },
  { key: 'colorado',  label: 'Matches Colorado (BDC)',   hint: "Shreya's top — stay Denver" },
  { key: 'nc',        label: 'Matches Duke/UNC',         hint: 'NC Triangle backup' },
  { key: 'orlando',   label: 'Matches Nemours',          hint: 'Stay in Orlando' },
  { key: 'nashville', label: 'Matches Vanderbilt',       hint: 'Nashville option' },
  { key: 'cincinnati',label: 'Consider: Cincinnati',     hint: 'Top-3 peds-endo · cheap FFS market', rec: true },
  { key: 'philly',    label: 'Consider: Philadelphia',   hint: 'CHOP · Main Line FFS density', rec: true },
  { key: 'stl',       label: 'Consider: St. Louis',      hint: 'Wash U · underpriced · Ladue/Clayton', rec: true },
  { key: 'houston',   label: 'Consider: Houston',        hint: "Texas Children's · Memorial/Sugar Land", rec: true },
  { key: 'pittsburgh',label: 'Consider: Pittsburgh',     hint: 'UPMC · absurdly cheap · Fox Chapel', rec: true },
  { key: 'seattle',   label: 'Consider: Seattle',        hint: "Seattle Children's · pricey market", rec: true },
  { key: 'unranked',  label: 'Ignore rank list',         hint: 'All markets equal' },
];

const SCENARIO_RANKS = {
  ranked:    window.SHREYA_RANK,
  colorado:  { 'Denver, CO': 1 },
  nc:        { 'NC Triangle': 1 },
  orlando:   { 'Orlando, FL': 1 },
  nashville: { 'Nashville, TN': 1 },
  cincinnati:{ 'Cincinnati, OH': 1 },
  philly:    { 'Philadelphia, PA': 1 },
  stl:       { 'St. Louis, MO': 1 },
  houston:   { 'Houston, TX': 1 },
  pittsburgh:{ 'Pittsburgh, PA': 1 },
  seattle:   { 'Seattle, WA': 1 },
  unranked:  null,
};
window.SCENARIO_RANKS = SCENARIO_RANKS;

// --- Dimension scorers (0-100) ---

function scoreDeal(l) {
  if (!l.collections) return 50;
  const c = l.collections;
  let s;
  if (c >= 500000 && c <= 1500000) s = 100;
  else if (c >= 300000 && c < 500000) s = 75;
  else if (c > 1500000 && c <= 2500000) s = 70;
  else if (c < 300000) s = 35;
  else s = 25;
  if (l.ops) {
    if (l.ops >= 4 && l.ops <= 7) s = Math.min(100, s + 5);
    else if (l.ops < 3 || l.ops > 10) s = Math.max(0, s - 15);
  }
  return Math.round(s);
}

function scoreFFS(l) {
  if (l.ffs === 'yes') return 100;
  if (l.ffs === 'potential') return 70;
  const notes = (l.notes || '').toLowerCase();
  if (/ffs|fee-for-service|affluent|retire|rural/i.test(notes)) return 60;
  return 35;
}

function scoreLocation(l, rankOverride) {
  if (rankOverride === null) return 50; // unranked scenario → neutral
  const rank = rankOverride || window.SHREYA_RANK;
  const r = rank[l.market];
  if (r == null) return 15;
  if (r === 1) return 100;
  if (r === 2) return 92;
  if (r === 3) return 80;
  if (r === 4) return 70;
  if (r === 5) return 60;
  return 45;
}

function scoreUpside(l) {
  if (l.specialty && !/general/i.test(l.specialty)) return 20;
  const notes = (l.notes || '').toLowerCase();
  let s = 55;
  if (/retire|villages|rural|mountain|wine/i.test(notes)) s += 25;
  if (/implant|sedation|denture/i.test(notes)) s += 15;
  if (/grow|expand|add ops|room/i.test(notes)) s += 10;
  if (/legacy|established|35 year|40 year|loyal/i.test(notes)) s += 5;
  if (l.ops && l.ops >= 5) s += 5;
  // Big bonus if enrichment says sedation permit already in place
  if (l.enrich?.sedationPermit?.value === true) s += 10;
  return Math.min(100, s);
}

// Geo score — best neighborhood combined commute (home→practice + home→Shreya)
// Green (100) if both ≤30, yellow (70) if both ≤45, red (30) above.
function scoreGeo(l, priceBand) {
  const g = window.geoFor(l, priceBand);
  if (!g) return 50;
  const tp = g.toPractice ?? 60;
  const ts = g.toShreya ?? 60;
  const worst = Math.max(tp, ts);
  if (worst <= 20) return 100;
  if (worst <= 30) return 85;
  if (worst <= 45) return 60;
  if (worst <= 60) return 35;
  return 15;
}

// Weighted composite
function computeFit(l, weights, rankOverride, priceBand) {
  const d = scoreDeal(l);
  const f = scoreFFS(l);
  const loc = scoreLocation(l, rankOverride);
  const u = scoreUpside(l);
  const geo = scoreGeo(l, priceBand);
  const w = weights || { deal: 22, ffs: 22, location: 22, upside: 18, geo: 16 };
  const total = w.deal + w.ffs + w.location + w.upside + w.geo;
  const composite = (d*w.deal + f*w.ffs + loc*w.location + u*w.upside + geo*w.geo) / total;
  return {
    deal: d, ffs: f, location: loc, upside: u, geo,
    composite: Math.round(composite),
    geoDetail: window.geoFor(l, priceBand)
  };
}

function realityFlags(l, rules) {
  const flags = [];
  if (rules.sbaCap && l.collections && l.collections > 2500000) flags.push('Over SBA cap');
  if (rules.specialty && l.specialty && /pedi|ortho/i.test(l.specialty)) flags.push('Specialty mismatch');
  if (rules.tooSmall && l.ops && l.ops < 3) flags.push('Too small (<3 ops)');
  if (rules.tooLarge && l.ops && l.ops > 10) flags.push('Too large (>10 ops)');
  if (rules.chartSale && l.collections && l.collections < 250000) flags.push('Chart sale');
  if (rules.lowScore && l.score < 75) flags.push('Low source score');
  return flags;
}

function dealModel(l, assumptions) {
  const price = l.collections ? Math.round(l.collections * assumptions.priceMultiple) : null;
  if (!price) return null;
  const loanAmt = Math.round(price * (1 - assumptions.downPct / 100));
  const r = assumptions.rate / 100 / 12;
  const n = assumptions.termYears * 12;
  const monthlyPay = loanAmt * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const annualDebt = monthlyPay * 12;
  const baseEbitda = l.collections * 0.35;
  const upsideEbitda = l.collections * (assumptions.upsidePct / 100);
  const projEbitda = baseEbitda + upsideEbitda;
  const dscr = projEbitda / annualDebt;
  const takeHome = projEbitda - annualDebt;
  return { price, loanAmt, monthlyPay, annualDebt, baseEbitda, upsideEbitda, projEbitda, dscr, takeHome };
}

Object.assign(window, { scoreDeal, scoreFFS, scoreLocation, scoreUpside, scoreGeo, computeFit, realityFlags, dealModel });
