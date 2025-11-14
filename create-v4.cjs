const fs = require('fs');

// Read the v3 JSON
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

// Re-group products within each brand
const regroupedData = {};

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
    // All products with same base type go in one group
    newGroups.push(products);
  }

  regroupedData[brand] = newGroups;
}

// Write the new grouped data
fs.writeFileSync(
  './public/products-grouped-by-variant_v4.json',
  JSON.stringify(regroupedData, null, 2),
  'utf8'
);

console.log('V4 Regrouping complete!');
console.log(`Processed ${Object.keys(regroupedData).length} brands`);

// Show statistics
let totalGroupsV1 = 0;
let totalGroupsV4 = 0;
let totalProducts = 0;

for (const brand in data) {
  totalGroupsV1 += data[brand].length;
  totalGroupsV4 += regroupedData[brand].length;
  for (const group of data[brand]) {
    totalProducts += group.length;
  }
}

console.log('');
console.log('Statistics:');
console.log(`Total products: ${totalProducts}`);
console.log(`Groups in v3: ${totalGroupsV1}`);
console.log(`Groups in v4: ${totalGroupsV4}`);
console.log(`Reduction: ${totalGroupsV1 - totalGroupsV4} groups merged (from v3 to v4)`);
console.log(`Percentage reduction: ${((totalGroupsV1 - totalGroupsV4) / totalGroupsV1 * 100).toFixed(2)}%`);
