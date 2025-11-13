const fs = require('fs');

// Read the original JSON
const data = JSON.parse(fs.readFileSync('./public/products-grouped-by-variant_v1.json', 'utf8'));

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
  'wood'
];

// Extract size from title
function extractSize(title) {
  const sizePatterns = [
    /(\d+\s*x\s*\d+(?:\s*x\s*\d+)?)\s*(mm|cm|m)?/i, // 1200x900 or 1200x900x600
    /(\d+)\s*(mm|cm|m)\b/i, // 600mm
  ];

  for (const pattern of sizePatterns) {
    const match = title.match(pattern);
    if (match) {
      return match[1] + (match[2] || '');
    }
  }
  return 'NO_SIZE';
}

// Normalize title by removing size and material
function normalizeTitle(title) {
  let normalized = title.toLowerCase().trim();

  // Remove size patterns
  normalized = normalized
    .replace(/\d+\s*x\s*\d+(?:\s*x\s*\d+)?\s*(mm|cm|m)?/gi, '')
    .replace(/\d+\s*(mm|cm|m)\b/gi, '');

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

  // Group products by their base type (without size and material)
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
  './public/products-grouped-by-variant_v3.json',
  JSON.stringify(regroupedData, null, 2),
  'utf8'
);

console.log('Regrouping complete!');
console.log(`Processed ${Object.keys(regroupedData).length} brands`);

// Show statistics
let totalGroupsBefore = 0;
let totalGroupsAfter = 0;

for (const brand in data) {
  totalGroupsBefore += data[brand].length;
  totalGroupsAfter += regroupedData[brand].length;
}

console.log(`Groups before: ${totalGroupsBefore}`);
console.log(`Groups after: ${totalGroupsAfter}`);
console.log(`Reduction: ${totalGroupsBefore - totalGroupsAfter} groups merged`);
