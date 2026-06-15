/**
 * Comprehensive OpenFDA coverage test with API key
 * Tests drugs commonly found in Egyptian pharmacies
 */

const API_KEY = 'vjkXvIlFJ1XrVDtDbNMLkcXo9hFZM1Q3tYSft5wM';

const drugs = [
  // Common drugs that should be in FDA
  'empagliflozin',
  'baricitinib',
  'amlodipine',
  'carvedilol',
  'meloxicam',
  'febuxostat',
  'glimepiride',
  'famotidine',
  'clonazepam',
  'midazolam',
  // Drugs that may NOT be FDA-approved (not sold in US)
  'dapoxetine',
  'piracetam',
  'ethamsylate',
  'trimebutine',
  // Vitamins / supplements
  'calcium',
  'iron',
  'chromium',
  // Combination ingredient search
  'heparin',
];

async function test() {
  console.log('=== Comprehensive OpenFDA Test (with API key) ===\n');

  const results = { found: 0, notFound: 0, foundNames: [], missingNames: [] };

  for (const name of drugs) {
    const url = `https://api.fda.gov/drug/label.json?api_key=${API_KEY}&search=openfda.generic_name:"${encodeURIComponent(name)}"&limit=1`;
    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        console.log(`❌ ${name.padEnd(25)} | NOT in FDA`);
        results.notFound++;
        results.missingNames.push(name);
      } else {
        const r = data.results[0];
        const has_inter = (r.drug_interactions || []).length > 0;
        const has_warn = (r.warnings || []).length > 0;
        const has_contra = (r.contraindications || []).length > 0;
        const flags = [
          has_inter ? 'interactions' : null,
          has_warn ? 'warnings' : null,
          has_contra ? 'contraindications' : null,
        ]
          .filter(Boolean)
          .join(', ');
        console.log(`✅ ${name.padEnd(25)} | ${flags || 'basic info only'}`);
        results.found++;
        results.foundNames.push(name);
      }
    } catch (e) {
      console.log(`⚠️  ${name.padEnd(25)} | ${e.message}`);
      results.notFound++;
      results.missingNames.push(name);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n=== RESULTS ===`);
  console.log(
    `Match rate: ${results.found}/${drugs.length} (${Math.round((results.found / drugs.length) * 100)}%)`
  );
  console.log(`\nMissing from FDA: ${results.missingNames.join(', ')}`);
}

test();
