// Glossary — jargon definitions for the hover-dot tooltips in the detail pane.
// Add entries here and reference them from <Fact hint="<key>" ...> or <InfoDot term="<key>" />.
// Keep `body` ≤ 2-3 sentences; put numeric rules-of-thumb in `benchmark`.

window.GLOSSARY = {
  dscr: {
    label: 'DSCR — Debt Service Coverage Ratio',
    body: 'NOI ÷ annual debt service. It tells you whether the practice\'s cash flow covers the acquisition loan with a safety margin. In the model here, NOI ≈ projected EBITDA after you replace the seller with a market-rate dentist comp.',
    benchmark: 'SBA 7(a) dental lenders want ≥ 1.25×. ≥ 1.35× is comfortable; under 1.00× means the deal can\'t service its own debt.',
  },
  ebitda: {
    label: 'EBITDA — Earnings Before Interest, Taxes, Depreciation, Amortization',
    body: 'Operating cash flow of the practice, stripping out financing and accounting choices. "Base" EBITDA is today\'s number; "projected" is base plus the upside you think you can drive (fee schedule, hygiene recare, FFS transition).',
    benchmark: 'Healthy GP practices: ~20–30% EBITDA margin on collections. Pediatric/ortho often higher.',
  },
  sde: {
    label: 'SDE — Seller\'s Discretionary Earnings',
    body: 'EBITDA plus the seller\'s salary and personal add-backs. Brokers quote practice value as a multiple of SDE because a new owner-operator is taking that salary home. This terminal normalizes to EBITDA instead to make lender math cleaner.',
    benchmark: 'Typical asking multiple: 0.65–0.85× collections or ~2.5–3.5× SDE for GP practices.',
  },
  collections: {
    label: 'Collections',
    body: 'Cash actually received in the period. Different from production (what was charged) because of insurance writeoffs, adjustments, and unpaid balances. Always underwrite on collections, not production — production inflates the picture.',
    benchmark: 'Collections-to-production ratio should be ≥ 94%. Under 90% signals billing or insurance-mix problems.',
  },
  ops: {
    label: 'Operatories (ops)',
    body: 'The treatment rooms with plumbed chairs. An op is the constraint on daily patient throughput. "Plumbed but not equipped" still counts because the expensive work is already done — you can add a chair.',
    benchmark: 'Solo GP: 3–5 ops is typical. 6+ ops with only one dentist usually means there\'s room to add a hygienist or associate.',
  },
  ffs: {
    label: 'FFS — Fee-For-Service',
    body: 'The practice collects full fees directly from patients instead of accepting reduced rates from PPO insurance networks. Higher margin, smaller addressable patient pool. The opposite end is "PPO-heavy" where the practice is contracted with most insurers and takes their writedowns.',
    benchmark: '"All-FFS" is rare and commands a premium. "FFS potential" usually means high median income + low PPO penetration in the ZIP.',
  },
  sedationPermit: {
    label: 'Sedation permit',
    body: 'State-issued authorization to administer IV or oral moderate sedation. Takes months to obtain (CE hours, facility inspection, equipment) so an existing permit is a real asset. Enables higher-margin cases: full-mouth rehab, big extractions, pedo.',
    benchmark: 'About 15–20% of GP practices hold one. Sedation cases run 3–5× the fee of standard work.',
  },
  loanAmt: {
    label: 'Loan amount',
    body: 'Purchase price minus your down payment. SBA 7(a) loans can go up to 10% down (sometimes 5% for experienced buyers), with the rest financed over 10 years. Working-capital and equipment can roll into the same note.',
    benchmark: 'SBA 7(a): 10% down, prime + 2.75–3%, 10-year amortization, no prepay penalty after year 3.',
  },
  takeHome: {
    label: 'Take-home (post-debt, pre-tax)',
    body: 'What lands in your pocket after the loan payment, assuming you pay yourself the associate-dentist salary already baked into projected EBITDA. This is your W-2 + K-1 distribution combined, before federal/state income tax.',
    benchmark: 'Target ≥ $150K/yr in year 1 to justify ownership risk over being a W-2 associate.',
  },
  upsideEbitda: {
    label: 'Upside EBITDA',
    body: 'Incremental EBITDA you think you can unlock on top of what the practice does today. The scoring model credits FFS transitions, hygiene recare improvement, and adding a procedure the practice doesn\'t currently offer (like sedation or clear aligners).',
    benchmark: 'Realistic 12-month upside: 10–25% of base EBITDA. Bigger numbers mean heroic assumptions.',
  },
  sba: {
    label: 'SBA 7(a) loan',
    body: 'Small Business Administration\'s flagship loan program, commonly used for dental practice acquisition because it allows intangible asset (goodwill) financing and has no collateral shortfall requirement. You borrow from a bank; the SBA guarantees 75% of it.',
    benchmark: 'Max $5M total. Typical dental deal: $750K–$2M. Live Oak, Huntington, BofA Practice Solutions, Provide are the dominant lenders.',
  },
  monthlyPay: {
    label: 'Monthly debt service',
    body: 'Principal + interest payment on the acquisition loan each month. Calculated in the model at prime + 2.75%, 10-year amortization — standard SBA 7(a) terms. Doesn\'t include any equipment loans or working-capital draws.',
  },
  competingPractices: {
    label: 'Competing practices (3-mile radius)',
    body: 'Count of general-dentistry practices within 3 miles as of the last Google Places sweep. Density matters less than fit — a saturated area with bad Google reviews is often a better market than a sparse area dominated by one 4.9-star practice.',
    benchmark: 'Urban: 15–40 competitors in 3mi is normal. Suburban: 5–15. Rural: <5.',
  },
  populationGrowth: {
    label: 'Population growth (5-year)',
    body: 'Percent change in ZIP-level population over the trailing 5 years, from Census ACS data. Growing markets grow your patient base passively; shrinking markets force you to steal share.',
    benchmark: 'Above US average (~3%/5yr) is good. 10%+ means the ZIP is a growth market — rare and valuable.',
  },
  medianIncome: {
    label: 'Median household income',
    body: 'ZIP-level median from Census ACS. Drives FFS potential — above ~$90K the patient base is more likely to pay cash or use out-of-network reimbursement instead of demanding PPO-contracted rates.',
    benchmark: '$90K+ → FFS potential. $120K+ → strong sedation / cosmetic market.',
  },
  loi: {
    label: 'LOI — Letter of Intent',
    body: 'Non-binding term sheet you send after reviewing the CIM and initial financials. Covers price, down payment, financing contingency, transition period, noncompete, and exclusivity window (usually 30–60 days).',
    benchmark: 'Offers typically land at 0.60–0.75× collections for GP, with 3–6 month seller transition and 5-year noncompete.',
  },
  nda: {
    label: 'NDA + CIM workflow',
    body: 'You sign a Non-Disclosure Agreement with the broker; they send the Confidential Info Memorandum (CIM) with real financials, owner name, license details, and lease terms. Until then listings show only anonymized codes. Drop the CIM PDF into a Cowork chat to unlock the listing in this terminal.',
  },
  confidence: {
    label: 'Confidence chips',
    body: 'How much to trust each field. "verified" = from the broker or an NDA unlock. "high" = cross-referenced across 2+ public sources. "med" = inferred from one public source. "low" = best guess. "unknown" = pipeline hasn\'t found it yet.',
  },
};
