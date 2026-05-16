
const drugsToTest = [
  "warfarin",
  "dasatinib",
  "diclofenac potassium",
  "metformin",
  "sitagliptin",
  "metronidazole",
  "tetracycline"
];

async function testFDA() {
  console.log("| Generic Name | Found? | Interactions Length |");
  console.log("|--------------|--------|---------------------|");
  
  for (const name of drugsToTest) {
    const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(name)}"&limit=1`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.results && data.results.length > 0) {
        const interactions = data.results[0].drug_interactions || [];
        console.log(`| ${name} | ✅ | ${interactions.length} fields |`);
      } else {
        console.log(`| ${name} | ❌ | - |`);
      }
    } catch (error) {
      console.log(`| ${name} | ⚠️ Error | - |`);
    }
  }
}

testFDA();
