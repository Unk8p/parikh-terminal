// Simplified scoring — 4 dimensions, each 0-100, weighted.
// DEAL, FFS, LOCATION, UPSIDE

// Shreya's rank list drives the LOCATION score
const SHREYA_RANK = {
  'Denver, CO': 1,          // Colorado / Barbara Davis Center (CU Anschutz)
  'Orlando, FL': 3,         // Nemours
  'Nashville, TN': 5,       // Vanderbilt
  'NC Triangle': 2,         // Duke/UNC backup — active LOI market
  // Off list — zero weight
  'Portland, OR': null,
  'Seattle, WA': null,
  'Cincinnati, OH': null,
  'St. Louis, MO': null,
};

// Score each dimension 0-100
function scoreDeal(l) {
  // Sweet spot: $500K–$1.5M, 4–7 ops. SBA 7(a) friendly, not overpriced.
  if (!l.collections) return 50; // unknown — neutral
  const c = l.collections;
  let s = 0;
  if (c >= 500000 && c <= 1500000) s = 100;
  else if (c >= 300000 && c < 500000) s = 75;
  else if (c > 1500000 && c <= 2500000) s = 70;
  else if (c < 300000) s = 35;
  else s = 25; // over $2.5M

  // ops adjustment
  if (l.ops) {
    if (l.ops >= 4 && l.ops <= 7) s = Math.min(100, s + 5);
    else if (l.ops < 3 || l.ops > 10) s = Math.max(0, s - 15);
  }
  return Math.round(s);
}

function scoreFFS(l) {
  if (l.ffs === 'yes') return 100;
  if (l.ffs === 'potential') return 70;
  // Area-based inference: affluent suburbs + rural = FFS-friendly
  const notes = (l.notes || '').toLowerCase();
  if (/ffs|fee-for-service|affluent|retire|rural/i.test(notes)) return 60;
  return 35; // PPO default
}

function scoreLocation(l, rankOverride) {
  const rank = rankOverride || SHREYA_RANK;
  const r = rank[l.market];
  if (r == null) return 10; // off list
  if (r === 1) return 100;
  if (r === 2) return 92;
  if (r === 3) return 80;
  if (r === 4) return 70;
  if (r === 5) return 60;
  return 40;
}

function scoreUpside(l) {
  // Implant/sedation lift potential: GP + underserved/rural/retiree markets win
  if (l.specialty && !/general/i.test(l.specialty)) return 20; // specialty mismatch
  const notes = (l.notes || '').toLowerCase();
  let s = 55; // base GP
  if (/retire|villages|rural|mountain|wine/i.test(notes)) s += 25;
  if (/implant|sedation|denture/i.test(notes)) s += 15;
  if (/grow|expand|add ops|room/i.test(notes)) s += 10;
  if (/legacy|established|35 year|40 year|loyal/i.test(notes)) s += 5;
  if (l.ops && l.ops >= 5) s += 5;
  return Math.min(100, s);
}

// Weighted composite 0-100
function computeFit(l, weights, rankOverride) {
  const d = scoreDeal(l);
  const f = scoreFFS(l);
  const loc = scoreLocation(l, rankOverride);
  const u = scoreUpside(l);
  const w = weights || { deal: 25, ffs: 25, location: 30, upside: 20 };
  const total = w.deal + w.ffs + w.location + w.upside;
  const composite = (d * w.deal + f * w.ffs + loc * w.location + u * w.upside) / total;
  return {
    deal: d, ffs: f, location: loc, upside: u,
    composite: Math.round(composite)
  };
}

// Reality filter — reasons to auto-hide a listing
function realityFlags(l, rules) {
  const flags = [];
  if (rules.sbaCap && l.collections && l.collections > 2500000) flags.push('Over SBA cap (>$2.5M)');
  if (rules.specialty && l.specialty && /pedi|ortho/i.test(l.specialty)) flags.push('Specialty mismatch');
  if (rules.tooSmall && l.ops && l.ops < 3) flags.push('Too small (<3 ops)');
  if (rules.tooLarge && l.ops && l.ops > 10) flags.push('Too large (>10 ops)');
  if (rules.chartSale && l.collections && l.collections < 250000) flags.push('Likely chart sale');
  if (rules.offList) {
    const r = SHREYA_RANK[l.market];
    if (r == null) flags.push("Off Shreya's rank list");
  }
  if (rules.lowScore && l.score < 75) flags.push('Low source score');
  return flags;
}

// SBA deal model — monthly debt service, DSCR estimate
function dealModel(l, assumptions) {
  const price = l.collections ? Math.round(l.collections * assumptions.priceMultiple) : null;
  if (!price) return null;
  const loanAmt = Math.round(price * (1 - assumptions.downPct / 100));
  const r = assumptions.rate / 100 / 12;
  const n = assumptions.termYears * 12;
  const monthlyPay = loanAmt * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const annualDebt = monthlyPay * 12;

  // EBITDA estimate: collections * margin (assume 35% for GP)
  const baseEbitda = l.collections * 0.35;
  // Upside from implant/sedation — add a % of collections
  const upsideEbitda = l.collections * (assumptions.upsidePct / 100);
  const projEbitda = baseEbitda + upsideEbitda;

  const dscr = projEbitda / annualDebt;
  const takeHome = projEbitda - annualDebt;

  return {
    price, loanAmt, monthlyPay, annualDebt,
    baseEbitda, upsideEbitda, projEbitda,
    dscr, takeHome
  };
}

Object.assign(window, {
  SHREYA_RANK, scoreDeal, scoreFFS, scoreLocation, scoreUpside,
  computeFit, realityFlags, dealModel
});
