const fs = require('fs');

// Read the v5 JSON (apply temperature logic on top of v5)
const data = JSON.parse(fs.readFileSync('./public/products-grouped-by-variant_v5.json', 'utf8'));

// Extended list of materials, colors, finishes, and temperatures to remove
const materials = [
  // Finishes and materials
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
  'polished chrome',
  'satin chrome',
  'matte black',
  'matte white',
  'gloss white',
  'gloss black',

  // Glass types
  'reflective glass',
  'black glass',
  'white glass',
  'clear glass',
  'frosted glass',
  'smoked glass',
  'mirror glass',
  'tinted glass',
  'glass',

  // Wood types
  'oak',
  'walnut',
  'bamboo',
  'timber',
  'wood',

  // Base materials/colors (can be both)
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
  'grey',
  'gray',

  // Additional finishes
  'matt black',
  'matt white',
  'matte',
  'gloss',
  'satin',
  'polished',
  'brushed',

  // Temperature variations
  'cold',
  'warm',
  'hot',
  'cool',
  'cold water',
  'warm water',
  'hot water'
];

// Sort by length (longest first) to match longer phrases first
materials.sort((a, b) => b.length - a.length);

// Normalize title by removing size, material, color combinations, and temperature variations
function normalizeTitle(title) {
  let normalized = title.toLowerCase().trim();

  // Remove size patterns
  normalized = normalized
    .replace(/\d+\s*x\s*\d+(?:\s*x\s*\d+)?\s*(mm|cm|m)?/gi, '')
    .replace(/\d+\s*(mm|cm|m)\b/gi, '');

  // Remove color combination patterns like "Grey/Chrome", "White/Chrome", "Black/Brass", etc.
  // This will match patterns like: word/word, word / word
  normalized = normalized.replace(/\b\w+\s*\/\s*\w+\b/gi, '');

  // Remove materials, finishes, and temperature variations (sorted by length, longest first)
  for (const material of materials) {
    const regex = new RegExp(`\\b${material.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  }

  // Normalize whitespace
  return normalized.replace(/\s+/g, ' ').trim();
}

// Re-group products within each brand
const regroupedData = {};

for (const [brand, groups] of Object.entries(data)) {
  // Flatten all products from all groups
  const allProducts = groups.flat();

  // Group products by their base type
  const baseTypeMap = new Map();

  for (const product of allProducts) {
    const baseType = normalizeTitle(product.productTitle);

    if (!baseTypeMap.has(baseType)) {
      baseTypeMap.set(baseType, []);
    }
    baseTypeMap.get(baseType).push(product);
  }

  // Convert each base type group to a single group
  const newGroups = [];

  for (const [baseType, products] of baseTypeMap.entries()) {
    newGroups.push(products);
  }

  regroupedData[brand] = newGroups;
}

// Write the new grouped data
fs.writeFileSync(
  './public/products-grouped-by-variant_v6.json',
  JSON.stringify(regroupedData, null, 2),
  'utf8'
);

console.log('V6 Regrouping complete!');
console.log(`Processed ${Object.keys(regroupedData).length} brands`);

// Show statistics
let totalGroupsV1 = 0;
let totalGroupsV5 = 0;
let totalGroupsV6 = 0;
let totalProducts = 0;

// Load v5 for comparison
const dataV5 = JSON.parse(fs.readFileSync('./public/products-grouped-by-variant_v5.json', 'utf8'));

for (const brand in data) {
  totalGroupsV1 += data[brand].length;
  totalProducts += data[brand].reduce((sum, group) => sum + group.length, 0);
}

for (const brand in dataV5) {
  totalGroupsV5 += dataV5[brand].length;
}

for (const brand in regroupedData) {
  totalGroupsV6 += regroupedData[brand].length;
}

console.log('');
console.log('Statistics:');
console.log(`Total products: ${totalProducts}`);
console.log(`Groups in v1: ${totalGroupsV1}`);
console.log(`Groups in v5: ${totalGroupsV5}`);
console.log(`Groups in v6: ${totalGroupsV6}`);
console.log(`Reduction v1 to v6: ${totalGroupsV1 - totalGroupsV6} groups merged`);
console.log(`Reduction v5 to v6: ${totalGroupsV5 - totalGroupsV6} groups merged`);
console.log(`Percentage reduction (v1 to v6): ${((totalGroupsV1 - totalGroupsV6) / totalGroupsV1 * 100).toFixed(2)}%`);

// Try to find the specific products mentioned
console.log('');
console.log('=== Looking for products 9508241 and 9508242 ===');
for (const [brand, groups] of Object.entries(regroupedData)) {
  for (const group of groups) {
    const codes = group.map(p => p.productCode);
    if (codes.includes('9508241') || codes.includes('9508242')) {
      console.log(`Brand: ${brand}`);
      console.log(`Group has ${group.length} products:`);
      group.forEach(p => {
        if (p.productCode === '9508241' || p.productCode === '9508242') {
          console.log(`  ✓ ${p.productCode}: ${p.productTitle}`);
        }
      });
      if (codes.includes('9508241') && codes.includes('9508242')) {
        console.log('  → SUCCESS: Both products are now grouped together!');
      }
    }
  }
}
