// Enrichment layer — data Cowork's pipeline will populate nightly.
// Each field has a value + confidence ('verified' | 'inferred' | 'unknown').
// This file also seeds:
//   • per-metro neighborhood anchors (good schools + price band + centroid)
//   • Shreya fellowship hospital anchors
//   • expanded scenario candidates (programs worth considering)

// --------------------------------------------------------------------------
// Shreya fellowship hospital anchors (geocoded for drive-time scoring).
// --------------------------------------------------------------------------
window.SHREYA_ANCHORS = {
  'Denver, CO':    { name: 'Barbara Davis Center — CU Anschutz', lat: 39.7446, lng: -104.8373, city: 'Aurora, CO' },
  'Orlando, FL':   { name: "Nemours Children's Hospital",        lat: 28.4126, lng: -81.2706, city: 'Orlando, FL' },
  'Nashville, TN': { name: 'Monroe Carell — Vanderbilt',         lat: 36.1437, lng: -86.8031, city: 'Nashville, TN' },
  'NC Triangle':   { name: "Duke Children's",                    lat: 36.0071, lng: -78.9395, city: 'Durham, NC' },
  'Cincinnati, OH':{ name: "Cincinnati Children's",              lat: 39.1404, lng: -84.5020, city: 'Cincinnati, OH' },
  'Philadelphia, PA':{ name: "CHOP",                             lat: 39.9475, lng: -75.1938, city: 'Philadelphia, PA' },
  'St. Louis, MO': { name: "St. Louis Children's — Wash U",      lat: 38.6359, lng: -90.2648, city: 'St. Louis, MO' },
  'Houston, TX':   { name: "Texas Children's",                   lat: 29.7089, lng: -95.4013, city: 'Houston, TX' },
  'Seattle, WA':   { name: "Seattle Children's",                 lat: 47.6616, lng: -122.2822, city: 'Seattle, WA' },
  'Pittsburgh, PA':{ name: 'UPMC Children\'s',                   lat: 40.4664, lng: -79.9494, city: 'Pittsburgh, PA' },
  'Portland, OR':  { name: 'OHSU Doernbecher',                   lat: 45.4989, lng: -122.6851, city: 'Portland, OR' },
};

// --------------------------------------------------------------------------
// Neighborhood anchors — curated "good schools + price band" candidates
// per metro. Cowork enriches these with GreatSchools rating + Redfin median.
// Seed values are reasonable estimates; confidence="inferred" until refreshed.
// --------------------------------------------------------------------------
window.NEIGHBORHOODS = {
  'Denver, CO': [
    { name: 'Cherry Creek',      lat: 39.7183, lng: -104.9551, schools: 9, priceK: 1150 },
    { name: 'Wash Park',         lat: 39.7007, lng: -104.9683, schools: 8, priceK: 895 },
    { name: 'Hilltop',           lat: 39.7242, lng: -104.9238, schools: 9, priceK: 1250 },
    { name: 'Stapleton/Central Park', lat: 39.7695, lng: -104.8938, schools: 8, priceK: 755 },
    { name: 'Lowry',             lat: 39.7217, lng: -104.8952, schools: 8, priceK: 820 },
    { name: 'Englewood',         lat: 39.6478, lng: -104.9878, schools: 7, priceK: 640 },
    { name: 'Highlands Ranch',   lat: 39.5407, lng: -104.9694, schools: 9, priceK: 740 },
  ],
  'NC Triangle': [
    { name: 'Chapel Hill',       lat: 35.9132, lng: -79.0558, schools: 10, priceK: 820 },
    { name: 'Southern Village',  lat: 35.8823, lng: -79.0795, schools: 9, priceK: 720 },
    { name: 'Cary (West)',       lat: 35.7915, lng: -78.8114, schools: 9, priceK: 680 },
    { name: 'North Hills (Raleigh)', lat: 35.8340, lng: -78.6330, schools: 8, priceK: 720 },
    { name: 'Hope Valley (Durham)',  lat: 35.9520, lng: -78.9740, schools: 8, priceK: 650 },
    { name: 'Apex',              lat: 35.7320, lng: -78.8503, schools: 9, priceK: 620 },
  ],
  'Orlando, FL': [
    { name: 'Winter Park',       lat: 28.6000, lng: -81.3392, schools: 9, priceK: 780 },
    { name: 'Baldwin Park',      lat: 28.5569, lng: -81.3382, schools: 8, priceK: 680 },
    { name: 'College Park',      lat: 28.5727, lng: -81.3858, schools: 7, priceK: 560 },
    { name: 'Windermere',        lat: 28.4951, lng: -81.5347, schools: 9, priceK: 870 },
    { name: 'Lake Mary',         lat: 28.7589, lng: -81.3184, schools: 9, priceK: 640 },
  ],
  'Nashville, TN': [
    { name: 'Green Hills',       lat: 36.1056, lng: -86.8139, schools: 9, priceK: 880 },
    { name: 'Forest Hills',      lat: 36.0831, lng: -86.8270, schools: 9, priceK: 1100 },
    { name: '12South',           lat: 36.1199, lng: -86.7894, schools: 7, priceK: 790 },
    { name: 'Franklin',          lat: 35.9251, lng: -86.8689, schools: 10, priceK: 850 },
    { name: 'Brentwood',         lat: 36.0331, lng: -86.7828, schools: 10, priceK: 1020 },
  ],
  'Cincinnati, OH': [
    { name: 'Mason',             lat: 39.3600, lng: -84.3094, schools: 10, priceK: 520 },
    { name: 'Montgomery',        lat: 39.2284, lng: -84.3538, schools: 10, priceK: 640 },
    { name: 'Hyde Park',         lat: 39.1406, lng: -84.4381, schools: 8, priceK: 580 },
    { name: 'Blue Ash',          lat: 39.2325, lng: -84.3783, schools: 9, priceK: 490 },
    { name: 'Indian Hill',       lat: 39.1873, lng: -84.3435, schools: 10, priceK: 920 },
  ],
  'Philadelphia, PA': [
    { name: 'Wayne (Main Line)', lat: 40.0437, lng: -75.3872, schools: 10, priceK: 880 },
    { name: 'Bryn Mawr',         lat: 40.0237, lng: -75.3149, schools: 10, priceK: 820 },
    { name: 'Haverford',         lat: 40.0137, lng: -75.2961, schools: 10, priceK: 920 },
    { name: 'Rosemont',          lat: 40.0284, lng: -75.3285, schools: 10, priceK: 950 },
  ],
  'St. Louis, MO': [
    { name: 'Ladue',             lat: 38.6478, lng: -90.3812, schools: 10, priceK: 840 },
    { name: 'Clayton',           lat: 38.6426, lng: -90.3235, schools: 10, priceK: 780 },
    { name: 'Kirkwood',          lat: 38.5834, lng: -90.4068, schools: 9, priceK: 560 },
    { name: 'Chesterfield',      lat: 38.6631, lng: -90.5771, schools: 9, priceK: 520 },
  ],
  'Houston, TX': [
    { name: 'West University',   lat: 29.7185, lng: -95.4310, schools: 10, priceK: 1250 },
    { name: 'Memorial',          lat: 29.7645, lng: -95.4913, schools: 10, priceK: 920 },
    { name: 'Sugar Land',        lat: 29.5994, lng: -95.6347, schools: 10, priceK: 560 },
    { name: 'The Woodlands',     lat: 30.1658, lng: -95.4613, schools: 10, priceK: 620 },
  ],
  'Seattle, WA': [
    { name: 'Bellevue',          lat: 47.6101, lng: -122.2015, schools: 10, priceK: 1380 },
    { name: 'Sammamish',         lat: 47.6163, lng: -122.0356, schools: 10, priceK: 1180 },
    { name: 'Mercer Island',     lat: 47.5707, lng: -122.2221, schools: 10, priceK: 1650 },
    { name: 'Issaquah',          lat: 47.5301, lng: -122.0326, schools: 9, priceK: 980 },
  ],
  'Pittsburgh, PA': [
    { name: 'Fox Chapel',        lat: 40.5234, lng: -79.8960, schools: 10, priceK: 620 },
    { name: 'Upper St. Clair',   lat: 40.3390, lng: -80.0836, schools: 10, priceK: 520 },
    { name: 'Mt. Lebanon',       lat: 40.3773, lng: -80.0495, schools: 9, priceK: 440 },
  ],
  'Portland, OR': [
    { name: 'Lake Oswego',       lat: 45.4207, lng: -122.6706, schools: 10, priceK: 920 },
    { name: 'West Linn',         lat: 45.3656, lng: -122.6148, schools: 10, priceK: 780 },
    { name: 'Bethany',           lat: 45.5498, lng: -122.8421, schools: 9, priceK: 720 },
  ],
};

// --------------------------------------------------------------------------
// City → (lat,lng) seed for listings. Used to estimate drive times until
// Cowork replaces with real Distance Matrix API values.
// --------------------------------------------------------------------------
window.CITY_COORDS = {
  // Denver metro
  'Denver': { lat: 39.7392, lng: -104.9903 },
  'Aurora': { lat: 39.7294, lng: -104.8319 },
  'Lakewood': { lat: 39.7047, lng: -105.0814 },
  'Englewood': { lat: 39.6478, lng: -104.9878 },
  'Golden': { lat: 39.7555, lng: -105.2211 },
  'Littleton': { lat: 39.6133, lng: -105.0166 },
  'Arvada': { lat: 39.8028, lng: -105.0875 },
  'Westminster': { lat: 39.8367, lng: -105.0372 },
  'Colorado Springs': { lat: 38.8339, lng: -104.8214 },
  'Fort Collins': { lat: 40.5853, lng: -105.0844 },
  'Boulder': { lat: 40.0150, lng: -105.2705 },
  'Longmont': { lat: 40.1672, lng: -105.1019 },
  'Highlands Ranch': { lat: 39.5407, lng: -104.9694 },
  'Parker': { lat: 39.5186, lng: -104.7614 },
  'Castle Rock': { lat: 39.3722, lng: -104.8561 },
  'Thornton': { lat: 39.8680, lng: -104.9719 },
  // NC
  'Raleigh': { lat: 35.7796, lng: -78.6382 },
  'Durham': { lat: 35.9940, lng: -78.8986 },
  'Chapel Hill': { lat: 35.9132, lng: -79.0558 },
  'Cary': { lat: 35.7915, lng: -78.7811 },
  'Apex': { lat: 35.7320, lng: -78.8503 },
  'Wake Forest': { lat: 35.9798, lng: -78.5097 },
  // Orlando
  'Orlando': { lat: 28.5384, lng: -81.3789 },
  'Winter Park': { lat: 28.6000, lng: -81.3392 },
  'Winter Garden': { lat: 28.5651, lng: -81.5861 },
  'Lake Mary': { lat: 28.7589, lng: -81.3184 },
  'Windermere': { lat: 28.4951, lng: -81.5347 },
  'Altamonte Springs': { lat: 28.6611, lng: -81.3656 },
  // Nashville
  'Nashville': { lat: 36.1627, lng: -86.7816 },
  'Franklin': { lat: 35.9251, lng: -86.8689 },
  'Brentwood': { lat: 36.0331, lng: -86.7828 },
  'Murfreesboro': { lat: 35.8456, lng: -86.3903 },
};

// --------------------------------------------------------------------------
// Haversine miles — good enough for commute estimates pre-Maps-API.
// --------------------------------------------------------------------------
function milesBetween(a, b) {
  if (!a || !b) return null;
  const R = 3959; // earth miles
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(lat1)*Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Rough drive time: urban-adjusted miles → minutes.
// Cowork will replace with Distance Matrix API; keeps UI honest with "~" prefix.
function estDriveMin(miles) {
  if (miles == null) return null;
  // Avg 30 mph in metro (traffic + lights)
  return Math.round(miles / 30 * 60);
}

// --------------------------------------------------------------------------
// For a listing, pick its best neighborhood anchor (school + price + commute).
// Returns { neighborhood, toPractice, toShreya } with minutes estimates.
// --------------------------------------------------------------------------
function geoFor(listing, priceBand) {
  const coords = window.CITY_COORDS[listing.city];
  const hoods = window.NEIGHBORHOODS[listing.market];
  const shreya = window.SHREYA_ANCHORS[listing.market];
  if (!coords || !hoods) return null;

  const [minP, maxP] = priceBand || [550, 900];
  const candidates = hoods.filter(h => h.schools >= 8 && h.priceK >= minP && h.priceK <= maxP);
  const pool = candidates.length ? candidates : hoods;

  let best = null;
  for (const h of pool) {
    const toPractice = estDriveMin(milesBetween(h, coords));
    const toShreya = shreya ? estDriveMin(milesBetween(h, shreya)) : null;
    const combined = (toPractice || 0) + (toShreya || 0);
    if (!best || combined < best.combined) {
      best = { neighborhood: h, toPractice, toShreya, combined };
    }
  }
  return best;
}

// --------------------------------------------------------------------------
// Seed enrichment-shape data on each listing so the UI has slots to render.
// Cowork's nightly pipeline will populate with verified values.
// --------------------------------------------------------------------------
function hydrateListing(l) {
  // Already hydrated? skip
  if (l.__hydrated) return l;
  const coords = window.CITY_COORDS[l.city] || null;
  return {
    ...l,
    __hydrated: true,
    coords,
    // Practice-facts enrichment slots (Cowork fills)
    enrich: {
      practiceUrl:   { value: null, conf: 'unknown' },
      ownerName:     { value: null, conf: 'unknown' },
      licenseNumber: { value: null, conf: 'unknown' },
      yearsLicensed: { value: null, conf: 'unknown' },
      sedationPermit:{ value: null, conf: 'unknown' }, // big deal for your thesis
      googleRating:  { value: null, conf: 'unknown' }, // { stars, count }
      proceduresOffered: { value: null, conf: 'unknown' }, // array of strings
      recentHeadlines: { value: null, conf: 'unknown' }, // array {title, url, date}
      medianIncome:    { value: null, conf: 'unknown' }, // nearby census tract
      populationGrowth5y: { value: null, conf: 'unknown' },
      competingPractices3mi: { value: null, conf: 'unknown' },
      firstSeen:     { value: null, conf: 'unknown' }, // date listing first appeared
      lastChecked:   { value: null, conf: 'unknown' },
      brokerName:    { value: null, conf: 'unknown' },
      brokerPhone:   { value: null, conf: 'unknown' },
      brokerEmail:   { value: null, conf: 'unknown' },
    }
  };
}

// Apply to the whole dataset.
window.PARIKH_DATA.listings = window.PARIKH_DATA.listings.map(hydrateListing);

Object.assign(window, { milesBetween, estDriveMin, geoFor, hydrateListing });
