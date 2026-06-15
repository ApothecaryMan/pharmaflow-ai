/**
 * Edge Case Testing for OpenFDA API
 * Testing potential problem areas before building the feature
 */

const edgeCases = [
  // 1. Combination drugs (multi-ingredient) - can we search the combo?
  { name: 'empagliflozin+metformin (combo search)', query: 'empagliflozin+AND+metformin' },

  // 2. Vitamins & supplements - does FDA have data?
  { name: 'vitamin b complex', query: 'vitamin+b+complex' },
  { name: 'calcium', query: 'calcium' },
  { name: 'chromium picolinate', query: 'chromium+picolinate' },
  { name: 'iron', query: 'iron' },

  // 3. Less common generics
  { name: 'baricitinib', query: 'baricitinib' },
  { name: 'dapoxetine', query: 'dapoxetine' },
  { name: 'trimebutine', query: 'trimebutine' },
  { name: 'piracetam', query: 'piracetam' },
  { name: 'ethamsylate', query: 'ethamsylate' },

  // 4. Steroids / hormones
  { name: 'fludrocortisone', query: 'fludrocortisone' },

  // 5. Common Egyptian market drugs
  { name: 'neostigmine', query: 'neostigmine' },
  { name: 'nalbuphine', query: 'nalbuphine' },
  { name: 'tranexamic acid', query: 'tranexamic+acid' },
];

async function testEdgeCases() {
  console.log('=== OpenFDA Edge Case Analysis ===\n');

  let found = 0;
  let notFound = 0;
  let hasInteractions = 0;
  let hasWarnings = 0;

  for (const tc of edgeCases) {
    const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${tc.query}"&limit=1`;
    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        console.log(`❌ ${tc.name.padEnd(40)} | NOT FOUND in FDA`);
        notFound++;
        continue;
      }

      const result = data.results[0];
      const interactions = result.drug_interactions || [];
      const warnings = result.warnings || [];
      const contraindications = result.contraindications || [];

      const interLen = interactions.length > 0 ? interactions[0].length : 0;
      const warnLen = warnings.length > 0 ? warnings[0].length : 0;
      const contraLen = contraindications.length > 0 ? contraindications[0].length : 0;

      found++;
      if (interLen > 0) hasInteractions++;
      if (warnLen > 0) hasWarnings++;

      console.log(
        `✅ ${tc.name.padEnd(40)} | interactions: ${interLen > 0 ? interLen + ' chars' : 'NONE'} | warnings: ${warnLen > 0 ? warnLen + ' chars' : 'NONE'} | contraindications: ${contraLen > 0 ? contraLen + ' chars' : 'NONE'}`
      );
    } catch (error) {
      console.log(`⚠️  ${tc.name.padEnd(40)} | ERROR: ${error.message}`);
      notFound++;
    }

    // Rate limit protection
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log('\n=== Summary ===');
  console.log(`Total tested:     ${edgeCases.length}`);
  console.log(`Found in FDA:     ${found}  (${Math.round((found / edgeCases.length) * 100)}%)`);
  console.log(
    `NOT found:        ${notFound}  (${Math.round((notFound / edgeCases.length) * 100)}%)`
  );
  console.log(`Has interactions: ${hasInteractions}`);
  console.log(`Has warnings:     ${hasWarnings}`);
}

testEdgeCases();
