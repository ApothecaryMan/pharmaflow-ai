/**
 * Round 2: Sequential testing with longer delays to avoid connection issues
 */

const drugs = [
  'empagliflozin',
  'calcium',
  'iron',
  'baricitinib',
  'dapoxetine',
  'trimebutine',
  'piracetam',
  'ethamsylate',
  'chromium',
  'vitamin b1',
];

async function test() {
  for (const name of drugs) {
    const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(name)}"&limit=1`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.error) {
        console.log(`❌ ${name.padEnd(30)} | NOT in FDA database`);
      } else {
        const r = data.results[0];
        const inter = (r.drug_interactions || []).length > 0;
        const warn = (r.warnings || []).length > 0;
        console.log(`✅ ${name.padEnd(30)} | interactions: ${inter ? 'YES' : 'NO'} | warnings: ${warn ? 'YES' : 'NO'}`);
      }
    } catch (e) {
      console.log(`⚠️  ${name.padEnd(30)} | Network error: ${e.cause?.code || e.message}`);
    }
    await new Promise(r => setTimeout(r, 600));
  }
}

test();
