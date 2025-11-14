const fs = require('fs');

// Read the v1 JSON (starting fresh)
const data = JSON.parse(fs.readFileSync('./public/products-grouped-by-variant_v1.json', 'utf8'));

// Extended list of materials, colors, and finishes to remove
// These can function as both colors AND materials
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
  'brushed'
];

// Sort by length (longest first) to match longer phrases first
materials.sort((a, b) => b.length - a.length);

// Normalize title by removing size, material, color combinations, and all variants
function normalizeTitle(title) {
  let normalized = title.toLowerCase().trim();

  // Remove size patterns
  normalized = normalized
    .replace(/\d+\s*x\s*\d+(?:\s*x\s*\d+)?\s*(mm|cm|m)?/gi, '')
    .replace(/\d+\s*(mm|cm|m)\b/gi, '');

  // Remove color combination patterns like "Grey/Chrome", "White/Chrome", "Black/Brass", etc.
  // This will match patterns like: word/word, word / word
  normalized = normalized.replace(/\b\w+\s*\/\s*\w+\b/gi, '');

  // Remove materials and finishes (sorted by length, longest first)
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
  './public/products-grouped-by-variant_v5.json',
  JSON.stringify(regroupedData, null, 2),
  'utf8'
);

console.log('V5 Regrouping complete!');
console.log(`Processed ${Object.keys(regroupedData).length} brands`);

// Show statistics
let totalGroupsV1 = 0;
let totalGroupsV5 = 0;
let totalProducts = 0;

for (const brand in data) {
  totalGroupsV1 += data[brand].length;
  totalGroupsV5 += regroupedData[brand].length;
  for (const group of data[brand]) {
    totalProducts += group.length;
  }
}

console.log('');
console.log('Statistics:');
console.log(`Total products: ${totalProducts}`);
console.log(`Groups in v1: ${totalGroupsV1}`);
console.log(`Groups in v5: ${totalGroupsV5}`);
console.log(`Reduction: ${totalGroupsV1 - totalGroupsV5} groups merged (from v1 to v5)`);
console.log(`Percentage reduction: ${((totalGroupsV1 - totalGroupsV5) / totalGroupsV1 * 100).toFixed(2)}%`);

// Try to find the specific products mentioned
console.log('');
console.log('=== Looking for products 2202028 and 9506780 ===');
for (const [brand, groups] of Object.entries(regroupedData)) {
  for (const group of groups) {
    const codes = group.map(p => p.productCode);
    if (codes.includes('2202028') || codes.includes('9506780')) {
      console.log(`Brand: ${brand}`);
      console.log(`Group has ${group.length} products:`);
      group.forEach(p => {
        if (p.productCode === '2202028' || p.productCode === '9506780') {
          console.log(`  ✓ ${p.productCode}: ${p.productTitle}`);
        }
      });
      if (codes.includes('2202028') && codes.includes('9506780')) {
        console.log('  → SUCCESS: Both products are now grouped together!');
      }
    }
  }
}
