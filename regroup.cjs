const fs = require('fs');

// Read the original JSON
const data = JSON.parse(fs.readFileSync('./public/products-grouped-by-variant_v6.json', 'utf8'));

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

  // Normalize whitespace BEFORE removing materials (critical for multi-word materials with inconsistent spacing)
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Remove materials
  for (const material of materials) {
    const regex = new RegExp(`\\b${material}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  }

  // Normalize whitespace again
  return normalized.replace(/\s+/g, ' ').trim();
}

// Re-group products within each brand
const regroupedData = {};

for (const [brand, groups] of Object.entries(data)) {
  // Skip metadata
  if (brand === '_algorithmInfo') continue;

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

// Add algorithm metadata
const output = {
  _algorithmInfo: {
    version: 6,
    description: "Groups products by base type, removing size, materials, and finishes. Includes whitespace normalization fix for proper multi-word material matching.",
    groupingCriteria: [
      "Same base product name (after normalization)",
      "Different sizes grouped together",
      "Different materials/finishes grouped together (e.g., Matte Black, Polished Stainless Steel)"
    ],
    normalizedAttributes: [
      "Sizes (e.g., 1200x900mm, 630mm)",
      "Materials (e.g., stainless steel, brass, bronze)",
      "Finishes (e.g., brushed, polished, matte, gloss)"
    ],
    bugFixes: [
      {
        issue: "Whitespace normalization bug",
        description: "Multi-word materials with inconsistent spacing (e.g., 'Polished Stainless    Steel' with extra spaces) were not being removed properly",
        solution: "Normalize whitespace to single spaces BEFORE attempting to remove materials, ensuring consistent matching",
        affectedProducts: [
          {
            productCodes: ["9509570", "9509568"],
            productTitles: [
              "Mizu Bloc Heated Towel Rail 630 (Each) (Less Transformer) Matte Black",
              "Mizu Bloc Heated Towel Rail 630 (Each) (Less Transformer) Polished Stainless Steel"
            ],
            before: "Not grouped (whitespace prevented material matching)",
            after: "Properly grouped (same base product, different finishes)"
          }
        ]
      }
    ],
    lastUpdated: new Date().toISOString()
  },
  ...regroupedData
};

// Write the updated v6 data
fs.writeFileSync(
  './public/products-grouped-by-variant_v6.json',
  JSON.stringify(output, null, 2),
  'utf8'
);

console.log('Regrouping complete!');
console.log(`Processed ${Object.keys(regroupedData).length} brands`);

// Show statistics
let totalGroupsBefore = 0;
let totalGroupsAfter = 0;

for (const brand in data) {
  if (brand === '_algorithmInfo') continue;
  totalGroupsBefore += data[brand].length;
  totalGroupsAfter += regroupedData[brand].length;
}

console.log(`Groups before: ${totalGroupsBefore}`);
console.log(`Groups after: ${totalGroupsAfter}`);
console.log(`Reduction: ${totalGroupsBefore - totalGroupsAfter} groups merged`);
