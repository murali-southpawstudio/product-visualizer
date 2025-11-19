const fs = require('fs');

// Read the v2 JSON
const data = JSON.parse(fs.readFileSync('./public/products_with_variants2.json', 'utf8'));

console.log('Verifying variant matching logic...\n');
console.log(`Total families to check: ${data.families.length}\n`);

const problemFamilies = [];
let totalChecked = 0;
let totalMatched = 0;

// Function to find matching product based on selected options (same logic as frontend)
function getMatchingProduct(family, selectedOptions) {
  if (Object.keys(selectedOptions).length === 0) {
    return null;
  }

  return family.variants.find(variant => {
    return Object.entries(selectedOptions).every(([key, value]) => {
      // Try the exact key first
      let attr = variant.attributes[key];

      // If not found, try plural/singular variations
      if (attr === undefined) {
        // If key is singular, try plural
        if (!key.endsWith('s')) {
          attr = variant.attributes[key + 's'];
        }
        // If key is plural, try singular
        else if (key.endsWith('s')) {
          attr = variant.attributes[key.slice(0, -1)];
        }
      }

      if (Array.isArray(attr)) {
        return attr.includes(value);
      }
      return attr === value;
    });
  });
}

// Check each family
for (const family of data.families) {
  totalChecked++;

  // Skip families with no variant options
  if (Object.keys(family.variantOptions).length === 0) {
    continue;
  }

  // Select first value from each variant option
  const selectedOptions = {};
  for (const [optionType, values] of Object.entries(family.variantOptions)) {
    if (values.length > 0) {
      selectedOptions[optionType] = values[0];
    }
  }

  // Try to find matching product
  const matchingProduct = getMatchingProduct(family, selectedOptions);

  if (matchingProduct) {
    totalMatched++;
  } else {
    problemFamilies.push({
      familyId: family.productFamilyId,
      familyTitle: family.productFamilyTitle,
      brand: family.brand,
      variantCount: family.variantCount,
      selectedOptions: selectedOptions,
      variantOptions: family.variantOptions,
      variants: family.variants.map(v => ({
        productCode: v.productCode,
        productTitle: v.productTitle,
        attributes: v.attributes
      }))
    });
  }
}

console.log(`Total families checked: ${totalChecked}`);
console.log(`Families with matching product: ${totalMatched}`);
console.log(`Families WITHOUT matching product: ${problemFamilies.length}\n`);

if (problemFamilies.length > 0) {
  console.log('=== PROBLEM FAMILIES ===\n');

  problemFamilies.forEach((family, index) => {
    console.log(`${index + 1}. ${family.brand} - ${family.familyTitle}`);
    console.log(`   Family ID: ${family.familyId}`);
    console.log(`   Variant Count: ${family.variantCount}`);
    console.log(`   Selected Options (first values):`);
    console.log(`   ${JSON.stringify(family.selectedOptions, null, 2).split('\n').join('\n   ')}`);
    console.log(`   Available Variant Options:`);
    console.log(`   ${JSON.stringify(family.variantOptions, null, 2).split('\n').join('\n   ')}`);
    console.log(`   First variant attributes:`);
    console.log(`   ${JSON.stringify(family.variants[0].attributes, null, 2).split('\n').join('\n   ')}`);
    console.log('');
  });

  // Write detailed report to file
  fs.writeFileSync(
    './variant-verification-report.json',
    JSON.stringify({ problemFamilies, summary: { totalChecked, totalMatched, problemCount: problemFamilies.length } }, null, 2),
    'utf8'
  );
  console.log('Detailed report written to: variant-verification-report.json\n');
} else {
  console.log('✓ All families have matching products when selecting first values!\n');
}
