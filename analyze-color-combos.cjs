const fs = require('fs');

// Read the current v3 JSON
const data = JSON.parse(fs.readFileSync('./public/products-grouped-by-variant_v3.json', 'utf8'));

// Common materials and finishes to remove for base comparison
const materials = [
  'polished stainless steel',
  'brushed stainless steel',
  'stainless steel',
  'brushed nickel',
  'brushed brass',
  'brushed bronze',
  'brushed gunmetal',
  'brushed chrome',
  'brushed gold',
  'polished brass',
  'satin chrome',
  'matte black',
  'matte white',
  'gloss white',
  'gloss black',
  'reflective glass',
  'black glass',
  'white glass',
  'clear glass',
  'frosted glass',
  'smoked glass',
  'mirror glass',
  'tinted glass',
  'glass',
  'gunmetal',
  'chrome',
  'black',
  'white',
  'brass',
  'bronze',
  'nickel',
  'gold',
  'silver',
  'copper',
  'titanium',
  'oak',
  'walnut',
  'bamboo',
  'timber',
  'wood',
  'grey',
  'gray'
];

// Normalize title by removing size, material, and color combinations
function normalizeTitle(title) {
  let normalized = title.toLowerCase().trim();

  // Remove size patterns
  normalized = normalized
    .replace(/\d+\s*x\s*\d+(?:\s*x\s*\d+)?\s*(mm|cm|m)?/gi, '')
    .replace(/\d+\s*(mm|cm|m)\b/gi, '');

  // Remove color combination patterns like "Grey/Chrome", "White/Chrome", "Black/Brass", etc.
  // This will match patterns like: word/word, word / word
  normalized = normalized.replace(/\b\w+\s*\/\s*\w+\b/gi, '');

  // Remove materials
  for (const material of materials) {
    const regex = new RegExp(`\\b${material}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  }

  // Normalize whitespace
  return normalized.replace(/\s+/g, ' ').trim();
}

// Analyze current grouping
let currentTotalGroups = 0;
let currentTotalProducts = 0;

for (const [brand, groups] of Object.entries(data)) {
  currentTotalGroups += groups.length;
  for (const group of groups) {
    currentTotalProducts += group.length;
  }
}

// Re-group with new logic
const regroupedData = {};
let newTotalGroups = 0;

for (const [brand, groups] of Object.entries(data)) {
  // Flatten all products from all groups
  const allProducts = groups.flat();

  // Group products by their base type (without size, material, and color combos)
  const baseTypeMap = new Map();

  for (const product of allProducts) {
    const baseType = normalizeTitle(product.productTitle);

    if (!baseTypeMap.has(baseType)) {
      baseTypeMap.set(baseType, []);
    }
    baseTypeMap.get(baseType).push(product);
  }

  // Convert each base type group to a single group (all variants together)
  const newGroups = [];

  for (const [baseType, products] of baseTypeMap.entries()) {
    newGroups.push(products);
  }

  regroupedData[brand] = newGroups;
  newTotalGroups += newGroups.length;
}

console.log('=== ANALYSIS RESULTS ===');
console.log('');
console.log('Current grouping (v3):');
console.log(`  Total products: ${currentTotalProducts}`);
console.log(`  Total groups: ${currentTotalGroups}`);
console.log('');
console.log('With color combination logic:');
console.log(`  Total products: ${currentTotalProducts}`);
console.log(`  Total groups: ${newTotalGroups}`);
console.log('');
console.log(`Difference: ${currentTotalGroups - newTotalGroups} groups would be merged`);
console.log(`Reduction: ${((currentTotalGroups - newTotalGroups) / currentTotalGroups * 100).toFixed(2)}%`);
console.log('');

// Find some examples of products that would be grouped
console.log('=== EXAMPLE: Products 9510028 and 9510029 ===');
for (const [brand, groups] of Object.entries(data)) {
  for (const group of groups) {
    const codes = group.map(p => p.productCode);
    if (codes.includes('9510028') || codes.includes('9510029')) {
      console.log(`Brand: ${brand}`);
      console.log('Current group:');
      group.forEach(p => {
        console.log(`  ${p.productCode}: ${p.productTitle}`);
      });
    }
  }
}

console.log('');
console.log('After applying new logic:');
for (const [brand, groups] of Object.entries(regroupedData)) {
  for (const group of groups) {
    const codes = group.map(p => p.productCode);
    if (codes.includes('9510028') || codes.includes('9510029')) {
      console.log(`Brand: ${brand}`);
      console.log('New group:');
      group.forEach(p => {
        console.log(`  ${p.productCode}: ${p.productTitle}`);
      });
    }
  }
}
